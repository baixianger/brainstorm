# 04 — LLM Provider 架构与实现

## Provider 系统概览

Provider 系统位于 `crates/agents/src/providers/`，通过 trait 抽象支持多种 LLM 后端。

```
crates/agents/src/
├── providers/
│   ├── mod.rs                 # Provider trait 定义
│   ├── openai.rs              # OpenAI (GPT-4o 等)
│   ├── anthropic.rs           # Anthropic (Claude)
│   ├── async_openai_provider.rs  # 基于 async-openai crate
│   ├── openai_compat.rs       # OpenAI 兼容 API（OpenRouter, Ollama 等）
│   ├── openai_codex.rs        # OpenAI Codex
│   ├── github_copilot.rs      # GitHub Copilot
│   ├── kimi_code.rs           # Kimi Code
│   ├── genai_provider.rs      # 基于 genai crate（通用）
│   └── local_llm/             # 本地 LLM
│       ├── mod.rs
│       ├── backend.rs         # 推理后端
│       ├── models.rs          # 模型管理
│       └── system_info.rs     # 系统信息（内存、GPU）
├── provider_chain.rs          # Provider 链（fallback）
├── model.rs                   # 模型定义
└── auth_profiles.rs           # Provider 认证档案
```

---

## LlmProvider Trait

核心 trait 定义了所有 Provider 必须实现的接口：

```rust
#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// Provider 名称（如 "openai", "anthropic"）
    fn name(&self) -> &str;

    /// 模型 ID（如 "gpt-4o", "claude-sonnet-4-20250514"）
    fn id(&self) -> &str;

    /// 是否支持工具调用
    fn supports_tools(&self) -> bool;

    /// 是否支持视觉（图片输入）
    fn supports_vision(&self) -> bool { false }

    /// 非流式补全
    async fn complete(
        &self,
        messages: &[ChatMessage],
        tools: &[serde_json::Value],
    ) -> Result<CompletionResponse>;

    /// 流式补全
    fn stream(
        &self,
        messages: Vec<ChatMessage>,
    ) -> Pin<Box<dyn Stream<Item = StreamEvent> + Send + '_>>;
}
```

### CompletionResponse

```rust
pub struct CompletionResponse {
    pub text: Option<String>,
    pub tool_calls: Vec<ToolCall>,
    pub usage: Usage,
}

pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

pub struct Usage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    // ...
}
```

### StreamEvent

```rust
pub enum StreamEvent {
    TextDelta(String),              // 文本片段
    ToolCallStart { id, name },     // 工具调用开始
    ToolCallDelta { id, delta },    // 工具参数片段
    ToolCallEnd { id },             // 工具调用结束
    Usage(Usage),                   // Token 用量
    Error(String),                  // 错误
    Done,                           // 完成
}
```

---

## Provider Chain（Fallback 机制）

`provider_chain.rs` 实现了 Provider 链，当主 Provider 失败时自动回退：

```rust
// 概念示例
let chain = ProviderChain::new(vec![
    openai_provider,       // 首选
    anthropic_provider,    // 备选 1
    local_provider,        // 备选 2（本地模型）
]);
```

---

## 流式输出设计

Moltis 优先使用流式 API，即使在工具调用场景也支持流式：

```
LLM Stream → TextDelta → 实时推送到 WebSocket
           → ToolCallStart → UI 显示"正在调用..."
           → ToolCallDelta → 参数逐步到达
           → ToolCallEnd → 执行工具 → 结果喂回 LLM
```

关键设计：
- **工具调用参数也流式传输**——delta 到达时逐步拼接
- **非流式 fallback**——如果 Provider 不支持流式，自动使用 `complete()`

---

## ChatMessage 类型

```rust
pub enum ChatMessage {
    System { content: String },
    User { content: UserContent },
    Assistant {
        content: Option<String>,
        tool_calls: Vec<ToolCall>,
    },
    Tool {
        tool_call_id: String,
        content: String,  // 注意：始终是字符串，不支持多模态
    },
}

pub enum UserContent {
    Text(String),
    Multimodal(Vec<ContentPart>),  // 文本 + 图片
}
```

### 视觉支持

当 Provider `supports_vision()` 返回 true 时：
- 用户消息可以包含图片
- 但**工具结果始终是字符串**（大多数 LLM API 限制）
- 截图等 base64 数据在喂回 LLM 前被清洗为 `[screenshot captured and displayed in UI]`
- 原始数据通过 `RunnerEvent::ToolCallEnd` 传给 UI 显示

---

## 实现新 Provider 的规范

1. **全异步**——永远不在 async context 中使用 `block_on`
2. **模型列表要宽泛**——API 会拒绝不可用的模型，不需要硬编码过滤
3. **BYOM Provider**（OpenRouter、Ollama 等）——需要用户配置，不硬编码模型列表
4. **流式优先**——优先实现 `stream()`，`complete()` 作为兜底
5. **密钥安全**——使用 `secrecy::Secret<String>` 存储，仅在使用点 `expose_secret()`

---

## 本地 LLM 支持

`local_llm/` 模块支持运行本地 GGUF 模型：

- 自动检测系统信息（内存、GPU）
- Chat template 解析（适配不同模型的 prompt 格式）
- 依赖 `llama-cpp-2` crate 进行推理

```toml
[providers.local]
model_path = "/path/to/llama-3.2-8b-instruct.gguf"
# 自动检测 GPU 层数、上下文长度等
```
