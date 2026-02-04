# Nanobot Architecture UML

## Class Diagram - Core Architecture

```mermaid
classDiagram
    direction TB

    %% Core Agent Components
    class AgentLoop {
        -context_builder: ContextBuilder
        -memory_store: MemoryStore
        -skills_loader: SkillsLoader
        -subagent_manager: SubagentManager
        -llm_client: LLMClient
        +run(input: str) Response
        +process_message(message: Message) Response
        -build_context() Context
        -execute_skill(skill: Skill) Result
    }

    class ContextBuilder {
        -system_prompt: str
        -memory_context: str
        -skills_context: str
        +build(message: Message) Context
        +add_memory(memory: str)
        +add_skills(skills: List~Skill~)
    }

    class MemoryStore {
        -storage_path: Path
        -memories: Dict
        +save(key: str, value: str)
        +load(key: str) str
        +search(query: str) List~Memory~
        +clear()
    }

    class SkillsLoader {
        -skills_dir: Path
        -loaded_skills: Dict~str, Skill~
        +load_all() List~Skill~
        +get_skill(name: str) Skill
        +register_skill(skill: Skill)
    }

    class SubagentManager {
        -agents: Dict~str, Agent~
        +create_agent(config: AgentConfig) Agent
        +delegate(task: str, agent_id: str) Response
        +list_agents() List~Agent~
    }

    class LLMClient {
        -api_key: str
        -model: str
        -base_url: str
        +chat(messages: List~Message~) Response
        +stream(messages: List~Message~) Iterator
    }

    class Skill {
        <<interface>>
        +name: str
        +description: str
        +parameters: Dict
        +execute(params: Dict) Result
    }

    %% Relationships
    AgentLoop --> ContextBuilder : uses
    AgentLoop --> MemoryStore : uses
    AgentLoop --> SkillsLoader : uses
    AgentLoop --> SubagentManager : uses
    AgentLoop --> LLMClient : uses
    ContextBuilder --> MemoryStore : reads from
    SkillsLoader --> Skill : loads
```

## Class Diagram - Memory Improvement Extension

```mermaid
classDiagram
    direction TB

    %% Enums
    class ChatType {
        <<enumeration>>
        PRIVATE_DM
        GROUP_CHANNEL
    }

    %% Memory Context
    class MemoryContext {
        +chat_type: ChatType
        +user_id: str
        +guild_id: Optional~str~
        +channel_id: Optional~str~
        +can_write_user_memory() bool
        +can_write_group_memory() bool
        +get_readable_scopes() List~str~
    }

    %% Memory Store
    class MemoryStore {
        -base_path: Path
        +get_user_path(user_id: str) Path
        +get_group_path(guild_id: str, channel_id: str) Path
        +read_memory(path: Path) str
        +write_memory(path: Path, content: str, long_term: bool)
        +list_users() List~str~
        +list_groups() List~str~
    }

    %% Memory Manager
    class MemoryManager {
        -store: MemoryStore
        -context: MemoryContext
        +__init__(store: MemoryStore, context: MemoryContext)
        +save_memory(content: str, long_term: bool) Result
        +read_memory(target: str, user_id: str) str
        +list_memories(scope: str) Dict
        +clear_memory(scope: str, confirmation: bool) Result
        +get_context_memories() str
    }

    %% Memory Tools
    class SaveMemoryTool {
        +name: str = "save_memory"
        +description: str
        -manager: MemoryManager
        +execute(content: str, long_term: bool) Result
    }

    class ReadMemoryTool {
        +name: str = "read_memory"
        +description: str
        -manager: MemoryManager
        +execute(target: str, user_id: str) str
    }

    class ListMemoriesTool {
        +name: str = "list_memories"
        +description: str
        -manager: MemoryManager
        +execute(scope: str) Dict
    }

    class ClearMemoryTool {
        +name: str = "clear_memory"
        +description: str
        -manager: MemoryManager
        +execute(scope: str, confirmation: bool) Result
    }

    %% Relationships
    MemoryManager --> MemoryStore : uses
    MemoryManager --> MemoryContext : uses
    MemoryContext --> ChatType : has
    SaveMemoryTool --> MemoryManager : uses
    ReadMemoryTool --> MemoryManager : uses
    ListMemoriesTool --> MemoryManager : uses
    ClearMemoryTool --> MemoryManager : uses
```

## Class Diagram - Batch Response System

```mermaid
classDiagram
    direction TB

    class MessageType {
        <<enumeration>>
        COMMAND
        MENTION
        REPLY
        REGULAR
    }

    class QueuedMessage {
        +message: Message
        +message_type: MessageType
        +timestamp: datetime
        +channel_id: str
        +user_id: str
    }

    class MessageQueue {
        -queues: Dict~str, List~QueuedMessage~~
        -lock: asyncio.Lock
        +add(channel_id: str, message: QueuedMessage)
        +get_batch(channel_id: str) List~QueuedMessage~
        +clear(channel_id: str)
        +get_all_channels() List~str~
    }

    class CommandDetector {
        -prefixes: List~str~
        -patterns: List~Pattern~
        +is_command(content: str) bool
        +is_mention(message: Message, bot_id: str) bool
        +is_reply_to_bot(message: Message, bot_id: str) bool
        +classify(message: Message, bot_id: str) MessageType
    }

    class BatchResponseManager {
        -queue: MessageQueue
        -detector: CommandDetector
        -agent: AgentLoop
        -batch_interval: int
        -bot_id: str
        +__init__(agent: AgentLoop, batch_interval: int)
        +on_message(message: Message) Optional~Response~
        +process_batch(channel_id: str) Response
        +start_batch_processor()
        +stop()
    }

    %% Relationships
    BatchResponseManager --> MessageQueue : manages
    BatchResponseManager --> CommandDetector : uses
    BatchResponseManager --> AgentLoop : delegates to
    MessageQueue --> QueuedMessage : contains
    CommandDetector --> MessageType : returns
    QueuedMessage --> MessageType : has
```

## Sequence Diagram - Private DM Flow

```mermaid
sequenceDiagram
    participant User
    participant Discord
    participant DiscordChannel
    participant MemoryManager
    participant MemoryStore
    participant AgentLoop
    participant LLM

    User->>Discord: Send DM
    Discord->>DiscordChannel: on_message(message)
    DiscordChannel->>MemoryManager: create_context(PRIVATE_DM, user_id)
    MemoryManager->>MemoryStore: read user memory
    MemoryStore-->>MemoryManager: user memories
    MemoryManager->>MemoryStore: read group memories (read-only)
    MemoryStore-->>MemoryManager: group memories
    MemoryManager-->>DiscordChannel: context with memories
    DiscordChannel->>AgentLoop: process(message, context)
    AgentLoop->>LLM: chat(messages + context)
    LLM-->>AgentLoop: response + tool_calls

    alt Agent wants to save memory
        AgentLoop->>MemoryManager: save_memory(content)
        MemoryManager->>MemoryManager: check can_write_user_memory()
        MemoryManager->>MemoryStore: write to user memory
        MemoryStore-->>MemoryManager: success
    end

    AgentLoop-->>DiscordChannel: response
    DiscordChannel-->>Discord: send reply
    Discord-->>User: Bot response
```

## Sequence Diagram - Group Channel Flow

```mermaid
sequenceDiagram
    participant User
    participant Discord
    participant BatchManager
    participant MemoryManager
    participant MemoryStore
    participant AgentLoop
    participant LLM

    User->>Discord: Send message in channel
    Discord->>BatchManager: on_message(message)
    BatchManager->>BatchManager: classify message

    alt Command or @mention
        BatchManager->>MemoryManager: create_context(GROUP_CHANNEL)
        MemoryManager->>MemoryStore: read group memory
        MemoryStore-->>MemoryManager: group memories
        MemoryManager->>MemoryStore: read user memory (read-only)
        MemoryStore-->>MemoryManager: user memories
        BatchManager->>AgentLoop: process immediately
        AgentLoop->>LLM: chat(messages)
        LLM-->>AgentLoop: response
        AgentLoop-->>BatchManager: response
        BatchManager-->>Discord: send reply immediately
    else Regular message
        BatchManager->>BatchManager: add to queue
        Note over BatchManager: Wait for batch interval
    end

    Note over BatchManager: Batch timer triggers
    BatchManager->>BatchManager: get_batch(channel_id)
    BatchManager->>MemoryManager: create_context(GROUP_CHANNEL)
    BatchManager->>AgentLoop: process batch
    AgentLoop->>LLM: chat(batched messages)
    LLM-->>AgentLoop: response

    alt Agent saves group memory
        AgentLoop->>MemoryManager: save_memory(content)
        MemoryManager->>MemoryStore: write to group memory
    end

    AgentLoop-->>BatchManager: response
    BatchManager-->>Discord: send batch reply
```

## Component Diagram - Full System

```mermaid
flowchart TB
    subgraph Cloud["Cloud / Jetson"]
        subgraph NanoBot["Nanobot Agent"]
            AL[AgentLoop]
            CB[ContextBuilder]
            SL[SkillsLoader]
            SM[SubagentManager]
        end

        subgraph Memory["Memory Extension"]
            MM[MemoryManager]
            MS[MemoryStore]
            MT[Memory Tools]
        end

        subgraph Batch["Batch Response"]
            BRM[BatchResponseManager]
            MQ[MessageQueue]
            CD[CommandDetector]
        end

        subgraph LLM["LLM Backend"]
            LC[LLMClient]
            QWEN[Qwen3-4B on Jetson]
        end
    end

    subgraph Storage["File Storage"]
        UM[(User Memories)]
        GM[(Group Memories)]
    end

    subgraph Discord["Discord"]
        DG[Discord Gateway]
        DC[Discord Channel]
    end

    subgraph Local["Local Machine"]
        CH[Chrome + Extension]
        LX[Luxafor Light]
    end

    %% Connections
    DC <--> AL
    AL --> CB
    AL --> SL
    AL --> SM
    AL --> LC
    LC --> QWEN

    AL <--> MM
    MM --> MS
    MS --> UM
    MS --> GM
    MM --> MT

    DC --> BRM
    BRM --> MQ
    BRM --> CD
    BRM --> AL

    DG --> DC
    DG --> CH
    CH --> LX
```

## State Diagram - Memory Permissions

```mermaid
stateDiagram-v2
    [*] --> CheckChatType

    CheckChatType --> PrivateDM: chat_type == PRIVATE_DM
    CheckChatType --> GroupChannel: chat_type == GROUP_CHANNEL

    state PrivateDM {
        [*] --> UserMemory_RW
        UserMemory_RW: User Memory\n(Read/Write)
        UserMemory_RW --> GroupMemory_RO
        GroupMemory_RO: Group Memories\n(Read Only)
    }

    state GroupChannel {
        [*] --> GroupMemory_RW
        GroupMemory_RW: Group Memory\n(Read/Write)
        GroupMemory_RW --> UserMemory_RO
        UserMemory_RO: User Memory\n(Read Only)
    }

    PrivateDM --> [*]
    GroupChannel --> [*]
```

## File Structure

```
nanobot/
├── agent/
│   ├── __init__.py
│   ├── loop.py              # AgentLoop
│   ├── context.py           # ContextBuilder
│   ├── memory.py            # Original MemoryStore
│   ├── skills.py            # SkillsLoader
│   ├── subagents.py         # SubagentManager
│   └── llm.py               # LLMClient
│
├── channels/
│   ├── __init__.py
│   ├── base.py              # Base channel interface
│   ├── discord.py           # Discord integration
│   └── cli.py               # CLI interface
│
└── skills/
    ├── __init__.py
    ├── web_search.py
    ├── code_execute.py
    └── ...

nanobot-memory-improvement/
├── nanobot/
│   └── agent/
│       ├── memory_manager.py    # MemoryManager, MemoryStore, MemoryContext
│       ├── batch_responder.py   # BatchResponseManager
│       └── tools/
│           └── memory_tools.py  # Save/Read/List/Clear tools
│
├── workspace/
│   ├── AGENTS_MEMORY.md         # Agent instructions
│   └── memory/
│       ├── users/
│       │   └── user_{id}/
│       │       ├── MEMORY.md
│       │       └── {date}.md
│       └── groups/
│           └── group_{guild}_{channel}/
│               ├── MEMORY.md
│               └── {date}.md
│
├── patches/
│   ├── loop_memory.patch
│   └── context_memory.patch
│
└── tests/
    └── test_memory_manager.py
```
