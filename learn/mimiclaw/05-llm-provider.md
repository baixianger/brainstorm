# 05 — LLM API 集成

## 概述

LLM 集成位于 `main/llm/llm_proxy.c`，支持 Anthropic（Claude）和 OpenAI（GPT）两种 Provider。

---

## 双 Provider 架构

```c
// 运行时判断当前 Provider
static bool provider_is_openai(void) {
    return (strcmp(s_provider, "openai") == 0);
}
```

### API 端点

```c
#define MIMI_LLM_API_URL       "https://api.anthropic.com/v1/messages"
#define MIMI_OPENAI_API_URL    "https://api.openai.com/v1/chat/completions"
#define MIMI_LLM_API_VERSION   "2023-06-01"   // Anthropic API 版本
#define MIMI_LLM_MAX_TOKENS    4096
```

---

## HTTP/TLS 通信

在 ESP32 上的 HTTPS 调用与服务器端差异巨大：

```c
// ESP-IDF 的 HTTP 客户端
esp_http_client_config_t config = {
    .url = api_url,
    .method = HTTP_METHOD_POST,
    .crt_bundle_attach = esp_crt_bundle_attach,  // 使用内置 CA 证书
    .timeout_ms = 60000,
    .buffer_size = 2048,
    .buffer_size_tx = 4096,
};

esp_http_client_handle_t client = esp_http_client_init(&config);
esp_http_client_set_header(client, "Content-Type", "application/json");
esp_http_client_set_header(client, "x-api-key", s_api_key);
esp_http_client_set_header(client, "anthropic-version", MIMI_LLM_API_VERSION);
```

### 响应缓冲

LLM 响应可能很大，使用动态增长缓冲区：

```c
#define MIMI_LLM_STREAM_BUF_SIZE  (32 * 1024)  // 32 KB 初始缓冲

resp_buf_t rb;
resp_buf_init(&rb, MIMI_LLM_STREAM_BUF_SIZE);
// ... HTTP 调用 ...
resp_buf_free(&rb);
```

---

## 请求构建

### Anthropic 格式

```c
cJSON *body = cJSON_CreateObject();
cJSON_AddStringToObject(body, "model", s_model);
cJSON_AddNumberToObject(body, "max_tokens", MIMI_LLM_MAX_TOKENS);
cJSON_AddStringToObject(body, "system", system_prompt);  // 顶层字段！

// messages 数组
cJSON *msgs_copy = cJSON_Duplicate(messages, 1);
cJSON_AddItemToObject(body, "messages", msgs_copy);

// tools 数组
cJSON *tools = cJSON_Parse(tools_json);
cJSON_AddItemToObject(body, "tools", tools);

char *post_data = cJSON_PrintUnformatted(body);
cJSON_Delete(body);
```

### OpenAI 格式转换

OpenAI 的 `system` 是消息数组中的一条消息，不是顶层字段：

```c
static cJSON *convert_messages_openai(const char *system_prompt, cJSON *messages) {
    cJSON *out = cJSON_CreateArray();

    // system 作为第一条消息
    cJSON *sys = cJSON_CreateObject();
    cJSON_AddStringToObject(sys, "role", "system");
    cJSON_AddStringToObject(sys, "content", system_prompt);
    cJSON_AddItemToArray(out, sys);

    // 转换每条消息的格式
    cJSON *msg;
    cJSON_ArrayForEach(msg, messages) {
        // Anthropic 的 content blocks → OpenAI 的 content + tool_calls
        // tool_result → role: "tool"
        // ...
    }
    return out;
}
```

### 工具定义转换

Anthropic 和 OpenAI 的工具 JSON 格式也不同：

```c
// Anthropic:
// { "name": "web_search", "description": "...", "input_schema": {...} }

// OpenAI:
// { "type": "function", "function": { "name": "web_search", "description": "...", "parameters": {...} } }

static cJSON *convert_tools_openai(const char *tools_json) {
    // 遍历并转换每个工具定义
}
```

---

## 响应解析

### Anthropic 响应

```json
{
    "content": [
        {"type": "text", "text": "Let me search."},
        {"type": "tool_use", "id": "toolu_xxx", "name": "web_search", "input": {"query": "..."}}
    ],
    "stop_reason": "tool_use"
}
```

解析代码：

```c
cJSON *stop_reason = cJSON_GetObjectItem(root, "stop_reason");
resp->tool_use = (strcmp(stop_reason->valuestring, "tool_use") == 0);

cJSON *content = cJSON_GetObjectItem(root, "content");
cJSON *block;
cJSON_ArrayForEach(block, content) {
    cJSON *btype = cJSON_GetObjectItem(block, "type");

    if (strcmp(btype->valuestring, "text") == 0) {
        // 累积文本
        cJSON *text = cJSON_GetObjectItem(block, "text");
        // ... memcpy 到 resp->text
    }
    else if (strcmp(btype->valuestring, "tool_use") == 0) {
        // 提取工具调用
        llm_tool_call_t *call = &resp->calls[resp->call_count];
        // strncpy id, name
        // cJSON_PrintUnformatted(input) → call->input
        resp->call_count++;
    }
}
```

### OpenAI 响应

```json
{
    "choices": [{
        "finish_reason": "tool_calls",
        "message": {
            "content": "Let me search.",
            "tool_calls": [{
                "id": "call_xxx",
                "function": {
                    "name": "web_search",
                    "arguments": "{\"query\":\"...\"}"
                }
            }]
        }
    }]
}
```

注意 OpenAI 的 `arguments` 是**字符串化的 JSON**，而 Anthropic 的 `input` 是 JSON 对象。

---

## NVS 配置管理

Provider、模型、API key 都通过 NVS 持久化：

```c
esp_err_t llm_set_api_key(const char *api_key) {
    nvs_handle_t nvs;
    ESP_ERROR_CHECK(nvs_open(MIMI_NVS_LLM, NVS_READWRITE, &nvs));
    ESP_ERROR_CHECK(nvs_set_str(nvs, MIMI_NVS_KEY_API_KEY, api_key));
    ESP_ERROR_CHECK(nvs_commit(nvs));
    nvs_close(nvs);

    safe_copy(s_api_key, sizeof(s_api_key), api_key);
    return ESP_OK;
}

esp_err_t llm_set_provider(const char *provider) {
    // 同上，保存到 NVS 并更新内存中的值
}
```

---

## 非流式 vs 流式

MimiClaw 使用**非流式** API 调用，原因：
- 内存有限，无法维持长连接 + 增量缓冲
- JSON 解析更简单（一次解析完整响应）
- 延迟不是首要问题（用户通过 Telegram 异步交互）

代价：用户需要等待完整响应，没有"打字中..."的实时效果。

---

## HTTP 代理支持

`main/proxy/http_proxy.c` 实现了 HTTP CONNECT 隧道：

```c
// 通过代理连接到目标服务器
// 1. TCP 连接到代理
// 2. 发送 CONNECT host:443 HTTP/1.1
// 3. 等待 200 Connection Established
// 4. 在隧道上建立 TLS（esp_tls）
```

用于在受限网络中访问 LLM API。
