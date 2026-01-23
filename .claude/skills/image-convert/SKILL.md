---
name: image-convert
description: Automatically convert Apple HEIC/HEIF images (and other formats) to readable formats like JPG when user provides image paths
allowed-tools: Bash, Read
---

# Image Format Converter Skill

Automatically converts images from formats Claude Code cannot natively read (like Apple's HEIC/HEIF) into standard formats (JPG/PNG) for immediate display.

## When to Use This Skill

This skill activates when:
- User provides a path to a `.heic` or `.heif` file
- User asks to view/read/display an image that's in an unsupported format
- User mentions iPhone/iOS photos or screenshots
- You attempt to read a file and discover it's a HEIC/HEIF format

**Important**: Run this skill BEFORE attempting to read the image with the Read tool.

## How It Works

1. **Detect image format** from file extension or file type
2. **Choose conversion tool** (prefer ImageMagick, fallback to heif-convert or ffmpeg)
3. **Convert to JPG** in `/tmp` with descriptive name
4. **Return converted path** for immediate reading
5. **Optionally clean up** old temp files (keep recent conversions cached)

## Supported Input Formats

| Format | Extension | Source | Status |
|--------|-----------|--------|--------|
| HEIC/HEIF | `.heic`, `.heif` | Apple Photos (iPhone/iPad) | ✅ Primary use case |
| RAW formats | `.cr2`, `.nef`, `.arw`, etc. | DSLR cameras | ✅ Supported |
| WEBP | `.webp` | Web images | ✅ Already readable, but can convert |
| TIFF | `.tiff`, `.tif` | Scans/professional | ✅ Supported |
| Any other | Various | Various sources | ✅ Try conversion |

## Supported Output Formats

- **JPG/JPEG** (default) - Best for photos, widely compatible
- **PNG** - Best for screenshots with text, lossless
- **WEBP** - Modern format, good compression (if user requests)

## Installation Check

The skill checks for conversion tools in this order:

### 1. ImageMagick (Recommended)
```bash
if ! command -v convert &> /dev/null; then
    echo "Installing ImageMagick..."
    sudo apt install imagemagick -y
fi
```

### 2. HEIF Tools (Specialized)
```bash
if ! command -v heif-convert &> /dev/null; then
    echo "Installing HEIF conversion tools..."
    sudo apt install libheif-examples -y
fi
```

### 3. FFmpeg (Fallback)
```bash
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing ffmpeg..."
    sudo apt install ffmpeg -y
fi
```

## Conversion Strategy

### Priority Order
1. **ImageMagick `convert`** - Fast, reliable, handles all formats
2. **`heif-convert`** - Specialized for HEIC/HEIF, excellent quality
3. **`ffmpeg`** - Fallback, works but slower for still images

### Single File Conversion

```bash
#!/bin/bash
INPUT="$1"
OUTPUT_DIR="/tmp"
BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')
OUTPUT="$OUTPUT_DIR/${BASENAME}.jpg"

# Method 1: ImageMagick (preferred)
if command -v convert &> /dev/null; then
    convert "$INPUT" -quality 95 "$OUTPUT"
    echo "Converted using ImageMagick: $OUTPUT"
    exit 0
fi

# Method 2: heif-convert (for HEIC/HEIF)
if command -v heif-convert &> /dev/null && [[ "$INPUT" =~ \.(heic|heif)$ ]]; then
    heif-convert -q 95 "$INPUT" "$OUTPUT"
    echo "Converted using heif-convert: $OUTPUT"
    exit 0
fi

# Method 3: ffmpeg (fallback)
if command -v ffmpeg &> /dev/null; then
    ffmpeg -i "$INPUT" -q:v 2 "$OUTPUT" -y 2>&1 | tail -2
    echo "Converted using ffmpeg: $OUTPUT"
    exit 0
fi

echo "Error: No conversion tool available"
exit 1
```

### Batch Conversion

```bash
#!/bin/bash
# Convert all HEIC files in a directory
for file in "$1"/*.heic "$1"/*.HEIC; do
    [[ -e "$file" ]] || continue
    basename=$(basename "$file" | sed 's/\.[^.]*$//')
    convert "$file" -quality 95 "/tmp/${basename}.jpg"
    echo "✓ $file → /tmp/${basename}.jpg"
done
```

## Video Files (Extract Frame)

For `.mov` or `.mp4` files (like iPhone screen recordings):

```bash
# Extract first frame
ffmpeg -i "$INPUT" -frames:v 1 -q:v 2 "/tmp/${BASENAME}_frame.jpg" -y

# Extract frame at specific time (e.g., 1.5 seconds)
ffmpeg -ss 1.5 -i "$INPUT" -frames:v 1 -q:v 2 "/tmp/${BASENAME}_frame.jpg" -y

# Extract middle frame
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT")
MIDPOINT=$(echo "$DURATION / 2" | bc -l)
ffmpeg -ss "$MIDPOINT" -i "$INPUT" -frames:v 1 -q:v 2 "/tmp/${BASENAME}_frame_mid.jpg" -y
```

## Workflow Examples

### Example 1: User Provides HEIC Path

**User**: "Can you look at /home/user/Photos/IMG_2014.heic?"

**Skill Actions**:
1. Detect `.heic` extension
2. Run conversion: `convert /home/user/Photos/IMG_2014.heic -quality 95 /tmp/IMG_2014.jpg`
3. Respond to user: "Converting HEIC to JPG..."
4. Use Read tool on `/tmp/IMG_2014.jpg`
5. Display image to user

### Example 2: User Provides Directory with Multiple Files

**User**: "Show me the images in /home/user/Downloads/Photos/"

**Skill Actions**:
1. List directory contents
2. Detect multiple `.heic` files
3. Ask user: "Found 3 HEIC files. Convert all? (y/n)"
4. Batch convert if confirmed
5. Display converted images

### Example 3: Video File

**User**: "Can you view /home/user/Downloads/screen_recording.mov?"

**Skill Actions**:
1. Detect `.mov` video format
2. Extract representative frame (first or middle)
3. Convert frame to JPG
4. Display extracted frame
5. Optionally offer to extract different frames if needed

## Cache Management

Keep converted images cached in `/tmp` to avoid re-converting:

```bash
# Check if already converted (less than 1 hour old)
OUTPUT="/tmp/${BASENAME}.jpg"
if [[ -f "$OUTPUT" ]] && [[ $(find "$OUTPUT" -mmin -60) ]]; then
    echo "Using cached conversion: $OUTPUT"
    exit 0
fi

# Otherwise, convert fresh
convert "$INPUT" -quality 95 "$OUTPUT"
```

Clean up old conversions periodically:
```bash
# Remove conversions older than 24 hours
find /tmp -name "*.jpg" -mtime +1 -delete
```

## Error Handling

### Common Issues

**1. Permission Denied**
```
Error: convert: unable to open image '/path/to/image.heic': Permission denied
```
**Solution**: Check file permissions, ensure readable

**2. Corrupted HEIC File**
```
Error: heif-convert: could not read HEIF file
```
**Solution**: Try ffmpeg as fallback, or inform user file is corrupted

**3. Out of Space in /tmp**
```
Error: No space left on device
```
**Solution**: Clean up `/tmp`, use different output directory

**4. No Conversion Tool Available**
```
Error: No conversion tool available
```
**Solution**: Install ImageMagick or libheif-examples

### Quality Settings

- **JPG quality**: Use `-quality 95` for ImageMagick (good balance)
- **PNG**: Use `-quality 95` or lossless if needed
- **FFmpeg**: Use `-q:v 2` (lower is better, 2-5 range)

## Integration with Read Tool

After conversion, immediately read and display:

```bash
# Convert
CONVERTED="/tmp/IMG_2014.jpg"
convert "/path/to/IMG_2014.heic" -quality 95 "$CONVERTED"

# Immediately read with Read tool
Read(file_path="$CONVERTED")
```

## Best Practices

1. **Always check file existence** before conversion
2. **Use descriptive temp filenames** (include original basename)
3. **Cache conversions** to avoid redundant work
4. **Clean up old temp files** periodically
5. **Handle video files** by extracting frames, not full conversion
6. **Preserve original files** - never overwrite source
7. **Use high quality settings** (95 for JPG) - disk space is cheap
8. **Provide user feedback** - "Converting HEIC to JPG..."
9. **Handle batch operations efficiently** - ask before converting many files
10. **Fall back gracefully** - try multiple tools if one fails

## Complete Workflow Script

```bash
#!/bin/bash
# image-convert.sh - Complete image conversion workflow

set -e

INPUT="$1"
OUTPUT_FORMAT="${2:-jpg}"  # Default to JPG
QUALITY="${3:-95}"

# Validate input
if [[ ! -f "$INPUT" ]]; then
    echo "Error: File not found: $INPUT"
    exit 1
fi

# Determine output path
BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')
OUTPUT="/tmp/${BASENAME}.${OUTPUT_FORMAT}"

# Check cache (< 1 hour old)
if [[ -f "$OUTPUT" ]] && [[ $(find "$OUTPUT" -mmin -60 2>/dev/null) ]]; then
    echo "Using cached: $OUTPUT"
    echo "$OUTPUT"
    exit 0
fi

# Detect if video file
if [[ "$INPUT" =~ \.(mov|mp4|m4v|avi)$ ]]; then
    echo "Video detected, extracting frame..."
    ffmpeg -i "$INPUT" -frames:v 1 -q:v 2 "$OUTPUT" -y 2>&1 | tail -2
    echo "Frame extracted: $OUTPUT"
    echo "$OUTPUT"
    exit 0
fi

# Try conversion tools in order
if command -v convert &> /dev/null; then
    echo "Converting with ImageMagick..."
    convert "$INPUT" -quality "$QUALITY" "$OUTPUT"
    echo "Converted: $OUTPUT"
    echo "$OUTPUT"
    exit 0
elif command -v heif-convert &> /dev/null && [[ "$INPUT" =~ \.(heic|heif)$ ]]; then
    echo "Converting with heif-convert..."
    heif-convert -q "$QUALITY" "$INPUT" "$OUTPUT"
    echo "Converted: $OUTPUT"
    echo "$OUTPUT"
    exit 0
elif command -v ffmpeg &> /dev/null; then
    echo "Converting with ffmpeg (fallback)..."
    ffmpeg -i "$INPUT" -q:v 2 "$OUTPUT" -y 2>&1 | tail -2
    echo "Converted: $OUTPUT"
    echo "$OUTPUT"
    exit 0
else
    echo "Error: No conversion tool available"
    echo "Install: sudo apt install imagemagick"
    exit 1
fi
```

## Usage in Conversation

**Pattern 1: Direct path**
```
User: "Look at /home/user/IMG_2014.heic"
Assistant: [Runs image-convert skill]
          "Converting HEIC to JPG..."
          [Reads /tmp/IMG_2014.jpg]
          [Displays image]
```

**Pattern 2: Discovery**
```
User: "What's in my Downloads folder?"
Assistant: [Lists files, finds IMG_2014.heic]
          "Found an iPhone photo (HEIC format). Let me convert it..."
          [Runs image-convert skill]
          [Displays converted image]
```

**Pattern 3: Batch**
```
User: "Convert all my iPhone photos in ~/Photos"
Assistant: [Finds 15 HEIC files]
          "Found 15 HEIC files. Converting all to JPG..."
          [Runs batch conversion]
          "✓ Converted 15 images to /tmp/"
          "Would you like me to display them?"
```

## Notes

- **Storage**: Converted files in `/tmp` are automatically cleaned by system (usually on reboot)
- **Speed**: ImageMagick is fastest; ffmpeg works but slower for still images
- **Quality**: JPG at 95% quality is visually lossless for most uses
- **Privacy**: Original files are never modified; conversions are temporary
- **Cleanup**: Consider implementing periodic cleanup of `/tmp/*.jpg` older than 24h
