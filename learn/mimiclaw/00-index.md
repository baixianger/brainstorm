# 学习笔记：MimiClaw — $5 芯片上的 AI Agent

> 学习对象：[memovai/mimiclaw](https://github.com/memovai/mimiclaw)
> 语言：C（纯 C，无 C++）
> 平台：ESP32-S3 / ESP-IDF v5.5+ / FreeRTOS
> 定位：在 $5 的 ESP32-S3 芯片上运行完整 AI Agent（无 Linux、无 Node.js），通过 Telegram 交互

---

## 目录

| 文件 | 内容 | 关键词 |
| --- | --- | --- |
| [01-architecture-overview.md](./01-architecture-overview.md) | 整体架构与数据流 | 双核分工、FreeRTOS、消息总线 |
| [02-getting-started.md](./02-getting-started.md) | 硬件准备与首次烧录 | ESP32-S3、ESP-IDF、idf.py |
| [03-memory-and-flash.md](./03-memory-and-flash.md) | 内存管理与 Flash 存储 | PSRAM、SPIFFS、分区表、NVS |
| [04-agent-loop.md](./04-agent-loop.md) | Agent 循环与 ReAct 模式 | agent_loop.c、工具调用、上下文构建 |
| [05-llm-provider.md](./05-llm-provider.md) | LLM API 集成 | Anthropic/OpenAI、cJSON、HTTP/TLS |
| [06-tool-system.md](./06-tool-system.md) | 工具系统与注册表 | tool_registry、web_search、get_time |
| [07-telegram-bot.md](./07-telegram-bot.md) | Telegram Bot 集成 | 长轮询、消息解析、发送 |
| [08-embedded-c-patterns.md](./08-embedded-c-patterns.md) | 嵌入式 C 编程模式 | 内存安全、FreeRTOS 队列、SPIFFS I/O |

---

## 项目概览

```
mimiclaw/
├── main/
│   ├── mimi.c                 # 入口 app_main()
│   ├── mimi_config.h          # 所有编译时常量
│   ├── mimi_secrets.h         # 密钥（gitignore，构建时注入）
│   ├── agent/                 # Agent 循环 + 上下文构建
│   │   ├── agent_loop.c/h
│   │   └── context_builder.c/h
│   ├── bus/                   # FreeRTOS 消息队列
│   │   └── message_bus.c/h
│   ├── llm/                   # LLM API 代理（Anthropic + OpenAI）
│   │   └── llm_proxy.c/h
│   ├── tools/                 # 工具注册 + 实现
│   │   ├── tool_registry.c/h
│   │   ├── tool_web_search.c/h
│   │   ├── tool_get_time.c/h
│   │   └── tool_files.c/h
│   ├── memory/                # 长期记忆 + 会话管理
│   │   ├── memory_store.c/h
│   │   └── session_mgr.c/h
│   ├── telegram/              # Telegram Bot
│   │   └── telegram_bot.c/h
│   ├── gateway/               # WebSocket 服务器
│   │   └── ws_server.c/h
│   ├── wifi/                  # WiFi STA 管理
│   │   └── wifi_manager.c/h
│   ├── proxy/                 # HTTP CONNECT 代理
│   │   └── http_proxy.c/h
│   ├── cli/                   # 串口 CLI 调试
│   │   └── serial_cli.c/h
│   └── ota/                   # OTA 固件更新
│       └── ota_manager.c/h
├── spiffs_data/               # 预置的 SPIFFS 文件
│   ├── config/SOUL.md         # AI 人格定义
│   ├── config/USER.md         # 用户档案
│   └── memory/MEMORY.md       # 长期记忆
├── partitions.csv             # Flash 分区表
├── sdkconfig.defaults         # ESP-IDF 默认配置
└── CMakeLists.txt             # 构建配置
```

## 硬件规格

| 规格 | 值 |
| --- | --- |
| 芯片 | ESP32-S3 |
| Flash | 16 MB |
| PSRAM | 8 MB |
| CPU | 双核 Xtensa LX7 @ 240 MHz |
| 功耗 | ~0.5 W |
| 连接 | WiFi 802.11 b/g/n |
| 价格 | ~$5-10 |

## 与 OpenClaw/Moltis 的对比

| 特性 | MimiClaw | Moltis | OpenClaw |
| --- | --- | --- | --- |
| 语言 | C | Rust | TypeScript |
| 运行环境 | 裸机 ESP32 | Linux/macOS/Docker | Node.js |
| 内存 | 8 MB PSRAM | GB 级 | GB 级 |
| 存储 | 12 MB SPIFFS | SQLite | SQLite |
| LLM 调用 | 非流式 | 流式 | 流式 |
| 工具 | 2 个（web_search, get_time） | 20+ | 完整 |
| 通信 | Telegram + WebSocket | Web + Telegram + API | Web |
| 成本 | $5 芯片 | 服务器/PC | 服务器/PC |
