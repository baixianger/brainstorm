# 学习笔记：Moltis — Rust 编写的个人 AI 网关

> 学习对象：[moltis-org/moltis](https://github.com/moltis-org/moltis)
> 语言：Rust (edition 2024, 1.91+)
> 定位：单二进制、多 Provider LLM 网关，集成长期记忆、沙箱执行、语音、MCP 工具、多渠道接入（Web/Telegram/API）

---

## 目录

| 文件 | 内容 | 关键词 |
| --- | --- | --- |
| [01-architecture-overview.md](./01-architecture-overview.md) | 整体架构与 Workspace 解析 | Cargo workspace、crate 拓扑、数据流 |
| [02-getting-started.md](./02-getting-started.md) | 安装、配置与首次运行 | 安装方式、moltis.toml、首次启动 |
| [03-configuration-deep-dive.md](./03-configuration-deep-dive.md) | 配置系统详解 | schema.rs、环境变量替换、校验 |
| [04-provider-system.md](./04-provider-system.md) | LLM Provider 架构与实现 | trait LlmProvider、streaming、provider chain |
| [05-agent-loop.md](./05-agent-loop.md) | Agent 循环与工具调用 | runner.rs、tool registry、并行执行 |
| [06-tools-and-sandbox.md](./06-tools-and-sandbox.md) | 内置工具与沙箱执行 | exec、browser、web_fetch、Docker sandbox |
| [07-memory-system.md](./07-memory-system.md) | 长期记忆与嵌入 | embeddings、SQLite FTS、MEMORY.md |
| [08-session-management.md](./08-session-management.md) | 会话管理与分支 | session store、branching、compaction |
| [09-hooks-and-skills.md](./09-hooks-and-skills.md) | Hook 系统与 Skill 扩展 | 生命周期钩子、skill 发现、安全沙盒 |
| [10-channels-and-gateway.md](./10-channels-and-gateway.md) | Web 网关与通信渠道 | axum、WebSocket、Telegram、认证 |
| [11-mcp-integration.md](./11-mcp-integration.md) | MCP 协议集成 | stdio/HTTP transport、health polling |
| [12-voice-system.md](./12-voice-system.md) | 语音系统（TTS/STT） | 多 provider 语音、本地/云端 |
| [13-rust-patterns.md](./13-rust-patterns.md) | 项目中的 Rust 惯用模式 | trait 设计、错误处理、异步模式、安全实践 |

---

## 项目概览

```
moltis/
├── crates/                    # 27 个 workspace crate
│   ├── cli/                   # 主入口（二进制 crate）
│   ├── gateway/               # HTTP/WS 服务器 + Web UI
│   ├── agents/                # LLM Provider + Agent 循环
│   ├── tools/                 # 内置工具（exec、browser、web 等）
│   ├── config/                # 配置加载/校验/迁移
│   ├── sessions/              # 会话持久化（SQLite）
│   ├── memory/                # 长期记忆（嵌入 + FTS）
│   ├── skills/                # Skill 发现/安装/注册
│   ├── mcp/                   # MCP 协议客户端
│   ├── voice/                 # TTS/STT 多 provider
│   ├── channels/              # 通信渠道抽象
│   ├── telegram/              # Telegram bot 集成
│   ├── common/                # 公共类型 + hooks
│   ├── cron/                  # 定时任务
│   ├── browser/               # Chrome CDP 自动化
│   ├── plugins/               # 插件系统
│   ├── protocol/              # 通信协议定义
│   ├── routing/               # 请求路由
│   ├── oauth/                 # OAuth2 流程
│   ├── onboarding/            # 首次设置向导
│   ├── media/                 # 媒体处理
│   ├── metrics/               # 可观测性（OpenTelemetry）
│   ├── projects/              # 项目管理
│   ├── canvas/                # 画布服务
│   ├── qmd/                   # 文档管理
│   ├── auto-reply/            # 自动回复
│   └── benchmarks/            # 性能基准测试
├── docs/                      # mdBook 文档
├── examples/                  # 示例（hooks、docker-compose）
├── scripts/                   # 构建/发布脚本
└── plans/                     # 架构规划文档
```

## 核心技术栈

| 领域 | 技术选型 |
| --- | --- |
| 异步运行时 | tokio (full features) |
| HTTP 服务器 | axum + tower-http |
| 模板引擎 | askama |
| 数据库 | SQLite (sqlx) |
| 序列化 | serde + serde_json / toml |
| 错误处理 | anyhow (应用层) + thiserror (库层) |
| TLS | rustls + rcgen (自签名证书) |
| 认证 | argon2 (密码) + webauthn-rs (Passkey) |
| 可观测性 | tracing + OpenTelemetry + metrics |
| LLM 客户端 | async-openai、genai、自定义 provider |
| 浏览器自动化 | Chrome DevTools Protocol |
| 容器沙箱 | Docker / Apple Container |
