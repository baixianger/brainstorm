# 学习笔记：从零构建统一 LLM API 框架

> 学习对象：[@mariozechner/pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai)
> 作者：Mario Zechner（libGDX 作者）
> 框架定位：统一 20+ LLM Provider 的 TypeScript SDK，支持流式输出、工具调用、跨 Provider 切换

---

## 目录

| 文件                                                                         | 内容                    | 关键词                              |
| -------------------------------------------------------------------------- | --------------------- | -------------------------------- |
| [01-framework-tutorial.md](./01-framework-tutorial.md)                     | 从零构建框架的十步教学           | 架构设计、Provider 适配器、注册表模式          |
| [02-typescript-key-concepts.md](./02-typescript-key-concepts.md)           | TypeScript 核心概念心得     | 判别式联合、异步事件流、类型收窄                 |
| [03-anthropic-provider-deep-dive.md](./03-anthropic-provider-deep-dive.md) | Anthropic Provider 深度实现 | 消息转换、SSE 事件解析、Thinking Signature |
| [04-openai-provider-deep-dive.md](./04-openai-provider-deep-dive.md)       | OpenAI Provider 深度实现   | 多 Provider 兼容、并发工具调用、Reasoning   |
| [05-message-transform-deep-dive.md](./05-message-transform-deep-dive.md)   | 跨 Provider 消息转换详解     | Thinking 降级、孤儿工具修复、Partial JSON   |
| [06-round-trip-data-flow.md](./06-round-trip-data-flow.md)                 | 数据双向转换全链路详解          | 非对称闭环、状态机累积、IR 中间表示               |

---

## 框架整体架构

```
┌─────────────────────────────────────────────────┐
│              用户代码 (User Code)                  │
│   stream(model, context) / complete(model, ctx)  │
├─────────────────────────────────────────────────┤
│            API 注册表 (API Registry)               │
│   "anthropic" → anthropicProvider                │
│   "openai"    → openaiProvider                   │
├─────────────────────────────────────────────────┤
│          Provider 适配器层 (Adapters)              │
│   Anthropic │ OpenAI │ Google │ Bedrock │ ...    │
├─────────────────────────────────────────────────┤
│          核心类型 (Core Types)                     │
│   Model, Context, Message, Tool, Event, Usage    │
└─────────────────────────────────────────────────┘
```

## 核心设计理念

- **一套类型定义**：所有 Provider 共用同一套 `Message`, `Tool`, `StreamEvent`
- **注册表模式**：Provider 自注册，核心代码零依赖具体实现
- **可序列化 Context**：对话上下文可跨 Provider 无缝传递
- **EventStream 双通道**：既能实时消费事件流，又能获取最终完整结果
