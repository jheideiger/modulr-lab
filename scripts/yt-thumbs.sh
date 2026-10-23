#!/bin/zsh
# Miniatures YouTube servies par le site : images/yt/<id>-480 et -960, en WebP et en AVIF.
# Usage : scripts/yt-thumbs.sh <id> [<id>…]      (cwebp et ffmpeg avec libsvtav1 : brew install webp ffmpeg)
set -e
cd "$(dirname "$0")/.."
mkdir -p images/yt
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for id in "$@"; do
  curl -sfo "$tmp/$id.jpg" "https://i.ytimg.com/vi/$id/maxresdefault.jpg" || { echo "$id : pas de miniature 1280 × 720 (vidéo privée ou en traitement ?)"; continue; }
  for w in 480 960; do
    h=$((w * 9 / 16))
    cwebp -quiet -q 74 -m 6 -sharp_yuv -resize $w $h "$tmp/$id.jpg" -o "images/yt/$id-$w.webp"
    ffmpeg -nostdin -loglevel error -y -i "$tmp/$id.jpg" \
      -vf "scale=${w}:${h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p" \
      -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv \
      -c:v libsvtav1 -crf 36 -preset 4 -frames:v 1 -f avif "images/yt/$id-$w.avif" 2>/dev/null
  done
  echo "$id : $(ls images/yt/$id-* | wc -l | tr -d ' ') fichiers"
done
