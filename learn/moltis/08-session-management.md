# 08 — 会话管理与分支

## 会话存储

会话系统位于 `crates/sessions/`，基于 SQLite 持久化。

```
crates/sessions/src/
├── lib.rs          # 公共 API
├── store.rs        # SessionStore（CRUD 操作）
├── message.rs      # 消息类型定义
├── metadata.rs     # 会话元数据
├── key.rs          # 会话 key 生成
├── compaction.rs   # 消息压缩
└── state_store.rs  # 会话状态 KV 存储
```

### 数据库迁移

```
migrations/
├── 20240205100001_init.sql              # 初始表结构
├── 20260205120000_session_state.sql     # 会话状态 KV
├── 20260205130000_session_branches.sql  # 会话分支支持
├── 20260205140000_session_mcp_disabled.sql
├── 20260209100000_session_preview.sql   # 会话预览
├── 20260209110000_session_last_seen.sql
└── 20260210100000_session_version.sql   # 版本号
```

---

## 会话 Key

每个会话有唯一的 key，格式为 `session:<uuid>`。特殊 key：
- `main` — 默认会话

---

## Per-Session Run 序列化

关键设计：**每个会话的 Agent run 是序列化执行的**，防止历史消息被并发写入破坏。

当用户在 Agent 处理上一条消息时发送新消息：
- **followup 模式**：排队的消息作为独立 run 依次执行
- **collect 模式**：拼接所有排队消息后一次执行

---

## 会话分支（Branching）

### 概念

从现有会话的某个消息点创建分支（fork），复制该点之前的所有消息到新会话。

```
原始会话：[msg0, msg1, msg2, msg3, msg4]
                            ↑ fork at msg2
分支会话：[msg0, msg1, msg2] → 继续独立发展
```

### 创建分支的方式

**1. Web UI**
- 聊天头部的 Fork 按钮
- 侧边栏悬停时的 fork 图标

**2. Agent 工具**
```json
{
    "at_message": 5,
    "label": "explore-alternative"
}
```

**3. RPC 方法**
```json
{
    "method": "sessions.fork",
    "params": {
        "key": "main",
        "at_message": 5,
        "label": "my-fork"
    }
}
```

### 继承规则

| 继承 | 不继承 |
| --- | --- |
| 消息（到 fork 点） | Worktree 分支 |
| 模型选择 | 沙箱设置 |
| 项目分配 | 渠道绑定 |
| MCP 禁用标记 | |

### 父子关系

会话表中的字段：
- `parent_session_key` — 父会话 key
- `fork_point` — fork 的消息索引

侧边栏中，子会话缩进显示在父会话下方，带分支图标。

> 删除父会话不会级联删除子会话——子会话变为顶层会话。

---

## 会话状态（Session State）

Per-session 的 KV 存储，用于 Skill 和扩展持久化上下文。

### 作用域

每条数据的 key 是 `(session_key, namespace, key)` 三元组。

### Agent 工具操作

```json
// 获取
{ "op": "get", "namespace": "my-skill", "key": "last_query" }

// 设置
{ "op": "set", "namespace": "my-skill", "key": "last_query", "value": "SELECT * FROM users" }

// 列出命名空间下所有 key
{ "op": "list", "namespace": "my-skill" }
```

值是字符串。存储结构化数据需要 JSON 序列化/反序列化。

---

## 消息压缩（Compaction）

`compaction.rs` 处理长会话的消息压缩：
- 当消息历史过长时，压缩旧消息
- 保留关键信息的摘要
- 减少 token 消耗

---

## 会话预览

每个会话保存一个预览（preview），用于侧边栏显示：
- 最近一条消息的摘要
- 最后访问时间（last_seen）
- 版本号（用于乐观并发控制）
