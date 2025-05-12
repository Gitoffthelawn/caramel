#!/bin/bash
set -e

# This script tests the icon generation process locally

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it with 'brew install imagemagick'"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it with 'brew install jq'"
    exit 1
fi

# Determine script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source icon path
SOURCE_ICON="${1:-"$PROJECT_ROOT/icons/original.png"}"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "Error: Source icon not found at $SOURCE_ICON"
    exit 1
fi

echo "Testing Safari icon generation with source icon: $SOURCE_ICON"

# Generate Safari icons
echo "Generating Safari icons..."
"$SCRIPT_DIR/generate-safari-icons.sh" "$SOURCE_ICON"

# Show generated icons
echo "Generated icons:"
find "$PROJECT_ROOT/safari-icons" -type f -name "*.png" | sort

echo ""
echo "Icon generation test completed successfully!"
echo ""
echo "To test with a real Safari Web Extension project:"
echo "1. Convert your extension with: xcrun safari-web-extension-converter /path/to/extension"
echo "2. Update the icons with: $SCRIPT_DIR/update-safari-icons.sh /path/to/project"
echo ""
echo "The icons will be properly formatted without white padding." 