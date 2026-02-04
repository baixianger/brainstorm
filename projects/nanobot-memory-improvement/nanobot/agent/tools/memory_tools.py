"""
Memory Tools for Nanobot Agent

Provides tools for the agent to read and save memories with
context-aware permissions.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from nanobot.agent.memory_manager import MemoryManager, MemoryContext

from nanobot.agent.tools.base import Tool
from nanobot.agent.memory_manager import ChatType


class SaveMemoryTool(Tool):
    """
    Tool for the agent to save memories.

    Respects chat context:
    - In private chats: saves to user's personal memory
    - In group chats: saves to group's shared memory
    """

    def __init__(self, manager: "MemoryManager", ctx: "MemoryContext"):
        self.manager = manager
        self.ctx = ctx

    @property
    def name(self) -> str:
        return "save_memory"

    @property
    def description(self) -> str:
        if self.ctx.chat_type == ChatType.PRIVATE:
            target = "the user's personal memory"
            examples = "preferences, personal facts, ongoing tasks, reminders"
        else:
            target = "the group's shared memory"
            examples = "group decisions, shared context, channel-specific information, meeting notes"

        return (
            f"Save important information to {target}. "
            f"Use for: {examples}. "
            f"Set long_term=true for permanent facts, false for session notes."
        )

    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": (
                        "The information to remember. Be concise and factual. "
                        "Include relevant context like dates, names, or specifics."
                    )
                },
                "long_term": {
                    "type": "boolean",
                    "description": (
                        "True for permanent facts (preferences, important decisions). "
                        "False for temporary notes (current tasks, session context). "
                        "Default: false"
                    ),
                    "default": False
                }
            },
            "required": ["content"]
        }

    async def execute(self, content: str, long_term: bool = False) -> str:
        """Execute the save memory operation"""
        try:
            result = self.manager.save_memory(self.ctx, content, long_term=long_term)
            return result
        except Exception as e:
            return f"Failed to save memory: {str(e)}"


class ReadMemoryTool(Tool):
    """
    Tool for the agent to explicitly read memories.

    Allows reading:
    - Own memory (current user)
    - Group memory (current group)
    - Other user's memory (in group context, for personalization)
    """

    def __init__(self, manager: "MemoryManager", ctx: "MemoryContext"):
        self.manager = manager
        self.ctx = ctx

    @property
    def name(self) -> str:
        return "read_memory"

    @property
    def description(self) -> str:
        return (
            "Read specific memory when you need details not in the current context. "
            "Use 'self' for the current user's memory, 'group' for the current group's memory, "
            "or 'user' with a user_id to read another user's memory (useful in groups)."
        )

    @property
    def parameters(self) -> dict:
        params = {
            "type": "object",
            "properties": {
                "target": {
                    "type": "string",
                    "enum": ["self", "group", "user"],
                    "description": (
                        "'self' = current user's personal memory, "
                        "'group' = current group/channel memory, "
                        "'user' = specific user's memory (requires user_id)"
                    )
                },
                "user_id": {
                    "type": "string",
                    "description": (
                        "User ID to read memory for. Only used when target='user'. "
                        "Useful in group chats to get context about another participant."
                    )
                }
            },
            "required": ["target"]
        }
        return params

    async def execute(self, target: str, user_id: str = None) -> str:
        """Execute the read memory operation"""
        try:
            if target == "self":
                content = self.manager.read_user_memory(self.ctx.user_id)
                if not content:
                    return "No personal memories found for this user."
                return f"## Personal Memory\n\n{content}"

            elif target == "group":
                if not self.ctx.group_id:
                    return "Not in a group chat - no group memory available."
                content = self.manager.read_group_memory(self.ctx.group_id)
                if not content:
                    return "No group memories found for this channel."
                return f"## Group Memory\n\n{content}"

            elif target == "user":
                if not user_id:
                    return "Error: user_id is required when target='user'"
                content = self.manager.read_user_memory(user_id)
                if not content:
                    return f"No memories found for user {user_id}."
                return f"## Memory for {user_id}\n\n{content}"

            else:
                return f"Unknown target: {target}. Use 'self', 'group', or 'user'."

        except Exception as e:
            return f"Failed to read memory: {str(e)}"


class ListMemoriesTool(Tool):
    """
    Tool to list available memory scopes.

    Useful for the agent to discover what memories exist.
    """

    def __init__(self, manager: "MemoryManager", ctx: "MemoryContext"):
        self.manager = manager
        self.ctx = ctx

    @property
    def name(self) -> str:
        return "list_memories"

    @property
    def description(self) -> str:
        return (
            "List available memory scopes (users and groups with stored memories). "
            "Useful to discover what context is available."
        )

    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": ["users", "groups", "all"],
                    "description": "What to list: 'users', 'groups', or 'all'",
                    "default": "all"
                }
            },
            "required": []
        }

    async def execute(self, scope: str = "all") -> str:
        """Execute the list memories operation"""
        parts = []

        if scope in ("users", "all"):
            users = self.manager.list_users()
            if users:
                user_list = "\n".join(f"- {u}" for u in users[:20])
                if len(users) > 20:
                    user_list += f"\n- ... and {len(users) - 20} more"
                parts.append(f"## Users with memories ({len(users)})\n{user_list}")
            else:
                parts.append("## Users with memories\nNone found.")

        if scope in ("groups", "all"):
            groups = self.manager.list_groups()
            if groups:
                group_list = "\n".join(f"- {g}" for g in groups[:20])
                if len(groups) > 20:
                    group_list += f"\n- ... and {len(groups) - 20} more"
                parts.append(f"## Groups with memories ({len(groups)})\n{group_list}")
            else:
                parts.append("## Groups with memories\nNone found.")

        return "\n\n".join(parts)


class ClearMemoryTool(Tool):
    """
    Tool to clear memory (with confirmation).

    Only allows clearing the writable memory scope:
    - In private chat: can clear personal memory
    - In group chat: can clear group memory
    """

    def __init__(self, manager: "MemoryManager", ctx: "MemoryContext"):
        self.manager = manager
        self.ctx = ctx

    @property
    def name(self) -> str:
        return "clear_memory"

    @property
    def description(self) -> str:
        if self.ctx.chat_type == ChatType.PRIVATE:
            target = "personal"
        else:
            target = "group"

        return (
            f"Clear {target} memory. Use 'daily' to clear today's notes only, "
            f"or 'all' to clear everything including long-term memory. "
            f"Requires confirmation=true to execute."
        )

    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": ["daily", "all"],
                    "description": "'daily' = today's notes only, 'all' = everything"
                },
                "confirmation": {
                    "type": "boolean",
                    "description": "Must be true to confirm deletion"
                }
            },
            "required": ["scope", "confirmation"]
        }

    async def execute(self, scope: str, confirmation: bool) -> str:
        """Execute the clear memory operation"""
        if not confirmation:
            return "Clear operation cancelled. Set confirmation=true to proceed."

        try:
            if self.ctx.chat_type == ChatType.PRIVATE:
                store = self.manager._user_store(self.ctx.user_id)
                target = "personal"
            else:
                if not self.ctx.group_id:
                    return "Not in a group chat."
                store = self.manager._group_store(self.ctx.group_id)
                target = "group"

            if scope == "daily":
                daily_file = store._daily_file()
                if daily_file.exists():
                    daily_file.unlink()
                    return f"Cleared today's {target} notes."
                return f"No {target} notes for today."

            elif scope == "all":
                # Clear all files in the memory directory
                count = 0
                for f in store.base_path.glob("*.md"):
                    f.unlink()
                    count += 1
                return f"Cleared {count} {target} memory files."

            return f"Unknown scope: {scope}"

        except Exception as e:
            return f"Failed to clear memory: {str(e)}"


def register_memory_tools(
    registry,
    manager: "MemoryManager",
    ctx: "MemoryContext"
) -> None:
    """
    Register all memory tools with the tool registry.

    Args:
        registry: Tool registry to register with
        manager: MemoryManager instance
        ctx: Current memory context
    """
    registry.register(SaveMemoryTool(manager, ctx))
    registry.register(ReadMemoryTool(manager, ctx))
    registry.register(ListMemoriesTool(manager, ctx))
    registry.register(ClearMemoryTool(manager, ctx))
