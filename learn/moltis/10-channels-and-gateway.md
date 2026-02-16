# 10 — Web 网关与通信渠道

## Gateway 架构

网关是 Moltis 的 HTTP/WebSocket 服务器，位于 `crates/gateway/`。

```
crates/gateway/src/
├── server.rs           # 主服务器（axum Router 组装）
├── auth.rs             # 认证逻辑
├── auth_routes.rs      # 认证路由
├── auth_middleware.rs   # auth_gate 中间件
├── approval.rs         # 命令审批
├── assets/             # Web UI 静态资源
│   ├── css/            # 样式（Tailwind）
│   ├── js/             # 前端 JS（Preact/HTM）
│   └── icons/          # 图标/PWA 资源
└── migrations/         # 数据库迁移
```

### 技术栈

| 层级 | 技术 |
| --- | --- |
| HTTP 框架 | axum 0.8 |
| 模板引擎 | askama |
| WebSocket | axum ws feature |
| 中间件 | tower-http |
| 静态资源 | include_dir!（release）/ 磁盘（dev） |
| 前端框架 | Preact + HTM（轻量级） |
| CSS | Tailwind CSS |

### 资源嵌入策略

- **Dev 模式**：从磁盘加载 `crates/gateway/src/assets/`，支持实时修改刷新
- **Release 模式**：`include_dir!` 编译时嵌入，URL 带版本号用于缓存

---

## 认证系统

### 统一认证入口

所有请求经过 `auth_gate` 中间件 → `check_auth()` 函数（全局唯一认证决策点）。

```
Request → auth_gate → check_auth()
                        ├─ Public path? → 放行
                        ├─ No credential store? → 放行
                        ├─ auth_disabled? → 放行
                        ├─ 未完成设置 + 本地? → 放行
                        ├─ 未完成设置 + 远程? → SetupRequired
                        ├─ 有效 session cookie? → 放行
                        ├─ 有效 Bearer API key? → 放行
                        └─ 其他 → Unauthorized
```

### 凭据类型

| 类型 | 存储方式 | 传输方式 |
| --- | --- | --- |
| 密码 | Argon2id 哈希 | POST /api/auth/login |
| Passkey (WebAuthn) | 序列化凭据 | WebAuthn 协议 |
| Session Cookie | HTTP-only, SameSite=Strict, 30 天 | 自动 |
| API Key | SHA-256 哈希, mk_ 前缀 | Authorization: Bearer |

### API Key Scope

| Scope | 权限 |
| --- | --- |
| `operator.read` | 查看状态、列出任务、读取历史 |
| `operator.write` | 发送消息、创建任务、修改配置 |
| `operator.admin` | 所有权限 |
| `operator.approvals` | 处理命令审批 |
| `operator.pairing` | 设备配对 |

### 请求限流

认证启用时，未认证请求受 IP 限流：

| 端点 | 限制 |
| --- | --- |
| `POST /api/auth/login` | 5 次/60 秒 |
| 其他 `/api/auth/*` | 120 次/60 秒 |
| 其他 `/api/*` | 180 次/60 秒 |
| `/ws` upgrade | 30 次/60 秒 |

超限返回 `429 Too Many Requests` + `Retry-After` 头。

---

## WebSocket 通信

### 连接流程

```
1. HTTP upgrade → auth_gate 认证
2. WebSocket 建立
3. Client 发送 connect 消息（非浏览器客户端的认证）
4. 双向实时通信
```

### connect 消息

```json
{
    "method": "connect",
    "params": {
        "client": { "id": "my-tool", "version": "1.0.0" },
        "auth": {
            "api_key": "mk_abc123..."
        }
    }
}
```

### Origin 校验（CSWSH 防护）

`server.rs` 校验 WebSocket upgrade 请求的 Origin 头，拒绝跨域连接（403），防止 Cross-Site WebSocket Hijacking。

---

## Server-Injected Data（gon 模式）

服务器在页面加载时注入数据：

**Rust 端**：
- `GonData` 结构体在 `server.rs`
- `build_gon_data()` 构建数据

**JS 端**：
```javascript
import * as gon from "./gon.js";
gon.get();        // 获取当前数据
gon.onChange();   // 监听变化
gon.refresh();    // 刷新数据
```

> 永远不注入 inline `<script>` 标签，也不在 Rust 中拼接 HTML。

### Event Bus

```javascript
import { onEvent } from "./events.js";

const unsub = onEvent("session.updated", (data) => {
    console.log("Session updated:", data);
});

// 取消订阅
unsub();
```

> 不使用 `window.addEventListener` / `CustomEvent` 传递服务器事件。

---

## API 命名空间

每个 UI tab 有独立的 API 命名空间：

```
REST: /api/<feature>/...
RPC:  <feature>.*
```

示例：
- `/api/sessions/...` + `sessions.*`
- `/api/memory/...` + `memory.*`
- `/api/cron/...` + `cron.*`

> 永远不合并不同功能到同一端点。

---

## Channels 抽象

`crates/channels/` 提供通信渠道抽象层：

```
crates/channels/src/
├── lib.rs          # Channel trait
├── registry.rs     # 渠道注册表
├── plugin.rs       # 渠道插件接口
├── gating.rs       # 访问控制
├── store.rs        # 渠道持久化
└── message_log.rs  # 消息日志
```

设计原则：**始终回复经过授权的发送者**——永不静默失败。LLM 错误、转录失败、未知消息类型都要发送错误/fallback 消息。

---

## Telegram 集成

`crates/telegram/` 实现了完整的 Telegram bot：

```
crates/telegram/src/
├── bot.rs        # Bot 主循环
├── handlers.rs   # 消息处理器
├── config.rs     # 配置
├── access.rs     # 访问控制（allowlist + OTP）
├── markdown.rs   # Telegram Markdown 格式化
├── otp.rs        # 一次性密码
├── outbound.rs   # 发送消息
├── plugin.rs     # Channel 插件实现
└── state.rs      # Bot 状态
```

功能：
- 允许列表控制访问
- OTP 配对流程
- 文本/语音/图片消息
- 截图自动发送到聊天
- Markdown 格式化输出

---

## PWA 支持

Moltis Web UI 支持 Progressive Web App：
- `manifest.json` — PWA 清单
- `sw.js` — Service Worker
- 各尺寸图标
- 移动端自适应布局 (`mobile.css`)

### TLS 自签名证书

```bash
# 下载 CA 证书
http://localhost:13132/certs/ca.pem
```

Moltis 使用 `rcgen` 自动生成 TLS 证书，`rustls` 提供 TLS 支持。
