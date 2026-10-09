#!/usr/bin/env bash
# Fallback export for constrained machines: renders the film in short chunks to a JPEG
# sequence (fresh browser per chunk), then encodes once with ffmpeg and muxes the mixed
# audio. Output matches `npm run render`: H.264 yuv420p, 1080x1920, 30 fps, AAC, 40.000 s.
#
#   bash scripts/render-chunked.sh [extra remotion flags, e.g. --browser-executable=...]
set -euo pipefail
cd "$(dirname "$0")/.."

FRAMES=1200
CHUNK=300
SEQ=out/frames
rm -rf "$SEQ" && mkdir -p "$SEQ"
node scripts/generate-audio.mjs

for ((start = 0; start < FRAMES; start += CHUNK)); do
  end=$((start + CHUNK - 1))
  if ((end >= FRAMES)); then end=$((FRAMES - 1)); fi
  echo "Rendering frames $start-$end"
  npx remotion render src/index.ts GrowwithMHIntro "$SEQ" --sequence --image-format=jpeg \
    --jpeg-quality=95 --frames="$start-$end" --concurrency=4 "$@" > "out/chunk-$start.log" 2>&1 \
    || { tail -20 "out/chunk-$start.log"; exit 1; }
done

# Remotion pads names per chunk (element-000 vs element-0900); normalise to 4 digits.
for f in "$SEQ"/element-*.jpeg; do
  n=${f##*/element-}; n=${n%.jpeg}
  mv "$f" "$SEQ/frame-$(printf %04d $((10#$n))).jpeg"
done
test "$(ls "$SEQ" | wc -l)" -eq "$FRAMES"

ffmpeg -v error -y -framerate 30 -start_number 0 -i "$SEQ/frame-%04d.jpeg" \
  -i public/audio/music.wav -i public/audio/sfx.wav \
  -filter_complex "[1:a][2:a]amix=inputs=2:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high \
  -movflags +faststart -c:a aac -b:a 192k -ar 48000 -t 40 out/growwithmh-intro.mp4
echo "Wrote out/growwithmh-intro.mp4"
