# 13 — 项目中的 Rust 惯用模式

## Trait 设计

Moltis 大量使用 trait 定义行为边界。

### 核心设计原则

- **泛型用于热路径**，`dyn Trait` 用于异构/运行时分派
- 所有 Provider、Tool、Channel 都通过 trait 抽象

```rust
// 泛型（编译时分派，零开销）
fn process<T: Serialize>(data: &T) -> String { ... }

// dyn Trait（运行时分派，灵活）
fn register_tool(tool: Box<dyn AgentTool>) { ... }
```

### AgentTool Trait

```rust
#[async_trait]
pub trait AgentTool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn parameters_schema(&self) -> serde_json::Value;
    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value>;
}
```

注意 `Send + Sync` 约束——在异步环境中跨线程安全。

---

## 错误处理

### 双层策略

| 层级 | 库 | 用途 |
| --- | --- | --- |
| 应用层 | `anyhow::Result` | 快速传播，堆栈追踪 |
| 库层 | `thiserror` | 结构化错误类型 |

```rust
// 库 crate（如 moltis-config）
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("invalid field `{field}`: {reason}")]
    InvalidField { field: String, reason: String },
    #[error("file not found: {0}")]
    NotFound(PathBuf),
}

// 应用层（如 gateway）
async fn handler() -> anyhow::Result<Response> {
    let config = load_config()?;  // ConfigError 自动转为 anyhow::Error
    Ok(respond(config))
}
```

### 禁止 unwrap/expect

Workspace lint 禁止了 `.unwrap()` 和 `.expect()`：

```rust
// ❌ 编译错误
let value = map.get("key").unwrap();

// ✅ 安全替代
let value = map.get("key").ok_or_else(|| anyhow!("key not found"))?;
let value = map.get("key").unwrap_or_default();
let value = lock.write().unwrap_or_else(|e| e.into_inner());  // 处理中毒锁
```

---

## 异步模式

### tokio 全特性运行时

```toml
tokio = { features = ["full"], version = "1" }
```

### 并发执行

```rust
// 独立任务并发
let (result_a, result_b) = tokio::join!(task_a(), task_b());

// 批量并发
let results = futures::future::join_all(tasks).await;
```

### 禁止 block_on

在 async context 中使用 `block_on` 会死锁：

```rust
// ❌ 永远不要这样做
async fn bad() {
    let result = tokio::runtime::Handle::current().block_on(other_async());
}

// ✅ 直接 await
async fn good() {
    let result = other_async().await;
}
```

### Stream 处理

```rust
use async_stream::stream;
use tokio_stream::StreamExt;

fn my_stream() -> impl Stream<Item = String> {
    stream! {
        yield "hello".into();
        yield "world".into();
    }
}
```

---

## 安全实践

### Secret 管理

```rust
use secrecy::{Secret, ExposeSecret};

struct ProviderConfig {
    api_key: Secret<String>,  // 不会在 Debug 中泄露
}

impl ProviderConfig {
    fn make_request(&self) {
        let key = self.api_key.expose_secret();  // 仅在使用点暴露
        // ...
    }
}

// 自定义 Debug
impl fmt::Debug for ProviderConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProviderConfig")
            .field("api_key", &"[REDACTED]")
            .finish()
    }
}
```

### SSRF 防护

```rust
// web_fetch.rs 中的 IP 检查
fn is_blocked_ip(ip: IpAddr) -> bool {
    ip.is_loopback()          // 127.0.0.0/8, ::1
    || is_private(ip)         // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    || is_link_local(ip)      // 169.254.0.0/16
    || is_cgnat(ip)           // 100.64.0.0/10
}
```

### 禁止 unsafe

```toml
[workspace.lints.rust]
unsafe_code = "deny"
```

---

## 类型驱动设计

### 匹配类型，不匹配字符串

```rust
// ❌ 字符串匹配
match provider_name {
    "openai" => ...,
    "anthropic" => ...,
}

// ✅ 枚举匹配
enum Provider { OpenAI, Anthropic, Local }
match provider {
    Provider::OpenAI => ...,
    Provider::Anthropic => ...,
    Provider::Local => ...,
}
```

> 仅在序列化/显示边界转换为字符串。

### From/Into 转换

```rust
// ✅ 偏好标准转换 trait
impl From<ConfigError> for AppError {
    fn from(e: ConfigError) -> Self {
        AppError::Config(e)
    }
}

// 使用时自动转换
let result: Result<_, AppError> = config_operation()?;
```

### 具体类型优于 serde_json::Value

```rust
// ❌ 形状已知时不用 Value
fn process(data: serde_json::Value) { ... }

// ✅ 用结构体
#[derive(Deserialize)]
struct ToolResult {
    success: bool,
    output: String,
}
fn process(data: ToolResult) { ... }
```

---

## 其他模式

### Guard Clause

```rust
// ❌ 嵌套 if
fn process(input: Option<&str>) -> Result<String> {
    if let Some(s) = input {
        if !s.is_empty() {
            Ok(s.to_uppercase())
        } else {
            Err(anyhow!("empty"))
        }
    } else {
        Err(anyhow!("none"))
    }
}

// ✅ 早返回
fn process(input: Option<&str>) -> Result<String> {
    let s = input.ok_or_else(|| anyhow!("none"))?;
    if s.is_empty() {
        return Err(anyhow!("empty"));
    }
    Ok(s.to_uppercase())
}
```

### 迭代器优于循环

```rust
// ❌ 手动循环
let mut results = Vec::new();
for item in items {
    if item.is_valid() {
        results.push(item.transform());
    }
}

// ✅ 迭代器组合
let results: Vec<_> = items.iter()
    .filter(|item| item.is_valid())
    .map(|item| item.transform())
    .collect();
```

### Cow 条件分配

```rust
use std::borrow::Cow;

fn process(input: &str) -> Cow<'_, str> {
    if input.contains("bad") {
        Cow::Owned(input.replace("bad", "good"))  // 需要分配
    } else {
        Cow::Borrowed(input)  // 零拷贝
    }
}
```

### Derive Default

```rust
// 当所有字段有合理默认值时
#[derive(Default)]
struct Options {
    timeout: u64,        // 默认 0
    retries: usize,      // 默认 0
    verbose: bool,       // 默认 false
}
```

### #[must_use]

```rust
#[must_use]
fn compute_hash(data: &[u8]) -> String {
    // 返回值不该被忽略
}
```

---

## 可观测性模式

### Tracing

```rust
use tracing::instrument;

#[instrument(skip(password))]  // 跳过敏感参数
async fn authenticate(username: &str, password: &str) -> Result<Session> {
    tracing::info!("authenticating user");
    // ...
}
```

### Metrics

```rust
#[cfg(feature = "metrics")]
{
    metrics::counter!("moltis_tool_calls_total", "tool" => tool_name).increment(1);
    metrics::histogram!("moltis_tool_duration_seconds", "tool" => tool_name)
        .record(elapsed.as_secs_f64());
}
```

### 日志级别规范

| 级别 | 用途 |
| --- | --- |
| `error!` | 不可恢复的错误 |
| `warn!` | 意外但可恢复 |
| `info!` | 运营里程碑 |
| `debug!` | 详细诊断 |
| `trace!` | 极详细的逐项数据 |

> 常见错误：未配置的 Provider 用 `warn!`。应该用 `debug!`——"未配置"是预期状态，不是意外。
