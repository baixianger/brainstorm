# 08 — 嵌入式 C 编程模式

## MimiClaw 中的嵌入式 C 编程惯例

---

## 1. 错误处理：esp_err_t

ESP-IDF 使用 `esp_err_t` 作为统一错误类型：

```c
// 每个函数返回 esp_err_t
esp_err_t wifi_manager_init(void);  // ESP_OK 或错误码

// 关键路径：ESP_ERROR_CHECK（失败时 abort）
ESP_ERROR_CHECK(nvs_flash_init());

// 非关键路径：检查并处理
esp_err_t err = wifi_manager_start();
if (err != ESP_OK) {
    ESP_LOGW(TAG, "WiFi failed: %s", esp_err_to_name(err));
    // 继续运行，CLI 仍可用
}
```

### 常见错误码

| 错误码 | 含义 |
| --- | --- |
| `ESP_OK` | 成功 |
| `ESP_FAIL` | 通用失败 |
| `ESP_ERR_NO_MEM` | 内存分配失败 |
| `ESP_ERR_INVALID_STATE` | 状态错误（如未初始化） |
| `ESP_ERR_NOT_FOUND` | 未找到 |
| `ESP_ERR_TIMEOUT` | 超时 |

---

## 2. 日志系统

```c
static const char *TAG = "mimi";  // 每个文件一个 TAG

ESP_LOGE(TAG, "Error: %s", message);    // 错误（红色）
ESP_LOGW(TAG, "Warning: %s", message);  // 警告（黄色）
ESP_LOGI(TAG, "Info: %s", message);     // 信息（绿色）
ESP_LOGD(TAG, "Debug: %s", message);    // 调试
ESP_LOGV(TAG, "Verbose: %s", message);  // 详细

// 控制日志级别
esp_log_level_set("esp-x509-crt-bundle", ESP_LOG_WARN);  // 降低噪音
```

---

## 3. FreeRTOS 队列通信

任务间通信使用 FreeRTOS 队列（而非共享内存 + 锁）：

```c
// 创建队列
QueueHandle_t inbound_queue = xQueueCreate(8, sizeof(mimi_msg_t));

// 发送（入站端）
mimi_msg_t msg = {
    .channel = "telegram",
    .chat_id = "12345",
    .content = strdup("Hello"),  // 堆分配，所有权转移
};
xQueueSend(inbound_queue, &msg, portMAX_DELAY);

// 接收（Agent Loop）
mimi_msg_t msg;
if (xQueueReceive(inbound_queue, &msg, portMAX_DELAY) == pdTRUE) {
    // 处理消息...
    free(msg.content);  // 接收方负责释放
}
```

### 所有权转移模式

关键设计：字符串 `content` 在 push 时**转移所有权**，接收方必须 `free()`。这避免了：
- 数据竞争（无共享指针）
- 生命周期管理（单一所有者）
- 锁的需要

---

## 4. 字符串安全

C 语言字符串操作是安全重灾区。MimiClaw 的做法：

```c
// ✅ 安全拷贝
static void safe_copy(char *dst, size_t dst_size, const char *src) {
    strncpy(dst, src, dst_size - 1);
    dst[dst_size - 1] = '\0';  // 确保 null 终止
}

// ✅ 使用 snprintf 而非 sprintf
snprintf(buf, sizeof(buf), "chat_id=%s", chat_id);

// ❌ 危险：无边界检查
strcpy(dst, src);      // 可能溢出
sprintf(buf, "%s", s); // 可能溢出
```

### strncpy 注意事项

`strncpy` 在源字符串长度 >= n 时**不会添加 null 终止符**：

```c
char buf[16];
strncpy(buf, very_long_string, sizeof(buf) - 1);
buf[sizeof(buf) - 1] = '\0';  // 必须手动添加！
```

---

## 5. cJSON 使用

cJSON 是 MimiClaw 使用的 JSON 库（ESP-IDF 内置）：

### 构建 JSON

```c
cJSON *body = cJSON_CreateObject();
cJSON_AddStringToObject(body, "model", "claude-opus-4-5");
cJSON_AddNumberToObject(body, "max_tokens", 4096);

cJSON *arr = cJSON_CreateArray();
cJSON *msg = cJSON_CreateObject();
cJSON_AddStringToObject(msg, "role", "user");
cJSON_AddStringToObject(msg, "content", "Hello");
cJSON_AddItemToArray(arr, msg);
cJSON_AddItemToObject(body, "messages", arr);

char *json_str = cJSON_PrintUnformatted(body);
// 使用 json_str...
free(json_str);     // cJSON_Print 的结果需要 free
cJSON_Delete(body); // 删除 cJSON 树
```

### 解析 JSON

```c
cJSON *root = cJSON_Parse(json_string);
if (!root) {
    ESP_LOGE(TAG, "JSON parse failed");
    return ESP_FAIL;
}

cJSON *name = cJSON_GetObjectItem(root, "name");
if (name && cJSON_IsString(name)) {
    printf("Name: %s\n", name->valuestring);
}

cJSON *items = cJSON_GetObjectItem(root, "items");
cJSON *item;
cJSON_ArrayForEach(item, items) {
    // 遍历数组
}

cJSON_Delete(root);  // 一次释放整棵树
```

### cJSON 内存注意

| 操作 | 所有权 |
| --- | --- |
| `cJSON_CreateObject()` | 调用者拥有 |
| `cJSON_AddItemToObject(parent, key, child)` | child 所有权转移给 parent |
| `cJSON_AddItemToArray(arr, item)` | item 所有权转移给 arr |
| `cJSON_Duplicate(item, 1)` | 深拷贝，调用者拥有新对象 |
| `cJSON_Delete(root)` | 递归释放整棵树 |
| `cJSON_Print(item)` | 返回堆分配字符串，需要 `free()` |

**关键**：一旦用 `cJSON_AddItem*` 添加到父节点，就不要再手动 `cJSON_Delete` 子节点。

---

## 6. PSRAM 大缓冲区分配

```c
// 大缓冲区从 PSRAM 分配
char *buf = heap_caps_calloc(1, 32 * 1024, MALLOC_CAP_SPIRAM);
if (!buf) {
    ESP_LOGE(TAG, "PSRAM allocation failed");
    return ESP_ERR_NO_MEM;
}
// 使用...
free(buf);

// 检查可用内存
size_t internal = heap_caps_get_free_size(MALLOC_CAP_INTERNAL);
size_t psram = heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
ESP_LOGI(TAG, "Internal: %d, PSRAM: %d", (int)internal, (int)psram);
```

---

## 7. 任务创建模式

```c
// 固定核心的任务创建
xTaskCreatePinnedToCore(
    task_function,          // 任务函数
    "task_name",            // 名称（调试用）
    stack_size,             // 栈大小（字节）
    (void *)param,          // 参数
    priority,               // 优先级（数字越大优先级越高）
    &task_handle,           // 任务句柄（可选）
    core_id                 // 运行的核心（0 或 1）
);
```

### 任务函数模板

```c
static void my_task(void *arg) {
    ESP_LOGI(TAG, "Task started");

    while (1) {
        // 做事...
        vTaskDelay(pdMS_TO_TICKS(100));  // 让出 CPU
    }

    // 正常不会到达这里
    vTaskDelete(NULL);
}
```

---

## 8. WiFi 指数退避

```c
#define MIMI_WIFI_MAX_RETRY     10
#define MIMI_WIFI_RETRY_BASE_MS 1000
#define MIMI_WIFI_RETRY_MAX_MS  30000

// 重试延迟 = min(base * 2^attempt, max)
int delay = MIN(MIMI_WIFI_RETRY_BASE_MS * (1 << retry_count), MIMI_WIFI_RETRY_MAX_MS);
vTaskDelay(pdMS_TO_TICKS(delay));
```

---

## 9. 模块初始化模式

MimiClaw 每个模块遵循统一的 init/start 模式：

```c
// xxx.h
esp_err_t xxx_init(void);   // 初始化（分配资源，加载配置）
esp_err_t xxx_start(void);  // 启动（创建任务，开始服务）

// xxx.c
static bool s_initialized = false;

esp_err_t xxx_init(void) {
    if (s_initialized) return ESP_OK;

    // 加载配置、分配资源
    // ...

    s_initialized = true;
    return ESP_OK;
}

esp_err_t xxx_start(void) {
    if (!s_initialized) return ESP_ERR_INVALID_STATE;

    // 创建 FreeRTOS 任务
    xTaskCreatePinnedToCore(...);

    return ESP_OK;
}
```

### 启动顺序依赖

```
init_nvs → init_spiffs → message_bus_init → memory_store_init →
session_mgr_init → wifi_manager_init → http_proxy_init →
telegram_bot_init → llm_proxy_init → tool_registry_init →
agent_loop_init → serial_cli_init

[WiFi 连接后]
telegram_bot_start → agent_loop_start → ws_server_start → outbound_dispatch
```

---

## 10. 与 Rust（Moltis）的编程模式对比

| 模式 | C (MimiClaw) | Rust (Moltis) |
| --- | --- | --- |
| 错误处理 | `esp_err_t` + 手动检查 | `Result<T, E>` + `?` 运算符 |
| 字符串 | `char *` + `strncpy` + 手动 null | `String` / `&str`（自动管理） |
| 内存管理 | `malloc/free` + 所有权约定 | 所有权系统（编译时检查） |
| JSON | cJSON（手动构建/解析） | serde（自动序列化/反序列化） |
| 并发 | FreeRTOS 任务 + 队列 | tokio 异步任务 + channel |
| 多态 | 函数指针 | trait + dyn Trait |
| 配置 | `#define` 常量 | TOML 反序列化到结构体 |
| 安全 | 靠程序员自律 | 编译器强制 |
