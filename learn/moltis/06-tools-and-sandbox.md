# 06 — 内置工具与沙箱执行

## 工具一览

`crates/tools/src/` 包含所有内置工具：

```
crates/tools/src/
├── lib.rs              # 工具注册入口
├── exec.rs             # 命令执行（ExecTool）
├── sandbox.rs          # 沙箱 trait + Docker/Apple Container 实现
├── sandbox_packages.rs # 默认沙箱包列表
├── browser.rs          # 浏览器自动化（CDP）
├── web_fetch.rs        # URL 内容获取（SSRF 防护）
├── web_search.rs       # 网络搜索（Brave/Perplexity）
├── spawn_agent.rs      # 子 Agent 委托
├── branch_session.rs   # 会话分支
├── session_state.rs    # 会话状态读写
├── cron_tool.rs        # 定时任务管理
├── skill_tools.rs      # Skill 相关工具
├── location.rs         # 位置信息
├── map.rs              # 地图
├── image_cache.rs      # 图片缓存
├── process.rs          # 进程管理
├── approval.rs         # 命令审批
└── policy.rs           # 工具使用策略
```

---

## ExecTool — 命令执行

最核心的工具，让 Agent 执行 shell 命令。

### 沙箱模式

| 模式 | 行为 |
| --- | --- |
| `off` | 直接在宿主机执行（开发模式） |
| `all` | 所有命令在容器中执行 |

### 沙箱架构

```
┌──────────────────────────────┐
│       ExecTool               │
│  (crates/tools/src/exec.rs)  │
└──────────┬───────────────────┘
           │
     ┌─────▼─────────────────┐
     │  Sandbox Trait         │
     │  - create_container()  │
     │  - execute()           │
     │  - destroy()           │
     └─────┬─────────────────┘
           │
     ┌─────┴───────────────┐
     │                     │
┌────▼────┐         ┌─────▼──────┐
│ Docker  │         │   Apple    │
│ Backend │         │ Container  │
└─────────┘         └────────────┘
```

### 沙箱配置

```toml
[tools.exec.sandbox]
mode = "all"
backend = "docker"        # docker | apple_container
image = "ubuntu:24.04"
packages = ["python3", "nodejs", "git", "curl"]
no_network = true         # 默认禁止网络访问
```

### 预构建镜像

沙箱使用确定性哈希标签：`base_image + packages → hash tag`

```bash
moltis sandbox build      # 构建当前配置的沙箱镜像
moltis sandbox list       # 列出所有沙箱容器
moltis sandbox clean      # 清理旧镜像
```

每个会话有独立的容器实例（per-session isolation）。

---

## Web Fetch — URL 内容获取

```json
{
    "url": "https://docs.example.com/api",
    "extract_readability": true
}
```

### SSRF 防护

`web_fetch.rs` 内置 SSRF（Server-Side Request Forgery）防护：

- **阻止 loopback** 地址（127.0.0.1, ::1）
- **阻止 private** 网段（10.x, 172.16-31.x, 192.168.x）
- **阻止 link-local**（169.254.x）
- **阻止 CGNAT**（100.64-127.x）

---

## Web Search — 网络搜索

```json
{
    "query": "Rust async patterns 2025",
    "provider": "brave"
}
```

支持的搜索引擎：
- **Brave Search** — 需要 API key
- **Perplexity** — 需要 API key

---

## Browser — 浏览器自动化

基于 Chrome DevTools Protocol (CDP) 的完整浏览器控制：

### 架构

```
BrowserTool → BrowserManager → BrowserPool → Chrome/Chromium (CDP)
```

### 操作列表

| 操作 | 说明 |
| --- | --- |
| `navigate` | 导航到 URL |
| `snapshot` | 获取 DOM 元素引用列表 |
| `screenshot` | 截图 |
| `click` | 点击元素 |
| `type` | 输入文本 |
| `scroll` | 滚动 |
| `evaluate` | 执行 JavaScript |
| `wait` | 等待元素出现 |
| `close` | 关闭浏览器会话 |

### 元素引用系统

`snapshot` 返回带数字引用的交互元素列表：

```json
{
    "ref_": 1,
    "tag": "button",
    "role": "button",
    "text": "Submit",
    "visible": true,
    "interactive": true
}
```

后续操作使用 `ref_` 引用元素，而非 CSS 选择器。好处：
- 更稳定（不受 DOM 小变化影响）
- 更安全（不暴露选择器给模型）
- 更可靠（按角色/内容识别）

### 会话自动跟踪

浏览器工具自动跟踪 session_id，防止因 LLM 忘记传 session_id 导致的 pool 耗尽。

### 内存管理

```toml
[tools.browser]
max_instances = 0              # 0 = 不限数量，由内存限制
memory_limit_percent = 90      # 系统内存超过 90% 时阻止新实例
idle_timeout_secs = 300        # 空闲 5 分钟后关闭
```

### 域名限制

```toml
[tools.browser]
allowed_domains = [
    "docs.example.com",
    "*.github.com",     # 通配符匹配子域名
]
```

---

## 工具审批系统

`approval.rs` 实现了命令审批机制：

- 某些高风险操作需要用户确认
- 审批请求通过 WebSocket 推送到 UI
- 用户可以批准或拒绝
- 支持 API key scope `operator.approvals`

---

## 工具结果大小限制

所有工具结果在喂回 LLM 前受到大小限制：
- 默认上限 50 KB
- 超出部分被截断
- base64 数据 URI 被替换
- 长 hex blob 被移除

这防止了意外的大型工具输出消耗过多 token。
