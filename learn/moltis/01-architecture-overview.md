# 01 — 整体架构与 Workspace 解析

## Workspace 结构

Moltis 采用 Cargo workspace 管理 27 个 crate，所有版本统一在根 `Cargo.toml` 的 `[workspace.package]` 中声明：

```toml
[workspace.package]
edition      = "2024"
license      = "MIT"
rust-version = "1.91"
version      = "0.8.35"
```

### 依赖管理原则

所有第三方依赖在 `[workspace.dependencies]` 中集中声明，子 crate 通过 `{ workspace = true }` 引用：

```toml
# 根 Cargo.toml
[workspace.dependencies]
tokio = { features = ["full"], version = "1" }
axum  = { features = ["ws"], version = "0.8" }

# 子 crate 的 Cargo.toml
[dependencies]
tokio = { workspace = true }
```

好处：
- 版本统一，避免菱形依赖
- 升级只需改一处
- 编译缓存更高效

---

## Crate 依赖拓扑

```
                    ┌────────────┐
                    │   cli      │  ← 唯一的 bin crate（main.rs）
                    └─────┬──────┘
                          │
                    ┌─────▼──────┐
                    │  gateway   │  ← HTTP/WS 服务器、Web UI、认证
                    └─────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌──────▼──────┐
    │  agents   │   │  tools  │   │  channels   │
    │ (LLM loop)│   │ (exec,  │   │ (Telegram,  │
    │           │   │  browser)│   │  web)       │
    └─────┬─────┘   └────┬────┘   └──────┬──────┘
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌──────▼──────┐
    │ sessions  │   │ sandbox │   │  telegram   │
    │ memory    │   │ browser │   │  protocol   │
    │ skills    │   │ mcp     │   │             │
    └─────┬─────┘   └────┬────┘   └─────────────┘
          │               │
    ┌─────▼───────────────▼─────┐
    │       common / config     │  ← 公共类型、hooks、配置 schema
    └───────────────────────────┘
```

---

## 数据流概览

### 用户消息的完整路径

```
用户输入（Web UI / Telegram / API）
    │
    ▼
Gateway (axum 路由)
    │
    ├─ 认证检查（auth_gate middleware）
    │
    ▼
Session 管理
    │
    ├─ 加载/创建会话
    ├─ 消息持久化到 SQLite
    │
    ▼
Agent Runner（核心循环）
    │
    ├─ 构建 system prompt（含记忆、skill 上下文）
    ├─ 调用 LLM Provider（streaming）
    │
    ├─ LLM 返回文本 → 直接流式输出
    │
    ├─ LLM 请求工具调用 →
    │   ├─ 并行执行工具（futures::join_all）
    │   ├─ 结果清洗（sanitize：去 base64、截断）
    │   └─ 喂回 LLM，继续循环
    │
    ▼
响应流式推送到客户端（WebSocket / HTTP SSE）
```

### 关键设计决策

| 决策 | 选择 | 原因 |
| --- | --- | --- |
| 单二进制 vs 微服务 | 单二进制 | 部署简单，无运行时依赖 |
| SQLite vs PostgreSQL | SQLite（默认） | 零配置，适合个人使用场景 |
| 嵌入式 Web UI vs 分离前端 | 嵌入式 | `include_dir!` 编译时嵌入，dev 模式从磁盘加载 |
| 自签名 TLS | 默认启用 | rcgen 自动生成，零配置 HTTPS |
| Workspace lint | deny unsafe_code, unwrap, expect | 强制安全编码习惯 |

---

## 编译与运行

```bash
# 克隆 + 构建
git clone https://github.com/moltis-org/moltis.git
cd moltis
cargo build --release

# 运行（gateway 是默认命令）
cargo run --release

# 打开 https://moltis.localhost:3000
```

### Feature Flags

Feature flags 在 `crates/cli/Cargo.toml` 中以 **默认启用** 方式管理（opt-out 模式）：

```toml
[features]
default = ["provider-github-copilot", "provider-openai-codex", "provider-kimi-code"]
```

这意味着新功能添加时默认包含，用户需要显式排除不需要的功能。

---

## Workspace Lint 规则

```toml
[workspace.lints.rust]
unsafe_code           = "deny"    # 禁止 unsafe
unused_qualifications = "deny"

[workspace.lints.clippy]
expect_used = "deny"    # 禁止 .expect()
unwrap_used = "deny"    # 禁止 .unwrap()
```

这两条规则从根本上防止了 panic，所有错误必须通过 `?`、`ok_or_else`、`unwrap_or_default` 等安全方式处理。
