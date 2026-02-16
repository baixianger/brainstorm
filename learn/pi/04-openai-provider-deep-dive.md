# OpenAI Provider 深度实现详解

> 学习来源：[@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) — `providers/openai-completions.ts` (28KB)
> 前置阅读：[01-framework-tutorial.md](./01-framework-tutorial.md)、[03-anthropic-provider-deep-dive.md](./03-anthropic-provider-deep-dive.md)
> 核心目标：**深入 OpenAI Chat Completions API 的流式适配器，理解它为何是框架中最复杂的 Provider（28KB），以及它如何兼容 15+ 个 OpenAI 协议的 Provider**

---

## 为什么 OpenAI Provider 是最复杂的？

OpenAI 的 Chat Completions API 已经成为事实上的行业标准。大量第三方 Provider 声称"兼容 OpenAI API"，但每家都有微妙差异。框架中的 `openai-completions.ts` 之所以膨胀到 28KB，是因为它要处理：

| Provider         | 使用 OpenAI 协议？ | 特殊行为                                     |
| ---------------- | ------------- | ---------------------------------------- |
| OpenAI           | 原生            | 基准实现                                     |
| Groq             | 兼容            | tool_calls 的 index 可能乱序                   |
| Mistral          | 兼容            | 不支持 `parallel_tool_calls` 参数              |
| xAI (Grok)       | 兼容            | 思考内容在 `reasoning_content` 字段              |
| DeepSeek         | 兼容            | `reasoning_content` + 特殊 token 用量字段       |
| Together AI      | 兼容            | 参数名 `max_tokens` 而非 `max_completion_tokens` |
| OpenRouter       | 代理            | 代理多个模型，各自行为不同                            |
| Azure OpenAI     | 兼容            | 不同的 URL 结构和认证方式                          |
| GitHub Copilot   | 兼容            | 需要 OAuth token 而非 API key                |
| Fireworks        | 兼容            | 需要特殊的 reasoning 参数格式                     |
| Cerebras, Nebius | 兼容            | 各有细微差异...                                |

> **关键洞察**：所谓"兼容 OpenAI API"只是一个光谱，不是二元的。框架必须处理每家的特殊情况。

---

## 整体架构

```
用户调用 stream(model, context)
       │
       ▼
  API Registry 根据 model.api === "openai-completions" 找到本 Provider
       │
       ▼
  streamOpenAI(model, context, options)
       │
       ├── 1. 消息格式转换  Context → OpenAI.ChatCompletionCreateParams
       ├── 2. Provider 特殊参数处理（兼容性补丁）
       ├── 3. 调用 OpenAI SDK 创建流式请求
       ├── 4. 解析 SSE 事件 → 推送到 EventStream
       │        └── 处理各 Provider 的特殊 delta 格式
       └── 5. 关闭 EventStream，交付 AssistantMessage
```

---

## 第一节：模型注册

### 1.1 模型定义

```typescript
// models.ts（节选）

const openaiModels: Model[] = [
  // ── 原生 OpenAI ──
  {
    id: "gpt-4o",
    name: "GPT-4o",
    api: "openai-completions",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
    supportsReasoning: false,
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10 },
  },
  {
    id: "o3",
    name: "o3",
    api: "openai-completions",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    maxInputTokens: 200_000,
    maxOutputTokens: 100_000,
    supportsReasoning: true,           // o 系列支持 reasoning
    pricing: { inputPerMillion: 10, outputPerMillion: 40 },
  },

  // ── Groq（OpenAI 兼容）──
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B (Groq)",
    api: "openai-completions",         // ← 同一个 api 协议
    provider: "groq",                  // ← 不同的 provider 名
    baseUrl: "https://api.groq.com/openai/v1",
    maxInputTokens: 128_000,
    maxOutputTokens: 32_768,
    supportsReasoning: false,
    pricing: { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  },

  // ── DeepSeek（OpenAI 兼容 + reasoning）──
  {
    id: "deepseek-reasoner",
    name: "DeepSeek R1",
    api: "openai-completions",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    maxInputTokens: 128_000,
    maxOutputTokens: 8_192,
    supportsReasoning: true,           // 有推理能力但格式不同
    pricing: { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  },

  // ── xAI Grok（OpenAI 兼容 + reasoning）──
  {
    id: "grok-3",
    name: "Grok 3",
    api: "openai-completions",
    provider: "xai",
    baseUrl: "https://api.x.ai/v1",
    maxInputTokens: 131_072,
    maxOutputTokens: 131_072,
    supportsReasoning: true,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
];
```

### 1.2 Provider 注册

```typescript
// providers/openai-completions.ts（底部）

registerApiProvider({
  api: "openai-completions",
  stream: streamOpenAI,
});
```

> **注意**：所有用 OpenAI 兼容协议的 Provider（Groq、xAI、DeepSeek 等）都走同一个 `openai-completions` 适配器。区分它们的不是 `api` 字段，而是 `provider` 字段和 `baseUrl`。

---

## 第二节：消息格式转换

### 2.1 角色映射对比

| 框架统一格式             | OpenAI 格式              | Anthropic 格式（对比）          |
| ------------------ | ---------------------- | ------------------------- |
| `role: "user"`     | `role: "user"`         | `role: "user"`            |
| `role: "assistant"`| `role: "assistant"`    | `role: "assistant"`       |
| `role: "tool_result"` | **`role: "tool"`**  | `role: "user"` + tool_result 块 |
| _(system prompt)_  | **`role: "system"`**（在 messages 数组里） | 请求体顶层 `system` 字段 |

### 2.2 完整消息转换

```typescript
import OpenAI from "openai";

function convertToOpenAIMessages(
  context: Context
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // ---- System Prompt → 第一条 system 消息 ----
  // ⚠️ 这是与 Anthropic 最大的结构差异
  if (context.systemPrompt) {
    messages.push({
      role: "system",
      content: context.systemPrompt,
    });
  }

  // ---- 转换每条消息 ----
  for (const msg of context.messages) {
    switch (msg.role) {

      case "user":
        messages.push({
          role: "user",
          content: typeof msg.content === "string"
            ? msg.content
            : msg.content.map(convertUserContentBlock),
        });
        break;

      case "assistant":
        messages.push(convertAssistantMessage(msg));
        break;

      case "tool_result":
        // ⚠️ 核心差异：OpenAI 有独立的 "tool" 角色
        messages.push({
          role: "tool",                    // ← 不是 "user"！
          tool_call_id: msg.toolCallId,    // ← snake_case
          content: msg.content,
        });
        break;
    }
  }

  return messages;
}
```

### 2.3 Assistant 消息转换——tool_calls 结构差异

这是 OpenAI 和 Anthropic 差异最大的地方。Anthropic 把 tool_use 当作 content block，而 OpenAI 把 tool_calls 放在消息顶层的独立字段。

```typescript
function convertAssistantMessage(
  msg: AssistantMessage
): OpenAI.ChatCompletionAssistantMessageParam {
  const textParts: string[] = [];
  const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];

  for (const block of msg.content) {
    switch (block.type) {
      case "text":
        textParts.push(block.text);
        break;

      case "thinking":
        // OpenAI 原生不支持 thinking block
        // 转为普通文本保留（或丢弃，取决于策略）
        textParts.push(`<thinking>\n${block.text}\n</thinking>`);
        break;

      case "tool_call":
        // ⚠️ OpenAI 的 tool_calls 是顶层数组，不在 content 里
        toolCalls.push({
          id: block.toolCallId,              // "call_abc123"
          type: "function",                  // OpenAI 固定为 "function"
          function: {
            name: block.toolName,
            arguments: JSON.stringify(block.args), // ← 必须是字符串！
          },
        });
        break;
    }
  }

  return {
    role: "assistant",
    content: textParts.length > 0 ? textParts.join("\n") : null,
    // ⚠️ tool_calls 是顶层字段，不是 content 内部
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  };
}
```

### 2.4 结构对比图

```
─── Anthropic 消息结构 ───          ─── OpenAI 消息结构 ───

{                                   {
  role: "assistant",                  role: "assistant",
  content: [                          content: "Here's the weather",
    { type: "text",                   tool_calls: [        ← 顶层字段！
      text: "..." },                    {
    { type: "tool_use",                   id: "call_abc123",
      id: "toolu_xxx",                   type: "function",
      name: "get_weather",                function: {
      input: { city: "Tokyo" }              name: "get_weather",
    }                                       arguments: '{"city":"Tokyo"}'
  ]                                       }                ← 字符串不是对象！
}                                       }
                                      ]
                                    }
```

### 2.5 User 内容块转换

```typescript
function convertUserContentBlock(
  block: ContentBlock
): OpenAI.ChatCompletionContentPart {
  switch (block.type) {
    case "text":
      return { type: "text", text: block.text };

    case "image":
      return {
        type: "image_url",
        image_url: {
          // OpenAI 用 data URL 格式，不是分离的 mediaType + data
          url: `data:${block.mediaType};base64,${block.data}`,
          detail: "auto",
        },
      };
  }
}
```

### 2.6 工具定义转换

```typescript
function convertToOpenAITools(
  tools: Tool[]
): OpenAI.ChatCompletionTool[] | undefined {
  if (tools.length === 0) return undefined;

  return tools.map((tool) => ({
    type: "function" as const,     // ← OpenAI 多了一层 "function" 包装
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,  // JSON Schema 直接传
    },
  }));
}
```

---

## 第三节：SSE 事件流解析

### 3.1 OpenAI SSE 事件结构

OpenAI 的流式格式比 Anthropic 更"扁平"——没有明确的 block_start/block_stop 事件，全靠 `delta` 对象的字段有无来判断。

```
chunk { choices: [{ delta: { role: "assistant" } }] }                  ← 开始
chunk { choices: [{ delta: { content: "Hello" } }] }                   ← 文本
chunk { choices: [{ delta: { content: " world" } }] }                  ← 文本
chunk { choices: [{ delta: { tool_calls: [{ index: 0,                  ← 工具调用开始
                              id: "call_abc",
                              function: { name: "get_weather",
                                          arguments: "" } }] } }] }
chunk { choices: [{ delta: { tool_calls: [{ index: 0,                  ← 工具参数片段
                              function: { arguments: '{"ci' } }] } }] }
chunk { choices: [{ delta: { tool_calls: [{ index: 0,                  ← 工具参数片段
                              function: { arguments: 'ty":"Tokyo"}' } }] } }] }
chunk { choices: [{ delta: {} }], finish_reason: "tool_calls" }        ← 结束
chunk { usage: { prompt_tokens: 50, completion_tokens: 20 } }         ← 用量
```

### 3.2 核心挑战：没有明确的 block 边界

| 特性        | Anthropic                       | OpenAI                              |
| --------- | ------------------------------- | ----------------------------------- |
| 块开始       | `content_block_start` 事件       | delta 中首次出现 `tool_calls[i].id` 时推断  |
| 块结束       | `content_block_stop` 事件        | delta 为空 + `finish_reason` 时推断       |
| 多工具并发     | 顺序出现，一个块完成后再开始下一个               | `tool_calls[i].index` 可以交错出现！        |
| Token 用量  | `message_start` + `message_delta` | 最后一个 chunk 的 `usage` 字段（需 `stream_options`）|

### 3.3 完整流式处理函数

```typescript
export function streamOpenAI(
  model: Model,
  context: Context,
  options: StreamOptions = {}
): EventStream<StreamEvent, AssistantMessage> {
  const eventStream = new EventStream<StreamEvent, AssistantMessage>();

  (async () => {
    try {
      const client = new OpenAI({
        apiKey: getApiKey(model.provider, model),
        baseURL: model.baseUrl,
      });

      // ---- 构造请求参数 ----
      const params: OpenAI.ChatCompletionCreateParams = {
        model: model.id,
        temperature: options.temperature,
        messages: convertToOpenAIMessages(context),
        tools: convertToOpenAITools(context.tools),
        stream: true,
        // 请求流式返回 usage 信息
        stream_options: { include_usage: true },
      };

      // ⚠️ Provider 特殊参数处理
      applyProviderSpecificParams(model, params, options);

      // ---- 发起请求 ----
      const response = await client.chat.completions.create(params, {
        signal: options.signal,
      });

      eventStream.push({ type: "start" });

      // ---- 状态追踪 ----
      let inputTokens = 0;
      let outputTokens = 0;
      const contentBlocks: AssistantContentBlock[] = [];

      // 工具调用追踪：OpenAI 用 index 标识并发工具调用
      const toolCallTrackers = new Map<number, {
        toolCallId: string;
        toolName: string;
        argsBuffer: string;
        blockIndex: number;  // 在 contentBlocks 中的位置
      }>();

      // ---- 逐 chunk 处理 ----
      for await (const chunk of response) {
        // 处理 usage（通常在最后一个 chunk）
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
          continue;
        }

        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;

        // ── 文本内容 ──
        if (delta.content) {
          // 查找或创建 text block
          let textBlock = contentBlocks.find(b => b.type === "text");
          if (!textBlock) {
            textBlock = { type: "text", text: "" };
            contentBlocks.push(textBlock);
          }
          if (textBlock.type === "text") {
            textBlock.text += delta.content;
          }
          eventStream.push({ type: "text_delta", text: delta.content });
        }

        // ── Reasoning（DeepSeek / xAI 特有）──
        if ((delta as any).reasoning_content) {
          let thinkingBlock = contentBlocks.find(b => b.type === "thinking");
          if (!thinkingBlock) {
            thinkingBlock = { type: "thinking", text: "" };
            contentBlocks.push(thinkingBlock);
          }
          if (thinkingBlock.type === "thinking") {
            thinkingBlock.text += (delta as any).reasoning_content;
          }
          eventStream.push({
            type: "thinking_delta",
            text: (delta as any).reasoning_content,
          });
        }

        // ── 工具调用 ──
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            handleToolCallDelta(
              tc, toolCallTrackers, contentBlocks, eventStream
            );
          }
        }

        // ── 结束信号 ──
        if (choice.finish_reason) {
          // 关闭所有未关闭的工具调用
          for (const [, tracker] of toolCallTrackers) {
            finalizeToolCall(tracker, contentBlocks, eventStream);
          }
          toolCallTrackers.clear();
        }
      }

      // ---- 计算用量并关闭 ----
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
      eventStream.push({ type: "error", error: err as Error });
      eventStream.error(err as Error);
    }
  })();

  return eventStream;
}
```

### 3.4 工具调用 Delta 处理——最复杂的部分

OpenAI 的工具调用 delta 通过 `index` 字段支持**并发多工具调用**，同一个 chunk 可以包含多个不同 index 的 delta。

```typescript
function handleToolCallDelta(
  tc: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall,
  trackers: Map<number, ToolCallTracker>,
  contentBlocks: AssistantContentBlock[],
  eventStream: EventStream<StreamEvent, AssistantMessage>
) {
  const index = tc.index;

  // 新工具调用？（有 id 和 function.name 表示开始）
  if (tc.id && tc.function?.name) {
    const blockIndex = contentBlocks.length;
    contentBlocks.push({
      type: "tool_call",
      toolCallId: tc.id,
      toolName: tc.function.name,
      args: {},
    });

    trackers.set(index, {
      toolCallId: tc.id,
      toolName: tc.function.name,
      argsBuffer: tc.function.arguments ?? "",
      blockIndex,
    });

    eventStream.push({
      type: "tool_call_start",
      toolCallId: tc.id,
      toolName: tc.function.name,
    });

    if (tc.function.arguments) {
      eventStream.push({
        type: "tool_call_delta",
        args: tc.function.arguments,
      });
    }
    return;
  }

  // 已有工具调用的参数增量
  const tracker = trackers.get(index);
  if (tracker && tc.function?.arguments) {
    tracker.argsBuffer += tc.function.arguments;
    eventStream.push({
      type: "tool_call_delta",
      args: tc.function.arguments,
    });
  }
}

function finalizeToolCall(
  tracker: ToolCallTracker,
  contentBlocks: AssistantContentBlock[],
  eventStream: EventStream<StreamEvent, AssistantMessage>
) {
  const block = contentBlocks[tracker.blockIndex];
  if (block.type === "tool_call") {
    try {
      block.args = JSON.parse(tracker.argsBuffer);
    } catch {
      block.args = tracker.argsBuffer;
    }
  }
  eventStream.push({ type: "tool_call_end" });
}
```

### 3.5 EventStream 数据流图解

```
OpenAI SSE chunk                  EventStream                      消费者
────────────────                  ───────────                      ──────
{ delta: { role: "assistant" } }
                              →  push({ type: "start" })       →  "start"

{ delta: { content: "The " } }
                              →  push({ type: "text_delta",    →  逐字渲染
                                        text: "The " })

{ delta: { content: "weather" } }
                              →  push({ type: "text_delta",    →  逐字渲染
                                        text: "weather" })

{ delta: { tool_calls: [{
    index: 0,
    id: "call_abc",
    function: { name: "get_weather",
                arguments: "" } }] } }
                              →  push({ type: "tool_call_start", → "正在调用 get_weather"
                                    toolCallId: "call_abc",
                                    toolName: "get_weather" })

{ delta: { tool_calls: [{
    index: 0,
    function: { arguments: '{"city' } }] } }
                              →  push({ type: "tool_call_delta", → 实时参数
                                        args: '{"city' })

{ delta: { tool_calls: [{
    index: 0,
    function: { arguments: '":"Tokyo"}' } }] } }
                              →  push({ type: "tool_call_delta", → 实时参数
                                        args: '":"Tokyo"}' })

{ delta: {}, finish_reason: "tool_calls" }
                              →  push({ type: "tool_call_end" }) → 可以执行工具了

{ usage: { prompt_tokens: 50,
           completion_tokens: 20 } }
                              →  push({ type: "done", usage })  → 显示用量
                                 close(assistantMessage)         → await s.result()
```

---

## 第四节：Provider 特殊参数处理

这是 `openai-completions.ts` 膨胀到 28KB 的主要原因——每家"兼容"Provider 都有自己的怪癖。

### 4.1 兼容性补丁分发器

```typescript
function applyProviderSpecificParams(
  model: Model,
  params: OpenAI.ChatCompletionCreateParams,
  options: StreamOptions
) {
  switch (model.provider) {

    // ── DeepSeek ──
    case "deepseek":
      // DeepSeek 不支持 max_completion_tokens，用 max_tokens
      if (params.max_completion_tokens) {
        (params as any).max_tokens = params.max_completion_tokens;
        delete params.max_completion_tokens;
      }
      // DeepSeek 不支持 stream_options
      delete (params as any).stream_options;
      break;

    // ── Groq ──
    case "groq":
      // Groq 不支持 parallel_tool_calls
      delete (params as any).parallel_tool_calls;
      // Groq 用 max_tokens 不是 max_completion_tokens
      if (params.max_completion_tokens) {
        (params as any).max_tokens = params.max_completion_tokens;
        delete params.max_completion_tokens;
      }
      break;

    // ── xAI (Grok) ──
    case "xai":
      // xAI 的 reasoning 通过 reasoning_effort 参数控制
      if (model.supportsReasoning && options.thinkingLevel) {
        (params as any).reasoning_effort = mapThinkingLevel(options.thinkingLevel);
        // xAI: "low" | "medium" | "high"
      }
      break;

    // ── Together AI ──
    case "together":
      // Together 不支持 stream_options
      delete (params as any).stream_options;
      break;

    // ── Mistral ──
    case "mistral":
      // Mistral 不支持 parallel_tool_calls
      delete (params as any).parallel_tool_calls;
      break;

    // ── OpenAI 原生 ──
    case "openai":
      // o 系列推理模型的特殊处理
      if (model.supportsReasoning && options.thinkingLevel) {
        (params as any).reasoning_effort = mapThinkingLevel(options.thinkingLevel);
      }
      break;
  }
}
```

### 4.2 Reasoning Content 差异

不同 Provider 的 "思考过程" 放在不同字段：

```typescript
// OpenAI o 系列: 通过 stream 事件中的 reasoning 内容
// 注意: OpenAI o 系列不直接在 delta 中暴露 reasoning

// DeepSeek R1: delta.reasoning_content
// xAI Grok:   delta.reasoning_content

// 统一处理
if ((delta as any).reasoning_content) {
  // 兼容 DeepSeek 和 xAI 的思考内容
  eventStream.push({
    type: "thinking_delta",
    text: (delta as any).reasoning_content,
  });
}
```

### 4.3 Token 用量获取差异

```typescript
// OpenAI 标准: chunk.usage（需要 stream_options.include_usage = true）
// DeepSeek:   chunk.usage 但没有 stream_options 支持，用最后 chunk 的 usage
// Groq:       x-groq 自定义 header 中的用量信息
// Together:   不提供流式 usage，需要额外 API 调用或估算

// 兜底策略
if (inputTokens === 0 && outputTokens === 0) {
  // 如果流式没拿到 usage，用完成后的 API 调用获取
  // 或者基于 token 估算
  inputTokens = estimateTokens(context);
  outputTokens = estimateTokens(contentBlocks);
}
```

---

## 第五节：OpenAI Responses API（补充）

OpenAI 近期推出了新的 Responses API（`openai-responses`），它是 Chat Completions 的演进版：

```typescript
// 原框架中有独立的 openai-responses.ts (8KB)
// 注册为不同的 api 类型
registerApiProvider({
  api: "openai-responses",       // ← 与 "openai-completions" 不同
  stream: streamOpenAIResponses,
});
```

### Responses API 的主要区别

| 特性       | Chat Completions         | Responses API                 |
| -------- | ------------------------ | ----------------------------- |
| 端点       | `/v1/chat/completions`   | `/v1/responses`               |
| 工具调用格式   | `tool_calls` 在 delta 中   | 独立的 `function_call` 事件        |
| 内置工具     | 不支持                      | 支持 `web_search`, `code_interpreter` |
| 事件结构     | 全在 `choices[0].delta` 中  | 有独立的事件类型如 `response.text.delta` |
| 生态兼容性    | Groq, Mistral 等广泛兼容      | 目前仅 OpenAI 原生支持               |

---

## 第六节：完整使用示例

### 6.1 基础 OpenAI 调用

```typescript
import { stream, getModel } from "@mariozechner/pi-ai";

const model = getModel("openai", "gpt-4o");

const s = stream(model, {
  systemPrompt: "你是一个有帮助的助手。",
  messages: [{ role: "user", content: "用一句话解释递归" }],
  tools: [],
});

for await (const event of s) {
  if (event.type === "text_delta") process.stdout.write(event.text);
}
```

### 6.2 无缝切换到 Groq（同一个 context）

```typescript
// 同样的 context，换个模型就行
const groqModel = getModel("groq", "llama-3.3-70b-versatile");
const s2 = stream(groqModel, context);  // ← 框架自动路由到 openai-completions

for await (const event of s2) {
  if (event.type === "text_delta") process.stdout.write(event.text);
}
```

### 6.3 DeepSeek 推理模式

```typescript
const deepseekModel = getModel("deepseek", "deepseek-reasoner");

const s = stream(deepseekModel, {
  messages: [{ role: "user", content: "证明哥德巴赫猜想对小于100的偶数成立" }],
  tools: [],
}, {
  thinkingLevel: "high",
});

for await (const event of s) {
  switch (event.type) {
    case "thinking_delta":
      // DeepSeek 的推理过程通过 reasoning_content 传来
      process.stderr.write(event.text);
      break;
    case "text_delta":
      process.stdout.write(event.text);
      break;
  }
}
```

### 6.4 多工具并发调用

```typescript
const model = getModel("openai", "gpt-4o");

const context: Context = {
  messages: [{
    role: "user",
    content: "比较东京和纽约的天气，以及两地的当前时间",
  }],
  tools: [
    { name: "get_weather", description: "获取天气", parameters: { /* ... */ } },
    { name: "get_time", description: "获取时间", parameters: { /* ... */ } },
  ],
};

const s = stream(model, context);

// OpenAI 可能同时返回多个 tool_call（并发）
// 通过 tool_calls[index] 的 index 区分
const pendingCalls: Map<string, any> = new Map();

for await (const event of s) {
  switch (event.type) {
    case "tool_call_start":
      console.log(`开始调用: ${event.toolName}`);
      pendingCalls.set(event.toolCallId, { name: event.toolName, args: "" });
      break;
    case "tool_call_delta":
      // 可能交错到达不同工具的参数片段
      break;
    case "tool_call_end":
      console.log("工具调用参数完成");
      break;
  }
}

const result = await s.result();
// result.content 可能包含多个 tool_call block
const toolCalls = result.content.filter(b => b.type === "tool_call");
console.log(`共 ${toolCalls.length} 个工具调用`);
// 可能输出: "共 4 个工具调用"（get_weather × 2 + get_time × 2）
```

---

## 关键收获

| 要点                           | 说明                                              |
| ---------------------------- | ----------------------------------------------- |
| **一个 Provider 适配 15+ 后端**    | `openai-completions` 通过 provider 字段和兼容性补丁统一处理    |
| **tool_calls 是顶层字段**        | 不在 content 里，且 arguments 是字符串不是对象                 |
| **工具调用可以并发**                 | 通过 `tool_calls[index]` 的 index 区分，delta 可能交错到达    |
| **没有明确的 block 边界**           | 需要自行根据 delta 中字段的出现/消失来推断块的开始和结束                  |
| **兼容性是最大的工作量**              | 28KB 中超过一半是处理各 Provider 的特殊情况                     |
| **reasoning_content 非标准字段**  | DeepSeek、xAI 等用这个字段传递思考过程，需要 `(delta as any)` 访问 |

---

## 与 Anthropic Provider 的对照总结

| 维度          | Anthropic Provider        | OpenAI Provider             |
| ----------- | ------------------------- | --------------------------- |
| 代码量         | 26KB                      | 28KB                        |
| 复杂度来源       | Thinking/Signature 处理     | 15+ Provider 兼容性处理          |
| System Prompt | 请求体顶层字段                   | messages 数组第一条              |
| Tool Result  | 嵌入 user 角色                | 独立 tool 角色                  |
| Tool Call 结构 | content block 内部           | 消息顶层 tool_calls 数组          |
| 流式事件粒度      | 细（block_start/stop 明确）    | 粗（需自行推断边界）                  |
| 并发工具调用      | 顺序执行                      | index 交错并发                   |

---

> **下一篇**：[05-message-transform-deep-dive.md](./05-message-transform-deep-dive.md) — 当对话需要从 Anthropic 切换到 OpenAI（或反过来）时，消息如何无损转换。
