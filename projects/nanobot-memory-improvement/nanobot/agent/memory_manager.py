"""
Multi-Scope Memory Manager for Nanobot

Provides isolated memory storage with context-aware permissions:
- Private chat: Read/Write user memory, Read-only group memory
- Group chat: Read-only user memory, Read/Write group memory
"""

from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from typing import Optional, List
import json


class ChatType(Enum):
    """Type of chat context"""
    PRIVATE = "private"
    GROUP = "group"


@dataclass
class MemoryContext:
    """
    Holds context for memory operations.

    Attributes:
        user_id: Unique identifier for the user
        group_id: Unique identifier for the group (guild_channel format)
        chat_type: Whether this is a private or group chat
        user_name: Display name of the user (optional)
        group_name: Display name of the group (optional)
    """
    user_id: str
    group_id: Optional[str]
    chat_type: ChatType
    user_name: Optional[str] = None
    group_name: Optional[str] = None

    @classmethod
    def from_message(cls, msg) -> "MemoryContext":
        """Create MemoryContext from an InboundMessage"""
        metadata = msg.metadata or {}
        chat_type_str = metadata.get("chat_type", "private")

        return cls(
            user_id=msg.sender_id,
            group_id=metadata.get("group_id"),
            chat_type=ChatType(chat_type_str),
            user_name=metadata.get("sender_name"),
            group_name=metadata.get("group_name"),
        )


class MemoryStore:
    """
    Single-scope memory store for either a user or a group.

    Handles both daily notes and long-term memory storage.
    """

    def __init__(self, base_path: Path):
        """
        Initialize memory store.

        Args:
            base_path: Directory path for this memory scope
        """
        self.base_path = base_path
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.long_term_file = base_path / "MEMORY.md"
        self.metadata_file = base_path / ".metadata.json"

    def _daily_file(self, date: datetime = None) -> Path:
        """Get path to daily memory file"""
        date = date or datetime.now()
        return self.base_path / f"{date.strftime('%Y-%m-%d')}.md"

    # --- Daily Memory Operations ---

    def read_today(self) -> str:
        """Read today's memory notes"""
        f = self._daily_file()
        return f.read_text(encoding="utf-8") if f.exists() else ""

    def append_today(self, content: str) -> None:
        """Append content to today's memory"""
        f = self._daily_file()
        timestamp = datetime.now().strftime("%H:%M")
        entry = f"\n### [{timestamp}]\n{content}\n"

        if not f.exists():
            header = f"# {datetime.now().strftime('%Y-%m-%d')}\n"
            f.write_text(header + entry, encoding="utf-8")
        else:
            with f.open("a", encoding="utf-8") as fp:
                fp.write(entry)

        self._update_metadata()

    # --- Long-term Memory Operations ---

    def read_long_term(self) -> str:
        """Read long-term memory file"""
        if self.long_term_file.exists():
            return self.long_term_file.read_text(encoding="utf-8")
        return ""

    def write_long_term(self, content: str) -> None:
        """Overwrite long-term memory file"""
        self.long_term_file.write_text(content, encoding="utf-8")
        self._update_metadata()

    def append_long_term(self, content: str) -> None:
        """Append to long-term memory with timestamp"""
        existing = self.read_long_term()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

        if not existing:
            new_content = f"# Long-term Memory\n\n## [{timestamp}]\n{content}\n"
        else:
            new_content = existing.rstrip() + f"\n\n## [{timestamp}]\n{content}\n"

        self.write_long_term(new_content)

    # --- Query Operations ---

    def get_recent(self, days: int = 3) -> str:
        """Get memories from the last N days"""
        memories = []
        for i in range(days):
            date = datetime.now() - timedelta(days=i)
            f = self._daily_file(date)
            if f.exists():
                content = f.read_text(encoding="utf-8")
                memories.append(content)

        return "\n\n---\n\n".join(memories) if memories else ""

    def list_memory_files(self) -> List[Path]:
        """List all daily memory files, newest first"""
        files = list(self.base_path.glob("????-??-??.md"))
        return sorted(files, reverse=True)

    def get_context(self, include_recent_days: int = 3) -> str:
        """
        Get combined memory context for LLM.

        Returns long-term memory and recent daily notes combined.
        """
        parts = []

        # Long-term memory
        long_term = self.read_long_term()
        if long_term:
            parts.append(long_term)

        # Recent daily notes
        recent = self.get_recent(days=include_recent_days)
        if recent:
            parts.append(f"## Recent Notes\n\n{recent}")

        return "\n\n---\n\n".join(parts) if parts else ""

    # --- Metadata ---

    def _update_metadata(self) -> None:
        """Update metadata file with last modified time"""
        metadata = self._read_metadata()
        metadata["last_updated"] = datetime.now().isoformat()
        metadata["file_count"] = len(self.list_memory_files())

        with self.metadata_file.open("w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    def _read_metadata(self) -> dict:
        """Read metadata file"""
        if self.metadata_file.exists():
            with self.metadata_file.open("r", encoding="utf-8") as f:
                return json.load(f)
        return {"created": datetime.now().isoformat()}

    def get_last_updated(self) -> Optional[datetime]:
        """Get last update timestamp"""
        metadata = self._read_metadata()
        if "last_updated" in metadata:
            return datetime.fromisoformat(metadata["last_updated"])
        return None


class MemoryManager:
    """
    Manages dual-layer memory with context-aware permissions.

    Memory access rules:
    - Private chat: Read/Write user memory, Read-only group memories
    - Group chat: Read-only user memory, Read/Write group memory
    """

    def __init__(self, workspace: Path):
        """
        Initialize memory manager.

        Args:
            workspace: Base workspace directory
        """
        self.workspace = Path(workspace)
        self.users_dir = self.workspace / "memory" / "users"
        self.groups_dir = self.workspace / "memory" / "groups"

        # Ensure directories exist
        self.users_dir.mkdir(parents=True, exist_ok=True)
        self.groups_dir.mkdir(parents=True, exist_ok=True)

    def _user_store(self, user_id: str) -> MemoryStore:
        """Get memory store for a user"""
        safe_id = self._safe_filename(user_id)
        return MemoryStore(self.users_dir / f"user_{safe_id}")

    def _group_store(self, group_id: str) -> MemoryStore:
        """Get memory store for a group"""
        safe_id = self._safe_filename(group_id)
        return MemoryStore(self.groups_dir / f"group_{safe_id}")

    @staticmethod
    def _safe_filename(name: str) -> str:
        """Convert ID to safe filename"""
        return "".join(c if c.isalnum() or c in "-_" else "_" for c in name)

    # --- Context Building ---

    def get_context_for_chat(self, ctx: MemoryContext) -> str:
        """
        Build memory context based on chat type.

        Private DM:
            - Primary (RW): User's personal memory
            - Reference (RO): Relevant group memories

        Group Chat:
            - Primary (RW): Group's shared memory
            - Reference (RO): User's personal memory

        Args:
            ctx: Memory context with user/group info and chat type

        Returns:
            Formatted memory string for LLM context
        """
        parts = []

        if ctx.chat_type == ChatType.PRIVATE:
            # Primary: User's own memory (they can write to this)
            user_mem = self._user_store(ctx.user_id).get_context()
            if user_mem:
                header = f"# Personal Memory"
                if ctx.user_name:
                    header += f" ({ctx.user_name})"
                parts.append(f"{header}\n\n{user_mem}")

            # Reference: Could add group memories the user participates in
            # This requires tracking user-group relationships

        elif ctx.chat_type == ChatType.GROUP:
            # Primary: Group memory (this is what gets written to)
            if ctx.group_id:
                group_mem = self._group_store(ctx.group_id).get_context()
                if group_mem:
                    header = "# Group Memory"
                    if ctx.group_name:
                        header += f" ({ctx.group_name})"
                    parts.append(f"{header}\n\n{group_mem}")

            # Reference: User's personal memory (read-only context)
            user_mem = self._user_store(ctx.user_id).get_context()
            if user_mem:
                user_label = ctx.user_name or ctx.user_id
                parts.append(
                    f"# Personal Context for {user_label} (read-only reference)\n\n{user_mem}"
                )

        if not parts:
            return ""

        return "\n\n" + "═" * 40 + "\n\n".join(parts)

    # --- Memory Operations ---

    def save_memory(
        self,
        ctx: MemoryContext,
        content: str,
        long_term: bool = False
    ) -> str:
        """
        Save memory respecting context permissions.

        - Private chat → writes to user memory
        - Group chat → writes to group memory

        Args:
            ctx: Memory context
            content: Content to save
            long_term: If True, save to long-term memory; else daily notes

        Returns:
            Confirmation message
        """
        if ctx.chat_type == ChatType.PRIVATE:
            store = self._user_store(ctx.user_id)
            target = "personal"
        elif ctx.chat_type == ChatType.GROUP:
            if not ctx.group_id:
                raise ValueError("Group chat requires group_id")
            store = self._group_store(ctx.group_id)
            target = "group"
        else:
            raise ValueError(f"Unknown chat type: {ctx.chat_type}")

        if long_term:
            store.append_long_term(content)
            return f"Saved to {target} long-term memory."
        else:
            store.append_today(content)
            return f"Saved to {target} daily notes."

    def read_user_memory(self, user_id: str) -> str:
        """
        Directly read a user's memory.

        Args:
            user_id: User identifier

        Returns:
            User's memory content
        """
        return self._user_store(user_id).get_context()

    def read_group_memory(self, group_id: str) -> str:
        """
        Directly read a group's memory.

        Args:
            group_id: Group identifier

        Returns:
            Group's memory content
        """
        return self._group_store(group_id).get_context()

    # --- Utility Methods ---

    def list_users(self) -> List[str]:
        """List all users with memories"""
        users = []
        for path in self.users_dir.iterdir():
            if path.is_dir() and path.name.startswith("user_"):
                users.append(path.name[5:])  # Remove "user_" prefix
        return sorted(users)

    def list_groups(self) -> List[str]:
        """List all groups with memories"""
        groups = []
        for path in self.groups_dir.iterdir():
            if path.is_dir() and path.name.startswith("group_"):
                groups.append(path.name[6:])  # Remove "group_" prefix
        return sorted(groups)

    def get_user_stats(self, user_id: str) -> dict:
        """Get statistics for a user's memory"""
        store = self._user_store(user_id)
        return {
            "user_id": user_id,
            "file_count": len(store.list_memory_files()),
            "has_long_term": store.long_term_file.exists(),
            "last_updated": store.get_last_updated(),
        }

    def get_group_stats(self, group_id: str) -> dict:
        """Get statistics for a group's memory"""
        store = self._group_store(group_id)
        return {
            "group_id": group_id,
            "file_count": len(store.list_memory_files()),
            "has_long_term": store.long_term_file.exists(),
            "last_updated": store.get_last_updated(),
        }
