"""
Discord Channel with Batch Response Support

Implements the "busy expert" pattern for Discord:
- Immediate response for commands and @mentions
- Batch processing for regular messages via scheduled job
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
from pathlib import Path

try:
    import discord
    from discord import Intents
    from discord.ext import tasks
    HAS_DISCORD = True
except ImportError:
    HAS_DISCORD = False

from nanobot.agent.memory_manager import MemoryManager, MemoryContext, ChatType
from nanobot.agent.batch_responder import (
    BatchResponseManager,
    BatchConfig,
    MessagePriority,
)

logger = logging.getLogger(__name__)


class DiscordBatchChannel:
    """
    Discord 频道适配器，支持批量响应模式。

    工作流程：
    1. 命令消息 (@mention, /ask, !bot) → 立即响应
    2. 普通消息 → 加入队列
    3. 定时任务 → 批量处理队列并回复
    """

    def __init__(
        self,
        bot_token: str,
        llm_provider,
        memory_manager: MemoryManager,
        workspace: Path,
        config: BatchConfig = None,
        bot_names: list[str] = None,
        expertise: list[str] = None,
        batch_interval_minutes: int = 5,
    ):
        """
        初始化 Discord 批量响应频道。

        Args:
            bot_token: Discord bot token
            llm_provider: LLM 提供者（用于即时响应和批量响应）
            memory_manager: 记忆管理器
            workspace: 工作空间路径
            config: 批量响应配置
            bot_names: 机器人名字列表
            expertise: 专业领域
            batch_interval_minutes: 批处理间隔（分钟）
        """
        if not HAS_DISCORD:
            raise ImportError("discord.py required: pip install discord.py")

        self.token = bot_token
        self.llm = llm_provider
        self.memory_manager = memory_manager
        self.workspace = workspace
        self.batch_interval = batch_interval_minutes
        self.bot_names = bot_names or ["nanobot"]

        # 配置
        self.config = config or BatchConfig(
            batch_interval_minutes=batch_interval_minutes
        )

        # 初始化 Discord client
        intents = Intents.default()
        intents.message_content = True
        intents.dm_messages = True
        intents.guild_messages = True

        self.client = discord.Client(intents=intents)

        # 初始化批量响应管理器
        self.batch_manager = BatchResponseManager(
            llm_provider=llm_provider,
            storage_path=workspace / "batch_queue",
            config=self.config,
            bot_names=bot_names,
            expertise=expertise,
            send_callback=self._send_message,
        )

        self._setup_handlers()
        self._setup_batch_task()

    def _setup_handlers(self):
        """设置 Discord 事件处理器"""

        @self.client.event
        async def on_ready():
            logger.info(f"Discord bot ready: {self.client.user}")
            # 启动批处理任务
            if not self.batch_task.is_running():
                self.batch_task.start()

        @self.client.event
        async def on_message(message: discord.Message):
            await self._handle_message(message)

    def _setup_batch_task(self):
        """设置定时批处理任务"""

        @tasks.loop(minutes=self.batch_interval)
        async def batch_process():
            """定时运行批处理"""
            logger.info("Running batch process job...")
            try:
                responses = await self.batch_manager.run_batch_job()
                if responses:
                    logger.info(f"Sent batch responses to {len(responses)} channels")
            except Exception as e:
                logger.error(f"Batch process error: {e}")

        self.batch_task = batch_process

    async def _handle_message(self, message: discord.Message):
        """处理收到的消息"""
        # 忽略机器人消息
        if message.author.bot:
            return

        # 确定是否是 DM
        is_dm = isinstance(message.channel, discord.DMChannel)

        # DM 总是立即响应
        if is_dm:
            await self._handle_immediate(message, message.content)
            return

        # 群聊：检查是否需要立即响应
        is_mentioned = self.client.user in message.mentions
        is_reply_to_bot = (
            message.reference and
            message.reference.resolved and
            message.reference.resolved.author == self.client.user
        )

        # 清理消息内容（移除 mention）
        content = message.content
        if is_mentioned:
            content = content.replace(f"<@{self.client.user.id}>", "").strip()
            content = content.replace(f"<@!{self.client.user.id}>", "").strip()

        # 让 batch_manager 决定处理方式
        result = await self.batch_manager.handle_message(
            message_id=str(message.id),
            channel_id=self._get_channel_id(message),
            author_id=str(message.author.id),
            author_name=message.author.display_name,
            content=content,
            is_mentioned=is_mentioned,
            is_reply_to_bot=is_reply_to_bot,
            metadata={
                "guild_id": str(message.guild.id) if message.guild else None,
                "channel_name": getattr(message.channel, "name", "DM"),
            }
        )

        if result and result.startswith("IMMEDIATE:"):
            # 需要立即响应
            query = result[10:]  # 移除 "IMMEDIATE:" 前缀
            await self._handle_immediate(message, query)
        else:
            # 已加入队列，可以添加一个反应表示收到
            try:
                await message.add_reaction("📝")  # 表示"已记录"
            except:
                pass

    async def _handle_immediate(self, message: discord.Message, query: str):
        """处理需要立即响应的消息"""
        is_dm = isinstance(message.channel, discord.DMChannel)

        # 构建记忆上下文
        if is_dm:
            chat_type = ChatType.PRIVATE
            group_id = None
        else:
            chat_type = ChatType.GROUP
            group_id = f"{message.guild.id}_{message.channel.id}"

        mem_ctx = MemoryContext(
            user_id=str(message.author.id),
            group_id=group_id,
            chat_type=chat_type,
            user_name=message.author.display_name,
        )

        # 获取记忆上下文
        memory_content = self.memory_manager.get_context_for_chat(mem_ctx)

        # 获取最近消息作为对话上下文
        recent_messages = []
        async for msg in message.channel.history(limit=10):
            if msg.id != message.id:
                recent_messages.append({
                    "role": "assistant" if msg.author == self.client.user else "user",
                    "content": f"[{msg.author.display_name}]: {msg.content}"
                })
        recent_messages.reverse()

        # 构建 prompt
        system_prompt = f"""You are {self.bot_names[0]}, a helpful AI assistant.

{memory_content if memory_content else ""}

Respond helpfully and concisely. Use the same language as the user."""

        messages = [
            {"role": "system", "content": system_prompt},
            *recent_messages,
            {"role": "user", "content": query},
        ]

        # 显示"正在输入"
        async with message.channel.typing():
            try:
                response = await self.llm.complete(
                    messages=messages,
                    max_tokens=1000,
                    temperature=0.7,
                )

                # 发送回复
                await self._send_response(message, response)

            except Exception as e:
                logger.error(f"Error generating response: {e}")
                await message.reply("抱歉，处理你的请求时出错了。请稍后再试。")

    async def _send_response(self, original_message: discord.Message, content: str):
        """发送回复，处理长消息"""
        # Discord 消息限制 2000 字符
        chunks = self._split_message(content, 2000)

        for i, chunk in enumerate(chunks):
            if i == 0:
                await original_message.reply(chunk)
            else:
                await original_message.channel.send(chunk)

    async def _send_message(self, channel_id: str, content: str):
        """发送消息到指定频道（用于批量回复）"""
        try:
            # 解析 channel_id
            if channel_id.startswith("dm_"):
                user_id = int(channel_id[3:])
                user = await self.client.fetch_user(user_id)
                channel = await user.create_dm()
            else:
                # guild_channel 格式
                parts = channel_id.split("_")
                discord_channel_id = int(parts[-1])
                channel = self.client.get_channel(discord_channel_id)
                if not channel:
                    channel = await self.client.fetch_channel(discord_channel_id)

            if channel:
                chunks = self._split_message(content, 2000)
                for chunk in chunks:
                    await channel.send(chunk)

        except Exception as e:
            logger.error(f"Failed to send message to {channel_id}: {e}")
            raise

    def _get_channel_id(self, message: discord.Message) -> str:
        """获取统一的频道 ID"""
        if isinstance(message.channel, discord.DMChannel):
            return f"dm_{message.author.id}"
        return f"{message.guild.id}_{message.channel.id}"

    @staticmethod
    def _split_message(content: str, max_length: int = 2000) -> list[str]:
        """分割长消息"""
        if len(content) <= max_length:
            return [content]

        chunks = []
        while content:
            if len(content) <= max_length:
                chunks.append(content)
                break

            # 找合适的分割点
            split_at = content.rfind("\n", 0, max_length)
            if split_at == -1:
                split_at = content.rfind(" ", 0, max_length)
            if split_at == -1:
                split_at = max_length

            chunks.append(content[:split_at])
            content = content[split_at:].lstrip()

        return chunks

    async def start(self):
        """启动 Discord bot"""
        await self.client.start(self.token)

    async def stop(self):
        """停止 Discord bot"""
        if self.batch_task.is_running():
            self.batch_task.cancel()
        await self.client.close()

    def run(self):
        """运行 Discord bot（阻塞）"""
        self.client.run(self.token)


# ============================================================
# 使用示例和 CLI 命令
# ============================================================

def create_discord_bot(
    token: str,
    llm_provider,
    workspace: Path,
    batch_interval: int = 5,
) -> DiscordBatchChannel:
    """
    创建配置好的 Discord 机器人。

    Args:
        token: Discord bot token
        llm_provider: LLM 提供者
        workspace: 工作空间路径
        batch_interval: 批处理间隔（分钟）
    """
    memory_manager = MemoryManager(workspace)

    config = BatchConfig(
        command_prefixes=["!", "/", "?"],
        command_triggers=["ask", "问", "help", "帮", "bot"],
        batch_interval_minutes=batch_interval,
        min_messages_to_respond=1,
        quiet_hours=(23, 7),  # 晚上 11 点到早上 7 点不发批量回复
    )

    return DiscordBatchChannel(
        bot_token=token,
        llm_provider=llm_provider,
        memory_manager=memory_manager,
        workspace=workspace,
        config=config,
        bot_names=["nanobot", "小助手", "bot"],
        expertise=["Python", "编程", "技术问题"],
        batch_interval_minutes=batch_interval,
    )


# CLI 入口点示例
if __name__ == "__main__":
    import os
    import sys

    # 这是一个示例，实际使用时需要配置 LLM provider
    print("Discord Batch Bot")
    print("=" * 40)
    print()
    print("Usage:")
    print("  from nanobot.channels.discord_batch import create_discord_bot")
    print()
    print("  bot = create_discord_bot(")
    print("      token='YOUR_DISCORD_TOKEN',")
    print("      llm_provider=your_llm,")
    print("      workspace=Path('~/.nanobot'),")
    print("      batch_interval=5,  # 分钟")
    print("  )")
    print("  bot.run()")
    print()
    print("Features:")
    print("  - Immediate response: @mention, !ask, /help, ?问")
    print("  - Batch response: Every N minutes for regular messages")
    print("  - Memory isolation: Per-user and per-group")
