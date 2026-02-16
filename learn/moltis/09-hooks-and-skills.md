# 09 — Hook 系统与 Skill 扩展

## Hook 系统

Hook 系统位于 `crates/common/src/hooks.rs`，提供生命周期钩子机制。

### 核心特性

- **优先级排序** — 多个 hook 按优先级顺序执行
- **并行派发** — 只读事件的 hook 并行执行
- **断路器（Circuit Breaker）** — 频繁失败的 hook 自动暂停
- **Dry-run 模式** — 测试 hook 而不实际执行
- **HOOK.md 发现** — 通过 HOOK.md 文件声明 hook
- **资格检查** — hook 可以声明自己适用的条件

### 内置 Hook

| Hook | 功能 |
| --- | --- |
| `boot-md` | 启动时加载 markdown 文件到上下文 |
| `session-memory` | 会话结束时自动保存重要信息到记忆 |
| `command-logger` | 记录所有命令执行日志 |

### Hook 示例（来自 examples/hooks/）

```bash
# block-dangerous-commands.sh — 阻止危险命令
#!/bin/bash
# 检查命令是否包含 rm -rf / 等

# log-tool-calls.sh — 记录工具调用
#!/bin/bash
echo "$(date): Tool $TOOL_NAME called" >> /var/log/moltis-tools.log

# redact-secrets.sh — 自动编辑敏感信息
#!/bin/bash
# 扫描输出中的 API key 模式并替换

# notify-slack.sh — Slack 通知
# notify-discord.sh — Discord 通知
# content-filter.sh — 内容过滤
# message-audit-log.sh — 消息审计日志
# agent-metrics.sh — Agent 指标收集
# save-session.sh — 会话保存
```

### CLI 管理

```bash
moltis hooks list          # 列出所有已注册的 hook
moltis hooks info <name>   # 查看 hook 详情
```

### Web UI 管理

通过 Web UI 可以：
- 编辑 hook 配置
- 启用/禁用 hook
- 运行时重新加载 hook

---

## Skill 系统

Skill 系统位于 `crates/skills/`，提供可扩展的能力模块。

```
crates/skills/src/
├── lib.rs           # 公共 API
├── types.rs         # Skill 类型定义
├── manifest.rs      # Skill 清单解析
├── discover.rs      # Skill 自动发现
├── install.rs       # Skill 安装
├── registry.rs      # Skill 注册表
├── parse.rs         # Skill 文件解析
├── formats.rs       # 支持的格式
├── prompt_gen.rs    # Prompt 生成
├── requirements.rs  # 依赖要求
├── migration.rs     # Skill 迁移
└── watcher.rs       # 文件监视（热重载）
```

### Skill 是什么？

Skill 是一组可复用的能力，可以包含：
- 工具定义
- Prompt 模板
- 文件/资源
- 配置

### Skill 发现

Skill 可以从以下来源发现：
- 本地目录
- Git 仓库
- Skill 市场（规划中）

### Skill 安装

```bash
# 通过 Agent 工具安装
# install_skill 工具
```

### Skill 工具（skill_tools.rs）

`crates/tools/src/skill_tools.rs` 注册了 Skill 相关的 Agent 工具：
- 安装 Skill
- 列出已安装的 Skill
- 启用/禁用 Skill

### 文件监视（Hot Reload）

`watcher.rs` 使用 `notify-debouncer-full` 监视 Skill 目录变化：
- 文件变更时自动重新加载
- 防抖处理避免频繁重载

### Skill 安全

`docs/src/skills-security.md` 详细说明了安全考虑：
- Skill 代码在沙箱中执行
- 权限隔离
- 审查机制

---

## Hook vs Skill 对比

| 特性 | Hook | Skill |
| --- | --- | --- |
| 触发方式 | 生命周期事件 | Agent 主动调用 |
| 执行方式 | Shell 脚本 | 工具 + Prompt |
| 复杂度 | 简单（单脚本） | 复杂（多文件） |
| 用途 | 日志、通知、过滤 | 能力扩展（如数据库操作、代码生成） |
| 热重载 | 支持 | 支持（文件监视） |
