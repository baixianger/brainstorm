# 从零构建统一 LLM API 框架：十步教学

> 学习来源：[@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai)
> 框架概要：统一 20+ LLM Provider（Anthropic, OpenAI, Google, AWS Bedrock 等）的 TypeScript SDK

---

## 框架概况

| 特性 | 说明 |
|------|------|
| 包名 | `@mariozechner/pi-ai` |
| 支持 Provider | 20+（OpenAI, Anthropic, Google, Azure, Bedrock, xAI, Groq, Mistral 等）|
| API 协议 | 9 种（anthropic-messages, openai-completions, openai-responses, google-generative-ai 等）|
| 核心功能 | 统一流式、工具调用、thinking/reasoning、Token 计费、跨 Provider 切换 |
| 代码规模 | 模型注册表 312KB（自动生成），Provider 适配器最大 28KB |

---

## 第一步：定义核心类型 (`types.ts`)

这是整个框架的基石。先想清楚"通用对话"长什么样。

```typescript
// types.ts - 核心类型定义

// ===== 1. Model：描述一个 LLM 模型 =====
export type Model<TApi extends string = string> = {
  id: string;            // 模型 ID，如 "claude-sonnet-4-5-20250929"
  name: string;          // 显示名称
  api: TApi;             // API 协议类型，如 "anthropic-messages"
  provider: string;      // 提供商名称，如 "anthropic"
  baseUrl: string;       // API 基础 URL
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsReasoning: boolean;
  pricing: {
    inputPerMillion: number;
    outputPerMillion: number;
  };
};

// ===== 2. Message：统一消息格式 =====
// 关键设计：用联合类型区分三种角色
export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export type UserMessage = {
  role: "user";
  content: string | ContentBlock[];
};

export type AssistantMessage = {
  role: "assistant";
  content: AssistantContentBlock[];
  usage?: Usage;
};

export type ToolResultMessage = {
  role: "tool_result";
  toolCallId: string;
  content: string;
  isError?: boolean;
};

// ===== 3. Content Blocks：细粒度内容 =====
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string };

export type AssistantContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; toolCallId: string; toolName: string; args: unknown };

// ===== 4. Tool：工具/函数调用定义 =====
export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
};

// ===== 5. Context：完整对话上下文（核心可移植单元）=====
export type Context = {
  systemPrompt?: string;
  messages: Message[];
  tools: Tool[];
};

// ===== 6. Usage：Token 用量和成本 =====
export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
};

// ===== 7. StreamEvent：流式事件（判别式联合）=====
export type StreamEvent =
  | { type: "start" }
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_call_start"; toolCallId: string; toolName: string }
  | { type: "tool_call_delta"; args: string }
  | { type: "tool_call_end" }
  | { type: "done"; usage: Usage }
  | { type: "error"; error: Error };

// ===== 8. StreamOptions =====
export type StreamOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};
```

### 为什么这样设计？

- `Message` 用联合类型而非简单字符串，因为 LLM 对话有严格的角色轮转规则
- `ContentBlock` 让消息可以混合文本、图片、工具调用
- `Context` 是可序列化的，可以跨 Provider 传递（这是核心价值）
- `StreamEvent` 用判别式联合(discriminated union)，消费者用 `switch(event.type)` 处理

---

## 第二步：构建 EventStream（异步事件流）

这是框架的"引擎"——让消费者可以用 `for await` 消费流式事件。

```typescript
// utils/event-stream.ts

export class EventStream<TEvent, TResult> implements AsyncIterable<TEvent> {
  private queue: TEvent[] = [];
  private resolve: ((value: IteratorResult<TEvent>) => void) | null = null;
  private done = false;
  private resultPromise: Promise<TResult>;
  private resolveResult!: (value: TResult) => void;
  private rejectResult!: (error: Error) => void;

  constructor() {
    this.resultPromise = new Promise((resolve, reject) => {
      this.resolveResult = resolve;
      this.rejectResult = reject;
    });
  }

  // ---- 生产者端 API ----

  // 推送事件
  push(event: TEvent) {
    if (this.resolve) {
      // 有消费者在等待，直接给它
      this.resolve({ value: event, done: false });
      this.resolve = null;
    } else {
      // 没人等，存入队列
      this.queue.push(event);
    }
  }

  // 标记完成
  close(result: TResult) {
    this.done = true;
    this.resolveResult(result);
    if (this.resolve) {
      this.resolve({ value: undefined as any, done: true });
    }
  }

  // 标记错误
  error(err: Error) {
    this.done = true;
    this.rejectResult(err);
    if (this.resolve) {
      this.resolve({ value: undefined as any, done: true });
    }
  }

  // ---- 消费者端 API ----

  // 获取最终结果
  result(): Promise<TResult> {
    return this.resultPromise;
  }

  // 实现 AsyncIterable 接口
  [Symbol.asyncIterator](): AsyncIterator<TEvent> {
    return {
      next: () => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift()!, done: false });
        }
        if (this.done) {
          return Promise.resolve({ value: undefined as any, done: true });
        }
        return new Promise((resolve) => { this.resolve = resolve; });
      },
    };
  }
}

export type AssistantMessageEventStream = EventStream<StreamEvent, AssistantMessage>;
```

### 使用示例

```typescript
const s = stream(model, context);

// 实时消费事件
for await (const event of s) {
  if (event.type === "text_delta") {
    process.stdout.write(event.text); // 逐字打印
  }
}

// 获取完整结果
const message = await s.result();
console.log("Total tokens:", message.usage?.totalTokens);
```

### 为什么这样设计？

- 生产者-消费者模式，支持背压(backpressure)
- 同时提供 `AsyncIterable`（事件流）和 `result()`（最终结果）
- 这比 callback 或 RxJS Observable 更符合现代 TypeScript 习惯

---

## 第三步：构建 API 注册表 (`api-registry.ts`)

注册表是框架的"路由器"——根据 `model.api` 字段找到对应的 Provider。

```typescript
// api-registry.ts

type ApiProvider = {
  api: string;
  stream: (
    model: Model,
    context: Context,
    options?: StreamOptions
  ) => AssistantMessageEventStream;
};

const registry = new Map<string, ApiProvider>();

export function registerApiProvider(provider: ApiProvider) {
  registry.set(provider.api, provider);
}

export function getApiProvider(api: string): ApiProvider {
  const provider = registry.get(api);
  if (!provider) {
    throw new Error(`No provider registered for API: ${api}`);
  }
  return provider;
}
```

### 为什么用注册表模式？

- **解耦**：核心代码不依赖任何具体 Provider
- **可扩展**：用户可以注册自定义 Provider
- **Tree-shaking 友好**：不需要的 Provider 可以不注册

---

## 第四步：实现第一个 Provider — Anthropic

这是最核心的工作——将通用格式转换为 Anthropic API 的格式。

### 4.1 消息格式转换

```typescript
// providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";

function convertMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "user":
        return {
          role: "user" as const,
          content: typeof msg.content === "string"
            ? msg.content
            : msg.content.map((block) => {
                if (block.type === "text") return { type: "text" as const, text: block.text };
                if (block.type === "image") {
                  return {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: block.mediaType,
                      data: block.data,
                    },
                  };
                }
                throw new Error(`Unknown block type`);
              }),
        };

      case "assistant":
        return {
          role: "assistant" as const,
          content: msg.content.map((block) => {
            if (block.type === "text") return { type: "text" as const, text: block.text };
            if (block.type === "thinking")
              return { type: "thinking" as const, thinking: block.text };
            if (block.type === "tool_call") {
              return {
                type: "tool_use" as const,  // ⚠️ Anthropic 叫 "tool_use" 不是 "tool_call"
                id: block.toolCallId,
                name: block.toolName,
                input: block.args,
              };
            }
            throw new Error(`Unknown block type`);
          }),
        };

      case "tool_result":
        return {
          role: "user" as const,  // ⚠️ Anthropic 把 tool_result 放在 user 角色里
          content: [{
            type: "tool_result" as const,
            tool_use_id: msg.toolCallId,
            content: msg.content,
            is_error: msg.isError,
          }],
        };
    }
  });
}
```

### 4.2 工具格式转换

```typescript
function convertTools(tools: Tool[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
  }));
}
```

### 4.3 核心流式函数

```typescript
export function streamAnthropic(
  model: Model,
  context: Context,
  options: StreamOptions = {}
): EventStream<StreamEvent, AssistantMessage> {
  const eventStream = new EventStream<StreamEvent, AssistantMessage>();

  // 异步执行，不阻塞返回
  (async () => {
    try {
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: model.baseUrl,
      });

      const response = await client.messages.create({
        model: model.id,
        max_tokens: options.maxTokens ?? model.maxOutputTokens,
        temperature: options.temperature,
        system: context.systemPrompt,
        messages: convertMessages(context.messages),
        tools: context.tools.length > 0 ? convertTools(context.tools) : undefined,
        stream: true,
      });

      eventStream.push({ type: "start" });

      let inputTokens = 0;
      let outputTokens = 0;
      const contentBlocks: AssistantContentBlock[] = [];

      for await (const event of response) {
        switch (event.type) {
          case "message_start":
            inputTokens = event.message.usage.input_tokens;
            break;

          case "content_block_start":
            if (event.content_block.type === "text") {
              contentBlocks.push({ type: "text", text: "" });
            } else if (event.content_block.type === "tool_use") {
              contentBlocks.push({
                type: "tool_call",
                toolCallId: event.content_block.id,
                toolName: event.content_block.name,
                args: {},
              });
              eventStream.push({
                type: "tool_call_start",
                toolCallId: event.content_block.id,
                toolName: event.content_block.name,
              });
            }
            break;

          case "content_block_delta":
            if (event.delta.type === "text_delta") {
              const last = contentBlocks[contentBlocks.length - 1];
              if (last.type === "text") last.text += event.delta.text;
              eventStream.push({ type: "text_delta", text: event.delta.text });
            } else if (event.delta.type === "input_json_delta") {
              eventStream.push({ type: "tool_call_delta", args: event.delta.partial_json });
            }
            break;

          case "content_block_stop":
            const lastBlock = contentBlocks[contentBlocks.length - 1];
            if (lastBlock.type === "tool_call") {
              eventStream.push({ type: "tool_call_end" });
            }
            break;

          case "message_delta":
            outputTokens = event.usage.output_tokens;
            break;
        }
      }

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

  return eventStream; // 立即返回，流式数据异步推送
}

function calculateCost(model: Model, input: number, output: number): number {
  return (
    (input / 1_000_000) * model.pricing.inputPerMillion +
    (output / 1_000_000) * model.pricing.outputPerMillion
  );
}
```

### 4.4 注册到全局注册表

```typescript
registerApiProvider({
  api: "anthropic-messages",
  stream: streamAnthropic,
});
```

### Provider 开发核心教训

1. **消息格式不同**：Anthropic 用 `tool_use`，OpenAI 用 `tool_calls`，Google 用 `functionCall`
2. **角色映射不同**：Anthropic 把 tool result 放在 `user` 角色里，OpenAI 有独立的 `tool` 角色
3. **流式事件不同**：每家的 SSE 事件名和结构都不一样
4. **错误处理**：一定要 try-catch 整个异步流程，通过 `eventStream.error()` 传播

---

## 第五步：实现 OpenAI Provider

同样的模式，不同的格式转换。

```typescript
// providers/openai.ts
import OpenAI from "openai";

export function streamOpenAI(
  model: Model,
  context: Context,
  options: StreamOptions = {}
): EventStream<StreamEvent, AssistantMessage> {
  const eventStream = new EventStream<StreamEvent, AssistantMessage>();

  (async () => {
    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: model.baseUrl,
      });

      const response = await client.chat.completions.create({
        model: model.id,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        messages: convertToOpenAIMessages(context),
        tools: convertToOpenAITools(context.tools),
        stream: true,
      });

      eventStream.push({ type: "start" });

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          eventStream.push({ type: "text_delta", text: delta.content });
        }

        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              eventStream.push({
                type: "tool_call_start",
                toolCallId: toolCall.id!,
                toolName: toolCall.function.name,
              });
            }
            if (toolCall.function?.arguments) {
              eventStream.push({
                type: "tool_call_delta",
                args: toolCall.function.arguments,
              });
            }
          }
        }
      }

      // ... 构建最终结果，同 Anthropic 模式
      eventStream.close(assistantMessage);
    } catch (err) {
      eventStream.error(err as Error);
    }
  })();

  return eventStream;
}

registerApiProvider({
  api: "openai-completions",
  stream: streamOpenAI,
});
```

### OpenAI 与 Anthropic 的关键差异

| 差异点 | Anthropic | OpenAI |
|--------|-----------|--------|
| Tool result 角色 | 嵌入 `user` 消息 | 独立 `role: "tool"` |
| Tool call 名称 | `tool_use` | `tool_calls` |
| 参数流式到达 | `input_json_delta` | `function.arguments` 字符串片段 |
| 兼容性 | 仅 Anthropic | Groq, Mistral, xAI 等都兼容 |

> OpenAI 兼容格式的 Provider 复用率最高，原框架的 `openai-completions.ts` 有 28KB，光兼容性处理就有 15+ 种 Provider 特殊情况。

---

## 第六步：构建统一入口 (`stream.ts`)

这是用户直接调用的 API，极其简洁：

```typescript
// stream.ts
import { getApiProvider } from "./api-registry";

// 流式 API
export function stream(
  model: Model,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const provider = getApiProvider(model.api);
  return provider.stream(model, context, options);
}

// 非流式（等待完整响应）
export async function complete(
  model: Model,
  context: Context,
  options?: StreamOptions
): Promise<AssistantMessage> {
  const s = stream(model, context, options);
  for await (const _ of s) { /* drain events */ }
  return s.result();
}
```

所有复杂性都封装在 Provider 适配器里了。

---

## 第七步：模型注册表 (`models.ts`)

预定义所有已知模型的元数据：

```typescript
// models.ts

const models: Model[] = [
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    api: "anthropic-messages",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    supportsReasoning: true,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    api: "openai-completions",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    supportsReasoning: false,
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10 },
  },
  // ... 更多模型
];

export function getModel(provider: string, modelId: string): Model {
  const model = models.find(m => m.provider === provider && m.id === modelId);
  if (!model) throw new Error(`Model not found: ${provider}/${modelId}`);
  return model;
}
```

> 原框架用 `scripts/generate-models.ts` 脚本自动生成 312KB 的模型注册表，从各 Provider API 自动拉取最新模型信息。

---

## 第八步：跨 Provider 消息转换 (`transform-messages.ts`)

这是框架最精妙的部分——让对话可以在不同 Provider 间无缝切换。

```typescript
// providers/transform-messages.ts

export function transformMessages(
  messages: Message[],
  fromModel: Model,
  toModel: Model
): Message[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant") return msg;

    const transformed: AssistantContentBlock[] = msg.content.map((block) => {
      // 1. Thinking blocks：不同模型的思考格式不互通
      //    将其他模型的 thinking 转为普通 text
      if (block.type === "thinking" && fromModel.provider !== toModel.provider) {
        return { type: "text", text: `[思考过程]\n${block.text}` };
      }

      // 2. Tool call IDs：不同 Provider 格式不同
      //    Anthropic: "toolu_xxx", OpenAI: "call_xxx"
      if (block.type === "tool_call") {
        return {
          ...block,
          toolCallId: normalizeToolCallId(block.toolCallId, toModel),
        };
      }

      return block;
    });

    return { ...msg, content: transformed };
  });
}
```

### 还需处理的边界情况

- **孤儿工具调用**：有 `tool_call` 但没有对应 `tool_result`（对话中断），需要插入合成的错误结果
- **中断的 assistant 消息**：错误/中止的 assistant 消息需要整条剥离
- **Thinking 签名**：只在同模型回放时保留 thought signatures

---

## 第九步：工具调用验证 (`utils/validation.ts`)

用 AJV 验证 LLM 返回的工具参数是否符合 JSON Schema：

```typescript
// utils/validation.ts
import Ajv from "ajv";

const ajv = new Ajv();

export function validateToolArgs(
  tool: Tool,
  args: unknown
): { valid: boolean; errors?: string } {
  const validate = ajv.compile(tool.parameters);
  const valid = validate(args);
  if (!valid) {
    return { valid: false, errors: ajv.errorsText(validate.errors) };
  }
  return { valid: true };
}
```

---

## 第十步：组装并导出 (`index.ts`)

```typescript
// index.ts - 公共 API

// 确保所有内置 Provider 被注册（副作用导入）
import "./providers/register-builtins";

// 导出核心 API
export { stream, complete } from "./stream";
export { getModel } from "./models";
export { registerApiProvider } from "./api-registry";

// 导出类型
export type {
  Model, Context, Message, UserMessage, AssistantMessage,
  ToolResultMessage, Tool, StreamEvent, StreamOptions, Usage,
} from "./types";

export type { EventStream } from "./utils/event-stream";
```

---

## 完整使用示例

```typescript
import { stream, complete, getModel } from "@your-name/ai";

// 1. 简单对话
const model = getModel("anthropic", "claude-sonnet-4-5-20250929");
const response = await complete(model, {
  systemPrompt: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }],
  tools: [],
});
console.log(response.content[0]); // { type: "text", text: "Hello! ..." }

// 2. 流式输出
const s = stream(model, {
  messages: [{ role: "user", content: "Write a poem" }],
  tools: [],
});
for await (const event of s) {
  if (event.type === "text_delta") process.stdout.write(event.text);
}

// 3. 带工具调用
const context = {
  messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  tools: [{
    name: "get_weather",
    description: "Get weather for a city",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  }],
};
const s2 = stream(model, context);
for await (const event of s2) {
  if (event.type === "tool_call_start") console.log(`Calling: ${event.toolName}`);
}

// 4. 跨 Provider 切换（同一个 context！）
const openaiModel = getModel("openai", "gpt-4o");
const response2 = await complete(openaiModel, context); // 无缝切换
```

---

## 开发路线图

| 阶段 | 内容 | 复杂度 | 文件 |
|------|------|--------|------|
| 1 | 核心类型定义 | 低 | `types.ts` |
| 2 | 异步事件流 | 中 | `utils/event-stream.ts` |
| 3 | Provider 注册表 | 低 | `api-registry.ts` |
| 4 | Anthropic Provider | **高** | `providers/anthropic.ts` |
| 5 | OpenAI Provider | **高** | `providers/openai.ts` |
| 6 | 统一入口 | 低 | `stream.ts` |
| 7 | 模型注册表 | 低 | `models.ts` |
| 8 | 跨 Provider 消息转换 | **高** | `providers/transform-messages.ts` |
| 9 | 工具参数验证 | 中 | `utils/validation.ts` |
| 10 | 打包导出 | 低 | `index.ts` |

### 进阶扩展

| 功能 | 说明 |
|------|------|
| Thinking 抽象 | 统一 `ThinkingLevel`（minimal/low/medium/high/xhigh）映射到各 Provider |
| Prompt Caching | 统一 `CacheRetention`（none/short/long）映射到各 Provider 缓存机制 |
| 部分 JSON 解析 | 用 `partial-json` 库实时解析流式到达的工具参数 |
| OAuth 认证 | 内置 Anthropic, GitHub Copilot, Google 等 OAuth 流程 |
| 上下文溢出检测 | 模式匹配 15+ Provider 的不同溢出错误消息 |
| 模型自动生成 | 脚本从各 Provider API 拉取最新模型信息 |

---

## 文件结构参考

```
packages/ai/
  src/
    index.ts                      ← 公共 API 导出
    types.ts                      ← 核心类型 (10KB)
    stream.ts                     ← stream/complete 入口
    api-registry.ts               ← Provider 注册表
    models.ts                     ← 模型查询 + 成本计算
    models.generated.ts           ← 自动生成模型定义 (312KB)
    env-api-keys.ts               ← 环境变量 API Key 解析
    cli.ts                        ← CLI OAuth 登录
    providers/
      register-builtins.ts        ← 注册所有内置 Provider
      anthropic.ts                ← Anthropic (26KB)
      openai-completions.ts       ← OpenAI Chat Completions (28KB)
      openai-responses.ts         ← OpenAI Responses API (8KB)
      google.ts                   ← Google Gemini (13KB)
      google-vertex.ts            ← Vertex AI (14KB)
      amazon-bedrock.ts           ← AWS Bedrock (23KB)
      transform-messages.ts       ← 跨 Provider 消息转换
      simple-options.ts           ← Thinking level 映射
    utils/
      event-stream.ts             ← 异步事件流
      json-parse.ts               ← 部分 JSON 解析
      overflow.ts                 ← 上下文溢出检测
      validation.ts               ← AJV 工具参数验证
      oauth/                      ← OAuth 实现 (5 个 Provider)
  test/                           ← 34 个测试文件
  scripts/
    generate-models.ts            ← 模型定义生成脚本
```
