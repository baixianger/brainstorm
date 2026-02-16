# 数据双向转换全链路详解：发出去 & 收回来

> 学习来源：[@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai)
> 前置阅读：[03-anthropic-provider-deep-dive.md](./03-anthropic-provider-deep-dive.md)、[04-openai-provider-deep-dive.md](./04-openai-provider-deep-dive.md)、[05-message-transform-deep-dive.md](./05-message-transform-deep-dive.md)
> 核心目标：**理解框架的数据流不是"一来一回的对称翻译"，而是"整进碎出、碎进整出"的非对称闭环**

---

## 先看全貌：一次完整请求的数据流

```
用户代码
  │
  │  stream(model, context)
  │  传入: Context { systemPrompt, messages[], tools[] }
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     框架统一层                                    │
│                                                                 │
│  ┌──────────────┐                    ┌──────────────────────┐   │
│  │ 发出去 (Outgoing) │                │  收回来 (Incoming)      │   │
│  │                │                    │                      │   │
│  │ convertMessages()                   │ SSE 事件循环           │   │
│  │ convertTools()                      │ + 状态累积器            │   │
│  │ 构造请求参数                           │ + EventStream        │   │
│  │                │                    │                      │   │
│  │ 一次性、批量      │                    │ 逐事件、增量            │   │
│  │ "整进整出"       │                    │ "碎进整出"             │   │
│  └───────┬──────┘                    └──────────▲───────────┘   │
│          │                                       │               │
└──────────┼───────────────────────────────────────┼───────────────┘
           │                                       │
           ▼                                       │
┌──────────────────────────────────────────────────────────────────┐
│                   Provider 原生 API                               │
│                                                                  │
│   HTTP POST (JSON body)  ──────→  API Server  ──────→  SSE 流    │
│   一次性发送完整请求                                   逐事件返回响应    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**核心洞察：发出去和收回来不是对称的。** 发出去是"翻译"（映射函数），收回来是"组装"（状态机）。

---

## 第一节：发出去——convertMessages 的"整进整出"

### 1.1 整体流程

```
框架统一的 Context
       │
       │  convertMessages(context.messages)
       │  convertTools(context.tools)
       │  构造 system prompt
       ▼
Provider 原生的请求参数
       │
       │  HTTP POST（一次性发送）
       ▼
Provider API Server
```

发出去的特点：
- **一次性**：所有消息一起转换，一起发送
- **纯函数**：`convertMessages(messages) → ProviderMessages`，无状态、无副作用
- **只做格式映射**：字段名改一下、结构调一下、角色换一下

### 1.2 三种消息的转换对比

#### User Message——最简单

```
框架统一格式                   Anthropic                    OpenAI
──────────                   ─────────                    ──────
{ role: "user",         →    { role: "user",         →    { role: "user",
  content: "你好" }            content: "你好" }            content: "你好" }

                              几乎不变                      几乎不变
```

带图片时稍有差异：

```
框架统一格式                   Anthropic                         OpenAI
──────────                   ─────────                         ──────
{ type: "image",        →    { type: "image",             →    { type: "image_url",
  mediaType: "image/png",      source: {                        image_url: {
  data: "iVBOR..." }            type: "base64",                   url: "data:image/png;
                                media_type: "image/png",                base64,iVBOR..."
                                data: "iVBOR..."                } }
                              } }
                              ↑ 分离的字段                        ↑ 合并为 data URL
```

#### Assistant Message——差异最大

```
框架统一格式                        Anthropic                      OpenAI
──────────                        ─────────                      ──────
{ role: "assistant",              { role: "assistant",           { role: "assistant",
  content: [                        content: [                     content: "天气晴朗",
    { type: "text",                   { type: "text",              tool_calls: [     ← 顶层！
      text: "天气晴朗" },                text: "天气晴朗" },           { id: "call_abc",
    { type: "tool_call",              { type: "tool_use",  ←名称      type: "function",
      toolCallId: "toolu_01",          id: "toolu_01",               function: {
      toolName: "get_weather",          name: "get_weather",           name: "get_weather",
      args: { city: "Tokyo" }           input: {city:"Tokyo"}          arguments: '{"city":"Tokyo"}'
    }                                 }                              } }             ← 字符串！
  ]                                 ]                              ]
}                                 }                              }

                                  tool_call 在 content 数组里      tool_calls 是顶层独立字段
                                  args 是对象                      arguments 是 JSON 字符串
                                  叫 "tool_use"                   叫 "tool_calls"
```

#### Tool Result Message——角色都不一样

```
框架统一格式                        Anthropic                      OpenAI
──────────                        ─────────                      ──────
{ role: "tool_result",     →      { role: "user",          →     { role: "tool",
  toolCallId: "toolu_01",           content: [{                    tool_call_id: "toolu_01",
  content: "15°C",                    type: "tool_result",         content: "15°C"
  isError: false }                    tool_use_id: "toolu_01",   }
                                      content: "15°C",
                                      is_error: false             独立的 "tool" 角色
                                    }]                            字段名 tool_call_id
                                  }
                                  嵌入 "user" 角色！
                                  字段名 tool_use_id
```

### 1.3 System Prompt 的处理差异

```
框架统一格式                     Anthropic                     OpenAI
──────────                     ─────────                     ──────
Context {                      POST body {                   messages: [
  systemPrompt: "你是助手",       system: "你是助手",    ←顶层     { role: "system",    ←第一条消息
  messages: [...]                messages: [...]               content: "你是助手" },
}                              }                               ...其他消息
                                                             ]
```

### 1.4 Tool 定义的转换

```
框架统一格式                     Anthropic                     OpenAI
──────────                     ─────────                     ──────
{ name: "get_weather",    →    { name: "get_weather",   →    { type: "function",  ← 多一层包装
  description: "获取天气",        description: "获取天气",       function: {
  parameters: {                   input_schema: {    ←名称       name: "get_weather",
    type: "object",                 type: "object",              description: "获取天气",
    properties: {...}               properties: {...}            parameters: {
  }                               }                                type: "object",
}                              }                                   properties: {...}
                                                                 }
                               直接传，改个字段名                    } }
                                                               多一层 function 包装
```

---

## 第二节：收回来——SSE 事件循环的"碎进整出"

### 2.1 为什么不能用 convertMessages 的"反函数"？

因为响应不是一次性到达的 JSON，而是**逐片段到达的 SSE 事件流**：

```
发出去: 完整 JSON ──POST──→ API
收回来: API ──SSE──→ 片段1 → 片段2 → 片段3 → ... → 片段N
```

你没法对一个还没到完的数据做"反向翻译"。你需要的是一个**状态机**，一边接收碎片，一边组装结果。

### 2.2 状态机的三个角色

```
┌─────────────┐     事件      ┌──────────────┐     推送      ┌─────────────┐
│ Provider API │  ──SSE──→   │   状态累积器    │  ──push──→  │  EventStream  │
│   (源头)     │              │  (翻译+组装)   │              │   (管道)      │
└─────────────┘              └──────────────┘              └──────┬──────┘
                                    │                              │
                              累积 contentBlocks              for await 消费
                              累积 argsBuffer                      │
                              累积 usage                           ▼
                                    │                        ┌─────────────┐
                                    │    close(result)       │   消费者      │
                                    └───────────────────────→│  (用户代码)   │
                                                             └─────────────┘
```

### 2.3 Anthropic 的收回来过程——逐事件拆解

以一次带工具调用的响应为例，完整追踪每个事件如何被"翻译"并累积：

```typescript
// ===== 初始状态 =====
const contentBlocks: AssistantContentBlock[] = [];
let inputTokens = 0;
let outputTokens = 0;
let currentToolCallArgs = "";

// ===== 事件 1: message_start =====
// Anthropic SSE:
{ type: "message_start", message: { usage: { input_tokens: 150 } } }
// 处理:
inputTokens = 150;
// EventStream: (不推送，这是内部记账)

// ===== 事件 2: content_block_start (text) =====
// Anthropic SSE:
{ type: "content_block_start", content_block: { type: "text", text: "" } }
// 处理: 创建新的统一格式 block
contentBlocks.push({ type: "text", text: "" });
//                   ↑ Anthropic "text" → 框架 "text" (碰巧同名)

// ===== 事件 3-5: content_block_delta (text) =====
// Anthropic SSE:
{ type: "content_block_delta", delta: { type: "text_delta", text: "东京" } }
{ type: "content_block_delta", delta: { type: "text_delta", text: "天气" } }
{ type: "content_block_delta", delta: { type: "text_delta", text: "晴朗。" } }
// 处理: 累积文本 + 推送实时事件
contentBlocks[0].text += "东京";  // → "东京"
eventStream.push({ type: "text_delta", text: "东京" });
contentBlocks[0].text += "天气";  // → "东京天气"
eventStream.push({ type: "text_delta", text: "天气" });
contentBlocks[0].text += "晴朗。"; // → "东京天气晴朗。"
eventStream.push({ type: "text_delta", text: "晴朗。" });
//                   ↑ Anthropic "text_delta" → 框架 "text_delta" (碰巧同名)

// ===== 事件 6: content_block_stop =====
// (text block 结束，无特殊处理)

// ===== 事件 7: content_block_start (tool_use) =====
// Anthropic SSE:
{ type: "content_block_start",
  content_block: { type: "tool_use", id: "toolu_01ABC", name: "get_weather" } }
//                        ↑ Anthropic 叫 "tool_use"
// 处理: 翻译为框架格式
contentBlocks.push({
  type: "tool_call",           // ← "tool_use" → "tool_call" !!
  toolCallId: "toolu_01ABC",   // ← "id" → "toolCallId" !!
  toolName: "get_weather",     // ← "name" → "toolName" !!
  args: {},
});
currentToolCallArgs = "";
eventStream.push({
  type: "tool_call_start",
  toolCallId: "toolu_01ABC",
  toolName: "get_weather",
});

// ===== 事件 8-10: content_block_delta (input_json) =====
// Anthropic SSE:
{ type: "content_block_delta", delta: { type: "input_json_delta", partial_json: '{"ci' } }
{ type: "content_block_delta", delta: { type: "input_json_delta", partial_json: 'ty":"' } }
{ type: "content_block_delta", delta: { type: "input_json_delta", partial_json: 'Tokyo"}' } }
// 处理: 累积 JSON 片段
currentToolCallArgs += '{"ci';     // → '{"ci'
eventStream.push({ type: "tool_call_delta", args: '{"ci' });
//                   ↑ Anthropic "input_json_delta" → 框架 "tool_call_delta" !!
currentToolCallArgs += 'ty":"';    // → '{"city":"'
eventStream.push({ type: "tool_call_delta", args: 'ty":"' });
currentToolCallArgs += 'Tokyo"}';  // → '{"city":"Tokyo"}'
eventStream.push({ type: "tool_call_delta", args: 'Tokyo"}' });

// ===== 事件 11: content_block_stop =====
// 处理: 解析累积的 JSON → 存入 block
contentBlocks[1].args = JSON.parse('{"city":"Tokyo"}');
// → args = { city: "Tokyo" }   ← 字符串片段组装为对象！
eventStream.push({ type: "tool_call_end" });

// ===== 事件 12: message_delta =====
// Anthropic SSE:
{ type: "message_delta", usage: { output_tokens: 45 } }
// 处理:
outputTokens = 45;

// ===== 关闭 EventStream =====
const usage = { inputTokens: 150, outputTokens: 45, totalTokens: 195, cost: 0.00117 };
eventStream.push({ type: "done", usage });
eventStream.close({
  role: "assistant",
  content: contentBlocks,   // ← 已经是框架统一格式！
  usage,
});
```

### 2.4 OpenAI 的收回来过程——对比差异

同样的工具调用场景，OpenAI 的 SSE 事件结构完全不同：

```typescript
// ===== 初始状态 =====
const contentBlocks: AssistantContentBlock[] = [];
const toolCallTrackers = new Map();   // ← OpenAI 需要 index 追踪器

// ===== chunk 1: 角色声明 =====
// OpenAI SSE:
{ choices: [{ delta: { role: "assistant", content: null } }] }
// 处理: (仅标记开始)
eventStream.push({ type: "start" });

// ===== chunk 2-3: 文本内容 =====
// OpenAI SSE:
{ choices: [{ delta: { content: "东京天气" } }] }
{ choices: [{ delta: { content: "晴朗。" } }] }
// 处理: 同 Anthropic，累积 + 推送
// ⚠️ 但结构不同: Anthropic 是 event.delta.text, OpenAI 是 chunk.choices[0].delta.content

// ===== chunk 4: 工具调用开始 =====
// OpenAI SSE:
{ choices: [{ delta: { tool_calls: [{
    index: 0,                           // ← Anthropic 没有 index！
    id: "call_abc123",                   // ← call_ 前缀，不是 toolu_
    type: "function",                    // ← 多了 type 字段
    function: {
      name: "get_weather",
      arguments: ""                      // ← 叫 arguments 不是 input
    }
  }] } }] }
// 处理: 翻译为框架格式
contentBlocks.push({
  type: "tool_call",                     // ← "function" → "tool_call"
  toolCallId: "call_abc123",             // ← "id" → "toolCallId"
  toolName: "get_weather",               // ← "function.name" → "toolName"
  args: {},
});
toolCallTrackers.set(0, { argsBuffer: "", blockIndex: 1 });  // 按 index 追踪
eventStream.push({ type: "tool_call_start", toolCallId: "call_abc123", toolName: "get_weather" });

// ===== chunk 5-6: 工具参数片段 =====
// OpenAI SSE:
{ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"city' } }] } }] }
{ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '":"Tokyo"}' } }] } }] }
// 处理: 累积
//   ⚠️ Anthropic: delta.type === "input_json_delta", 字段是 partial_json
//   ⚠️ OpenAI:    delta.tool_calls[i].function.arguments
//   完全不同的路径，但框架都翻译为同一个 "tool_call_delta" 事件

// ===== chunk 7: 结束 =====
// OpenAI SSE:
{ choices: [{ delta: {}, finish_reason: "tool_calls" }] }
//   ⚠️ Anthropic 有明确的 content_block_stop 事件
//   ⚠️ OpenAI 只有 finish_reason，需要自行推断所有工具调用结束

// ===== chunk 8: 用量（可能单独一个 chunk）=====
// OpenAI SSE:
{ usage: { prompt_tokens: 150, completion_tokens: 45 } }
//   ⚠️ Anthropic: input_tokens + output_tokens（分两次到达）
//   ⚠️ OpenAI: prompt_tokens + completion_tokens（一次到达，名称不同）
```

---

## 第三节：发出去 vs 收回来——非对称性总结

### 3.1 对比表

| 维度         | 发出去 (Outgoing)              | 收回来 (Incoming)                    |
| ---------- | --------------------------- | --------------------------------- |
| **数据形态**   | 完整的 JSON 对象                 | 逐片段到达的 SSE 事件流                   |
| **处理模式**   | 纯函数映射（无状态）                  | 状态机（有累积状态）                        |
| **核心函数**   | `convertMessages()`         | `for await` 事件循环                  |
| **转换粒度**   | 一次性转换整个消息数组                 | 逐事件翻译 + 增量累积                      |
| **错误处理**   | 转换时即刻发现格式错误                 | 流到一半可能中断，需 partial JSON 恢复        |
| **时间特性**   | 同步（瞬间完成）                    | 异步（持续数秒到数分钟）                      |
| **输出目标**   | Provider API（一个接收者）          | EventStream（双通道：实时事件 + 最终结果）      |

### 3.2 为什么是非对称的？

```
如果 API 是同步的（Request → Response），那转换可以是对称的：
  发出去: convertToProvider(messages)
  收回来: convertFromProvider(response)    ← 简单的反向映射

但 LLM API 是流式的（Request → Event Stream），所以：
  发出去: convertToProvider(messages)       ← 还是简单映射
  收回来: 状态机(event₁) → 状态机(event₂) → ... → 组装结果    ← 完全不同的模式
```

流式的本质决定了**收回来不可能是发出去的反函数**。

### 3.3 两层翻译

仔细看，收回来其实有**两层翻译**同时发生：

```
Layer 1: Provider 术语 → 框架术语（语义翻译）
  Anthropic "tool_use"           → 框架 "tool_call"
  Anthropic "input_json_delta"   → 框架 "tool_call_delta"
  OpenAI "function.arguments"    → 框架 "tool_call_delta"

Layer 2: 碎片 → 完整对象（时序组装）
  '{"ci' + 'ty":"' + 'Tokyo"}'  → { city: "Tokyo" }
  text("东京") + text("天气")     → "东京天气"
  inputTokens + outputTokens     → Usage { total, cost }
```

发出去只需要 Layer 1（语义翻译），收回来需要 Layer 1 + Layer 2。

---

## 第四节：完整闭环图——一次工具调用的全生命周期

把发出去和收回来串在一起，看一次完整的工具调用闭环：

```
═══════════════════════════════════════════════════════════════════
                        第一轮：用户提问
═══════════════════════════════════════════════════════════════════

用户代码:
  context.messages = [{ role: "user", content: "东京天气？" }]
  stream(anthropicModel, context)

──── 发出去 ────
convertMessages():
  框架 { role: "user", content: "东京天气？" }
  → Anthropic { role: "user", content: "东京天气？" }    (无变化)

HTTP POST → Anthropic API

──── 收回来 ────
SSE events → 状态机处理:
  content_block_start(tool_use, id="toolu_01", name="get_weather")
    → contentBlocks.push({ type: "tool_call", toolCallId: "toolu_01", ... })
  content_block_delta(input_json_delta, '{"city":"Tokyo"}')
    → argsBuffer += '{"city":"Tokyo"}'
  content_block_stop
    → args = JSON.parse(argsBuffer) = { city: "Tokyo" }
  message_delta(output_tokens: 30)

eventStream.close():
  → AssistantMessage {
      role: "assistant",
      content: [{ type: "tool_call", toolCallId: "toolu_01",
                  toolName: "get_weather", args: { city: "Tokyo" } }]
    }

═══════════════════════════════════════════════════════════════════
                  中间：用户代码执行工具
═══════════════════════════════════════════════════════════════════

const weather = await fetchWeather("Tokyo");  // → { temp: 15 }
context.messages.push(assistantMsg);
context.messages.push({
  role: "tool_result",
  toolCallId: "toolu_01",
  content: JSON.stringify(weather),
});

═══════════════════════════════════════════════════════════════════
                     第二轮：模型回复
═══════════════════════════════════════════════════════════════════

stream(anthropicModel, context)

──── 发出去 ────
convertMessages():  （三条消息一起转换）

  ① 框架 { role: "user", content: "东京天气？" }
     → Anthropic { role: "user", content: "东京天气？" }

  ② 框架 { role: "assistant", content: [{ type: "tool_call",
           toolCallId: "toolu_01", toolName: "get_weather", args: {...} }] }
     → Anthropic { role: "assistant", content: [{ type: "tool_use",    ← tool_call → tool_use
                   id: "toolu_01", name: "get_weather", input: {...} }] }

  ③ 框架 { role: "tool_result", toolCallId: "toolu_01", content: "..." }
     → Anthropic { role: "user", content: [{ type: "tool_result",      ← tool_result → user 角色
                   tool_use_id: "toolu_01", content: "..." }] }

HTTP POST → Anthropic API

──── 收回来 ────
SSE events:
  content_block_start(text) → contentBlocks.push({ type: "text", text: "" })
  content_block_delta("东京今天晴朗，气温15°C。")
    → contentBlocks[0].text = "东京今天晴朗，气温15°C。"
  message_delta(output_tokens: 25)

eventStream.close():
  → AssistantMessage {
      role: "assistant",
      content: [{ type: "text", text: "东京今天晴朗，气温15°C。" }]
    }
```

### 关键观察

注意第二轮**发出去**时，框架的 `AssistantMessage`（第一轮**收回来**的结果）被**反向转换回** Anthropic 格式：

```
收回来时:  Anthropic "tool_use" → 框架 "tool_call"   (正向翻译)
发出去时:  框架 "tool_call" → Anthropic "tool_use"   (反向翻译)

收回来时:  Anthropic "id" → 框架 "toolCallId"
发出去时:  框架 "toolCallId" → Anthropic "id"
```

所以**第一轮的 convertMessages 和第二轮的 convertMessages 里存在隐式的"往返翻译"**。框架的统一格式就是中间语言（类似编译器的 IR），每次发出去都做一次从 IR 到目标语言的翻译。

---

## 第五节：跨 Provider 切换时的完整数据流

当第二轮切换到 OpenAI 时，数据流会经过**跨 Provider 消息转换**（[05-message-transform-deep-dive.md](./05-message-transform-deep-dive.md)）：

```
第一轮 Anthropic 收回来:
  SSE → 框架格式 AssistantMessage (含 thinking + tool_call, id="toolu_01")

              ↓ 存入 context.messages

第二轮切换 OpenAI 发出去:
  ① transformMessages()         ← 跨 Provider 转换（05 教程内容）
     thinking block → <thinking> 文本
     toolCallId "toolu_01" → 保留（OpenAI 不验证格式）

  ② convertToOpenAIMessages()   ← OpenAI Provider 的格式转换
     框架 "tool_call" → OpenAI "function" + tool_calls 顶层字段
     框架 "tool_result" → OpenAI role: "tool"

HTTP POST → OpenAI API

第二轮 OpenAI 收回来:
  SSE chunks → 框架格式 AssistantMessage (tool_call, id="call_xyz")

              ↓ 存入 context.messages

第三轮可以再切回 Anthropic...
```

### 转换管道的完整顺序

```
context.messages (框架统一格式，可能包含多个 Provider 的历史回复)
       │
       │  ① transformMessages(fromModel, toModel)
       │     修复中断消息 → 补齐孤儿工具 → Thinking 降级 → ID 重映射
       │     (跨 Provider 才需要，同 Provider 跳过)
       ▼
  清洁的框架统一格式消息
       │
       │  ② convertMessages() / convertToOpenAIMessages()
       │     框架统一格式 → Provider 原生格式
       ▼
  Provider 原生请求参数
       │
       │  HTTP POST
       ▼
  Provider API Server
       │
       │  SSE 事件流
       ▼
  状态机 + EventStream
       │
       │  逐事件翻译 + 累积
       ▼
  框架统一格式 AssistantMessage
       │
       │  存入 context.messages
       ▼
  准备下一轮对话...（循环）
```

---

## 关键收获

| 要点                           | 说明                                                 |
| ---------------------------- | -------------------------------------------------- |
| **非对称闭环**                    | 发出去是纯函数映射，收回来是状态机累积，不是互为反函数                       |
| **统一格式是 IR（中间表示）**          | 像编译器的 IR 一样，框架统一格式是所有 Provider 之间的桥梁               |
| **收回来有两层翻译**                 | Layer 1 语义翻译（术语映射）+ Layer 2 时序组装（碎片累积）             |
| **发出去存在隐式往返**                | 第 N 轮收回来的数据，第 N+1 轮会被反向翻译回 Provider 格式             |
| **跨 Provider 多了一步 transform** | 在 convertMessages 之前，先做 thinking 降级、孤儿修复等清洁工作      |
| **EventStream 是枢纽**          | 它同时承担实时推送（碎片事件）和最终交付（完整结果）的双重职责，是收回来链路的核心基础设施 |

---

> **回顾整个系列**：[01](./01-framework-tutorial.md) 建骨架 → [02](./02-typescript-key-concepts.md) 学类型 → [03](./03-anthropic-provider-deep-dive.md) 深入 Anthropic → [04](./04-openai-provider-deep-dive.md) 深入 OpenAI → [05](./05-message-transform-deep-dive.md) 跨 Provider 转换 → **06 双向数据流全貌**
