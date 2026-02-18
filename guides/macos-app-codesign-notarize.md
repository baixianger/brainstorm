# macOS App Code Signing & Notarization Guide

## Overview

Record of signing, notarizing, and packaging AppleScript-based apps (`cd2-ghostty` and `ccOpener-ghostty`) for distribution via GitHub Release DMG.

## Key Learnings

### 1. `xattr -cr` destroys Finder custom icons

AppleScript apps often have custom icons set via Finder "Get Info" (paste icon). These are stored in:
- `AppName.app/Icon\r` file's **resource fork** (`com.apple.ResourceFork` xattr)

Running `xattr -cr` (required before `codesign`) **deletes the resource fork**, losing the custom icon.

**Solution**: Extract icon data from resource fork BEFORE cleaning xattrs:

```python
# Extract icns from Icon\r resource fork
with open("AppName.app/Icon\r/..namedfork/rsrc", "rb") as f:
    data = f.read()

import struct
idx = data.find(b"icns")
length = struct.unpack(">I", data[idx+4:idx+8])[0]
icns_data = data[idx:idx+length]

with open("custom-icon.icns", "wb") as out:
    out.write(icns_data)
```

Then replace `Contents/Resources/applet.icns` with the extracted icns.

### 2. `Assets.car` overrides `applet.icns`

AppleScript apps have an `Assets.car` (compiled Asset Catalog) in `Contents/Resources/` that contains the default applet icon at all sizes (16x16 to 1024x1024).

macOS **prioritizes `Assets.car` over `applet.icns`**. So even if you replace `applet.icns` with a custom icon, the default icon from `Assets.car` still shows.

**Solution**: Delete `Assets.car` before signing:

```bash
rm AppName.app/Contents/Resources/Assets.car
```

### 3. Apple Team ID is not secret

The Team ID (e.g., `TN7ZDD72P2`) visible in `codesign -dvv` output is semi-public. Anyone can see it by inspecting any signed app. However, no need to advertise it in release notes.

### 4. `hdiutil create` volume name conflicts

If a volume with the same name is already mounted, `hdiutil create -srcfolder` fails with "Operation not permitted". Use a unique volume name or ensure no conflicts.

## Complete Signing Workflow

```bash
# 1. Copy apps preserving metadata
ditto original.app /tmp/build/original.app

# 2. Extract custom icons from Icon\r resource fork (if using Finder custom icons)
python3 extract_icon.py  # see script above

# 3. Replace applet.icns with custom icon
cp custom-icon.icns /tmp/build/original.app/Contents/Resources/applet.icns

# 4. Delete Assets.car (it overrides applet.icns with default icon)
rm /tmp/build/original.app/Contents/Resources/Assets.car

# 5. Remove Icon\r and clean all xattrs
rm -f /tmp/build/original.app/Icon$'\r'
xattr -cr /tmp/build/original.app

# 6. Sign with Developer ID + hardened runtime
codesign --deep --force --options runtime \
  --sign "Developer ID Application: Name (TEAMID)" \
  /tmp/build/original.app

# 7. Create zip and submit for notarization
ditto -c -k --keepParent /tmp/build/original.app app.zip
xcrun notarytool submit app.zip \
  --keychain-profile "notarytool-profile" --wait

# 8. Staple notarization ticket
xcrun stapler staple /tmp/build/original.app

# 9. Create DMG
hdiutil create -volname "App Name" \
  -srcfolder /tmp/build/staging/ \
  -ov -format UDZO output.dmg

# 10. Verify
spctl -a -t exec -vv /tmp/build/original.app
```

## Notarytool Credential Setup

```bash
xcrun notarytool store-credentials "notarytool-profile" \
  --apple-id "your@email.com" \
  --team-id "TEAMID"
# Prompts for app-specific password (generate at appleid.apple.com)
```

## Files

- Signed apps: `/Users/baixianger/Documents/Actions/cd2-ghostty.app`, `ccOpener-ghostty.app`
- Icon backups: `/Users/baixianger/Documents/Actions/cd2-ghostty-icon-backup.icns`, `ccOpener-ghostty-icon-backup.icns`
- DMG backup: `/Users/baixianger/Documents/ghosttys-friends.dmg`
- GitHub Release: `baixianger/ghosttys-friends` v1.1.0
