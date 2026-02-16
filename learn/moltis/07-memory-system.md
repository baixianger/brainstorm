# 07 — 长期记忆与嵌入系统

## 概述

记忆系统位于 `crates/memory/`，提供基于嵌入（embedding）的长期记忆能力。

核心设计：
- 基于 **向量嵌入** 的语义搜索
- **SQLite** 存储（files、chunks、embedding_cache、chunks_fts）
- **FTS5** 全文搜索作为补充
- **MEMORY.md** 工作区级别的人类可读记忆文件

---

## 数据库表

| 表名 | 用途 |
| --- | --- |
| `files` | 被索引的文件元数据 |
| `chunks` | 文件内容的分块（chunk） |
| `embedding_cache` | 嵌入向量缓存 |
| `chunks_fts` | FTS5 全文搜索索引 |

---

## 记忆写入流程

```
用户交互 / Agent 总结
    │
    ▼
Memory Writer（crates/agents/src/memory_writer.rs）
    │
    ├─ 提取关键信息
    ├─ 分块（chunking）
    ├─ 生成嵌入向量
    │
    ▼
存储到 SQLite（chunks + embedding_cache）
    │
    ▼
更新 FTS5 索引
```

---

## 记忆检索流程

```
用户新消息
    │
    ▼
生成查询的嵌入向量
    │
    ▼
向量相似度搜索（余弦相似度）
    │
    ├─ 从 embedding_cache 中检索
    ├─ + FTS5 关键词补充
    │
    ▼
合并排序 → 注入 system prompt
```

---

## 配置

```toml
[memory]
enabled = true
# 嵌入 Provider 配置（通常跟随主 LLM Provider）
```

### MEMORY.md

工作区根目录的 `MEMORY.md` 文件作为持久化的人类可读记忆：
- Agent 可以读写此文件
- 内容会注入到 system prompt
- 解析路径相对于 `data_dir()`

---

## 知识库（Knowledge Base）

除了对话记忆，还支持知识库导入：
- 索引本地文件
- 分块 + 嵌入
- 语义搜索检索

---

## 与其他系统的集成

| 集成点 | 说明 |
| --- | --- |
| System Prompt | 相关记忆注入到 agent 的 system prompt |
| Session Memory Hook | 内置 hook 在会话结束时自动保存重要信息 |
| Skill 上下文 | Skill 可以读取/写入特定命名空间的记忆 |
| Memory Writer | Agent 循环中的自动记忆提取模块 |
