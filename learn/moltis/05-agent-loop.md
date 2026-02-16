# 05 — Agent 循环与工具调用

## Agent Runner 核心

Agent 循环是 Moltis 最核心的组件，位于 `crates/agents/src/runner.rs`。

### 核心函数签名

```rust
pub async fn run_agent_loop(
    provider: Arc<dyn LlmProvider>,
    tools: &ToolRegistry,
    system_prompt: &str,
    user_content: &UserContent,
    on_event: Option<&OnEvent>,
    options: Option<AgentOptions>,
) -> Result<AgentResult>
```

### 循环流程

```
开始
  │
  ▼
构建消息列表 [system, user, ...]
  │
  ▼
┌─────────────────────────────┐
│  调用 LLM Provider          │ ◀──────────────────┐
│  （streaming 或 complete）   │                    │
└───────────┬─────────────────┘                    │
            │                                      │
            ▼                                      │
    LLM 返回什么？                                  │
    ├─ 纯文本 → 结束，返回结果                        │
    ├─ 工具调用 →                                   │
    │   ├─ 并行执行所有工具                           │
    │   ├─ 清洗结果（sanitize）                      │
    │   ├─ 添加 Tool 消息到历史                      │
    │   └─ 继续循环 ─────────────────────────────────┘
    └─ 错误 → 重试或返回错误
```

### AgentResult

```rust
pub struct AgentResult {
    pub text: String,           // 最终文本响应
    pub tool_calls_made: usize, // 总共调用了多少工具
    pub usage: Usage,           // 累计 token 用量
}
```

---

## Tool Registry

`crates/agents/src/tool_registry.rs` 管理所有可用工具：

```rust
pub trait AgentTool: Send + Sync {
    /// 工具名称（LLM 用此名称调用）
    fn name(&self) -> &str;

    /// 工具描述（帮助 LLM 理解何时使用）
    fn description(&self) -> &str;

    /// JSON Schema 参数定义
    fn parameters_schema(&self) -> serde_json::Value;

    /// 执行工具
    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value>;
}

pub struct ToolRegistry {
    tools: Vec<Box<dyn AgentTool>>,
}

impl ToolRegistry {
    pub fn new() -> Self;
    pub fn register(&mut self, tool: Box<dyn AgentTool>);
    pub fn schemas(&self) -> Vec<serde_json::Value>;  // 给 LLM 的工具定义
    pub async fn execute(&self, name: &str, params: Value) -> Result<Value>;
}
```

---

## 并行工具执行

当 LLM 在一个 turn 中请求多个工具调用时，Moltis 使用 `futures::join_all` 并行执行：

```rust
// 概念代码
let futures: Vec<_> = tool_calls.iter().map(|tc| {
    let registry = &tools;
    async move {
        let result = registry.execute(&tc.name, tc.arguments.clone()).await;
        (tc.id.clone(), result)
    }
}).collect();

let results = futures::future::join_all(futures).await;
```

验证并行性的测试（来自 runner.rs）：

```rust
#[tokio::test]
async fn test_parallel_execution_is_concurrent() {
    // 3 个各需 100ms 的工具
    // 如果串行执行需要 ≥300ms
    // 并行应该 ~100ms
    assert!(elapsed < Duration::from_millis(250));
}
```

---

## 工具结果清洗（Sanitization）

工具返回的原始结果在喂回 LLM 前经过清洗：

### sanitize_tool_result

```rust
fn sanitize_tool_result(input: &str, max_bytes: usize) -> String
```

处理规则：
1. **截断超长结果**——超过 `max_bytes`（默认 50KB）时截断，添加 `[truncated: N bytes total]`
2. **剥离 base64 数据 URI**——`data:image/png;base64,...` 替换为 `[screenshot captured and displayed in UI]`
3. **剥离长 hex 字符串**——超过一定长度的 hex blob 替换为 `[hex data removed: N chars]`
4. **保留短数据**——短的 base64 和 hex 字符串不处理

### 图片提取

```rust
fn extract_images_from_text(input: &str) -> (Vec<ImageData>, String)
```

- 从文本中提取 `data:image/*;base64,...` 格式的图片
- 返回提取出的图片列表 + 去掉图片的剩余文本
- 仅提取足够长的 payload（短的 base64 保留原样）

### 工具结果 → LLM 内容

```rust
fn tool_result_to_content(input: &str, max_bytes: usize, vision: bool) -> Value
```

- **非视觉 Provider**：返回清洗后的纯字符串
- **视觉 Provider**：返回 `[{type: "text", text: ...}, {type: "image_url", image_url: {url: ...}}]`

> 重要：即使是视觉 Provider，工具结果中的图片也被清洗。因为大多数 LLM API 不支持工具结果中的多模态内容。原始数据通过事件系统传给 UI。

---

## RunnerEvent 事件系统

Agent 循环通过回调发出事件，供 UI 和外部系统消费：

```rust
pub type OnEvent = Box<dyn Fn(RunnerEvent) + Send + Sync>;

pub enum RunnerEvent {
    /// LLM 开始生成
    GenerationStart,

    /// 文本片段到达
    TextDelta(String),

    /// 工具调用开始
    ToolCallStart {
        tool_call_id: String,
        tool_name: String,
    },

    /// 工具调用结束
    ToolCallEnd {
        tool_call_id: String,
        tool_name: String,
        success: bool,
        result: Option<serde_json::Value>,  // 原始结果（未清洗）
    },

    /// Agent 循环结束
    Done {
        usage: Usage,
    },
}
```

关键设计：`ToolCallEnd` 中的 `result` 是**原始未清洗**的结果，这样 UI 可以显示截图等图片，即使这些数据不会发送给 LLM。

---

## Sub-Agent 委托

`spawn_agent` 工具允许 LLM 将任务委托给子 Agent：

```json
{
    "task": "Research the latest Rust async patterns",
    "tools": ["web_search", "web_fetch"],
    "max_depth": 2
}
```

- 子 Agent 有独立的消息历史
- 可以限制可用工具（`tools` 过滤）
- 支持嵌套深度限制（防止无限递归）

---

## Agent 超时

可配置的墙钟超时（默认 600 秒）防止失控执行：

```toml
[agent]
timeout_secs = 600
```

超时后 Agent 循环强制终止，返回已有的部分结果。

---

## Silent Turn

`silent_turn.rs` 处理 Agent 的"静默轮次"——当 LLM 只发起工具调用而没有文本输出时，不向用户显示空消息。
