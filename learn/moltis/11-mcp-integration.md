# 11 — MCP 协议集成

## 概述

MCP（Model Context Protocol）支持位于 `crates/mcp/`，允许 Moltis 连接外部工具服务器。

---

## 传输方式

| 方式 | 适用场景 |
| --- | --- |
| **stdio** | 本地进程（子进程通信） |
| **HTTP/SSE** | 远程服务器 |

---

## 配置

MCP 服务器在 `mcp-servers.json` 中配置（独立于 `moltis.toml`）：

```json
{
    "servers": [
        {
            "name": "file-system",
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]
        },
        {
            "name": "remote-tools",
            "transport": "http",
            "url": "https://tools.example.com/mcp"
        }
    ]
}
```

---

## 可靠性特性

### Health Polling

定期检查 MCP 服务器健康状态：
- 检测服务器是否仍然响应
- 超时 / 无响应时标记为不健康

### 自动重启

当 MCP 服务器崩溃时：
- **自动重启**进程
- **指数退避**（exponential backoff）防止频繁重启
- 重启后重新注册工具

### 错误处理

- 服务器不可用时，相关工具标记为暂时不可用
- 不影响其他工具的正常使用

---

## Web UI 管理

通过 Web UI 可以：
- 查看 MCP 服务器状态
- 编辑服务器配置
- 添加/删除服务器
- 查看服务器提供的工具列表

---

## 与 Tool Registry 的集成

MCP 服务器提供的工具自动注册到 Agent 的 Tool Registry：

```
MCP Server → 工具发现 → Tool Registry → Agent 可用
```

Agent 调用 MCP 工具时：
1. Tool Registry 识别为 MCP 工具
2. 通过 MCP 协议发送到对应服务器
3. 等待结果返回
4. 清洗结果后喂回 LLM

---

## Per-Session MCP 控制

每个会话可以独立禁用 MCP：

```sql
-- session_mcp_disabled 字段
ALTER TABLE sessions ADD COLUMN mcp_disabled BOOLEAN DEFAULT FALSE;
```

用于安全场景——某些会话不应该访问外部 MCP 工具。

---

## 配置示例：常用 MCP 服务器

```json
{
    "servers": [
        {
            "name": "filesystem",
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
        },
        {
            "name": "github",
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
                "GITHUB_TOKEN": "${GITHUB_TOKEN}"
            }
        },
        {
            "name": "sqlite",
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-sqlite", "database.db"]
        }
    ]
}
```
