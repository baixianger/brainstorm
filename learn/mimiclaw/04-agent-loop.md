# 04 — Agent 循环与 ReAct 模式

## Agent Loop 核心

位于 `main/agent/agent_loop.c`，在 Core 1 上独占运行。

### ReAct 模式

ReAct（Reasoning + Acting）是一种让 LLM 交替"思考"和"行动"的模式：

```
用户消息
    │
    ▼
┌─────────────────────────────┐
│ 构建上下文（system prompt + │
│ 历史 + 当前消息 + 工具定义）│
└────────────┬────────────────┘
             │
    ┌────────▼────────┐
    │ 调用 LLM API    │ ◀──────────────┐
    │（非流式，带 tools）│                │
    └────────┬────────┘                │
             │                         │
       stop_reason?                    │
       ├─ "tool_use" ──┐              │
       │                ▼              │
       │    ┌──────────────────┐      │
       │    │ 执行工具          │      │
       │    │ (web_search 等)   │      │
       │    └────────┬─────────┘      │
       │             │                 │
       │    追加 tool_result 到消息     │
       │             └─────────────────┘
       │
       └─ "end_turn" ──▶ 返回最终文本
```

### 循环限制

```c
#define MIMI_AGENT_MAX_TOOL_ITER  10   // 最多 10 轮工具调用
#define MIMI_MAX_TOOL_CALLS        4   // 单次最多 4 个工具调用
```

防止 LLM 进入无限循环。

---

## 上下文构建（context_builder.c）

System prompt 由多个部分组合而成：

```
System Prompt = SOUL.md（人格）
              + USER.md（用户档案）
              + MEMORY.md（长期记忆）
              + 最近的每日笔记
              + 工具使用指引
              + 当前日期时间
```

```c
// 概念代码
void build_system_prompt(char *buf, size_t buf_size) {
    // 1. 读取 SOUL.md
    read_file("/spiffs/config/SOUL.md", buf, ...);

    // 2. 追加 USER.md
    append_file("/spiffs/config/USER.md", buf, ...);

    // 3. 追加 MEMORY.md
    append_file("/spiffs/memory/MEMORY.md", buf, ...);

    // 4. 追加今天的笔记
    char today[32];
    get_today_filename(today);
    append_file(today, buf, ...);

    // 5. 追加工具指引
    append_tool_guidance(buf, ...);
}
```

缓冲区大小：

```c
#define MIMI_CONTEXT_BUF_SIZE  (16 * 1024)  // 16 KB 的 system prompt
```

---

## 消息数组构建

使用 cJSON 库手动构建消息数组：

```c
// 构建消息数组
cJSON *messages = cJSON_CreateArray();

// 添加历史消息（从 JSONL 文件加载）
session_load(chat_id, messages, MIMI_AGENT_MAX_HISTORY);

// 添加当前用户消息
cJSON *user_msg = cJSON_CreateObject();
cJSON_AddStringToObject(user_msg, "role", "user");
cJSON_AddStringToObject(user_msg, "content", input_text);
cJSON_AddItemToArray(messages, user_msg);
```

### Anthropic vs OpenAI 消息格式

MimiClaw 支持两种 Provider，消息格式不同：

**Anthropic 格式**：
```json
{
    "system": "You are...",
    "messages": [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": [
            {"type": "text", "text": "Let me search."},
            {"type": "tool_use", "id": "toolu_xxx", "name": "web_search", "input": {"query": "..."}}
        ]}
    ]
}
```

**OpenAI 格式**：
```json
{
    "messages": [
        {"role": "system", "content": "You are..."},
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Let me search.", "tool_calls": [
            {"id": "call_xxx", "type": "function", "function": {"name": "web_search", "arguments": "{\"query\":\"...\"}"}}
        ]}
    ]
}
```

`llm_proxy.c` 中的 `convert_messages_openai()` 函数处理格式转换。

---

## 工具调用流程

### 1. LLM 返回 tool_use

Anthropic 响应：
```json
{
    "content": [
        {"type": "text", "text": "Let me search for that."},
        {"type": "tool_use", "id": "toolu_xxx", "name": "web_search", "input": {"query": "weather today"}}
    ],
    "stop_reason": "tool_use"
}
```

### 2. 解析工具调用

```c
typedef struct {
    char id[64];        // 工具调用 ID
    char name[64];      // 工具名称
    char *input;        // JSON 参数（堆分配）
    size_t input_len;
} llm_tool_call_t;

typedef struct {
    char *text;                 // 文本响应
    size_t text_len;
    bool tool_use;              // 是否有工具调用
    llm_tool_call_t calls[MIMI_MAX_TOOL_CALLS];  // 最多 4 个
    int call_count;
} llm_response_t;
```

### 3. 执行工具

```c
for (int i = 0; i < resp.call_count; i++) {
    char result[4096];
    tool_registry_execute(resp.calls[i].name, resp.calls[i].input, result, sizeof(result));

    // 构建 tool_result 消息
    // ...
}
```

### 4. 追加结果并继续

将 assistant 的 content（包含 text + tool_use）和 user 的 tool_result 追加到消息数组，然后再次调用 LLM。

---

## 会话持久化

Agent 循环结束后，保存到 JSONL 文件：

```c
// 保存用户消息
session_append(chat_id, "user", input_text);

// 保存助理回复
session_append(chat_id, "assistant", response_text);
```

JSONL 格式（每行一个 JSON 对象）：
```json
{"role":"user","content":"What's the weather?","ts":1738764810}
{"role":"assistant","content":"It's sunny and 72°F.","ts":1738764815}
```

---

## 错误处理

Agent 循环中的错误不会导致任务退出：

```c
while (1) {
    mimi_msg_t msg;
    if (message_bus_pop_inbound(&msg, UINT32_MAX) != ESP_OK) continue;

    // 处理消息...
    esp_err_t err = process_message(&msg);
    if (err != ESP_OK) {
        // 发送错误消息给用户，而非崩溃
        send_error_response(msg.channel, msg.chat_id, err);
    }

    free(msg.content);
}
```
