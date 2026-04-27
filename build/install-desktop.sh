#!/bin/bash
# Install HeatTrace desktop entry and icon (dev + production)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICON_SRC="$SCRIPT_DIR/appicon.png"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

# Install icon
mkdir -p "$ICON_DIR"
cp "$ICON_SRC" "$ICON_DIR/heattrace.png"

# Install desktop files
mkdir -p "$DESKTOP_DIR"
cp "$SCRIPT_DIR/heattrace.desktop" "$DESKTOP_DIR/"
cp "$SCRIPT_DIR/heattrace-dev.desktop" "$DESKTOP_DIR/"

# Update caches
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo "Installed:"
echo "  Icon: $ICON_DIR/heattrace.png"
echo "  Desktop (prod): $DESKTOP_DIR/heattrace.desktop  [WM_CLASS=HeatTrace]"
echo "  Desktop (dev):  $DESKTOP_DIR/heattrace-dev.desktop [WM_CLASS=HeatTrace-dev-linux-amd64]"
