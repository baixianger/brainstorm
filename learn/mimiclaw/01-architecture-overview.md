# 01 — 整体架构与数据流

## 系统架构

MimiClaw 在 ESP32-S3 双核处理器上实现了完整的 AI Agent 架构：

```
Telegram App (用户手机)
    │
    │  HTTPS 长轮询
    │
    ▼
┌──────────────────────────────────────────────────┐
│               ESP32-S3 (MimiClaw)                │
│                                                  │
│   ┌─────────────┐       ┌──────────────────┐     │
│   │  Telegram    │──────▶│   入站队列        │     │
│   │  Poller      │       │ (Inbound Queue)  │     │
│   │  (Core 0)    │       └────────┬─────────┘     │
│   └─────────────┘                │                │
│                       ┌──────────▼──────────┐     │
│   ┌─────────────┐     │   Agent Loop        │     │
│   │  WebSocket   │────▶│   (Core 1)         │     │
│   │  Server      │     │                    │     │
│   │  (:18789)    │     │  Context → LLM API │     │
│   └─────────────┘     │  Builder    (HTTPS) │     │
│                       │      ↑        │     │     │
│   ┌─────────────┐     │      │   tool_use?  │     │
│   │  Serial CLI  │     │  Results ← Tools   │     │
│   │  (Core 0)    │     └──────────┬─────────┘     │
│   └─────────────┘                │                │
│                       ┌──────────▼──────────┐     │
│                       │   出站队列           │     │
│                       │ (Outbound Queue)    │     │
│                       └─────┬─────────┬─────┘     │
│                             │         │           │
│                       Telegram    WebSocket       │
│                                                   │
│   ┌──────────────────────────────────────────┐    │
│   │  SPIFFS (12 MB Flash)                    │    │
│   │  /config/  SOUL.md, USER.md              │    │
│   │  /memory/  MEMORY.md, YYYY-MM-DD.md      │    │
│   │  /sessions/ tg_<chat_id>.jsonl           │    │
│   └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## 双核分工策略

ESP32-S3 有两个 Xtensa LX7 核心，MimiClaw 严格分工：

| Core | 职责 | 任务 |
| --- | --- | --- |
| **Core 0** | I/O 密集型 | Telegram 轮询、WebSocket 服务、串口 CLI、出站派发、WiFi 事件 |
| **Core 1** | CPU 密集型 | Agent 循环（JSON 构建 + 等待 HTTPS 响应） |

### FreeRTOS 任务布局

| 任务 | Core | 优先级 | 栈大小 | 说明 |
| --- | --- | --- | --- | --- |
| `tg_poll` | 0 | 5 | 12 KB | Telegram 长轮询（30s 超时） |
| `agent_loop` | 1 | 6 | 12 KB | 消息处理 + LLM API 调用 |
| `outbound` | 0 | 5 | 8 KB | 响应路由到 Telegram/WS |
| `serial_cli` | 0 | 3 | 4 KB | USB 串口 REPL |
| httpd (内部) | 0 | 5 | — | WebSocket 服务器 |

Agent Loop 优先级最高（6），确保 AI 处理不被 I/O 抢占。

---

## 消息流程（完整路径）

```
1. 用户在 Telegram 发消息
2. tg_poll 任务（Core 0）收到消息，包装成 mimi_msg_t
3. 推入入站队列（FreeRTOS xQueue，深度 8）
4. Agent Loop（Core 1）弹出消息：
   a. 从 SPIFFS 加载会话历史（JSONL 文件）
   b. 构建 system prompt（SOUL.md + USER.md + MEMORY.md + 每日笔记 + 工具指引）
   c. 构建 cJSON 消息数组（历史 + 当前消息）
   d. ReAct 循环（最多 10 轮）：
      i.   通过 HTTPS 调用 LLM API（非流式，带 tools 数组）
      ii.  解析 JSON 响应 → text blocks + tool_use blocks
      iii. 如果 stop_reason == "tool_use"：
           - 执行每个工具（如 web_search → Brave Search API）
           - 将 assistant content + tool_result 追加到消息
           - 继续循环
      iv.  如果 stop_reason == "end_turn"：退出循环
   e. 保存用户消息 + 最终助理回复到会话文件
   f. 推入出站队列
5. outbound 任务（Core 0）弹出响应：
   a. 按 channel 字段路由（"telegram" → sendMessage, "websocket" → WS frame）
6. 用户收到回复
```

---

## 消息总线协议

内部消息总线使用两个 FreeRTOS 队列传输 `mimi_msg_t`：

```c
typedef struct {
    char channel[16];   // "telegram", "websocket", "cli"
    char chat_id[32];   // Telegram chat ID 或 WS 客户端 ID
    char *content;      // 堆分配的文本（所有权转移）
} mimi_msg_t;
```

关键设计：
- **入站队列**：渠道 → Agent Loop（深度 8）
- **出站队列**：Agent Loop → 派发 → 渠道（深度 8）
- **所有权转移**：content 字符串在 push 时转移所有权，接收方负责 `free()`

---

## 启动序列

```c
app_main()
  ├── init_nvs()                    // NVS Flash 初始化
  ├── esp_event_loop_create_default()
  ├── init_spiffs()                 // 挂载 SPIFFS 到 /spiffs
  ├── message_bus_init()            // 创建入站 + 出站队列
  ├── memory_store_init()           // 验证 SPIFFS 路径
  ├── session_mgr_init()
  ├── wifi_manager_init()           // WiFi STA 模式 + 事件处理
  ├── http_proxy_init()             // 加载代理配置
  ├── telegram_bot_init()           // 加载 Bot token
  ├── llm_proxy_init()              // 加载 API key + model
  ├── tool_registry_init()          // 注册工具，构建 tools JSON
  ├── agent_loop_init()
  ├── serial_cli_init()             // 启动 REPL（无需 WiFi）
  │
  ├── wifi_manager_start()          // 连接 WiFi
  │   └── wifi_manager_wait_connected(30s)
  │
  └── [WiFi 连接成功]
      ├── telegram_bot_start()      // Core 0
      ├── agent_loop_start()        // Core 1
      ├── ws_server_start()         // 端口 18789
      └── outbound_dispatch_task    // Core 0
```

设计要点：
- CLI 最先启动——即使 WiFi 失败也能通过串口调试
- WiFi 失败时仅打印警告，不崩溃
- 网络服务仅在 WiFi 连接后才启动

---

## 与服务器端方案的关键差异

| 维度 | 服务器端（Moltis/OpenClaw） | MimiClaw（ESP32） |
| --- | --- | --- |
| 内存 | GB 级，malloc 自由 | 8 MB PSRAM，每字节珍贵 |
| 并发 | 异步运行时（tokio/Node.js） | FreeRTOS 任务 + 队列 |
| 存储 | SQLite / PostgreSQL | SPIFFS 平坦文件系统 |
| 网络 | 全功能 HTTP 栈 | esp_http_client（精简） |
| JSON | serde / 原生对象 | cJSON 手动构建/解析 |
| 错误处理 | Result<T, E> / try-catch | esp_err_t + ESP_ERROR_CHECK |
| TLS | rustls / OpenSSL | esp_tls（mbedTLS） |
| 流式 | 支持 | 不支持（内存限制） |
