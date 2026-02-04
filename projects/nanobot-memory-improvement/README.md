# Nanobot Multi-Scope Memory System

A contribution to [HKUDS/nanobot](https://github.com/HKUDS/nanobot) adding isolated memory management for multi-user and multi-channel scenarios.

## Problem

The current nanobot memory system uses a single workspace-level memory store, which means:
- All users share the same memory in group chats
- Personal preferences leak into shared context
- No isolation between different Discord servers/channels

## Solution

This improvement implements a **dual-layer memory system** with context-aware read/write permissions:

| Chat Type | User Memory | Group Memory |
|-----------|-------------|--------------|
| **Private DM** | Read + Write | Read only |
| **Group Chat** | Read only | Read + Write |

## Features

- **Per-user memory**: Each user has isolated personal memory
- **Per-group memory**: Each Discord server/channel has its own shared memory
- **Smart context loading**: Automatically loads relevant memories based on chat context
- **Permission-aware tools**: `save_memory` and `read_memory` tools respect context
- **Daily + Long-term storage**: Both short-term notes and permanent facts

## Directory Structure

```
workspace/
└── memory/
    ├── users/
    │   ├── user_123456789/
    │   │   ├── MEMORY.md          # Long-term personal facts
    │   │   └── 2026-02-04.md      # Daily notes
    │   └── user_987654321/
    │       └── ...
    └── groups/
        ├── group_guild123_channel456/
        │   ├── MEMORY.md          # Long-term group knowledge
        │   └── 2026-02-04.md      # Daily group notes
        └── group_guild123_channel789/
            └── ...
```

## Installation

1. Copy files to your nanobot installation:

```bash
cp -r nanobot/agent/memory_manager.py /path/to/nanobot/nanobot/agent/
cp -r nanobot/agent/tools/memory_tools.py /path/to/nanobot/nanobot/agent/tools/
cp -r nanobot/channels/discord_channel.py /path/to/nanobot/nanobot/channels/
```

2. Apply the patch to `loop.py`:

```bash
cd /path/to/nanobot
git apply patches/loop_memory.patch
```

3. Add memory instructions to your `workspace/AGENTS.md` (see `workspace/AGENTS_MEMORY.md`)

## Usage

### For Users

The agent automatically:
- Remembers personal preferences in DMs
- Maintains shared context in group channels
- References your personal context when you chat in groups

### For the Agent

New tools available:

```python
# Save to appropriate memory (respects chat context)
save_memory(content="User prefers dark mode", long_term=True)

# Read specific memories
read_memory(target="self")   # Current user's memory
read_memory(target="group")  # Current group's memory
read_memory(target="user", user_id="123")  # Specific user (in groups)
```

## Configuration

Add to your `config.json`:

```json
{
  "memory": {
    "user_retention_days": 30,
    "group_retention_days": 90,
    "max_context_tokens": 2000
  }
}
```

## API Reference

### MemoryManager

```python
from nanobot.agent.memory_manager import MemoryManager, MemoryContext, ChatType

manager = MemoryManager(workspace_path)

# Build context for a chat
ctx = MemoryContext(
    user_id="123456789",
    group_id="guild_channel",
    chat_type=ChatType.GROUP
)

# Get combined memory for LLM context
memory_text = manager.get_context_for_chat(ctx)

# Save with permissions
manager.save_memory(ctx, "Important fact", long_term=True)
```

### ChatType

- `ChatType.PRIVATE` - Direct messages
- `ChatType.GROUP` - Server/channel messages

## Architecture

For detailed UML diagrams, see [docs/nanobot-uml.md](docs/nanobot-uml.md).

### Class Diagram - Core Architecture

```mermaid
classDiagram
    direction TB

    class AgentLoop {
        -context_builder: ContextBuilder
        -memory_store: MemoryStore
        -skills_loader: SkillsLoader
        -subagent_manager: SubagentManager
        -llm_client: LLMClient
        +run(input: str) Response
        +process_message(message: Message) Response
    }

    class ContextBuilder {
        -system_prompt: str
        -memory_context: str
        +build(message: Message) Context
    }

    class MemoryStore {
        -storage_path: Path
        +save(key: str, value: str)
        +load(key: str) str
    }

    class SkillsLoader {
        -skills_dir: Path
        +load_all() List~Skill~
        +get_skill(name: str) Skill
    }

    class SubagentManager {
        -agents: Dict~str, Agent~
        +create_agent(config: AgentConfig) Agent
        +delegate(task: str, agent_id: str) Response
    }

    class LLMClient {
        -api_key: str
        -model: str
        +chat(messages: List~Message~) Response
    }

    AgentLoop --> ContextBuilder
    AgentLoop --> MemoryStore
    AgentLoop --> SkillsLoader
    AgentLoop --> SubagentManager
    AgentLoop --> LLMClient
```

### Class Diagram - Memory Extension

```mermaid
classDiagram
    direction TB

    class ChatType {
        <<enumeration>>
        PRIVATE_DM
        GROUP_CHANNEL
    }

    class MemoryContext {
        +chat_type: ChatType
        +user_id: str
        +guild_id: Optional~str~
        +channel_id: Optional~str~
        +can_write_user_memory() bool
        +can_write_group_memory() bool
    }

    class MemoryStore {
        -base_path: Path
        +get_user_path(user_id: str) Path
        +get_group_path(guild_id: str, channel_id: str) Path
        +read_memory(path: Path) str
        +write_memory(path: Path, content: str)
    }

    class MemoryManager {
        -store: MemoryStore
        -context: MemoryContext
        +save_memory(content: str, long_term: bool) Result
        +read_memory(target: str) str
        +get_context_memories() str
    }

    class SaveMemoryTool {
        +name: str = "save_memory"
        -manager: MemoryManager
        +execute(content: str, long_term: bool) Result
    }

    class ReadMemoryTool {
        +name: str = "read_memory"
        -manager: MemoryManager
        +execute(target: str) str
    }

    MemoryManager --> MemoryStore
    MemoryManager --> MemoryContext
    MemoryContext --> ChatType
    SaveMemoryTool --> MemoryManager
    ReadMemoryTool --> MemoryManager
```

### Sequence Diagram - Private DM Flow

```mermaid
sequenceDiagram
    participant User
    participant Discord
    participant MemoryManager
    participant AgentLoop
    participant LLM

    User->>Discord: Send DM
    Discord->>MemoryManager: create_context(PRIVATE_DM)
    MemoryManager-->>Discord: context with memories
    Discord->>AgentLoop: process(message, context)
    AgentLoop->>LLM: chat(messages)
    LLM-->>AgentLoop: response + tool_calls

    opt save_memory called
        AgentLoop->>MemoryManager: save_memory(content)
        Note over MemoryManager: Writes to USER memory
    end

    AgentLoop-->>Discord: response
    Discord-->>User: Bot reply
```

### Sequence Diagram - Group Channel Flow

```mermaid
sequenceDiagram
    participant User
    participant Discord
    participant MemoryManager
    participant AgentLoop
    participant LLM

    User->>Discord: Send message in channel
    Discord->>MemoryManager: create_context(GROUP_CHANNEL)
    MemoryManager-->>Discord: context with memories
    Discord->>AgentLoop: process(message, context)
    AgentLoop->>LLM: chat(messages)
    LLM-->>AgentLoop: response + tool_calls

    opt save_memory called
        AgentLoop->>MemoryManager: save_memory(content)
        Note over MemoryManager: Writes to GROUP memory
    end

    AgentLoop-->>Discord: response
    Discord-->>User: Bot reply
```

### Component Diagram - Full System

```mermaid
flowchart TB
    subgraph Cloud["Cloud / Jetson"]
        subgraph NanoBot["Nanobot Agent"]
            AL[AgentLoop]
            CB[ContextBuilder]
            SL[SkillsLoader]
        end

        subgraph Memory["Memory Extension"]
            MM[MemoryManager]
            MS[MemoryStore]
        end

        subgraph LLM["LLM Backend"]
            LC[LLMClient]
            QWEN[Qwen3-4B]
        end
    end

    subgraph Storage["File Storage"]
        UM[(User Memories)]
        GM[(Group Memories)]
    end

    subgraph Discord["Discord"]
        DC[Discord Channel]
    end

    DC <--> AL
    AL --> CB
    AL --> SL
    AL --> LC
    LC --> QWEN
    AL <--> MM
    MM --> MS
    MS --> UM
    MS --> GM
```

### State Diagram - Memory Permissions

```mermaid
stateDiagram-v2
    [*] --> CheckChatType

    CheckChatType --> PrivateDM: PRIVATE_DM
    CheckChatType --> GroupChannel: GROUP_CHANNEL

    state PrivateDM {
        [*] --> UserRW
        UserRW: User Memory (R/W)
        UserRW --> GroupRO
        GroupRO: Group Memory (Read Only)
    }

    state GroupChannel {
        [*] --> GroupRW
        GroupRW: Group Memory (R/W)
        GroupRW --> UserRO
        UserRO: User Memory (Read Only)
    }

    PrivateDM --> [*]
    GroupChannel --> [*]
```

## License

MIT - Same as nanobot
