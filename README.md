# Brainstorm

Project ideas, technical documentation, and development notes.

## Structure

```
brainstorm/
├── ideas/           # Business & product ideas
├── plans/           # Technical planning documents
├── guides/          # Setup & configuration guides
└── projects/        # Active development projects
```

---

## Ideas

Product concepts and brainstorms.

| File | Description |
|------|-------------|
| [wechat_stock_bot.md](ideas/wechat_stock_bot.md) | WeChat-based stock analysis bot with user authentication |
| [seo_optimization_saas.md](ideas/seo_optimization_saas.md) | SEO optimization SaaS using embedding & clustering |

---

## Plans

Technical architecture and integration plans.

| File | Description |
|------|-------------|
| [max-integration-plan.md](plans/max-integration-plan.md) | Max integration with Microsoft Teams & WhatsApp |

---

## Guides

Hardware setup and configuration guides.

| File | Description |
|------|-------------|
| [jetson_xavier_nx_setup.md](guides/jetson_xavier_nx_setup.md) | Jetson Xavier NX setup for LLM inference (CUDA, llama.cpp, swap, API server) |

---

## Projects

Active development projects with source code.

| Project | Description |
|---------|-------------|
| [nanobot-memory-improvement](projects/nanobot-memory-improvement/) | Multi-scope memory system for nanobot (user/group isolation, Discord integration) |

---

## Quick Links

### Hardware

- **Jetson Xavier NX**
  - Local: `ssh jetson` (192.168.1.91)
  - Tailscale: `ssh jetson-ts` (100.69.176.104)
  - LLM API: `http://192.168.1.91:8080`
  - API Key: See [guides/jetson_xavier_nx_setup.md](guides/jetson_xavier_nx_setup.md)

### Models on Jetson

| Model | Size | Speed |
|-------|------|-------|
| Qwen3-4B-Q4_K_M | 2.4GB | ~14 tok/s |
| DeepSeek-R1-Distill-Qwen-7B-Q4_K_M | 4.4GB | ~3.7 tok/s |
| Qwen2.5-1.5B-Q4_K_M | 1.1GB | ~20 tok/s |
