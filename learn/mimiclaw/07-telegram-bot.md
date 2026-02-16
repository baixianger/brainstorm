# 07 — Telegram Bot 集成

## 概述

Telegram 集成位于 `main/telegram/telegram_bot.c`，是主要的用户交互渠道。

---

## 长轮询（Long Polling）

Telegram Bot API 使用 HTTP 长轮询获取消息：

```
ESP32 → HTTPS GET → https://api.telegram.org/bot<TOKEN>/getUpdates
                     ?timeout=30&offset=<last_update_id+1>
                  ← JSON 响应（消息数组）
等待 30 秒或有新消息到达
```

### 工作流

```c
// 简化的轮询循环
static void tg_poll_task(void *arg) {
    int64_t offset = 0;

    while (1) {
        // 构建 URL
        char url[256];
        snprintf(url, sizeof(url),
            "https://api.telegram.org/bot%s/getUpdates?timeout=%d&offset=%lld",
            bot_token, MIMI_TG_POLL_TIMEOUT_S, offset);

        // HTTPS GET
        char response[MIMI_TG_MAX_MSG_LEN];
        esp_err_t err = http_get(url, response, sizeof(response));
        if (err != ESP_OK) {
            vTaskDelay(pdMS_TO_TICKS(5000));  // 出错时等待 5 秒重试
            continue;
        }

        // 解析 JSON
        cJSON *root = cJSON_Parse(response);
        cJSON *result = cJSON_GetObjectItem(root, "result");

        cJSON *update;
        cJSON_ArrayForEach(update, result) {
            // 提取 update_id, chat_id, text
            int64_t update_id = cJSON_GetObjectItem(update, "update_id")->valuedouble;
            offset = update_id + 1;

            cJSON *message = cJSON_GetObjectItem(update, "message");
            cJSON *text = cJSON_GetObjectItem(message, "text");
            cJSON *chat = cJSON_GetObjectItem(message, "chat");
            char *chat_id = cJSON_GetObjectItem(chat, "id")->valuestring;

            // 包装成 mimi_msg_t 推入入站队列
            mimi_msg_t msg;
            strncpy(msg.channel, "telegram", sizeof(msg.channel));
            strncpy(msg.chat_id, chat_id, sizeof(msg.chat_id));
            msg.content = strdup(text->valuestring);
            message_bus_push_inbound(&msg);
        }

        cJSON_Delete(root);
    }
}
```

### 任务配置

```c
#define MIMI_TG_POLL_TIMEOUT_S  30        // 长轮询超时
#define MIMI_TG_MAX_MSG_LEN     4096      // 最大消息长度
#define MIMI_TG_POLL_STACK      (12 * 1024)  // 12 KB 栈
#define MIMI_TG_POLL_PRIO       5         // 优先级
#define MIMI_TG_POLL_CORE       0         // 运行在 Core 0
```

---

## 发送消息

```c
esp_err_t telegram_send_message(const char *chat_id, const char *text) {
    // 构建请求体
    cJSON *body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "chat_id", chat_id);
    cJSON_AddStringToObject(body, "text", text);
    cJSON_AddStringToObject(body, "parse_mode", "Markdown");

    char *post_data = cJSON_PrintUnformatted(body);
    cJSON_Delete(body);

    // HTTPS POST
    char url[256];
    snprintf(url, sizeof(url),
        "https://api.telegram.org/bot%s/sendMessage", bot_token);

    esp_err_t err = http_post(url, post_data, NULL, 0);
    free(post_data);
    return err;
}
```

### 长消息分割

Telegram 单条消息最大 4096 字符。长回复需要分割：

```c
// 概念代码
void send_long_message(const char *chat_id, const char *text) {
    size_t len = strlen(text);
    size_t offset = 0;

    while (offset < len) {
        size_t chunk_len = MIN(4096, len - offset);
        // 在合适位置截断（换行符、空格）
        // ...
        char chunk[4097];
        memcpy(chunk, text + offset, chunk_len);
        chunk[chunk_len] = '\0';

        telegram_send_message(chat_id, chunk);
        offset += chunk_len;
    }
}
```

---

## Markdown 格式化

Telegram 支持 Markdown 格式，但有限制：

| Markdown | Telegram 支持 |
| --- | --- |
| **粗体** `**text**` | 支持 |
| *斜体* `*text*` | 支持 |
| `代码` `` `code` `` | 支持 |
| 代码块 ` ```code``` ` | 支持 |
| [链接](url) | 支持 |
| 标题 `# H1` | 不支持 |
| 列表 `- item` | 不支持（显示为纯文本） |

需要将 LLM 回复中不支持的 Markdown 语法转换或移除。

---

## Bot 初始化

```c
esp_err_t telegram_bot_init(void) {
    // 1. 从 NVS 读取 token（优先）
    // 2. 如果 NVS 无值，使用 mimi_secrets.h 的构建时值
    // 3. 验证 token 非空
    return ESP_OK;
}

esp_err_t telegram_bot_start(void) {
    // 创建轮询任务（固定在 Core 0）
    xTaskCreatePinnedToCore(
        tg_poll_task, "tg_poll",
        MIMI_TG_POLL_STACK, NULL,
        MIMI_TG_POLL_PRIO, NULL,
        MIMI_TG_POLL_CORE);
    return ESP_OK;
}
```

---

## WebSocket 网关

除了 Telegram，还有 WebSocket 服务器用于 LAN 访问：

```c
#define MIMI_WS_PORT        18789   // 监听端口
#define MIMI_WS_MAX_CLIENTS 4       // 最多 4 个并发连接
```

### 协议

**客户端 → 服务器**：
```json
{"type": "message", "content": "Hello", "chat_id": "ws_client1"}
```

**服务器 → 客户端**：
```json
{"type": "response", "content": "Hi there!", "chat_id": "ws_client1"}
```

### 使用场景

- 本地开发/调试
- 自定义客户端接入
- 不依赖 Telegram 的场景

---

## 对比：直接 HTTP vs Bot 库

MimiClaw 直接使用 ESP-IDF 的 `esp_http_client` 调用 Telegram API，而不是使用任何 Bot 框架：

| 方面 | 直接 HTTP | Bot 框架 |
| --- | --- | --- |
| 依赖 | 无额外依赖 | 需要引入库 |
| 内存 | 最小化 | 框架开销 |
| 灵活性 | 完全控制 | 受框架限制 |
| 复杂度 | 需要手写 JSON 解析 | 自动处理 |
| 维护 | 需要跟踪 API 变化 | 库维护者处理 |

在 ESP32 这种资源受限环境中，直接 HTTP 是合理选择。
