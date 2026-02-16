# 03 — 内存管理与 Flash 存储

## 内存架构

ESP32-S3 有两种 RAM：

| 类型 | 大小 | 速度 | 用途 |
| --- | --- | --- | --- |
| 内部 SRAM | ~512 KB | 快 | FreeRTOS 栈、WiFi 缓冲、关键数据 |
| 外部 PSRAM | 8 MB | 较慢 | 大缓冲区、JSON 解析、TLS 连接 |

### 内存预算

| 用途 | 位置 | 大小 |
| --- | --- | --- |
| FreeRTOS 任务栈 | 内部 SRAM | ~40 KB |
| WiFi 缓冲区 | 内部 SRAM | ~30 KB |
| TLS 连接 x2（Telegram + LLM） | PSRAM | ~120 KB |
| JSON 解析缓冲 | PSRAM | ~32 KB |
| 会话历史缓存 | PSRAM | ~32 KB |
| System prompt 缓冲 | PSRAM | ~16 KB |
| LLM 响应缓冲 | PSRAM | ~32 KB |
| **剩余可用** | **PSRAM** | **~7.7 MB** |

### PSRAM 分配

大缓冲区（32KB+）必须从 PSRAM 分配：

```c
// ✅ 从 PSRAM 分配
char *buf = heap_caps_calloc(1, 32 * 1024, MALLOC_CAP_SPIRAM);

// ❌ 默认 malloc 可能从内部 SRAM 分配
char *buf = calloc(1, 32 * 1024);  // 可能耗尽内部 SRAM
```

### 动态缓冲区结构

```c
typedef struct {
    char *data;     // 堆分配的缓冲区
    size_t len;     // 当前数据长度
    size_t cap;     // 缓冲区容量
} resp_buf_t;

esp_err_t resp_buf_init(resp_buf_t *rb, size_t initial_cap);
void resp_buf_free(resp_buf_t *rb);
```

---

## Flash 分区表

16 MB Flash 的分区布局（`partitions.csv`）：

```
偏移         大小      名称        用途
─────────────────────────────────────────────
0x009000     24 KB    nvs         ESP-IDF 内部（WiFi 校准等）
0x00F000      8 KB    otadata     OTA 启动状态
0x011000      4 KB    phy_init    WiFi PHY 校准
0x020000      2 MB    ota_0       固件槽位 A
0x220000      2 MB    ota_1       固件槽位 B
0x420000     12 MB    spiffs      Markdown 记忆、会话、配置
0xFF0000     64 KB    coredump    崩溃转储
```

关键设计：
- **两个 OTA 槽位**（各 2MB）—— 支持 A/B 无缝升级
- **12 MB SPIFFS**—— 最大的分区，存储所有用户数据
- **64 KB coredump**—— 崩溃时自动保存调试信息

---

## SPIFFS 文件系统

SPIFFS（SPI Flash File System）是为 NOR Flash 设计的轻量级文件系统。

### 特点
- **平坦结构**——没有真正的目录，路径名只是文件名的一部分
- **磨损均衡**——自动分散写操作延长 Flash 寿命
- **掉电安全**——写操作原子性
- **无目录索引**——遍历所有文件较慢

### 存储布局

```
/spiffs/config/SOUL.md          AI 人格定义
/spiffs/config/USER.md          用户档案
/spiffs/memory/MEMORY.md        长期记忆（持久化）
/spiffs/memory/2026-02-05.md    每日笔记（一天一个文件）
/spiffs/sessions/tg_12345.jsonl 会话历史（每个 Telegram 聊天一个文件）
```

### 文件操作示例

```c
// 读取文件
FILE *f = fopen("/spiffs/memory/MEMORY.md", "r");
if (f) {
    char buf[4096];
    size_t len = fread(buf, 1, sizeof(buf) - 1, f);
    buf[len] = '\0';
    fclose(f);
}

// 追加写入
FILE *f = fopen("/spiffs/memory/2026-02-05.md", "a");
if (f) {
    fprintf(f, "- Learned about MimiClaw architecture\n");
    fclose(f);
}
```

---

## NVS（Non-Volatile Storage）

NVS 是 ESP-IDF 的键值存储系统，用于运行时配置：

```c
// 命名空间隔离
#define MIMI_NVS_WIFI    "wifi_config"
#define MIMI_NVS_TG      "tg_config"
#define MIMI_NVS_LLM     "llm_config"
#define MIMI_NVS_PROXY   "proxy_config"
#define MIMI_NVS_SEARCH  "search_config"

// 写入示例
nvs_handle_t nvs;
ESP_ERROR_CHECK(nvs_open("llm_config", NVS_READWRITE, &nvs));
ESP_ERROR_CHECK(nvs_set_str(nvs, "api_key", api_key));
ESP_ERROR_CHECK(nvs_commit(nvs));
nvs_close(nvs);

// 读取示例
nvs_handle_t nvs;
ESP_ERROR_CHECK(nvs_open("llm_config", NVS_READONLY, &nvs));
size_t len = sizeof(buf);
esp_err_t err = nvs_get_str(nvs, "api_key", buf, &len);
nvs_close(nvs);
```

### 配置优先级

```
NVS（运行时 CLI 设置） > mimi_secrets.h（构建时） > mimi_config.h（默认值）
```

---

## 会话存储（JSONL）

每个 Telegram 聊天对应一个 JSONL 文件，每行一个 JSON 对象：

```json
{"role":"user","content":"Hello","ts":1738764800}
{"role":"assistant","content":"Hi there!","ts":1738764802}
{"role":"user","content":"What's the weather?","ts":1738764810}
```

### 环形缓冲区

会话历史使用环形缓冲区策略：

```c
#define MIMI_SESSION_MAX_MSGS  20    // 最多保留 20 条消息
#define MIMI_AGENT_MAX_HISTORY 20    // Agent 上下文最多 20 条历史
```

当消息超过上限时，旧消息被丢弃（不是所有消息都加载到内存）。

---

## 记忆文件

### SOUL.md — AI 人格

定义了 AI 助手的行为风格、语气、能力边界：

```markdown
# Soul

You are MimiClaw, a friendly AI assistant running on a tiny ESP32 chip.
You are helpful, concise, and honest about your limitations.
```

### USER.md — 用户档案

存储用户偏好和基本信息：

```markdown
# User Profile

- Name: Alice
- Language: English
- Timezone: PST
```

### MEMORY.md — 长期记忆

Agent 可以读写的持久化记忆：

```markdown
# Memory

- User prefers Python over JavaScript
- User's birthday is March 15th
- Last discussed: ESP32 power optimization
```

### 每日笔记（YYYY-MM-DD.md）

每天一个文件，记录当天的重要事件：

```markdown
# 2026-02-05

- Discussed project architecture
- User asked about memory optimization
- Scheduled meeting for Friday
```

---

## 内存安全注意事项

| 场景 | 处理方式 |
| --- | --- |
| SPIFFS 满了 | 检查 `esp_spiffs_info()` 的 used/total |
| PSRAM 耗尽 | `heap_caps_get_free_size(MALLOC_CAP_SPIRAM)` 检查 |
| 内部 SRAM 耗尽 | `heap_caps_get_free_size(MALLOC_CAP_INTERNAL)` 检查 |
| NVS 损坏 | `nvs_flash_erase()` 后重新初始化 |
| 字符串溢出 | 使用 `strncpy` + 手动 null 终止 |
