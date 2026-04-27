#!/bin/bash
# Build AppImage for HeatTrace (Linux)
# Requires: appimagetool (https://github.com/AppImage/appimagetool)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/AppDir"
OUTPUT="$SCRIPT_DIR/HeatTrace-linux-amd64.AppImage"

# Clean previous build
rm -rf "$APP_DIR" "$OUTPUT"

# Create AppDir structure
mkdir -p "$APP_DIR/usr/bin" "$APP_DIR/usr/share/icons/hicolor/512x512/apps" "$APP_DIR/usr/share/applications"

# Copy binary
cp "$SCRIPT_DIR/bin/HeatTrace" "$APP_DIR/usr/bin/heattrace"
chmod +x "$APP_DIR/usr/bin/heattrace"

# Copy icon
cp "$SCRIPT_DIR/appicon.png" "$APP_DIR/usr/share/icons/hicolor/512x512/apps/heattrace.png"

# Create .desktop file
cat > "$APP_DIR/usr/share/applications/heattrace.desktop" << EOF
[Desktop Entry]
Name=HeatTrace
Exec=heattrace
Icon=heattrace
Type=Application
Categories=Utility;Development;
Comment=Desktop activity tracker for keyboard & mouse
Terminal=false
StartupNotify=false
EOF

# Copy .desktop to root (AppImage spec)
cp "$APP_DIR/usr/share/applications/heattrace.desktop" "$APP_DIR/heattrace.desktop"

# Copy icon to root (AppImage spec)
cp "$SCRIPT_DIR/appicon.png" "$APP_DIR/heattrace.png"

# Create AppRun symlink
ln -sf "usr/bin/heattrace" "$APP_DIR/AppRun"

# Build AppImage
if command -v appimagetool &>/dev/null; then
  appimagetool "$APP_DIR" "$OUTPUT"
elif [ -f "$SCRIPT_DIR/appimagetool" ]; then
  "$SCRIPT_DIR/appimagetool" "$APP_DIR" "$OUTPUT"
else
  echo "Error: appimagetool not found."
  echo "Install: https://github.com/AppImage/appimagetool/releases"
  exit 1
fi

echo "AppImage created: $OUTPUT"
