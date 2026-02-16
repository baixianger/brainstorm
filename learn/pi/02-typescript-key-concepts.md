# TypeScript 核心概念笔记：判别式联合 & 异步事件流

> 学习来源：分析 [@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai) 统一 LLM API 框架
> 核心主题：**"静态数据的精准分类"与"动态数据的时序管理"**

---

## 1. 判别式联合 (Discriminated Unions)

**一句话定义：** 通过共有的"标签"字段，让编译器自动识别联合类型中具体是哪一个。

### 核心要素

1. **多个类型共有一个"标签"字段**（通常是 `type`, `role`, `kind`）
2. **标签的值是唯一的字面量**（如 `"user"` vs `"assistant"`）

### 语法示例

```typescript
// 定义：每个成员有唯一的 role 标签
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; thinking: string };

// 使用：switch 判断标签，编译器自动收窄类型
function handle(msg: Message) {
  switch (msg.role) {
    case "user":
      console.log(msg.text);      // ✅ 编译器知道这里有 text
      break;
    case "assistant":
      console.log(msg.thinking);   // ✅ 编译器知道这里有 thinking
      break;
  }
}
```

### 在框架中的实际应用

```typescript
// StreamEvent：12 种流式事件，靠 type 字段区分
type StreamEvent =
  | { type: "start" }
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_call_start"; toolCallId: string; toolName: string }
  | { type: "tool_call_delta"; args: string }
  | { type: "tool_call_end" }
  | { type: "done"; usage: Usage }
  | { type: "error"; error: Error };

// 消费者用 switch 安全处理每种事件
for await (const event of stream) {
  switch (event.type) {
    case "text_delta":
      process.stdout.write(event.text);  // 自动收窄，安全访问
      break;
    case "tool_call_start":
      console.log(`调用工具: ${event.toolName}`);
      break;
    case "error":
      console.error(event.error);  // 只有 error 事件才有 error 字段
      break;
  }
}
```

### 核心感悟

它不仅仅是联合类型（A 或 B），它带有一种**自证明**属性。通过判断标签，编译器能自动"收窄"类型，让你安全地访问特定属性。就像给不同的快递盒贴上标签，不用拆开就知道里面是易碎品还是书籍。

---

## 2. 异步迭代器与事件流 (Async Streams)

**一句话定义：** 用 `for await...of` 优雅地消费随时间逐步到达的数据。

### 核心要素

1. **`AsyncIterable` 接口：** 让对象可以使用 `for await...of` 遍历
2. **生产者 (Producer)：** 调用 `push(event)` 推送数据，调用 `close(result)` 结案
3. **消费者 (Consumer)：** 通过 `next()` 挂起等待，直到被唤醒

### 语法示例

```typescript
// 消费端：像遍历数组一样遍历流式数据
for await (const chunk of eventStream) {
  process.stdout.write(chunk.text);
}
```

### EventStream 内部机制

```typescript
class EventStream<TEvent, TResult> implements AsyncIterable<TEvent> {
  private queue: TEvent[] = [];
  private resolve: ((value: IteratorResult<TEvent>) => void) | null = null;

  // 生产者推数据
  push(event: TEvent) {
    if (this.resolve) {
      // 消费者在等 → 直接唤醒它
      this.resolve({ value: event, done: false });
      this.resolve = null;
    } else {
      // 没人等 → 存入队列
      this.queue.push(event);
    }
  }

  // 消费者取数据（AsyncIterator 协议）
  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift()!, done: false });
        }
        if (this.done) {
          return Promise.resolve({ value: undefined, done: true });
        }
        // 没数据 → 留一个钩子，挂起等待
        return new Promise(resolve => { this.resolve = resolve; });
      }
    };
  }
}
```

### 关键设计：双通道输出

```typescript
const s = stream(model, context);

// 通道 1：逐事件消费（实时 UI 更新）
for await (const event of s) {
  if (event.type === "text_delta") process.stdout.write(event.text);
}

// 通道 2：获取完整结果（含 token 用量、成本等）
const message = await s.result();
console.log(`花费: $${message.usage?.cost}`);
```

### 核心感悟

这就是一套 **"Hook（钩子）联动系统"**：

- **没有数据时：** 消费者留下一个"回执"（`resolve` 钩子）并进入休眠
- **数据到达时：** 生产者触发这个钩子，将控制权和数据交还给消费者
- **职责对等：** 生产者有义务"叫醒"消费者，也有义务在最后"交付结果（`TResult`）"

---

## 3. 两者的联动关系

在实际开发中，这两个概念是**深度耦合**的：

1. **`EventStream`** 负责把数据从后端**搬运**到前端 → 解决 **"什么时候到"** 的问题
2. **`Discriminated Unions`** 负责定义搬运过来的每一份数据**到底是什么** → 解决 **"怎么用"** 的问题

| 维度        | 判别式联合                | 异步事件流                                |
| --------- | -------------------- | ------------------------------------ |
| **关注点**   | 数据的**形状**和安全性        | 数据的**时序**和控制权                        |
| **关键词**   | 字面量、类型收窄、Switch/Case | Promise、Resolve/Reject、AsyncIterator |
| **解决的问题** | 不确定**是什么类型**         | 不确定**什么时候到**                         |
| **金句**    | "通过标签精准识别"           | "全是钩子，生产者有义务叫醒消费者"                   |

### 联动示例

```typescript
// EventStream<StreamEvent, AssistantMessage>
//             ↑ 判别式联合      ↑ 最终结果类型
//             (每个事件是什么)    (整体结果是什么)

const s: EventStream<StreamEvent, AssistantMessage> = stream(model, context);

for await (const event of s) {    // ← 异步迭代器：控制时序
  switch (event.type) {            // ← 判别式联合：识别类型
    case "text_delta":             //    编译器知道这里有 event.text
      render(event.text);
      break;
    case "tool_call_start":        //    编译器知道这里有 event.toolName
      showToolUI(event.toolName);
      break;
  }
}
```

---

## 4. 延伸：这两个概念的通用适用场景

### 判别式联合适用于

- Redux Action 类型（`{ type: "ADD_TODO" }` vs `{ type: "REMOVE_TODO" }`）
- API 响应（`{ status: "success"; data }` vs `{ status: "error"; message }`）
- AST 节点（编译器中的 `IfStatement` vs `ForLoop` vs `FunctionDecl`）
- 状态机状态（`"loading"` vs `"ready"` vs `"error"`）

### 异步事件流适用于

- LLM 流式响应（SSE / Server-Sent Events）
- WebSocket 消息处理
- 文件逐行读取（`readline` 接口）
- 数据库游标遍历
- 任何 "数据分批到达" 的场景

---

> **总结：** 掌握的不仅是两个语法点，而是一套**处理不确定性**的高级编程思维——不确定是什么类型（用判别式联合），不确定什么时候到（用异步事件流）。
