"""
Discord Channel Integration for Nanobot

Handles Discord messages and builds appropriate memory context
for private DMs vs group/server channels.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional, Callable, Awaitable

try:
    import discord
    from discord import Intents
    HAS_DISCORD = True
except ImportError:
    HAS_DISCORD = False

from nanobot.bus.events import InboundMessage, OutboundMessage
from nanobot.agent.memory_manager import ChatType

logger = logging.getLogger(__name__)


class DiscordChannel:
    """
    Discord channel adapter for nanobot.

    Handles:
    - Receiving messages from Discord (DMs and server channels)
    - Building memory context based on chat type
    - Sending responses back to Discord
    """

    def __init__(
        self,
        bot_token: str,
        message_bus,
        bot_user_id: Optional[str] = None,
        command_prefix: str = "!",
    ):
        """
        Initialize Discord channel.

        Args:
            bot_token: Discord bot token
            message_bus: Message bus for publishing inbound messages
            bot_user_id: Bot's user ID (auto-detected if not provided)
            command_prefix: Prefix for explicit commands (default: "!")
        """
        if not HAS_DISCORD:
            raise ImportError("discord.py is required: pip install discord.py")

        self.token = bot_token
        self.bus = message_bus
        self.bot_user_id = bot_user_id
        self.command_prefix = command_prefix

        # Set up Discord client with required intents
        intents = Intents.default()
        intents.message_content = True
        intents.dm_messages = True
        intents.guild_messages = True
        intents.members = True

        self.client = discord.Client(intents=intents)
        self._setup_handlers()

    def _setup_handlers(self):
        """Set up Discord event handlers"""

        @self.client.event
        async def on_ready():
            logger.info(f"Discord bot connected as {self.client.user}")
            self.bot_user_id = str(self.client.user.id)

        @self.client.event
        async def on_message(message: discord.Message):
            await self._handle_message(message)

    async def _handle_message(self, message: discord.Message):
        """
        Process incoming Discord message.

        Builds appropriate memory context based on whether this is
        a DM or a server channel message.
        """
        # Ignore bot's own messages
        if message.author.bot:
            return

        # Ignore messages that don't mention the bot (in servers)
        # unless it's a DM or starts with command prefix
        is_dm = isinstance(message.channel, discord.DMChannel)
        is_mentioned = self.client.user in message.mentions if self.client.user else False
        is_command = message.content.startswith(self.command_prefix)

        if not is_dm and not is_mentioned and not is_command:
            return

        # Clean content (remove mention)
        content = message.content
        if is_mentioned and self.client.user:
            content = content.replace(f"<@{self.client.user.id}>", "").strip()
        if is_command:
            content = content[len(self.command_prefix):].strip()

        # Determine chat type and build identifiers
        if is_dm:
            chat_type = ChatType.PRIVATE
            group_id = None
            chat_id = f"dm_{message.author.id}"
            group_name = None
            channel_name = "DM"
        else:
            chat_type = ChatType.GROUP
            # Unique group ID: guild_channel
            group_id = f"{message.guild.id}_{message.channel.id}"
            chat_id = group_id
            group_name = f"{message.guild.name} / #{message.channel.name}"
            channel_name = message.channel.name

        # Extract media attachments
        media = []
        for attachment in message.attachments:
            media.append({
                "type": self._get_media_type(attachment.content_type),
                "url": attachment.url,
                "filename": attachment.filename,
            })

        # Build inbound message with full context
        inbound = InboundMessage(
            channel="discord",
            sender_id=str(message.author.id),
            chat_id=chat_id,
            content=content,
            timestamp=message.created_at or datetime.utcnow(),
            media=media,
            metadata={
                # Memory context fields
                "chat_type": chat_type.value,
                "group_id": group_id,
                "sender_name": message.author.display_name,
                "group_name": group_name,
                # Discord-specific fields
                "guild_id": str(message.guild.id) if message.guild else None,
                "guild_name": message.guild.name if message.guild else None,
                "channel_id": str(message.channel.id),
                "channel_name": channel_name,
                "message_id": str(message.id),
                "is_dm": is_dm,
                # For reply handling
                "reply_to_id": str(message.reference.message_id) if message.reference else None,
            }
        )

        # Publish to message bus
        await self.bus.publish(inbound)

    @staticmethod
    def _get_media_type(content_type: Optional[str]) -> str:
        """Map content type to simple media type"""
        if not content_type:
            return "file"
        if content_type.startswith("image/"):
            return "image"
        if content_type.startswith("video/"):
            return "video"
        if content_type.startswith("audio/"):
            return "audio"
        return "file"

    async def send_message(self, msg: OutboundMessage):
        """
        Send a message to Discord.

        Args:
            msg: Outbound message to send
        """
        try:
            # Parse chat_id to find the channel
            chat_id = msg.chat_id

            if chat_id.startswith("dm_"):
                # Direct message
                user_id = int(chat_id[3:])
                user = await self.client.fetch_user(user_id)
                channel = await user.create_dm()
            else:
                # Guild channel (format: guild_channel)
                parts = chat_id.split("_")
                if len(parts) >= 2:
                    channel_id = int(parts[-1])
                    channel = self.client.get_channel(channel_id)
                    if not channel:
                        channel = await self.client.fetch_channel(channel_id)
                else:
                    logger.error(f"Invalid chat_id format: {chat_id}")
                    return

            if not channel:
                logger.error(f"Could not find channel for {chat_id}")
                return

            # Split long messages (Discord limit: 2000 chars)
            content = msg.content
            chunks = self._split_message(content, max_length=2000)

            for chunk in chunks:
                await channel.send(chunk)

        except Exception as e:
            logger.error(f"Failed to send Discord message: {e}")

    @staticmethod
    def _split_message(content: str, max_length: int = 2000) -> list[str]:
        """Split message into chunks that fit Discord's limit"""
        if len(content) <= max_length:
            return [content]

        chunks = []
        while content:
            if len(content) <= max_length:
                chunks.append(content)
                break

            # Find a good split point (newline or space)
            split_at = content.rfind("\n", 0, max_length)
            if split_at == -1:
                split_at = content.rfind(" ", 0, max_length)
            if split_at == -1:
                split_at = max_length

            chunks.append(content[:split_at])
            content = content[split_at:].lstrip()

        return chunks

    async def start(self):
        """Start the Discord bot"""
        logger.info("Starting Discord channel...")
        await self.client.start(self.token)

    async def stop(self):
        """Stop the Discord bot"""
        logger.info("Stopping Discord channel...")
        await self.client.close()

    def run(self):
        """Run the Discord bot (blocking)"""
        self.client.run(self.token)


class DiscordWebhookChannel:
    """
    Alternative Discord integration using webhooks.

    Useful for simpler setups or when you don't need real-time listening.
    """

    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    async def send_message(self, content: str, username: str = "nanobot"):
        """Send message via webhook"""
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                payload = {
                    "content": content,
                    "username": username,
                }
                async with session.post(self.webhook_url, json=payload) as resp:
                    if resp.status != 204:
                        logger.error(f"Webhook failed: {resp.status}")
        except ImportError:
            logger.error("aiohttp required for webhooks: pip install aiohttp")
