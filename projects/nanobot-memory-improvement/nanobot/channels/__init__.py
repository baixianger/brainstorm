"""Channel integrations for nanobot."""

try:
    from nanobot.channels.discord_channel import DiscordChannel, DiscordWebhookChannel
    HAS_DISCORD = True
except ImportError:
    HAS_DISCORD = False
    DiscordChannel = None
    DiscordWebhookChannel = None

__all__ = [
    "DiscordChannel",
    "DiscordWebhookChannel",
    "HAS_DISCORD",
]
