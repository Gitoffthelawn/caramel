#!/bin/bash
set -e

# This script updates the Xcode project with custom icons
# It should be run after safari-web-extension-converter has generated the project

# Arguments:
#   $1 = path to the generated Safari Xcode project (default: SafariExtProject/Caramel)
#   $2 = path to the folder containing your generated icons (default: safari-icons)
PROJECT_DIR=${1:-"SafariExtProject/Caramel"}
ICONS_DIR=${2:-"safari-icons"}

echo "Updating Safari app icons in $PROJECT_DIR using icons from $ICONS_DIR"

# Ensure icons directory exists
if [ ! -d "$ICONS_DIR" ]; then
  echo "Error: icons directory '$ICONS_DIR' not found"
  exit 1
fi

# Iterate over all .xcassets where AppIcon.appiconset resides
find "$PROJECT_DIR" -name "*.xcassets" -type d | while read -r assets_dir; do
  APPICONSET_DIR="$assets_dir/AppIcon.appiconset"
  if [ -d "$APPICONSET_DIR" ]; then
    echo "Found AppIcon set at $APPICONSET_DIR"

    CONTENTS_FILE="$APPICONSET_DIR/Contents.json"
    if [ ! -f "$CONTENTS_FILE" ]; then
      echo "Warning: Contents.json not found in $APPICONSET_DIR"
      continue
    fi

    # Loop through each image entry
    jq -c '.images[]' "$CONTENTS_FILE" | while read -r entry; do
      FILENAME=$(echo "$entry" | jq -r '.filename // empty')
      SIZE=$(echo "$entry" | jq -r '.size // empty')
      SCALE=$(echo "$entry" | jq -r '.scale // "1x"')
      if [ -z "$FILENAME" ] || [ -z "$SIZE" ]; then
        continue
      fi

      WIDTH=$(echo "$SIZE" | cut -d'x' -f1)
      MULT=${SCALE%x}
      ACTUAL=$(( WIDTH * MULT ))
      SOURCE="$ICONS_DIR/icon_${ACTUAL}x${ACTUAL}.png"

      if [ -f "$SOURCE" ]; then
        echo "Replacing $FILENAME with icon ${ACTUAL}x${ACTUAL}"
        cp "$SOURCE" "$APPICONSET_DIR/$FILENAME"
      else
        # find nearest larger icon
        find "$ICONS_DIR" -name 'icon_*x*.png' | sort -V | while read -r alt; do
          ALT_SIZE=$(basename "$alt" | sed -E 's/icon_([0-9]+)x.*/\1/')
          if [ "$ALT_SIZE" -ge "$ACTUAL" ]; then
            echo "Resizing $alt to ${ACTUAL}x${ACTUAL} for $FILENAME"
            convert "$alt" -resize "${ACTUAL}x${ACTUAL}" "$APPICONSET_DIR/$FILENAME"
            break
          fi
        done
      fi
    done
  fi
 done

echo "Safari app icons updated successfully"
