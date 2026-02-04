"""
Batch Response System for Nanobot

Implements a "busy expert" pattern:
- Immediate response for explicit commands (@mention, /ask, !bot)
- Batch processing for regular messages via cron job
"""

import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Callable, Awaitable
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class MessagePriority(Enum):
    """消息优先级"""
    IMMEDIATE = "immediate"  # 立即回复（命令、@提及）
    HIGH = "high"            # 高优先级（问题、求助）
    NORMAL = "normal"        # 普通消息
    LOW = "low"              # 低优先级（闲聊）


@dataclass
class QueuedMessage:
    """队列中的消息"""
    id: str
    channel_id: str
    author_id: str
    author_name: str
    content: str
    timestamp: datetime
    priority: MessagePriority
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "channel_id": self.channel_id,
            "author_id": self.author_id,
            "author_name": self.author_name,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "priority": self.priority.value,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "QueuedMessage":
        return cls(
            id=data["id"],
            channel_id=data["channel_id"],
            author_id=data["author_id"],
            author_name=data["author_name"],
            content=data["content"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            priority=MessagePriority(data["priority"]),
            metadata=data.get("metadata", {}),
        )


@dataclass
class BatchConfig:
    """批量响应配置"""
    # 命令配置
    command_prefixes: list[str] = field(default_factory=lambda: ["!", "/", "?"])
    command_triggers: list[str] = field(default_factory=lambda: [
        "ask", "问", "help", "帮", "bot", "query"
    ])

    # 批处理配置
    batch_interval_minutes: int = 5        # 批处理间隔
    min_messages_to_respond: int = 1       # 最少多少条消息才回复
    max_messages_per_batch: int = 20       # 每批最多处理多少条
    message_ttl_hours: int = 24            # 消息过期时间

    # 智能批处理
    respond_to_questions: bool = True      # 优先回复问题
    summarize_discussions: bool = True     # 总结长讨论
    skip_if_answered: bool = True          # 如果已有人回答则跳过

    # 安静时段（不发批量回复）
    quiet_hours: tuple[int, int] = (23, 7)  # 23:00 - 07:00


class MessageQueue:
    """
    消息队列，持久化存储待处理的消息。
    """

    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._queue_file = self.storage_path / "message_queue.json"
        self._lock = asyncio.Lock()

    async def add(self, message: QueuedMessage) -> None:
        """添加消息到队列"""
        async with self._lock:
            queue = self._load_queue()
            queue.append(message.to_dict())
            self._save_queue(queue)

    async def get_pending(
        self,
        channel_id: str = None,
        limit: int = None,
        min_priority: MessagePriority = None,
    ) -> list[QueuedMessage]:
        """获取待处理的消息"""
        async with self._lock:
            queue = self._load_queue()

            messages = [QueuedMessage.from_dict(m) for m in queue]

            # 过滤
            if channel_id:
                messages = [m for m in messages if m.channel_id == channel_id]

            if min_priority:
                priority_order = [MessagePriority.LOW, MessagePriority.NORMAL,
                                 MessagePriority.HIGH, MessagePriority.IMMEDIATE]
                min_idx = priority_order.index(min_priority)
                messages = [m for m in messages
                           if priority_order.index(m.priority) >= min_idx]

            # 按优先级和时间排序
            messages.sort(key=lambda m: (
                -[MessagePriority.LOW, MessagePriority.NORMAL,
                  MessagePriority.HIGH, MessagePriority.IMMEDIATE].index(m.priority),
                m.timestamp
            ))

            if limit:
                messages = messages[:limit]

            return messages

    async def remove(self, message_ids: list[str]) -> None:
        """从队列中移除消息"""
        async with self._lock:
            queue = self._load_queue()
            queue = [m for m in queue if m["id"] not in message_ids]
            self._save_queue(queue)

    async def cleanup_expired(self, ttl_hours: int = 24) -> int:
        """清理过期消息"""
        async with self._lock:
            queue = self._load_queue()
            cutoff = datetime.now() - timedelta(hours=ttl_hours)

            original_count = len(queue)
            queue = [
                m for m in queue
                if datetime.fromisoformat(m["timestamp"]) > cutoff
            ]

            self._save_queue(queue)
            return original_count - len(queue)

    async def get_channels_with_pending(self) -> list[str]:
        """获取有待处理消息的频道列表"""
        async with self._lock:
            queue = self._load_queue()
            return list(set(m["channel_id"] for m in queue))

    def _load_queue(self) -> list[dict]:
        if self._queue_file.exists():
            with open(self._queue_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def _save_queue(self, queue: list[dict]) -> None:
        with open(self._queue_file, "w", encoding="utf-8") as f:
            json.dump(queue, f, ensure_ascii=False, indent=2)


class CommandDetector:
    """
    检测消息是否是需要立即响应的命令。
    """

    def __init__(self, config: BatchConfig, bot_names: list[str] = None):
        self.config = config
        self.bot_names = [n.lower() for n in (bot_names or ["nanobot", "bot"])]
        self._build_patterns()

    def _build_patterns(self):
        """构建命令匹配模式"""
        # 前缀命令: !ask, /help, ?问
        prefix_pattern = (
            r'^[' + re.escape(''.join(self.config.command_prefixes)) + r']\s*'
            r'(' + '|'.join(re.escape(t) for t in self.config.command_triggers) + r')\b'
        )
        self._prefix_re = re.compile(prefix_pattern, re.IGNORECASE)

        # 名字调用: "nanobot, ...", "bot: ..."
        name_pattern = r'^(' + '|'.join(re.escape(n) for n in self.bot_names) + r')[,:\s]+'
        self._name_re = re.compile(name_pattern, re.IGNORECASE)

    def is_command(
        self,
        content: str,
        is_mentioned: bool = False,
        is_reply_to_bot: bool = False,
    ) -> tuple[bool, str]:
        """
        检测是否是命令。

        Returns:
            (is_command, extracted_query)
        """
        content = content.strip()

        # @提及
        if is_mentioned:
            # 移除 mention 标记后的内容就是 query
            query = re.sub(r'<@!?\d+>\s*', '', content).strip()
            return True, query

        # 回复机器人的消息
        if is_reply_to_bot:
            return True, content

        # 前缀命令
        match = self._prefix_re.match(content)
        if match:
            query = content[match.end():].strip()
            return True, query

        # 名字调用
        match = self._name_re.match(content)
        if match:
            query = content[match.end():].strip()
            return True, query

        return False, ""


class MessageClassifier:
    """
    对非命令消息进行分类，决定优先级。
    """

    def __init__(self, expertise_keywords: list[str] = None):
        self.expertise_keywords = [
            kw.lower() for kw in (expertise_keywords or [
                "python", "code", "bug", "error", "help", "how",
                "代码", "报错", "怎么", "帮忙", "问题"
            ])
        ]

        # 问句模式
        self._question_re = re.compile(
            r'(\?|？|^(what|how|why|who|when|where|can|could|should|is|are|do|does)\b|'
            r'^(什么|怎么|为什么|谁|哪|能不能|是不是))',
            re.IGNORECASE
        )

    def classify(self, content: str) -> MessagePriority:
        """分类消息优先级"""
        content_lower = content.lower()

        # 是问题
        is_question = bool(self._question_re.search(content))

        # 包含专业关键词
        has_expertise = any(kw in content_lower for kw in self.expertise_keywords)

        if is_question and has_expertise:
            return MessagePriority.HIGH
        elif is_question:
            return MessagePriority.NORMAL
        elif has_expertise:
            return MessagePriority.NORMAL
        else:
            return MessagePriority.LOW


class BatchResponder:
    """
    批量响应器：处理消息队列，生成批量回复。
    """

    BATCH_PROMPT = '''You are {bot_name} reviewing messages from a group chat that accumulated while you were away.

## Your Expertise
{expertise}

## Messages to Review
{messages}

## Your Task
Review these messages and decide what to respond to. You should:

1. **Answer direct questions** that match your expertise
2. **Provide helpful information** where you can add value
3. **Skip casual chat** - don't respond to greetings, jokes, or off-topic chat
4. **Don't repeat** what others have already answered
5. **Be selective** - you don't need to respond to everything

## Response Format
Respond naturally as if you just checked the chat. You can:
- Answer multiple questions in one message
- Reference specific people by name
- Say "关于 @Alice 问的 XXX..." to address specific questions
- Keep it concise - this is a batch catch-up, not individual replies

If there's nothing worth responding to, just say "SKIP" (nothing else).

## Example Good Response
"刚看到群里的消息～

关于 @Alice 问的 Python 读取 Excel 的问题，可以用 pandas：
```python
import pandas as pd
df = pd.read_excel('file.xlsx')
```

@Bob 提到的那个 API 报错，看起来是认证问题，检查一下 token 是否过期了？

其他的我就不插嘴了 😄"
'''

    def __init__(
        self,
        llm_provider,
        queue: MessageQueue,
        config: BatchConfig = None,
        bot_name: str = "nanobot",
        expertise: list[str] = None,
    ):
        self.llm = llm_provider
        self.queue = queue
        self.config = config or BatchConfig()
        self.bot_name = bot_name
        self.expertise = expertise or ["programming", "technology"]

    async def process_batch(self, channel_id: str) -> Optional[str]:
        """
        处理指定频道的消息批次。

        Returns:
            回复内容，如果没有需要回复的则返回 None
        """
        # 获取待处理消息
        messages = await self.queue.get_pending(
            channel_id=channel_id,
            limit=self.config.max_messages_per_batch,
        )

        if len(messages) < self.config.min_messages_to_respond:
            return None

        # 检查安静时段
        if self._is_quiet_hours():
            logger.info(f"Skipping batch response during quiet hours")
            return None

        # 格式化消息
        formatted_messages = self._format_messages_for_llm(messages)

        # 生成回复
        prompt = self.BATCH_PROMPT.format(
            bot_name=self.bot_name,
            expertise=", ".join(self.expertise),
            messages=formatted_messages,
        )

        response = await self.llm.complete(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7,
        )

        response = response.strip()

        # 检查是否跳过
        if response.upper() == "SKIP" or not response:
            # 标记消息为已处理（即使没回复）
            await self.queue.remove([m.id for m in messages])
            return None

        # 标记消息为已处理
        await self.queue.remove([m.id for m in messages])

        return response

    async def process_all_channels(self) -> dict[str, Optional[str]]:
        """
        处理所有有待处理消息的频道。

        Returns:
            {channel_id: response} 映射
        """
        channels = await self.queue.get_channels_with_pending()
        results = {}

        for channel_id in channels:
            try:
                response = await self.process_batch(channel_id)
                if response:
                    results[channel_id] = response
            except Exception as e:
                logger.error(f"Error processing batch for {channel_id}: {e}")

        return results

    def _format_messages_for_llm(self, messages: list[QueuedMessage]) -> str:
        """格式化消息供 LLM 处理"""
        lines = []
        for msg in messages:
            time_str = msg.timestamp.strftime("%H:%M")
            priority_marker = "❗" if msg.priority == MessagePriority.HIGH else ""
            lines.append(f"[{time_str}] {msg.author_name}: {msg.content} {priority_marker}")
        return "\n".join(lines)

    def _is_quiet_hours(self) -> bool:
        """检查是否在安静时段"""
        current_hour = datetime.now().hour
        start, end = self.config.quiet_hours

        if start < end:
            return start <= current_hour < end
        else:  # 跨午夜
            return current_hour >= start or current_hour < end


class BatchResponseManager:
    """
    完整的批量响应管理器，整合所有组件。
    """

    def __init__(
        self,
        llm_provider,
        storage_path: Path,
        config: BatchConfig = None,
        bot_names: list[str] = None,
        expertise: list[str] = None,
        send_callback: Callable[[str, str], Awaitable[None]] = None,
    ):
        """
        Args:
            llm_provider: LLM 提供者
            storage_path: 存储路径
            config: 配置
            bot_names: 机器人名字列表
            expertise: 专业领域
            send_callback: 发送消息的回调 async def send(channel_id, content)
        """
        self.config = config or BatchConfig()
        self.bot_names = bot_names or ["nanobot"]

        # 初始化组件
        self.queue = MessageQueue(storage_path)
        self.command_detector = CommandDetector(self.config, self.bot_names)
        self.classifier = MessageClassifier(expertise)
        self.batch_responder = BatchResponder(
            llm_provider=llm_provider,
            queue=self.queue,
            config=self.config,
            bot_name=self.bot_names[0],
            expertise=expertise,
        )

        self.send_callback = send_callback

        # 统计
        self.stats = {
            "commands_processed": 0,
            "messages_queued": 0,
            "batches_sent": 0,
        }

    async def handle_message(
        self,
        message_id: str,
        channel_id: str,
        author_id: str,
        author_name: str,
        content: str,
        is_mentioned: bool = False,
        is_reply_to_bot: bool = False,
        metadata: dict = None,
    ) -> Optional[str]:
        """
        处理收到的消息。

        如果是命令，返回 "IMMEDIATE:{query}" 表示需要立即处理。
        如果是普通消息，加入队列并返回 None。
        """
        # 检测是否是命令
        is_cmd, query = self.command_detector.is_command(
            content, is_mentioned, is_reply_to_bot
        )

        if is_cmd:
            self.stats["commands_processed"] += 1
            return f"IMMEDIATE:{query}"

        # 分类并加入队列
        priority = self.classifier.classify(content)

        queued_msg = QueuedMessage(
            id=message_id,
            channel_id=channel_id,
            author_id=author_id,
            author_name=author_name,
            content=content,
            timestamp=datetime.now(),
            priority=priority,
            metadata=metadata or {},
        )

        await self.queue.add(queued_msg)
        self.stats["messages_queued"] += 1

        return None

    async def run_batch_job(self) -> dict[str, str]:
        """
        运行批处理任务（由 cron 调用）。

        Returns:
            {channel_id: response} 发送的回复
        """
        # 清理过期消息
        expired = await self.queue.cleanup_expired(self.config.message_ttl_hours)
        if expired:
            logger.info(f"Cleaned up {expired} expired messages")

        # 处理所有频道
        responses = await self.batch_responder.process_all_channels()

        # 发送回复
        if self.send_callback:
            for channel_id, response in responses.items():
                try:
                    await self.send_callback(channel_id, response)
                    self.stats["batches_sent"] += 1
                except Exception as e:
                    logger.error(f"Failed to send batch response to {channel_id}: {e}")

        return responses

    def get_stats(self) -> dict:
        """获取统计信息"""
        return self.stats.copy()
