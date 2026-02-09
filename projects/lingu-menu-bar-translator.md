# Lingu — macOS Menu Bar Multi-Language Translator

**Repo:** [github.com/baixianger/Lingu](https://github.com/baixianger/Lingu)
**Status:** v1 built, compiles, runs as menu bar app
**Stack:** Swift, SwiftUI, Combine, macOS 13+, XcodeGen

## What It Does

Menu bar translator with hub-and-spoke UX. 2–3 language panels side by side. Type in any one — the others auto-translate. No source/target switching, no direction buttons.

Supports Google Translate and DeepL APIs (switchable in Settings). API keys stored in macOS Keychain.

## Why It Kills Other Translators

### Hub-and-Spoke vs Pipeline
Every other translator forces A → B. One source, one target, one direction. Want to switch? Click swap, retype. Need a third language? Open another tab. Copy-paste between them.

Lingu: type anywhere, everything else updates. The source is wherever you're typing.

### Always One Click Away
- Google Translate: browser → URL → page load → text field
- DeepL: app → window → select languages → text field
- Lingu: click menu bar icon → type

Zero window management. No Cmd+Tab hunting. Click the icon, it's there. Click elsewhere, it's gone.

### No Language Switching Tax
3 languages simultaneously is the default state, not a power-user feature. Configure once, use forever.

### Speed
300ms debounce. Type, pause, translated. No "Translate" button. No Enter key. Clipboard auto-detect on open.

| Action | Google Translate | DeepL App | Lingu |
|--------|-----------------|-----------|-------|
| Get to text input | ~3s | ~2s | <0.5s |
| Translate to 2 languages | Do it twice | Do it twice | Already done |
| Switch direction | Click swap + retype | Click swap + retype | Type in other panel |

## Architecture

```
LinguApp (@main) → MenuBarExtra (.window style)
  ├── TranslatorView (header + error bar + panel stack)
  │   └── LanguagePanelView × N (TextEditor + copy + spinner)
  ├── SettingsView (provider, API keys, languages)
  └── TranslatorViewModel (Combine debounce, TaskGroup parallel translation)
      ├── GoogleTranslateService (API v2)
      ├── DeepLTranslateService (API v2, free endpoint)
      ├── KeychainHelper (Security framework)
      └── ClipboardManager (NSPasteboard)
```

## Production API Key Strategy

### Option 1: BYOK (Current — Good for Open Source)
Users enter their own API keys in Settings, stored in Keychain. Zero server cost.

### Option 2: Proxy Server (Best for App Store)
Run a lightweight backend. App calls your server, server calls Google/DeepL. Users never see an API key. You control rate limits and billing. A minimal proxy is ~30 lines (Cloudflare Worker / Vercel Edge Function).

### Option 3: Hybrid (Recommended for Production)
- Free tier via proxy (e.g. 5,000 chars/day)
- "Bring Your Own Key" in advanced settings for power users
- This is what Raycast and Bob Translate do

### API Pricing Reference

| Provider | Free Tier | Paid Rate |
|----------|-----------|-----------|
| DeepL Free | 500K chars/month, $0 | Hard limit |
| DeepL Pro | 1M chars included, $5.49/mo | $25/1M chars |
| Google Translate | $300 new account credit | $20/1M chars |

## Known Issues Fixed
- DeepL uses different language codes for source vs target (e.g. `ZH` source, `ZH-HANS` target). Split `deepLCode` into `deepLSourceCode` / `deepLTargetCode`.

## Future Ideas
- Global hotkey (needs Accessibility permission)
- Language auto-detection (omit source_lang param)
- Translation history
- Proxy server for App Store distribution
- Offline model support (Apple Translation framework, macOS 15+)
