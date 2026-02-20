#!/bin/bash
# Build script for SSS Chrome Extension
# Creates a signed CRX file for distribution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$SCRIPT_DIR/extension-key.pem"
OUTPUT_DIR="$SCRIPT_DIR/dist"
BACKEND_EXTENSIONS_DIR="$SCRIPT_DIR/../sss-backend/extensions"
PACK_DIR="$OUTPUT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  SSS Extension Build Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Get version from manifest
VERSION=$(grep '"version"' "$SCRIPT_DIR/manifest.json" | sed 's/.*: "\(.*\)".*/\1/')
echo -e "Building version: ${GREEN}$VERSION${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if Chrome/Chromium is available
CHROME_BIN=""
if command -v google-chrome &> /dev/null; then
    CHROME_BIN="google-chrome"
elif command -v chromium &> /dev/null; then
    CHROME_BIN="chromium"
elif command -v chromium-browser &> /dev/null; then
    CHROME_BIN="chromium-browser"
else
    echo -e "${YELLOW}Chrome/Chromium not found in PATH${NC}"
    echo "Please install Chrome or set CHROME_BIN environment variable"
    exit 1
fi

echo "Using: $CHROME_BIN"

echo -e "${CYAN}Running Vite build...${NC}"
( cd "$SCRIPT_DIR" && npm run build )

# Build CRX
if [ -f "$KEY_FILE" ]; then

    echo "Using existing key: $KEY_FILE"
    $CHROME_BIN --pack-extension="$PACK_DIR" --pack-extension-key="$KEY_FILE" 2>/dev/null || true
else
    echo -e "${YELLOW}No key found, generating new one...${NC}"
    $CHROME_BIN --pack-extension="$PACK_DIR" 2>/dev/null || true

    # Move generated key
    if [ -f "$SCRIPT_DIR.pem" ]; then
        mv "$SCRIPT_DIR.pem" "$KEY_FILE"
        echo -e "${GREEN}Key saved to: $KEY_FILE${NC}"
        echo -e "${YELLOW}IMPORTANT: Keep this file safe! You need it for future updates.${NC}"
    fi
fi

# Move CRX to output directory
if [ -f "$PACK_DIR.crx" ]; then
    mv "$PACK_DIR.crx" "$OUTPUT_DIR/sss-extension-v$VERSION.crx"
    cp "$OUTPUT_DIR/sss-extension-v$VERSION.crx" "$OUTPUT_DIR/sss-extension.crx"
    echo -e "${GREEN}CRX created: $OUTPUT_DIR/sss-extension-v$VERSION.crx${NC}"

    # Copy to backend if exists
    if [ -d "$BACKEND_EXTENSIONS_DIR" ]; then
        cp "$OUTPUT_DIR/sss-extension.crx" "$BACKEND_EXTENSIONS_DIR/sss-extension.crx"
        cp "$OUTPUT_DIR/sss-extension-v$VERSION.crx" "$BACKEND_EXTENSIONS_DIR/sss-extension-$VERSION.crx"
        echo -e "${GREEN}Copied to backend: $BACKEND_EXTENSIONS_DIR/sss-extension.crx${NC}"
        echo -e "${GREEN}Copied to backend: $BACKEND_EXTENSIONS_DIR/sss-extension-$VERSION.crx${NC}"
    fi
else
    echo "Error: CRX file not created"
    exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Build Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Output files:"
echo "  - $OUTPUT_DIR/sss-extension-v$VERSION.crx"
echo "  - $OUTPUT_DIR/sss-extension.crx (latest)"
echo ""
echo "Extension version: $VERSION"

