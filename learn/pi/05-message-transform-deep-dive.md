# 跨 Provider 消息转换深度详解

> 学习来源：[@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) — `providers/transform-messages.ts`
> 前置阅读：[03-anthropic-provider-deep-dive.md](./03-anthropic-provider-deep-dive.md)、[04-openai-provider-deep-dive.md](./04-openai-provider-deep-dive.md)
> 核心目标：**理解为什么对话不能简单地"换个模型就跑"，以及框架如何解决跨 Provider 消息兼容性问题**

---

## 为什么需要消息转换？

框架的核心价值之一是 **"同一个 Context 可以跨 Provider 无缝切换"**：

```typescript
const context: Context = {
  messages: [...],  // 包含 Anthropic 模型的历史回复
  tools: [...],
};

// 从 Anthropic 切到 OpenAI，同一个 context
const s1 = stream(anthropicModel, context);
const msg1 = await s1.result();
context.messages.push(msg1);

const s2 = stream(openaiModel, context);  // ← 这里需要消息转换！
```

问题在于：**msg1 是 Anthropic 格式的 AssistantMessage**，包含 Anthropic 特有的结构（thinking signature、tool_use id 格式等）。直接传给 OpenAI 会出错。

---

## 消息差异全景图

### 各 Provider 的 AssistantMessage 差异

```
─── 同一轮对话，不同 Provider 的 assistant 回复结构 ───

Anthropic:
{
  role: "assistant",
  content: [
    { type: "thinking", text: "...", signature: "ErUBCk..." },  ← 独有
    { type: "text", text: "东京天气晴朗" },
    { type: "tool_call",
      toolCallId: "toolu_01ABC...",    ← ID 格式不同
      toolName: "get_weather",
      args: { city: "Tokyo" } }
  ]
}

OpenAI:
{
  role: "assistant",
  content: [
    { type: "text", text: "东京天气晴朗" },
    { type: "tool_call",
      toolCallId: "call_abc123",       ← ID 格式不同
      toolName: "get_weather",
      args: { city: "Tokyo" } }
  ]
  // 没有 thinking block（原生不支持）
}

DeepSeek:
{
  role: "assistant",
  content: [
    { type: "thinking", text: "..." },  ← 有 thinking 但没有 signature
    { type: "text", text: "东京天气晴朗" },
    { type: "tool_call",
      toolCallId: "call_xyz789",
      toolName: "get_weather",
      args: { city: "Tokyo" } }
  ]
}

Google:
{
  role: "assistant",
  content: [
    { type: "text", text: "东京天气晴朗" },
    { type: "tool_call",
      toolCallId: "auto-generated-uuid",  ← 又一种 ID 格式
      toolName: "get_weather",
      args: { city: "Tokyo" } }
  ]
}
```

### ToolResult 消息的差异

```
─── 框架统一格式 ───
{
  role: "tool_result",
  toolCallId: "toolu_01ABC...",    ← 必须匹配之前 tool_call 的 id
  content: '{"temp": 15}',
}

→ 发给 Anthropic: 嵌入 user 角色，toolCallId → tool_use_id
→ 发给 OpenAI:    独立 tool 角色，toolCallId → tool_call_id
→ 发给 Google:    functionResponse 格式，用 toolName 而非 toolCallId 匹配
```

---

## 转换的核心问题

消息转换需要解决的问题可以归纳为五类：

| #  | 问题类别         | 具体表现                                       | 风险等级 |
| -- | ------------ | ------------------------------------------ | ---- |
| 1  | **Thinking 兼容** | Anthropic 有 signature，OpenAI 不认识 thinking    | 高    |
| 2  | **Tool ID 映射**  | `toolu_xxx` vs `call_xxx` vs UUID          | 高    |
| 3  | **孤儿工具调用**     | 有 tool_call 但没有对应的 tool_result              | 高    |
| 4  | **中断消息**       | 流式中断导致的不完整 assistant 消息                    | 中    |
| 5  | **角色格式差异**     | tool_result 在 Anthropic 中是 user 角色          | 低（Provider 层处理）|

> **注意**：问题 5 在 Provider 适配器层已经处理（见 03 和 04 教程），消息转换层只需处理前四个问题。

---

## 第一节：Thinking Block 转换

### 1.1 问题描述

Anthropic 的 Extended Thinking 返回的 thinking block 有两个特殊属性：
1. **signature**：加密签名，后续请求必须原样回传
2. **格式排他性**：只有 Anthropic 模型能理解带 signature 的 thinking

当对话从 Anthropic 切到 OpenAI 时，thinking block 怎么处理？

### 1.2 转换策略

```
场景 A: Anthropic → Anthropic（同 Provider）
  thinking block 原样保留，包括 signature
  ✅ 后续请求验证通过

场景 B: Anthropic → OpenAI（跨 Provider）
  thinking block → 转为普通 text block
  signature 丢弃
  ⚠️ 思考内容以文本形式保留，但失去了"思考"语义

场景 C: Anthropic → DeepSeek（跨 Provider，目标也支持 thinking）
  thinking block → 转为普通 text block
  ⚠️ 即使 DeepSeek 也有 thinking，格式不互通

场景 D: OpenAI → Anthropic（反方向）
  没有 thinking block → 无需处理
```

### 1.3 实现代码

```typescript
function transformThinkingBlocks(
  content: AssistantContentBlock[],
  fromModel: Model,
  toModel: Model
): AssistantContentBlock[] {
  return content.map((block) => {
    if (block.type !== "thinking") return block;

    // 同 Provider 且都支持 reasoning → 保留原样
    if (
      fromModel.provider === toModel.provider &&
      toModel.supportsReasoning
    ) {
      return block;
    }

    // 跨 Provider → 降级为 text
    // 为什么不直接丢弃？因为思考内容为后续对话提供了有价值的上下文
    return {
      type: "text" as const,
      text: `<thinking>\n${block.text}\n</thinking>`,
    };

    // signature 被自然丢弃（text block 没有 signature 字段）
  });
}
```

### 1.4 为什么用 `<thinking>` 标签包裹？

```typescript
// 方案 A: 直接丢弃 thinking
// ❌ 丢失了有价值的推理上下文

// 方案 B: 降级为 text，无标签
// ❌ 模型分不清哪部分是思考、哪部分是回复

// 方案 C: 降级为 text，带 <thinking> 标签  ✅
// ✅ 保留了语义标记，模型能理解这是之前的推理过程
// ✅ 不会被目标模型误认为是自己的 thinking block
```

---

## 第二节：Tool Call ID 映射

### 2.1 问题描述

不同 Provider 生成的 tool_call id 格式完全不同：

```
Anthropic:  "toolu_01XFDUDYJgAACzvnptvVer6u"   （26 字符，toolu_ 前缀）
OpenAI:     "call_abc123def456"                  （16-20 字符，call_ 前缀）
Google:     "a1b2c3d4-e5f6-7890-abcd-ef1234567890" （UUID 格式）
框架自生成:  "tc_001", "tc_002"                    （简单递增）
```

当 tool_call 由 Anthropic 生成，但 tool_result 要发给 OpenAI 时：

```typescript
// Anthropic 返回的 tool_call
{ type: "tool_call", toolCallId: "toolu_01XFD...", toolName: "get_weather", args: {...} }

// 对应的 tool_result
{ role: "tool_result", toolCallId: "toolu_01XFD...", content: "..." }

// 发给 OpenAI 时，tool_call_id 必须匹配
// OpenAI 不在乎 id 的格式，只要 tool_call 和 tool_result 的 id 一致就行
```

### 2.2 关键洞察：大多数情况不需要重映射

```
✅ 大多数 Provider 只要求 tool_call.id === tool_result.tool_call_id
   并不验证 id 的格式

⚠️ 少数 Provider 可能拒绝不认识格式的 id

✅ 框架的策略：默认保留原 id，仅在已知冲突时重映射
```

### 2.3 实现代码

```typescript
// Tool ID 映射表：在一次转换中保持 old → new 的映射
type ToolIdMap = Map<string, string>;

function transformToolCallIds(
  messages: Message[],
  fromModel: Model,
  toModel: Model
): { messages: Message[]; idMap: ToolIdMap } {
  const idMap: ToolIdMap = new Map();

  // 如果目标 Provider 不需要重映射，直接返回
  if (!needsIdRemapping(fromModel, toModel)) {
    return { messages, idMap };
  }

  let counter = 0;
  const transformed = messages.map((msg): Message => {
    if (msg.role === "assistant") {
      return {
        ...msg,
        content: msg.content.map((block): AssistantContentBlock => {
          if (block.type !== "tool_call") return block;

          const newId = generateToolCallId(toModel, ++counter);
          idMap.set(block.toolCallId, newId);

          return { ...block, toolCallId: newId };
        }),
      };
    }

    if (msg.role === "tool_result") {
      const newId = idMap.get(msg.toolCallId);
      if (newId) {
        return { ...msg, toolCallId: newId };
      }
    }

    return msg;
  });

  return { messages: transformed, idMap };
}

function generateToolCallId(model: Model, index: number): string {
  switch (model.provider) {
    case "anthropic":
      return `toolu_converted_${String(index).padStart(4, "0")}`;
    case "openai":
    case "groq":
    case "xai":
      return `call_converted_${String(index).padStart(4, "0")}`;
    default:
      return `tc_${String(index).padStart(4, "0")}`;
  }
}

function needsIdRemapping(from: Model, to: Model): boolean {
  // 同 Provider 不需要
  if (from.provider === to.provider) return false;

  // 已知需要重映射的组合
  // （实际框架会维护一个兼容性矩阵）
  return false; // 默认不重映射，大多数 Provider 都接受任意格式
}
```

### 2.4 ID 映射的一致性保证

最关键的约束：**tool_call 和对应的 tool_result 必须使用相同的 id**。

```
原始消息序列:
  assistant: tool_call(id="toolu_01ABC", name="get_weather")
  tool_result: toolCallId="toolu_01ABC", content="15°C"

转换后（如果需要重映射）:
  assistant: tool_call(id="call_converted_0001", name="get_weather")
  tool_result: toolCallId="call_converted_0001", content="15°C"
                         ↑ 必须同步更新！
```

---

## 第三节：孤儿工具调用处理

### 3.1 问题描述

"孤儿工具调用"是指 assistant 消息中有 `tool_call`，但后续消息中没有对应的 `tool_result`。

这通常发生在：
1. **用户中断**：流式输出被 abort，模型输出了 tool_call 但用户没有执行工具
2. **错误中断**：工具执行失败，没有返回结果就继续了对话
3. **手动编辑**：用户手动修改了对话历史

### 3.2 为什么孤儿工具调用是致命的？

```
─── 发送给 Anthropic ───
messages: [
  { role: "user", content: "查天气" },
  { role: "assistant", content: [
    { type: "tool_call", toolCallId: "toolu_01", toolName: "get_weather", args: {...} }
  ]},
  { role: "user", content: "算了，直接告诉我" },  // ← 没有 tool_result！
]

→ Anthropic API 返回错误:
  "messages: tool_use ids were provided without tool results"

─── 发送给 OpenAI ───
→ OpenAI API 返回错误:
  "messages: tool_calls must be followed by tool messages"
```

**所有主流 Provider 都要求 tool_call 必须有对应的 tool_result**。

### 3.3 修复策略

```
策略 A: 插入合成的 tool_result（推荐）
  → 在孤儿 tool_call 后面插入一条 "工具执行被取消" 的结果

策略 B: 删除孤儿 tool_call
  → 从 assistant 消息中移除没有对应结果的 tool_call block
  → 风险：如果 assistant 消息只有 tool_call，整条消息会变空

策略 C: 删除整个 assistant 消息
  → 最激进，但最安全
```

### 3.4 实现代码

```typescript
function fixOrphanToolCalls(messages: Message[]): Message[] {
  const result: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    result.push(msg);

    // 只关心 assistant 消息中的 tool_call
    if (msg.role !== "assistant") continue;

    const toolCalls = msg.content.filter(b => b.type === "tool_call");
    if (toolCalls.length === 0) continue;

    // 收集后续消息中已有的 tool_result id
    const existingResultIds = new Set<string>();
    for (let j = i + 1; j < messages.length; j++) {
      if (messages[j].role === "tool_result") {
        existingResultIds.add(messages[j].toolCallId);
      }
      // tool_result 必须紧跟在 assistant 之后（可能有多条）
      // 遇到非 tool_result 消息就停止查找
      if (messages[j].role !== "tool_result") break;
    }

    // 为每个孤儿 tool_call 插入合成的 tool_result
    for (const toolCall of toolCalls) {
      if (toolCall.type === "tool_call" && !existingResultIds.has(toolCall.toolCallId)) {
        // 在下一条非 tool_result 消息之前插入
        const syntheticResult: ToolResultMessage = {
          role: "tool_result",
          toolCallId: toolCall.toolCallId,
          content: "Tool execution was cancelled or interrupted.",
          isError: true,
        };
        // 找到插入位置
        insertAfterToolResults(result, syntheticResult);
      }
    }
  }

  return result;
}

function insertAfterToolResults(
  messages: Message[],
  toolResult: ToolResultMessage
) {
  // 从末尾向前找，找到最后一个 tool_result 后面插入
  // 如果没有 tool_result，就插在当前 assistant 后面
  let insertIndex = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "tool_result") {
      insertIndex = i + 1;
      break;
    }
    if (messages[i].role === "assistant") {
      insertIndex = i + 1;
      break;
    }
  }
  messages.splice(insertIndex, 0, toolResult);
}
```

### 3.5 示例：修复前后对比

```
─── 修复前 ───
messages: [
  { role: "user", content: "查天气和时间" },
  { role: "assistant", content: [
    tool_call(id="tc_1", name="get_weather", args={city:"Tokyo"}),
    tool_call(id="tc_2", name="get_time",    args={city:"Tokyo"}),
  ]},
  tool_result(id="tc_1", content='{"temp":15}'),     ← 只有 tc_1 的结果
  { role: "user", content: "时间不用了，天气怎样？" },  ← tc_2 没有结果！
]

─── 修复后 ───
messages: [
  { role: "user", content: "查天气和时间" },
  { role: "assistant", content: [
    tool_call(id="tc_1", name="get_weather", args={city:"Tokyo"}),
    tool_call(id="tc_2", name="get_time",    args={city:"Tokyo"}),
  ]},
  tool_result(id="tc_1", content='{"temp":15}'),
  tool_result(id="tc_2", content="Tool execution was cancelled.",  ← 合成插入
              isError=true),
  { role: "user", content: "时间不用了，天气怎样？" },
]
```

---

## 第四节：中断消息处理

### 4.1 问题描述

当流式输出中途被中断（网络错误、用户取消、超时），可能产生不完整的 assistant 消息：

```typescript
// 正常的 assistant 消息
{ role: "assistant", content: [{ type: "text", text: "完整的回答..." }] }

// 中断的消息——可能有这些问题：
{ role: "assistant", content: [] }          // 空内容
{ role: "assistant", content: [
  { type: "text", text: "" }               // 空文本
] }
{ role: "assistant", content: [
  { type: "tool_call", toolCallId: "tc_1",
    toolName: "get_weather",
    args: '{"ci' }                          // 参数 JSON 不完整！
] }
```

### 4.2 修复策略

```typescript
function fixBrokenAssistantMessages(messages: Message[]): Message[] {
  return messages.reduce<Message[]>((result, msg, index) => {
    if (msg.role !== "assistant") {
      result.push(msg);
      return result;
    }

    // 检查 1: 空消息 → 跳过
    if (msg.content.length === 0) {
      return result;  // 直接丢弃
    }

    // 检查 2: 所有 block 都是空的 → 跳过
    const hasContent = msg.content.some((block) => {
      if (block.type === "text") return block.text.trim().length > 0;
      if (block.type === "thinking") return block.text.trim().length > 0;
      if (block.type === "tool_call") return true;  // tool_call 总是有意义的
      return false;
    });
    if (!hasContent) return result;

    // 检查 3: 修复不完整的 tool_call 参数
    const fixedContent = msg.content.map((block): AssistantContentBlock => {
      if (block.type !== "tool_call") return block;

      // 参数是字符串说明 JSON 解析失败（不完整）
      if (typeof block.args === "string") {
        try {
          // 尝试用 partial JSON 解析器恢复
          block.args = parsePartialJson(block.args);
        } catch {
          // 实在解析不了 → 用空对象代替
          block.args = {};
        }
      }

      return block;
    });

    result.push({ ...msg, content: fixedContent });
    return result;
  }, []);
}
```

### 4.3 Partial JSON 解析

框架使用 `partial-json` 库来恢复不完整的 JSON：

```typescript
import { parse as parsePartialJson } from "partial-json";

// 正常 JSON
parsePartialJson('{"city":"Tokyo"}')     // → { city: "Tokyo" }

// 不完整 JSON — 自动补全
parsePartialJson('{"city":"Tok')          // → { city: "Tok" }
parsePartialJson('{"city":')              // → { city: null }
parsePartialJson('{"ci')                  // → {}
parsePartialJson('')                      // → {}
```

> 这个能力在流式处理中也很有用：消费者可以在工具参数还没完全到达时就开始预览。

---

## 第五节：完整转换管道

### 5.1 管道架构

```
原始 messages
     │
     ▼
 ① fixBrokenAssistantMessages    ← 修复中断消息
     │
     ▼
 ② fixOrphanToolCalls            ← 补齐缺失的 tool_result
     │
     ▼
 ③ transformThinkingBlocks       ← 处理 thinking 兼容性
     │
     ▼
 ④ transformToolCallIds          ← 重映射 tool call id（如需）
     │
     ▼
 转换完成的 messages → 传入目标 Provider 的 convertMessages
```

### 5.2 完整实现

```typescript
export function transformMessages(
  messages: Message[],
  fromModel: Model,
  toModel: Model
): Message[] {
  // 同 Provider 同模型 → 无需转换
  if (fromModel.id === toModel.id && fromModel.provider === toModel.provider) {
    return messages;
  }

  let result = [...messages]; // 浅拷贝，不修改原数组

  // ① 修复中断消息
  result = fixBrokenAssistantMessages(result);

  // ② 补齐孤儿工具调用
  result = fixOrphanToolCalls(result);

  // ③ 转换 thinking blocks
  result = result.map((msg): Message => {
    if (msg.role !== "assistant") return msg;

    return {
      ...msg,
      content: transformThinkingBlocks(msg.content, fromModel, toModel),
    };
  });

  // ④ 重映射 tool call id（通常不需要）
  const { messages: remapped } = transformToolCallIds(result, fromModel, toModel);
  result = remapped;

  return result;
}
```

### 5.3 调用时机

转换发生在哪里？**在统一入口 `stream.ts` 中**，在调用 Provider 之前：

```typescript
// stream.ts（增强版）

export function stream(
  model: Model,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const provider = getApiProvider(model.api);

  // 如果 context 中有来自其他模型的历史消息，进行转换
  const transformedContext = {
    ...context,
    messages: transformMessages(
      context.messages,
      context.lastModel ?? model,  // 上一个模型（如果有）
      model,                        // 目标模型
    ),
  };

  return provider.stream(model, transformedContext, options);
}
```

---

## 第六节：实战场景

### 6.1 场景一：Anthropic → OpenAI 切换

```typescript
// 第一轮：用 Anthropic 模型
const claudeModel = getModel("anthropic", "claude-sonnet-4-5-20250929");
const context: Context = {
  systemPrompt: "你是天气助手。",
  messages: [{ role: "user", content: "东京天气？" }],
  tools: [weatherTool],
};

const s1 = stream(claudeModel, context, { thinkingLevel: "medium" });
const msg1 = await s1.result();
context.messages.push(msg1);

// msg1.content 可能是:
// [
//   { type: "thinking", text: "用户想知道天气...", signature: "ErUBCk..." },
//   { type: "tool_call", toolCallId: "toolu_01ABC", toolName: "get_weather", args: {city:"Tokyo"} }
// ]

// 执行工具
context.messages.push({
  role: "tool_result",
  toolCallId: "toolu_01ABC",
  content: '{"temp": 15, "condition": "sunny"}',
});

// 第二轮：获取最终回答
const s2 = stream(claudeModel, context);
const msg2 = await s2.result();
context.messages.push(msg2);

// ==========================================
// 第三轮：切换到 OpenAI！
// ==========================================
const gptModel = getModel("openai", "gpt-4o");

// 框架自动执行 transformMessages:
// 1. thinking block → <thinking>...</thinking> 文本
// 2. toolu_01ABC id → 保留（OpenAI 接受任意格式）
// 3. 检查无孤儿 tool_call → 通过（tc_1 有 tool_result）

const s3 = stream(gptModel, {
  ...context,
  messages: [...context.messages, { role: "user", content: "明天呢？" }],
});

for await (const event of s3) {
  if (event.type === "text_delta") process.stdout.write(event.text);
}
// GPT-4o 基于之前的对话历史（包括 Anthropic 的回复）继续对话
```

### 6.2 场景二：中断恢复

```typescript
const model = getModel("anthropic", "claude-sonnet-4-5-20250929");

// 第一轮请求被中断
const abortController = new AbortController();
const s1 = stream(model, context, { signal: abortController.signal });

setTimeout(() => abortController.abort(), 500); // 500ms 后中断

let partialMessage: AssistantMessage | null = null;
try {
  for await (const event of s1) { /* ... */ }
  partialMessage = await s1.result();
} catch {
  // 中断可能导致不完整的消息
}

// 如果拿到了部分消息，加入历史
if (partialMessage) {
  context.messages.push(partialMessage);
  // partialMessage 可能有不完整的 tool_call args
}

// 重试：框架的 transformMessages 会自动修复
// - 不完整的 tool_call args → 用 partial-json 恢复
// - 孤儿 tool_call → 插入合成 tool_result
const s2 = stream(model, context);  // ← 自动修复后重试
```

### 6.3 场景三：多 Provider 轮转对话

```typescript
const models = [
  getModel("anthropic", "claude-sonnet-4-5-20250929"),
  getModel("openai", "gpt-4o"),
  getModel("deepseek", "deepseek-chat"),
];

const context: Context = {
  messages: [{ role: "user", content: "讲一个关于AI的故事" }],
  tools: [],
};

// 每轮换一个模型继续故事
for (let round = 0; round < 6; round++) {
  const model = models[round % models.length];
  console.log(`\n--- Round ${round + 1}: ${model.name} ---`);

  const s = stream(model, context);

  for await (const event of s) {
    if (event.type === "text_delta") process.stdout.write(event.text);
  }

  const msg = await s.result();
  context.messages.push(msg);
  context.messages.push({
    role: "user",
    content: "继续",
  });

  // 每轮切换时 transformMessages 自动处理:
  // - Claude 的 thinking → 降级为 text（给 GPT/DeepSeek）
  // - GPT 的消息 → 原样保留（给 DeepSeek）
  // - DeepSeek 的 thinking → 降级为 text（给 Claude）
}
```

---

## 转换规则速查表

| 源 Provider    | 目标 Provider  | Thinking          | Tool ID | 孤儿修复 |
| ------------ | ----------- | ----------------- | ------- | ---- |
| Anthropic    | Anthropic   | 保留（含 signature）   | 保留      | 是    |
| Anthropic    | OpenAI      | → `<thinking>` 文本 | 保留      | 是    |
| Anthropic    | Google      | → `<thinking>` 文本 | 可能重映射   | 是    |
| Anthropic    | DeepSeek    | → `<thinking>` 文本 | 保留      | 是    |
| OpenAI       | Anthropic   | 无需处理              | 保留      | 是    |
| OpenAI       | OpenAI      | 无需处理              | 保留      | 是    |
| DeepSeek     | Anthropic   | → `<thinking>` 文本 | 保留      | 是    |
| DeepSeek     | OpenAI      | → `<thinking>` 文本 | 保留      | 是    |

---

## 关键收获

| 要点                     | 说明                                        |
| ---------------------- | ----------------------------------------- |
| **转换是必要的安全网**          | 没有转换，跨 Provider 切换会因格式差异直接报错               |
| **Thinking 不可跨 Provider** | signature 机制决定了 thinking 只能同 Provider 回放    |
| **孤儿工具调用是最常见的 bug**    | 中断、取消、手动编辑都可能产生，所有 Provider 都不接受           |
| **转换管道是有序的**           | 必须先修复再转换，否则可能在不完整数据上做无效转换                 |
| **大多数 Tool ID 不需要重映射** | Provider 通常只要求配对一致，不验证格式                   |
| **Partial JSON 是救命稻草**  | 让不完整的工具参数也能恢复为可用对象                        |

---

> **系列完结**：至此，你已经完整理解了 pi-ai 框架从核心类型、EventStream、Provider 适配（Anthropic/OpenAI）到跨 Provider 消息转换的全链路实现。
