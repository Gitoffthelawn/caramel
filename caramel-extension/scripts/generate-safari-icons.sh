#!/bin/bash
set -e

# This script generates properly formatted icons for Safari from a single source icon
# It requires ImageMagick to be installed (brew install imagemagick)

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it with 'brew install imagemagick'"
    exit 1
fi

# Source icon path (should be at least 1024x1024)
# When running in GitHub Actions, working-directory is 'caramel-extension', so icons/original.png resolves correctly
SOURCE_ICON=${1:-"icons/original.png"}

# Output directory relative to working dir (caramel-extension)
OUTPUT_DIR="safari-icons"
mkdir -p "$OUTPUT_DIR"

# Sizes required for Apple App Store icons
ICON_SIZES=(16 20 29 32 40 58 60 64 76 80 87 120 128 152 167 180 256 512 1024)

echo "Generating Safari icons from $SOURCE_ICON"

for size in "${ICON_SIZES[@]}"; do
  echo "Creating ${size}x${size} icon..."

  # calculate padding = 8% of size
  pad=$(printf "%.0f" "$(echo "$size * 0.08" | bc)")
  inner=$(( size - 2*pad ))

  # set corner radius: iOS uses ~23%, macOS uses ~20%
  if (( size >= 256 )); then
    radius=$(echo "$size * 0.20" | bc)
  else
    radius=$(echo "$size * 0.23" | bc)
  fi

  # Resize down for padding, re-center on full canvas, then round corners, then flatten onto white
  convert "$SOURCE_ICON" \
    -resize ${inner}x${inner} \
    -background none -gravity center \
    -extent ${size}x${size} \
    \( +clone -alpha extract \
       -draw "roundrectangle 0,0,${size},${size},${radius},${radius}" \
       -alpha on \
    \) -compose CopyOpacity -composite \
    -background white -flatten \
    "$OUTPUT_DIR/icon_${size}x${size}.png"
done

# Debug: list generated files
echo "Generated icons:" && ls -lh "$OUTPUT_DIR"

echo "Safari icons generated in $OUTPUT_DIR"
