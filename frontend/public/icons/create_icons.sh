#!/bin/bash
# 簡易的なPWAアイコンを作成（ImageMagickまたはconvertコマンドが必要）

# 192x192のアイコンを作成
convert -size 192x192 xc:transparent \
  -fill "#0d6efd" -draw "circle 96,96 96,20" \
  -fill white -pointsize 120 -gravity center -annotate +0+0 "K" \
  icon-192x192.png 2>/dev/null

# 512x512のアイコンを作成
convert -size 512x512 xc:transparent \
  -fill "#0d6efd" -draw "circle 256,256 256,50" \
  -fill white -pointsize 320 -gravity center -annotate +0+0 "K" \
  icon-512x512.png 2>/dev/null

echo "Icons created (if ImageMagick is available)"
