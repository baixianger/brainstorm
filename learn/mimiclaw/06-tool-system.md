# 06 — 工具系统与注册表

## 工具注册表（tool_registry.c）

位于 `main/tools/tool_registry.c`，管理所有可用工具。

### 工具定义结构

```c
// 每个工具实现这个函数签名
typedef esp_err_t (*tool_handler_t)(const char *input_json, char *output, size_t output_size);

typedef struct {
    const char *name;         // 工具名称
    const char *description;  // 描述（LLM 用此理解何时调用）
    const char *input_schema; // JSON Schema 字符串
    tool_handler_t handler;   // 执行函数
} tool_def_t;
```

### 注册流程

```c
esp_err_t tool_registry_init(void) {
    // 注册所有工具
    register_tool("web_search", "Search the web...", web_search_schema, tool_web_search_execute);
    register_tool("get_current_time", "Get current date/time...", time_schema, tool_get_time_execute);

    // 构建 tools JSON（给 LLM 的工具定义数组）
    build_tools_json();

    return ESP_OK;
}
```

### 工具调度

```c
esp_err_t tool_registry_execute(const char *name, const char *input, char *output, size_t output_size) {
    for (int i = 0; i < tool_count; i++) {
        if (strcmp(tools[i].name, name) == 0) {
            return tools[i].handler(input, output, output_size);
        }
    }
    snprintf(output, output_size, "Error: Unknown tool '%s'", name);
    return ESP_ERR_NOT_FOUND;
}
```

---

## 内置工具

### web_search — 网络搜索

位于 `main/tools/tool_web_search.c`。

**功能**：通过 Brave Search API 搜索网络。

```c
// 工具 schema
{
    "name": "web_search",
    "description": "Search the web for current information.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query"
            }
        },
        "required": ["query"]
    }
}
```

**实现流程**：
```
1. 解析 input JSON，提取 query
2. URL 编码查询字符串
3. HTTPS GET → https://api.search.brave.com/res/v1/web/search?q=...
4. 解析 JSON 响应
5. 提取搜索结果的 title + description + URL
6. 格式化为文本返回给 LLM
```

**代理支持**：如果配置了 HTTP 代理，搜索请求也通过代理发送。

需要 Brave Search API key（免费额度足够个人使用）。

### get_current_time — 获取时间

位于 `main/tools/tool_get_time.c`。

**功能**：通过 HTTP 获取当前日期时间，并设置系统时钟。

ESP32 没有实时时钟（RTC 重启后丢失），此工具通过网络同步时间：

```c
// 通过 worldtimeapi.org 或类似 API 获取时间
// 设置系统时间 via settimeofday()
// 返回格式化的日期时间字符串
```

### tool_files — 文件操作

位于 `main/tools/tool_files.c`。

**功能**：读写 SPIFFS 上的文件（记忆、笔记等）。

---

## 工具 JSON 构建

给 LLM 的工具定义是在初始化时构建的 JSON 数组：

```c
static char *s_tools_json = NULL;  // 全局缓存

static void build_tools_json(void) {
    cJSON *arr = cJSON_CreateArray();

    for (int i = 0; i < tool_count; i++) {
        cJSON *tool = cJSON_CreateObject();
        cJSON_AddStringToObject(tool, "name", tools[i].name);
        cJSON_AddStringToObject(tool, "description", tools[i].description);

        cJSON *schema = cJSON_Parse(tools[i].input_schema);
        cJSON_AddItemToObject(tool, "input_schema", schema);

        cJSON_AddItemToArray(arr, tool);
    }

    s_tools_json = cJSON_PrintUnformatted(arr);
    cJSON_Delete(arr);
}
```

### Anthropic vs OpenAI 工具格式

LLM 调用时，工具定义根据 Provider 不同需要转换：

**Anthropic**（原始格式）：
```json
[
    {
        "name": "web_search",
        "description": "Search the web",
        "input_schema": { "type": "object", "properties": {...} }
    }
]
```

**OpenAI**（包装格式）：
```json
[
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web",
            "parameters": { "type": "object", "properties": {...} }
        }
    }
]
```

`llm_proxy.c` 中的 `convert_tools_openai()` 处理此转换。

---

## 添加新工具的步骤

1. 创建 `main/tools/tool_xxx.c` 和 `tool_xxx.h`

2. 实现 handler 函数：

```c
esp_err_t tool_xxx_execute(const char *input_json, char *output, size_t output_size) {
    // 1. 解析输入
    cJSON *root = cJSON_Parse(input_json);
    cJSON *param = cJSON_GetObjectItem(root, "param_name");

    // 2. 执行操作
    // ...

    // 3. 写入输出
    snprintf(output, output_size, "Result: ...");

    cJSON_Delete(root);
    return ESP_OK;
}
```

3. 在 `tool_registry_init()` 中注册：

```c
register_tool("xxx", "Description of tool xxx",
    "{\"type\":\"object\",\"properties\":{...},\"required\":[...]}",
    tool_xxx_execute);
```

4. 更新 `main/CMakeLists.txt` 添加新源文件

---

## 工具限制

| 限制 | 值 | 原因 |
| --- | --- | --- |
| 单次最多工具调用 | 4 | 内存限制 |
| 最多循环轮次 | 10 | 防止无限循环 |
| 输出缓冲区 | 4 KB | 栈大小限制 |
| 无并行执行 | 串行 | 单线程 Agent Loop |

相比服务器端方案（Moltis 使用 `futures::join_all` 并行执行工具），MimiClaw 的工具串行执行。在 ESP32 上这是合理的——单核专用于 Agent，并行没有性能优势。
