# 03 — 配置系统详解

## 配置架构

配置系统位于 `crates/config/`，包含以下模块：

```
crates/config/src/
├── lib.rs          # 公共 API（config_dir, data_dir, load_config）
├── schema.rs       # MoltisConfig 结构体定义
├── loader.rs       # TOML 加载 + 环境变量覆盖
├── validate.rs     # Schema 校验 + 未知字段检测
├── migrate.rs      # 配置迁移（旧版本兼容）
├── template.rs     # 默认配置模板生成
└── env_subst.rs    # 环境变量替换 ${VAR}
```

---

## MoltisConfig 结构（schema.rs）

`MoltisConfig` 是整个应用的配置根，使用 serde 反序列化自 TOML：

```rust
#[derive(Debug, Deserialize, Serialize)]
pub struct MoltisConfig {
    pub agent: AgentConfig,
    pub providers: ProvidersConfig,
    pub tools: ToolsConfig,
    pub memory: MemoryConfig,
    pub voice: VoiceConfig,
    pub gateway: GatewayConfig,
    pub telegram: Option<TelegramConfig>,
    pub cron: CronConfig,
    pub mcp: McpConfig,
    // ...
}
```

### 配置联动规则

添加/重命名 `MoltisConfig` 字段时，必须同步更新：
1. `schema.rs` — 结构体定义
2. `validate.rs` 中的 `build_schema_map()` — 已知字段列表
3. `validate.rs` 中的 `check_semantic_warnings()` — 枚举类型的字符串字段

---

## 环境变量替换

`env_subst.rs` 实现了 TOML 值中的环境变量替换：

```toml
# moltis.toml
[providers.openai]
api_key = "${OPENAI_API_KEY}"
model = "${MOLTIS_MODEL:-gpt-4o}"  # 带默认值
```

语法：
- `${VAR}` — 必须存在，否则报错
- `${VAR:-default}` — 不存在时使用默认值

---

## 配置校验

`moltis config check` 命令运行完整校验：

```bash
$ moltis config check
✓ Configuration file is valid
⚠ Unknown field 'providers.opanai' — did you mean 'providers.openai'?
⚠ Security: 'tools.exec.sandbox.mode' is 'off' — consider enabling for production
```

校验层次：
1. **TOML 语法**检查
2. **未知字段**检测（带拼写建议）
3. **语义警告**（安全配置、不推荐的值）
4. **类型检查**（枚举字段的值合法性）

---

## 配置文件示例

```toml
# ~/.moltis/moltis.toml

# === Agent 配置 ===
[agent]
name = "Moltis"
emoji = "🤖"
system_prompt = "You are a helpful assistant."
timeout_secs = 600       # Agent 运行超时（秒）
message_queue = "followup"  # followup | collect

# === LLM Provider 配置 ===
[providers]
default = "openai"

[providers.openai]
api_key = "${OPENAI_API_KEY}"
model = "gpt-4o"

[providers.anthropic]
api_key = "${ANTHROPIC_API_KEY}"
model = "claude-sonnet-4-20250514"

[providers.github_copilot]
# 使用 GitHub Copilot 认证

[providers.local]
# 本地 LLM（GGUF 格式）
model_path = "/path/to/model.gguf"

# === 工具配置 ===
[tools.exec]
enabled = true

[tools.exec.sandbox]
mode = "all"           # off | all
backend = "docker"     # docker | apple_container
image = "ubuntu:24.04"
packages = ["python3", "nodejs", "git"]
no_network = true      # 默认禁网

[tools.browser]
enabled = true
headless = true
viewport_width = 2560
viewport_height = 1440
device_scale_factor = 2.0
max_instances = 0               # 0 = 由内存限制
memory_limit_percent = 90
idle_timeout_secs = 300

[tools.web_search]
provider = "brave"     # brave | perplexity
api_key = "${BRAVE_API_KEY}"

# === 记忆配置 ===
[memory]
enabled = true
# embedding provider 配置

# === 语音配置 ===
[voice]
tts_provider = "openai"    # openai | elevenlabs | google | piper | coqui
stt_provider = "whisper"   # whisper | deepgram | elevenlabs | google | groq

# === 网关配置 ===
[gateway]
host = "0.0.0.0"
port = 3000
tls = true

# === Telegram 配置 ===
[telegram]
bot_token = "${TELEGRAM_BOT_TOKEN}"
allowed_users = [123456789]

# === 定时任务 ===
[cron]
enabled = true

# === MCP 配置 ===
[mcp]
enabled = true
# 服务器在 mcp-servers.json 中配置
```

---

## 消息队列模式

当用户在 Agent 处理上一条消息时发送新消息：

| 模式 | 行为 |
| --- | --- |
| `followup`（默认） | 每条排队消息作为独立的 run 重播 |
| `collect` | 拼接所有排队消息，一次性发送 |

---

## 首次运行默认配置

首次运行时，Moltis 写入完整的 `moltis.toml`，包含所有默认值。这样用户可以直接编辑，无需查阅文档了解有哪些配置项。

关键默认值：
- Agent 超时：600 秒
- 工具结果截断：50 KB
- 浏览器内存限制：90%
- 沙箱模式：off（开发模式）
- 随机端口（避免多用户冲突）
