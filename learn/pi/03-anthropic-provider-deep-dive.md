# Anthropic Provider 深度实现详解

> 学习来源：[@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) — `providers/anthropic.ts` (26KB)
> 前置阅读：[01-framework-tutorial.md](./01-framework-tutorial.md)（第一至三步：核心类型、EventStream、API 注册表）
> 核心目标：**逐行拆解 Anthropic Messages API 的流式适配器如何与 EventStream 和模型注册表协作**

---

## 整体定位

```
用户调用 stream(model, context)
       │
       ▼
  API Registry 根据 model.api === "anthropic-messages" 找到本 Provider
       │
       ▼
  streamAnthropic(model, context, options)
       │
       ├── 1. 消息格式转换  Context → Anthropic.MessageCreateParams
       ├── 2. 调用 Anthropic SDK 创建流式请求
       ├── 3. 解析 SSE 事件 → 推送到 EventStream
       └── 4. 关闭 EventStream，交付 AssistantMessage
```

---

## 第一节：模型注册——如何让框架"认识" Anthropic

### 1.1 模型定义

模型注册表 (`models.ts`) 中的每一条 Anthropic 模型都必须声明 `api: "anthropic-messages"`，这是 API Registry 路由的唯一依据。

```typescript
// models.ts（节选）

const anthropicModels: Model[] = [
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    api: "anthropic-messages",        // ← 关键：决定路由到哪个 Provider
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    maxInputTokens: 200_000,
    maxOutputTokens: 8_192,
    supportsReasoning: true,
    pricing: {
      inputPerMillion: 3,
      outputPerMillion: 15,
    },
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    api: "anthropic-messages",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    maxInputTokens: 200_000,
    maxOutputTokens: 32_000,
    supportsReasoning: true,
    pricing: {
      inputPerMillion: 15,
      outputPerMillion: 75,
    },
  },
  // AWS Bedrock 托管的 Claude 模型也走这个 api 协议
  {
    id: "anthropic.claude-sonnet-4-5-20250929-v1:0",
    name: "Claude Sonnet 4.5 (Bedrock)",
    api: "anthropic-messages",        // ← 同样的协议，不同的 baseUrl
    provider: "aws-bedrock",
    baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
    maxInputTokens: 200_000,
    maxOutputTokens: 8_192,
    supportsReasoning: true,
    pricing: {
      inputPerMillion: 3,
      outputPerMillion: 15,
    },
  },
];
```

### 1.2 Provider 注册

Provider 在模块加载时通过副作用注册到全局 Registry：

```typescript
// providers/anthropic.ts（底部）

import { registerApiProvider } from "../api-registry";

registerApiProvider({
  api: "anthropic-messages",          // ← 与模型定义中的 api 字段匹配
  stream: streamAnthropic,            // ← 核心流式函数
});
```

### 1.3 注册时序：副作用导入链

```typescript
// providers/register-builtins.ts — 在 index.ts 中被副作用导入
import "./anthropic";          // ← 触发 registerApiProvider
import "./openai-completions";
import "./google";
// ...

// index.ts
import "./providers/register-builtins";  // ← 确保所有 Provider 在使用前已注册
export { stream, complete } from "./stream";
```

> **关键细节**：副作用导入 (`import "./xxx"`) 不引入任何变量，只是为了执行模块顶层代码。这是注册表模式在 TypeScript 中的标准实践。如果你忘记导入某个 Provider 模块，`stream()` 时会抛出 `No provider registered for API: xxx`。

---

## 第二节：消息格式转换——框架通用格式 → Anthropic 格式

这是 Provider 适配器最核心的工作。每家 LLM API 的消息结构都不一样，Provider 的职责就是做这层"翻译"。

### 2.1 消息角色映射

| 框架统一格式 (pi-ai)        | Anthropic Messages API                     | 说明                  |
| --------------------- | ------------------------------------------ | ------------------- |
| `role: "user"`        | `role: "user"`                             | 直接对应                |
| `role: "assistant"`   | `role: "assistant"`                        | 直接对应                |
| `role: "tool_result"` | `role: "user"` + `type: "tool_result"` 内容块 | **关键差异：嵌入 user 角色** |

### 2.2 完整消息转换函数

```typescript
import Anthropic from "@anthropic-ai/sdk";

function convertMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((msg): Anthropic.MessageParam => {
    switch (msg.role) {

      // ---- User Message ----
      case "user":
        return {
          role: "user" as const,
          content: typeof msg.content === "string"
            ? msg.content                         // 纯文本直接传
            : msg.content.map(convertContentBlock), // 多模态内容需逐块转换
        };

      // ---- Assistant Message ----
      case "assistant":
        return {
          role: "assistant" as const,
          content: msg.content.map(convertAssistantBlock),
        };

      // ---- Tool Result ⚠️ 最大差异点 ----
      case "tool_result":
        // Anthropic 没有独立的 tool 角色！
        // tool_result 必须嵌入 user 消息中
        return {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: msg.toolCallId,     // 对应之前 tool_use 的 id
              content: msg.content,
              is_error: msg.isError,
            },
          ],
        };
    }
  });
}
```

### 2.3 内容块转换——细节在魔鬼里

```typescript
// User 消息的内容块
function convertContentBlock(block: ContentBlock): Anthropic.ContentBlockParam {
  switch (block.type) {
    case "text":
      return { type: "text" as const, text: block.text };

    case "image":
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: block.mediaType as Anthropic.Base64ImageSource["media_type"],
          // ↑ Anthropic 只接受 "image/jpeg" | "image/png" | "image/gif" | "image/webp"
          data: block.data,
        },
      };
  }
}

// Assistant 消息的内容块
function convertAssistantBlock(
  block: AssistantContentBlock
): Anthropic.ContentBlock {
  switch (block.type) {
    case "text":
      return { type: "text" as const, text: block.text };

    case "thinking":
      // Anthropic 的 extended thinking 需要特殊处理
      return {
        type: "thinking" as const,
        thinking: block.text,
        // 注意：实际 SDK 还需要 signature 字段用于后续请求验证
        // 这里简化展示，实际实现需保留原始 signature
      };

    case "tool_call":
      // 框架叫 "tool_call"，Anthropic 叫 "tool_use"
      return {
        type: "tool_use" as const,
        id: block.toolCallId,        // Anthropic 格式: "toolu_01ABC..."
        name: block.toolName,
        input: block.args,           // 已解析的 JSON 对象
      };
  }
}
```

### 2.4 工具定义转换

```typescript
function convertTools(tools: Tool[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    // ↑ Anthropic 要求 input_schema 是标准 JSON Schema
    //   框架的 Tool.parameters 本身就存的 JSON Schema，所以直接传
  }));
}
```

### 2.5 System Prompt 处理

Anthropic 的一个特殊之处：`system` 不在 `messages` 数组里，而是请求体的顶层字段。

```typescript
// 构造请求参数时
const params: Anthropic.MessageCreateParams = {
  model: model.id,
  max_tokens: options.maxTokens ?? model.maxOutputTokens,
  temperature: options.temperature,
  system: context.systemPrompt,       // ← 顶层字段，不是消息
  messages: convertMessages(context.messages),
  tools: context.tools.length > 0 ? convertTools(context.tools) : undefined,
  stream: true,
};
```

> **对比**：OpenAI 把 system prompt 放在 messages 数组的第一条 `{ role: "system", content: "..." }`。

---

## 第三节：SSE 事件流解析——Anthropic → EventStream

这是 Provider 的核心引擎：把 Anthropic SDK 返回的流式事件**逐个翻译**为框架统一的 `StreamEvent`，推入 `EventStream`。

### 3.1 Anthropic SSE 事件生命周期

```
message_start          ← 消息开始，包含 input_tokens
  │
  ├── content_block_start (type: "text")
  │     ├── content_block_delta (type: "text_delta")   ← 重复多次
  │     └── content_block_stop
  │
  ├── content_block_start (type: "thinking")
  │     ├── content_block_delta (type: "thinking_delta") ← 重复多次
  │     └── content_block_stop
  │
  ├── content_block_start (type: "tool_use")
  │     ├── content_block_delta (type: "input_json_delta") ← 重复多次
  │     └── content_block_stop
  │
  └── message_delta     ← 消息结束，包含 output_tokens + stop_reason
        message_stop
```

### 3.2 完整流式处理函数

```typescript
export function streamAnthropic(
  model: Model,
  context: Context,
  options: StreamOptions = {}
): EventStream<StreamEvent, AssistantMessage> {
  const eventStream = new EventStream<StreamEvent, AssistantMessage>();

  // 立即返回 EventStream，异步填充数据
  // 这是"生产者-消费者"模式的关键：先给消费者一个"管道"
  (async () => {
    try {
      // ---- Step 1: 创建 SDK 客户端 ----
      const client = new Anthropic({
        apiKey: getApiKey("anthropic", model),
        baseURL: model.baseUrl,
      });

      // ---- Step 2: 构造请求参数 ----
      const params: Anthropic.MessageCreateParams = {
        model: model.id,
        max_tokens: options.maxTokens ?? model.maxOutputTokens,
        temperature: options.temperature,
        system: context.systemPrompt,
        messages: convertMessages(context.messages),
        tools: context.tools.length > 0
          ? convertTools(context.tools)
          : undefined,
        stream: true,
      };

      // 如果模型支持 thinking，添加 thinking 参数
      if (model.supportsReasoning && options.thinkingLevel) {
        params.thinking = {
          type: "enabled",
          budget_tokens: getThinkingBudget(options.thinkingLevel),
        };
      }

      // ---- Step 3: 发起流式请求 ----
      const response = await client.messages.create(params, {
        signal: options.signal,  // 支持 AbortController 取消
      });

      // ---- Step 4: 推送起始事件 ----
      eventStream.push({ type: "start" });

      // ---- Step 5: 逐事件解析并翻译 ----
      let inputTokens = 0;
      let outputTokens = 0;
      const contentBlocks: AssistantContentBlock[] = [];
      let currentToolCallArgs = "";  // 累积工具参数的 JSON 片段

      for await (const event of response) {
        // 检查是否被取消
        if (options.signal?.aborted) break;

        switch (event.type) {
          // ── 消息级事件 ──
          case "message_start":
            inputTokens = event.message.usage.input_tokens;
            break;

          // ── 内容块开始 ──
          case "content_block_start":
            handleBlockStart(event, contentBlocks, eventStream);
            currentToolCallArgs = "";  // 重置工具参数累积器
            break;

          // ── 内容块增量 ──
          case "content_block_delta":
            currentToolCallArgs = handleBlockDelta(
              event, contentBlocks, eventStream, currentToolCallArgs
            );
            break;

          // ── 内容块结束 ──
          case "content_block_stop":
            handleBlockStop(contentBlocks, eventStream, currentToolCallArgs);
            break;

          // ── 消息增量（结尾）──
          case "message_delta":
            outputTokens = event.usage.output_tokens;
            break;
        }
      }

      // ---- Step 6: 计算用量并关闭 EventStream ----
      const usage: Usage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: calculateCost(model, inputTokens, outputTokens),
      };

      eventStream.push({ type: "done", usage });
      eventStream.close({
        role: "assistant",
        content: contentBlocks,
        usage,
      });

    } catch (err) {
      // ---- 错误处理 ----
      eventStream.push({ type: "error", error: err as Error });
      eventStream.error(err as Error);
    }
  })();

  return eventStream;  // 立即返回，消费者可以开始 for await
}
```

### 3.3 事件处理辅助函数

```typescript
function handleBlockStart(
  event: Anthropic.ContentBlockStartEvent,
  contentBlocks: AssistantContentBlock[],
  eventStream: EventStream<StreamEvent, AssistantMessage>
) {
  const block = event.content_block;

  switch (block.type) {
    case "text":
      contentBlocks.push({ type: "text", text: "" });
      break;

    case "thinking":
      contentBlocks.push({ type: "thinking", text: "" });
      break;

    case "tool_use":
      contentBlocks.push({
        type: "tool_call",
        toolCallId: block.id,       // "toolu_01XFDUDYJgAACzvnptvVer6u"
        toolName: block.name,
        args: {},
      });
      eventStream.push({
        type: "tool_call_start",
        toolCallId: block.id,
        toolName: block.name,
      });
      break;
  }
}

function handleBlockDelta(
  event: Anthropic.ContentBlockDeltaEvent,
  contentBlocks: AssistantContentBlock[],
  eventStream: EventStream<StreamEvent, AssistantMessage>,
  currentToolCallArgs: string
): string {
  const delta = event.delta;
  const lastBlock = contentBlocks[contentBlocks.length - 1];

  switch (delta.type) {
    case "text_delta":
      // 累积文本到 contentBlock
      if (lastBlock.type === "text") lastBlock.text += delta.text;
      // 同时推送实时事件给消费者
      eventStream.push({ type: "text_delta", text: delta.text });
      break;

    case "thinking_delta":
      if (lastBlock.type === "thinking") lastBlock.text += delta.thinking;
      eventStream.push({ type: "thinking_delta", text: delta.thinking });
      break;

    case "input_json_delta":
      // ⚠️ 工具参数是 JSON 片段，逐块到达
      // 例如: '{"ci' → 'ty": "' → 'Tokyo"}'
      currentToolCallArgs += delta.partial_json;
      eventStream.push({ type: "tool_call_delta", args: delta.partial_json });
      break;
  }

  return currentToolCallArgs;
}

function handleBlockStop(
  contentBlocks: AssistantContentBlock[],
  eventStream: EventStream<StreamEvent, AssistantMessage>,
  currentToolCallArgs: string
) {
  const lastBlock = contentBlocks[contentBlocks.length - 1];

  if (lastBlock.type === "tool_call") {
    // 工具参数流结束，解析完整 JSON
    try {
      lastBlock.args = JSON.parse(currentToolCallArgs);
    } catch {
      // 解析失败时保留原始字符串
      lastBlock.args = currentToolCallArgs;
    }
    eventStream.push({ type: "tool_call_end" });
  }
}
```

### 3.4 EventStream 数据流图解

```
Anthropic SSE                    EventStream                   消费者
─────────────                    ───────────                   ──────
message_start          →   push({ type: "start" })        →  event.type === "start"
                             │
content_block_start    →   push({ type: "tool_call_start"    event.type === "tool_call_start"
  (type: tool_use)           │    toolCallId, toolName })      → 显示 "正在调用工具: get_weather"
                             │
content_block_delta    →   push({ type: "tool_call_delta"    event.type === "tool_call_delta"
  (input_json_delta)         │    args: '{"ci' })              → 实时显示参数构建
content_block_delta    →   push({ ... args: 'ty":"' })
content_block_delta    →   push({ ... args: 'Tokyo"}' })
                             │
content_block_stop     →   push({ type: "tool_call_end" })   event.type === "tool_call_end"
                             │                                  → 参数完整，可执行工具
message_delta          →   push({ type: "done", usage })     event.type === "done"
                             │                                  → 显示 token 用量
                             │
                         close(assistantMessage)           →  await s.result()
                                                               → 获取完整 AssistantMessage
```

---

## 第四节：Anthropic 特有的陷阱与处理

### 4.1 Thinking Signature 的保留

Anthropic 的 Extended Thinking 会返回 `signature` 字段，**后续请求必须原样回传**，否则 API 会报错。

```typescript
// 实际 thinking block 的完整结构
{
  type: "thinking",
  thinking: "Let me analyze this step by step...",
  signature: "ErUBCkYIAxgCIkD...long-base64..."  // ← 必须保留！
}

// 框架的 AssistantContentBlock 需要存储 signature
type ThinkingBlock = {
  type: "thinking";
  text: string;
  signature?: string;  // ← 框架额外保留的字段
};
```

### 4.2 Tool Use ID 格式

Anthropic 的 tool_use id 格式是 `toolu_01XFDUDYJgAACzvnptvVer6u`，跨 Provider 转换时需要注意：

```typescript
// Anthropic ID 格式
"toolu_01XFDUDYJgAACzvnptvVer6u"

// OpenAI ID 格式
"call_abc123"

// 跨 Provider 时需要重新映射
// 详见 05-message-transform-deep-dive.md
```

### 4.3 消息交替规则

Anthropic 要求严格的 **user → assistant → user → assistant** 交替。连续两条相同角色会报错。

```typescript
// ❌ 这会报错
messages: [
  { role: "user", content: "Hello" },
  { role: "user", content: "Are you there?" },  // 连续两个 user！
]

// ✅ 需要合并或插入空 assistant
messages: [
  { role: "user", content: "Hello\n\nAre you there?" },  // 合并
]
```

框架在 `convertMessages` 中处理这个问题：

```typescript
function ensureAlternatingRoles(
  messages: Anthropic.MessageParam[]
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    const prev = result[result.length - 1];
    if (prev && prev.role === msg.role) {
      // 同角色连续出现，合并内容
      if (typeof prev.content === "string" && typeof msg.content === "string") {
        prev.content = prev.content + "\n\n" + msg.content;
      } else {
        // 数组类型的 content 需要 concat
        const prevBlocks = Array.isArray(prev.content) ? prev.content : [{ type: "text" as const, text: prev.content }];
        const msgBlocks = Array.isArray(msg.content) ? msg.content : [{ type: "text" as const, text: msg.content }];
        prev.content = [...prevBlocks, ...msgBlocks];
      }
    } else {
      result.push({ ...msg });
    }
  }

  return result;
}
```

### 4.4 Prompt Caching

Anthropic 支持 Prompt Caching（缓存长 system prompt 和历史消息以降低成本）：

```typescript
// 标记需要缓存的内容
const params = {
  system: [
    {
      type: "text",
      text: longSystemPrompt,
      cache_control: { type: "ephemeral" },  // ← 标记缓存
    },
  ],
  // ...
};

// Usage 中的缓存相关字段
// message_start 事件会返回：
// usage.cache_creation_input_tokens  — 本次新缓存的 token 数
// usage.cache_read_input_tokens      — 本次命中缓存的 token 数
```

### 4.5 错误类型与重试策略

```typescript
try {
  const response = await client.messages.create(params);
} catch (err) {
  if (err instanceof Anthropic.RateLimitError) {
    // 429: 速率限制，需退避重试
    // err.headers["retry-after"] 告诉你等多久
  }
  if (err instanceof Anthropic.APIError && err.status === 529) {
    // 529: API 过载 (Anthropic 特有)
    // 等待后重试
  }
  if (err instanceof Anthropic.AuthenticationError) {
    // 401: API Key 无效
  }
  // 所有错误都通过 EventStream.error() 传播给消费者
  eventStream.push({ type: "error", error: err as Error });
  eventStream.error(err as Error);
}
```

---

## 第五节：完整使用示例

### 5.1 基础流式对话

```typescript
import { stream, getModel } from "@mariozechner/pi-ai";

const model = getModel("anthropic", "claude-sonnet-4-5-20250929");

const s = stream(model, {
  systemPrompt: "你是一个有帮助的助手。",
  messages: [{ role: "user", content: "用一句话解释递归" }],
  tools: [],
});

for await (const event of s) {
  switch (event.type) {
    case "text_delta":
      process.stdout.write(event.text);
      break;
    case "done":
      console.log(`\n\n[Token: ${event.usage.totalTokens}, Cost: $${event.usage.cost}]`);
      break;
  }
}
```

### 5.2 带 Thinking 的深度推理

```typescript
const model = getModel("anthropic", "claude-sonnet-4-5-20250929");

const s = stream(model, {
  systemPrompt: "请深度分析问题。",
  messages: [{ role: "user", content: "证明 √2 是无理数" }],
  tools: [],
}, {
  thinkingLevel: "high",  // 框架统一的 thinking level
});

let thinkingText = "";
let responseText = "";

for await (const event of s) {
  switch (event.type) {
    case "thinking_delta":
      thinkingText += event.text;
      break;
    case "text_delta":
      responseText += event.text;
      process.stdout.write(event.text);
      break;
  }
}

console.log(`\n思考过程长度: ${thinkingText.length} 字符`);
```

### 5.3 工具调用完整循环

```typescript
const model = getModel("anthropic", "claude-sonnet-4-5-20250929");

const tools: Tool[] = [{
  name: "get_weather",
  description: "获取指定城市的天气",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "城市名" },
    },
    required: ["city"],
  },
}];

// 第一轮：模型决定调用工具
const context: Context = {
  messages: [{ role: "user", content: "东京今天天气怎么样？" }],
  tools,
};

const s1 = stream(model, context);
const msg1 = await s1.result();

// msg1.content 可能包含 tool_call block
const toolCall = msg1.content.find((b) => b.type === "tool_call");
if (toolCall && toolCall.type === "tool_call") {
  // 执行工具
  const weatherResult = await fetchWeather(toolCall.args.city);

  // 第二轮：把工具结果送回模型
  context.messages.push(msg1);  // 追加 assistant 消息
  context.messages.push({       // 追加工具结果
    role: "tool_result",
    toolCallId: toolCall.toolCallId,
    content: JSON.stringify(weatherResult),
  });

  const s2 = stream(model, context);
  for await (const event of s2) {
    if (event.type === "text_delta") process.stdout.write(event.text);
  }
  // 输出: "东京今天晴朗，温度 15°C..."
}
```

---

## 关键收获

| 要点                          | 说明                                                       |
| --------------------------- | -------------------------------------------------------- |
| **api 字段是路由键**              | `model.api === "anthropic-messages"` 决定了走哪个 Provider     |
| **tool_result 嵌入 user 角色**  | Anthropic 独有设计，框架在转换层屏蔽了这个差异                             |
| **SSE 事件是三层嵌套**             | message → content_block → delta，逐层拆解推入 EventStream       |
| **EventStream 立即返回**        | `(async () => { ... })()` 模式让消费者无需等待连接建立就能开始 `for await` |
| **Thinking Signature 必须保留** | 丢失 signature 会导致后续请求报错                                   |
| **消息必须交替**                  | 框架自动合并连续同角色消息                                            |

---

> **下一篇**：[04-openai-provider-deep-dive.md](./04-openai-provider-deep-dive.md) — OpenAI Chat Completions Provider 的对应实现，以及它如何兼容 15+ 个 OpenAI 协议的 Provider。
