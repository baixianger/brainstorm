# 02 — 硬件准备与首次烧录

## 硬件需求

| 物品 | 说明 | 价格 |
| --- | --- | --- |
| ESP32-S3 开发板 | 16 MB Flash + 8 MB PSRAM（如小智 AI 板） | ~$5-10 |
| USB Type-C 数据线 | 需要数据线，不能是纯充电线 | — |

### USB 端口注意

大多数 ESP32-S3 开发板有**两个 USB-C 口**：
- **USB**（原生 USB Serial/JTAG）—— **用这个**
- **COM**（外部 UART 桥接）—— 不要用这个

插错端口会导致烧录/监控失败。

---

## 软件环境

### 安装 ESP-IDF v5.5+

```bash
# macOS
brew install cmake ninja dfu-util
# 或按照官方指南：
# https://docs.espressif.com/projects/esp-idf/en/v5.5.2/esp32s3/get-started/

# 克隆 ESP-IDF
git clone -b v5.5.2 --recursive https://github.com/espressif/esp-idf.git
cd esp-idf
./install.sh esp32s3

# 激活环境（每次开新终端需要）
. ./export.sh
```

### 克隆 MimiClaw

```bash
git clone https://github.com/memovai/mimiclaw.git
cd mimiclaw
idf.py set-target esp32s3
```

---

## 配置

### 两层配置系统

MimiClaw 使用两层配置：
1. **构建时默认值**：`mimi_secrets.h`（编译时注入）
2. **运行时覆盖**：NVS Flash（串口 CLI 设置，优先级更高）

```bash
cp main/mimi_secrets.h.example main/mimi_secrets.h
```

编辑 `main/mimi_secrets.h`：

```c
#define MIMI_SECRET_WIFI_SSID       "你的WiFi名"
#define MIMI_SECRET_WIFI_PASS       "你的WiFi密码"
#define MIMI_SECRET_TG_TOKEN        "123456:ABC-DEF..."    // 从 @BotFather 获取
#define MIMI_SECRET_API_KEY         "sk-ant-api03-xxxxx"    // Anthropic 或 OpenAI key
#define MIMI_SECRET_MODEL_PROVIDER  "anthropic"             // "anthropic" 或 "openai"
#define MIMI_SECRET_SEARCH_KEY      ""                      // 可选：Brave Search API key
#define MIMI_SECRET_PROXY_HOST      ""                      // 可选：代理主机
#define MIMI_SECRET_PROXY_PORT      ""                      // 可选：代理端口
```

### 获取 Telegram Bot Token

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot`
3. 按提示设置名称
4. 获得形如 `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` 的 token

---

## 构建与烧录

```bash
# 清理构建（修改 mimi_secrets.h 后必须 fullclean）
idf.py fullclean && idf.py build

# 查找串口
ls /dev/cu.usb*          # macOS
ls /dev/ttyACM*          # Linux

# 烧录并启动串口监控
idf.py -p /dev/cu.usbmodem11401 flash monitor
```

### 首次启动输出

```
========================================
  MimiClaw - ESP32-S3 AI Agent
========================================
Internal free: 250000 bytes
PSRAM free:    8100000 bytes
SPIFFS: total=12000000, used=8192
Scanning nearby APs on boot...
Waiting for WiFi connection...
WiFi connected: 192.168.1.100
All services started!
MimiClaw ready. Type 'help' for CLI commands.
```

---

## 串口 CLI 命令

通过 USB 串口连接后可以使用以下命令：

### 运行时配置（保存到 NVS，覆盖构建时默认值）

```
mimi> wifi_set MySSID MyPassword      # 更换 WiFi
mimi> set_tg_token 123456:ABC...      # 更换 Telegram token
mimi> set_api_key sk-ant-api03-...    # 更换 API key
mimi> set_model_provider openai       # 切换 Provider
mimi> set_model gpt-4o                # 更换模型
mimi> set_proxy 127.0.0.1 7897       # 设置 HTTP 代理
mimi> clear_proxy                     # 清除代理
mimi> set_search_key BSA...           # 设置 Brave Search key
mimi> config_show                     # 显示所有配置（脱敏）
mimi> config_reset                    # 清除 NVS，恢复构建时默认
```

### 调试与维护

```
mimi> wifi_status                     # WiFi 连接状态
mimi> memory_read                     # 查看 MEMORY.md 内容
mimi> memory_write "content"          # 写入 MEMORY.md
mimi> heap_info                       # 查看剩余 RAM
mimi> session_list                    # 列出所有会话
mimi> session_clear 12345             # 清除某个会话
mimi> restart                         # 重启设备
```

---

## OTA 更新

支持通过 WiFi 更新固件，无需 USB：

```c
// 固件分区：两个 2MB 的 OTA 槽位
// ota_0: 当前运行的固件
// ota_1: OTA 下载目标
// 下载完成后切换启动分区并重启
```

---

## 常见问题

### 烧录失败
- 确认插的是 **USB** 口而非 **COM** 口
- 确认使用的是数据线而非纯充电线
- 试试按住 BOOT 按钮再插入 USB

### WiFi 连接超时
- 检查 SSID 和密码是否正确
- ESP32-S3 仅支持 **2.4 GHz** WiFi，不支持 5 GHz
- 串口 CLI 始终可用，可以用 `wifi_set` 更换凭据

### 内存不足
- 使用 `heap_info` 检查剩余内存
- PSRAM 应该有 ~7.7 MB 可用
- 大缓冲区（32KB+）应使用 PSRAM 分配
