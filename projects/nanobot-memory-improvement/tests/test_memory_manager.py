"""Tests for the multi-scope memory manager."""

import pytest
import tempfile
import asyncio
from pathlib import Path
from datetime import datetime

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "nanobot"))

from nanobot.agent.memory_manager import (
    MemoryManager,
    MemoryStore,
    MemoryContext,
    ChatType,
)
from nanobot.agent.tools.memory_tools import (
    SaveMemoryTool,
    ReadMemoryTool,
    ListMemoriesTool,
)


@pytest.fixture
def workspace():
    """Create a temporary workspace for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def manager(workspace):
    """Create a MemoryManager instance."""
    return MemoryManager(workspace)


class TestMemoryStore:
    """Test the base MemoryStore class."""

    def test_daily_notes(self, workspace):
        """Test daily note creation and retrieval."""
        store = MemoryStore(workspace / "test_user")

        # Initially empty
        assert store.read_today() == ""

        # Append content
        store.append_today("First note")
        content = store.read_today()
        assert "First note" in content

        # Append more
        store.append_today("Second note")
        content = store.read_today()
        assert "First note" in content
        assert "Second note" in content

    def test_long_term_memory(self, workspace):
        """Test long-term memory operations."""
        store = MemoryStore(workspace / "test_user")

        # Initially empty
        assert store.read_long_term() == ""

        # Write long-term memory
        store.append_long_term("User prefers dark mode")
        content = store.read_long_term()
        assert "dark mode" in content

        # Append more
        store.append_long_term("User's timezone is UTC+8")
        content = store.read_long_term()
        assert "dark mode" in content
        assert "UTC+8" in content

    def test_get_context(self, workspace):
        """Test combined context retrieval."""
        store = MemoryStore(workspace / "test_user")

        store.append_long_term("Permanent fact")
        store.append_today("Daily note")

        context = store.get_context()
        assert "Permanent fact" in context
        assert "Daily note" in context


class TestMemoryManager:
    """Test the MemoryManager class."""

    def test_user_isolation(self, manager):
        """Test that user memories are isolated."""
        ctx_alice = MemoryContext(
            user_id="alice",
            group_id=None,
            chat_type=ChatType.PRIVATE,
        )
        ctx_bob = MemoryContext(
            user_id="bob",
            group_id=None,
            chat_type=ChatType.PRIVATE,
        )

        # Save to Alice's memory
        manager.save_memory(ctx_alice, "Alice's secret")

        # Save to Bob's memory
        manager.save_memory(ctx_bob, "Bob's secret")

        # Verify isolation
        alice_mem = manager.read_user_memory("alice")
        bob_mem = manager.read_user_memory("bob")

        assert "Alice's secret" in alice_mem
        assert "Bob's secret" not in alice_mem

        assert "Bob's secret" in bob_mem
        assert "Alice's secret" not in bob_mem

    def test_group_isolation(self, manager):
        """Test that group memories are isolated."""
        ctx_group1 = MemoryContext(
            user_id="user1",
            group_id="guild1_channel1",
            chat_type=ChatType.GROUP,
        )
        ctx_group2 = MemoryContext(
            user_id="user1",
            group_id="guild1_channel2",
            chat_type=ChatType.GROUP,
        )

        # Save to different groups
        manager.save_memory(ctx_group1, "Channel 1 decision")
        manager.save_memory(ctx_group2, "Channel 2 decision")

        # Verify isolation
        group1_mem = manager.read_group_memory("guild1_channel1")
        group2_mem = manager.read_group_memory("guild1_channel2")

        assert "Channel 1 decision" in group1_mem
        assert "Channel 2 decision" not in group1_mem

        assert "Channel 2 decision" in group2_mem
        assert "Channel 1 decision" not in group2_mem

    def test_private_chat_writes_to_user(self, manager):
        """Test that private chat writes go to user memory."""
        ctx = MemoryContext(
            user_id="user123",
            group_id=None,
            chat_type=ChatType.PRIVATE,
        )

        manager.save_memory(ctx, "Personal preference")

        # Should be in user memory
        assert "Personal preference" in manager.read_user_memory("user123")

    def test_group_chat_writes_to_group(self, manager):
        """Test that group chat writes go to group memory."""
        ctx = MemoryContext(
            user_id="user123",
            group_id="guild_channel",
            chat_type=ChatType.GROUP,
        )

        manager.save_memory(ctx, "Group decision")

        # Should be in group memory, NOT user memory
        assert "Group decision" in manager.read_group_memory("guild_channel")
        assert "Group decision" not in manager.read_user_memory("user123")

    def test_context_for_private_chat(self, manager):
        """Test context building for private chat."""
        # Set up some memories
        manager._user_store("user123").append_long_term("User likes Python")

        ctx = MemoryContext(
            user_id="user123",
            group_id=None,
            chat_type=ChatType.PRIVATE,
        )

        context = manager.get_context_for_chat(ctx)
        assert "Python" in context
        assert "Personal Memory" in context

    def test_context_for_group_chat(self, manager):
        """Test context building for group chat."""
        # Set up memories
        manager._user_store("user123").append_long_term("User likes Python")
        manager._group_store("guild_channel").append_long_term("Team uses PostgreSQL")

        ctx = MemoryContext(
            user_id="user123",
            group_id="guild_channel",
            chat_type=ChatType.GROUP,
        )

        context = manager.get_context_for_chat(ctx)

        # Both should be present
        assert "Python" in context
        assert "PostgreSQL" in context

        # User memory should be marked as read-only
        assert "read-only" in context.lower()


class TestMemoryTools:
    """Test the memory tools."""

    @pytest.mark.asyncio
    async def test_save_memory_tool(self, manager):
        """Test the SaveMemoryTool."""
        ctx = MemoryContext(
            user_id="user123",
            group_id=None,
            chat_type=ChatType.PRIVATE,
        )

        tool = SaveMemoryTool(manager, ctx)

        # Test daily save
        result = await tool.execute(content="Test note", long_term=False)
        assert "daily" in result.lower()

        # Test long-term save
        result = await tool.execute(content="Permanent fact", long_term=True)
        assert "long-term" in result.lower()

        # Verify saved
        user_mem = manager.read_user_memory("user123")
        assert "Test note" in user_mem
        assert "Permanent fact" in user_mem

    @pytest.mark.asyncio
    async def test_read_memory_tool(self, manager):
        """Test the ReadMemoryTool."""
        # Set up memories
        manager._user_store("user123").append_long_term("My secret")
        manager._group_store("guild_channel").append_long_term("Group info")

        ctx = MemoryContext(
            user_id="user123",
            group_id="guild_channel",
            chat_type=ChatType.GROUP,
        )

        tool = ReadMemoryTool(manager, ctx)

        # Read self
        result = await tool.execute(target="self")
        assert "My secret" in result

        # Read group
        result = await tool.execute(target="group")
        assert "Group info" in result

        # Read another user
        manager._user_store("other_user").append_long_term("Other's info")
        result = await tool.execute(target="user", user_id="other_user")
        assert "Other's info" in result

    @pytest.mark.asyncio
    async def test_list_memories_tool(self, manager):
        """Test the ListMemoriesTool."""
        # Create some memories
        manager._user_store("alice").append_today("Alice note")
        manager._user_store("bob").append_today("Bob note")
        manager._group_store("group1").append_today("Group note")

        ctx = MemoryContext(
            user_id="alice",
            group_id=None,
            chat_type=ChatType.PRIVATE,
        )

        tool = ListMemoriesTool(manager, ctx)

        result = await tool.execute(scope="all")
        assert "alice" in result
        assert "bob" in result
        assert "group1" in result


class TestMemoryContext:
    """Test MemoryContext creation."""

    def test_from_dict_private(self):
        """Test creating context for private chat."""

        class MockMessage:
            sender_id = "user123"
            metadata = {"chat_type": "private", "group_id": None}

        ctx = MemoryContext.from_message(MockMessage())

        assert ctx.user_id == "user123"
        assert ctx.group_id is None
        assert ctx.chat_type == ChatType.PRIVATE

    def test_from_dict_group(self):
        """Test creating context for group chat."""

        class MockMessage:
            sender_id = "user123"
            metadata = {"chat_type": "group", "group_id": "guild_channel"}

        ctx = MemoryContext.from_message(MockMessage())

        assert ctx.user_id == "user123"
        assert ctx.group_id == "guild_channel"
        assert ctx.chat_type == ChatType.GROUP


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
