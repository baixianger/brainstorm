# Multi-Language Menu Bar Translator

A macOS Menu Bar app with a hub-and-spoke translation UX. Instead of the traditional A->B linear flow, any panel can be the input and the others update automatically. Designed for multilingual creators who need to verify meaning across languages simultaneously.

## Core Concept

**Hub-and-Spoke Flow**: Click into any language panel to make it the "source" — the other panels auto-translate as output. No submit button, no direction toggle.

### Why this beats Google Translate UX

Google assumes a "Translator" and a "Listener." This design assumes a **Multi-lingual Creator** — someone who needs to verify meaning across several languages simultaneously or switch contexts rapidly.

## Interaction Logic

| State | Behavior |
|-------|----------|
| **Idle** | All panels show their last translated state |
| **Focus** | Click into a panel — it becomes the source, text selected/cleared |
| **Input** | Type in the active panel — other panels are targets |
| **Smart Trigger** | Debounce timer (~300ms) — waits for typing pause before API call |

## UI Architecture (Vertical Stack)

| Component | Description |
|-----------|-------------|
| Header | Tiny icons for "Settings" and "Always on Top" |
| Text Area A | "English" label. Copy button appears on hover |
| Text Area B | "Chinese" label. Background shifts when active |
| Text Area C | "French" label. Copy button appears on hover |

- Output panels: text slightly dimmed (ghost text)
- Active input panel: high-contrast text, subtle background color shift
- Languages should be configurable (not hardcoded to EN/ZH/FR)

## Technical Implementation

```swift
// Core logic for N-panel setup
func onTextChange(sourceIndex: Int, text: String) {
    let targetIndices = [0, 1, 2].filter { $0 != sourceIndex }

    for index in targetIndices {
        let targetLang = languageConfig[index]
        translate(text, to: targetLang) { result in
            updateUI(index: index, with: result)
        }
    }
}
```

## Advanced UX Touches

- **Global Shortcut**: `Option + Space` to summon the popover
- **Automatic Clipboard Detection**: On open, if clipboard has text, paste into last-used input and trigger translation
- **Ghost Text**: Output panels dimmed, input panel high-contrast
- **Copy on Hover**: Each output panel shows a copy button on hover

## Tech Stack Options

| Option | Pros | Cons |
|--------|------|------|
| **SwiftUI** (native) | Lightweight, native feel, Menu Bar support built-in | Swift only, macOS only |
| **Tauri** (Rust + web) | Cross-platform potential, lightweight | Less native feel |
| **Electron** | Familiar web tech, fast to prototype | Heavy memory footprint |

Recommended: **SwiftUI** for the most native macOS experience.

## Translation API Options

| API | Cost | Quality |
|-----|------|---------|
| Google Translate API | $20/1M chars | Good general |
| DeepL API | Free tier 500K chars/month | Better quality for EU languages |
| OpenAI / Claude API | Token-based pricing | Best for nuanced/contextual translation |
| LibreTranslate | Free, self-hosted | Decent, fully offline option |

## TODO

- [ ] Decide on tech stack (SwiftUI recommended)
- [ ] Choose translation API (DeepL free tier to start?)
- [ ] Build basic 3-panel SwiftUI Menu Bar prototype
- [ ] Implement debounce + auto role switching
- [ ] Add global shortcut (Option + Space)
- [ ] Add clipboard detection
- [ ] Make language panels configurable (add/remove languages)
