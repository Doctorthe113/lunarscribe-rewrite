#!/usr/bin/env bash
# Convert the Tauri .deb package to a Flatpak

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [[ ! -f "src-tauri/tauri.conf.json" ]]; then
    echo "ERROR: src-tauri/tauri.conf.json not found."
    exit 1
fi

APP_ID=$(jq -r '.identifier' src-tauri/tauri.conf.json)
VERSION=$(jq -r '.version' src-tauri/tauri.conf.json)
RUNTIME_VER="${1:-49}"

# Ensure flathub user remote
echo "==> Checking Flathub user remote..."
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Find .deb
DEB_DIR="src-tauri/target/release/bundle/deb"
DEB=$(ls $DEB_DIR/*.deb 2>/dev/null | head -1 || true)

if [[ -z "$DEB" ]]; then
    echo "ERROR: No .deb file found in $DEB_DIR."
    echo "Run 'bun tauri build --bundles deb' first."
    exit 1
fi

echo "==> Using .deb: $DEB"
echo "==> App ID: $APP_ID"
echo "==> Version: $VERSION"

WORKDIR="$(mktemp -d)"
EXTRACT_DIR="$WORKDIR/deb-extracted"
BUILD_DIR="$WORKDIR/flatpak-build"
MANIFEST="$WORKDIR/${APP_ID}.json"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

# Extract .deb
echo "==> Extracting .deb"
mkdir -p "$EXTRACT_DIR"
ar x "$DEB" --output="$WORKDIR"
DATA_TAR=$(find "$WORKDIR" -maxdepth 1 -name 'data.tar*' | head -1)
[[ -z "$DATA_TAR" ]] && { echo "ERROR: No data.tar found in .deb"; exit 1; }
tar xf "$DATA_TAR" -C "$EXTRACT_DIR"

# Detect executable
echo "==> Detecting executable"
EXEC_CANDIDATES=$(find "$EXTRACT_DIR/usr/bin" "$EXTRACT_DIR/usr/local/bin" \
    "$EXTRACT_DIR/opt" -maxdepth 3 -type f -executable 2>/dev/null | head -5 || true)
FIRST_EXEC=$(echo "$EXEC_CANDIDATES" | head -1)

if [[ -z "$FIRST_EXEC" ]]; then
    echo "ERROR: No executable found in extracted .deb."
    exit 1
fi

EXEC_NAME=$(basename "$FIRST_EXEC")
EXEC_PATH="${FIRST_EXEC#"$EXTRACT_DIR"}"
echo "   Found executable: $EXEC_PATH"

# Prepare files dir with proper Flatpak layout
echo "==> Preparing Flatpak file layout"
FILES_DIR="$WORKDIR/files"
mkdir -p "$FILES_DIR"
cp -a "$EXTRACT_DIR"/. "$FILES_DIR/"

# Relocate desktop file and icons into /share (Flatpak standard)
mkdir -p "$FILES_DIR/share/applications" "$FILES_DIR/share/icons"

# Symlink binary into /bin so desktop Exec= resolves
mkdir -p "$FILES_DIR/bin"
ln -sf "../usr/bin/$EXEC_NAME" "$FILES_DIR/bin/$EXEC_NAME"

# Copy and patch desktop file
DESKTOP_SRC=$(find "$FILES_DIR/usr/share/applications" -name '*.desktop' | head -1)
if [[ -n "$DESKTOP_SRC" ]]; then
    cp "$DESKTOP_SRC" "$FILES_DIR/share/applications/${APP_ID}.desktop"
    sed -i "s/^Icon=.*/Icon=${APP_ID}/" "$FILES_DIR/share/applications/${APP_ID}.desktop"
fi

# Copy and rename icons
if [[ -d "$FILES_DIR/usr/share/icons" ]]; then
    cp -a "$FILES_DIR/usr/share/icons/"* "$FILES_DIR/share/icons/" || true
    for size_dir in "$FILES_DIR"/share/icons/hicolor/*/apps; do
        for f in "$size_dir"/*; do
            [[ -f "$f" ]] && mv "$f" "$size_dir/${APP_ID}.png" 2>/dev/null || true
        done
    done
fi

# Write manifest (no complex commands needed now)
echo "==> Building Flatpak manifest"
cat > "$MANIFEST" <<EOF
{
  "id": "${APP_ID}",
  "runtime": "org.gnome.Platform",
  "runtime-version": "${RUNTIME_VER}",
  "sdk": "org.gnome.Sdk",
  "command": "/app${EXEC_PATH}",
  "finish-args": [
    "--share=ipc",
    "--socket=x11",
    "--socket=wayland",
    "--socket=pulseaudio",
    "--device=dri",
    "--filesystem=home"
  ],
  "modules": [
    {
      "name": "${EXEC_NAME}",
      "buildsystem": "simple",
      "build-commands": [
        "cp -a . /app"
      ],
      "sources": [
        {
          "type": "dir",
          "path": "files"
        }
      ]
    }
  ]
}
EOF

# Install runtime if missing
echo "==> Installing required Flatpak runtime (if missing)"
flatpak install --user --noninteractive flathub \
    "org.gnome.Platform//${RUNTIME_VER}" \
    "org.gnome.Sdk//${RUNTIME_VER}" 2>/dev/null || \
  flatpak install --noninteractive flathub \
    "org.gnome.Platform//${RUNTIME_VER}" \
    "org.gnome.Sdk//${RUNTIME_VER}" || true

OUTPUT_FLATPAK="${APP_ID}_${VERSION}_amd64.flatpak"

echo "==> Building Flatpak with flatpak-builder"
flatpak-builder --force-clean --user \
    --state-dir="$WORKDIR/.flatpak-builder" \
    --install-deps-from=flathub \
    --repo="$WORKDIR/repo" \
    "$BUILD_DIR" \
    "$MANIFEST"

echo "==> Exporting to single-file .flatpak bundle"
flatpak build-bundle "$WORKDIR/repo" "$OUTPUT_FLATPAK" "$APP_ID"

echo ""
echo "Done! Created: $OUTPUT_FLATPAK"
echo ""
echo "Install with:"
echo "  flatpak install --user $OUTPUT_FLATPAK"
echo "Run with:"
echo "  flatpak run $APP_ID"
