# macOS System Cleanup - 2026-02-18

## Summary

- **Before:** 407 GB used / 494 GB total (82%)
- **After:** ~266 GB used / 494 GB total (~54%)
- **Total freed:** ~141 GB

## What was cleaned

### Docker / OrbStack (~58.4 GB)
- `docker system prune -a` — removed all unused images, containers, build cache
- `docker volume prune` — removed unused volumes

### Homebrew cache (~2.8 GB)
- `brew cleanup --prune=all`

### Xcode (~18 GB)
- `~/Library/Developer/Xcode/iOS DeviceSupport` — old device symbols (16 GB)
- `xcrun simctl delete unavailable` — removed unavailable simulators (2 GB)

### Unity (~5.8 GB)
- `~/Library/Unity/cache` — editor cache (5.2 GB)
- `~/Library/Unity` — remaining Asset Store data (631 MB)

### Dev tools removed (~11.6 GB)
- `~/.espressif` (5.9 GB) + `~/esp` (3.3 GB) — ESP-IDF toolchain
- `~/.codeium` (872 MB) — AI code completion
- `~/.vscode-server` (887 MB) — remote VSCode server
- `~/.expo` (765 MB) — React Native / Expo cache

### Package manager caches (~4.2 GB)
- `npm cache clean --force` (447 MB)
- `uv cache clean` (894 MB)
- `~/.nuget` (2.1 GB) — .NET packages
- `~/.cache` cleanup: puppeteer, selenium, huggingface, prisma, torch, chrome-devtools-mcp, n8n, grit, etc.

### App caches (~4.1 GB)
- `~/Library/Caches/SiriTTS` (1.9 GB)
- `~/Library/Caches/Homebrew` (included in brew cleanup)
- `~/Library/Caches/camoufox` (619 MB)
- `~/Library/Caches/Microsoft Edge` (446 MB)
- `~/Library/Caches/icloudmailagent` (402 MB)
- `~/Library/Caches/vscode-cpptools` (310 MB)
- `~/Library/Caches/bruno-updater` (239 MB)
- `~/Library/Caches/tradingview-desktop-updater` (181 MB)

### Apps uninstalled
- Visual Studio Code (app + `~/.vscode` 2.9 GB + App Support 162 MB)
- Discord (app + 1.5 GB data)
- Bruno
- Claude Desktop
- Expo Orbit
- OpenCode

### Uninstalled app leftovers cleaned
- **Microsoft Edge** (1.8 GB) — App Support
- **Microsoft Teams** (375 MB container + 54 MB group + support)
- **Spotify** (517 MB)
- **lx-music / LuoXue** (299 MB)
- **Chromium** (42 MB)
- **Adobe Creative Cloud** — Group Containers
- **Parallels Desktop** — prefs + Group Containers
- Arc, Brave, Opera, Vivaldi, Mozilla/Firefox, UTM, CleanMyMac, Raycast, Permute, Downie, Baidu Netdisk, Grammarly, Kwai, Xiaohongshu, Duolingo, Eudic, HelloTalk, GoodNotes, Xmind, Lattics, GeoGebra, Kimi, Pot, Docker Desktop, LangGraph Studio, CodeRabbit, camoufox, CEF, segment, turborepo, io.sentry, .opencode, .vs-kubernetes

### Kept
- `~/.bun` (2.2 GB) — in use
- `~/google-cloud-sdk` (655 MB) — in use
- `~/.rustup` (1.5 GB)
- `~/.nvm` (726 MB)
- OrbStack (38 GB disk image — needs manual compact in OrbStack UI)

## TODO
- [ ] Compact OrbStack disk image via OrbStack Settings to reclaim ~20 GB
- [ ] Clean WeChat media cache from within the app (8.9 GB)
- [ ] Remove Teams container via System Settings > General > Storage (macOS sandbox protected)
