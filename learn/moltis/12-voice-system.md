# 12 — 语音系统（TTS/STT）

## 概述

语音系统位于 `crates/voice/`，支持文字转语音（TTS）和语音转文字（STT）。

```
crates/voice/src/
├── lib.rs        # 公共 API
├── config.rs     # 语音配置
├── tts/          # 文字转语音
│   ├── mod.rs    # TTS trait
│   ├── openai.rs
│   ├── elevenlabs.rs
│   ├── google.rs
│   ├── piper.rs  # 本地 TTS
│   └── coqui.rs  # 本地 TTS
└── stt/          # 语音转文字
    ├── mod.rs    # STT trait
    ├── whisper.rs
    ├── whisper_cli.rs
    ├── deepgram.rs
    ├── elevenlabs.rs
    ├── google.rs
    ├── groq.rs
    ├── mistral.rs
    ├── sherpa_onnx.rs   # 本地 STT
    └── voxtral_local.rs # 本地 STT
```

---

## TTS Provider

| Provider | 类型 | 说明 |
| --- | --- | --- |
| **OpenAI** | 云端 | 高质量，多种声音 |
| **ElevenLabs** | 云端 | 极高质量，声音克隆 |
| **Google** | 云端 | Google Cloud TTS |
| **Piper** | 本地 | 轻量级本地 TTS |
| **Coqui** | 本地 | 开源本地 TTS |

---

## STT Provider

| Provider | 类型 | 说明 |
| --- | --- | --- |
| **Whisper** | 本地/云端 | OpenAI Whisper |
| **Whisper CLI** | 本地 | whisper.cpp 命令行 |
| **Deepgram** | 云端 | 实时转录 |
| **ElevenLabs** | 云端 | |
| **Google** | 云端 | Google Cloud STT |
| **Groq** | 云端 | 快速转录 |
| **Mistral** | 云端 | |
| **Sherpa-ONNX** | 本地 | ONNX 推理 |
| **Voxtral Local** | 本地 | |

---

## 配置

```toml
[voice]
tts_provider = "openai"     # openai | elevenlabs | google | piper | coqui
stt_provider = "whisper"    # whisper | deepgram | elevenlabs | google | groq | mistral | sherpa_onnx

[voice.openai]
api_key = "${OPENAI_API_KEY}"
voice = "alloy"             # alloy | echo | fable | onyx | nova | shimmer

[voice.elevenlabs]
api_key = "${ELEVENLABS_API_KEY}"
voice_id = "..."

[voice.piper]
model_path = "/path/to/piper-model.onnx"
```

---

## 集成点

### Web UI
- 麦克风输入 → STT → 文本消息
- Agent 回复 → TTS → 音频播放

### Telegram
- 语音消息 → STT → 文本处理
- Agent 回复 → TTS → 语音消息发送

### Settings UI
- 配置和管理语音 Provider
- 测试语音输出
- 选择声音

---

## 本地 vs 云端选择

| 考虑因素 | 本地 | 云端 |
| --- | --- | --- |
| 延迟 | 取决于硬件 | 网络延迟 |
| 隐私 | 数据不离开设备 | 数据发送到云端 |
| 质量 | 一般到好 | 好到极好 |
| 成本 | 免费 | 按用量计费 |
| 依赖 | 需要模型文件 | 需要 API key |

推荐：
- **隐私敏感**：Piper (TTS) + Sherpa-ONNX (STT)
- **最佳质量**：ElevenLabs (TTS) + Deepgram (STT)
- **平衡选择**：OpenAI (TTS) + Whisper (STT)
