#!/usr/bin/env bash
# Episode 01 export: audio prep -> chunked frame render (fresh browser per chunk, retries)
# -> one ffmpeg encode with the mixed, mastered audio.
# Output: out/growwithmh-ep01.mp4, H.264 High yuv420p 1080x1920 30 fps, AAC 48 kHz, 46.500 s.
#
#   bash scripts/render.sh [extra remotion flags, e.g. --browser-executable=/path/to/chrome]
#   RESUME=1 bash scripts/render.sh   # keep frames already rendered
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/prepare-audio.mjs
FRAMES=$(node -p "require('./src/cues.json').durationInFrames")
DURATION=$(node -p "require('./src/cues.json').duration.toFixed(3)")
CHUNK=150
SEQ=out/frames
mkdir -p "$SEQ"
[ "${RESUME:-0}" = 1 ] || rm -f "$SEQ"/*.jpeg

# Remotion pads names per chunk (element-000 vs element-0900); normalise to 4 digits.
normalise() {
  for f in "$SEQ"/element-*.jpeg; do
    [ -e "$f" ] || continue
    n=${f##*/element-}; n=${n%.jpeg}
    mv "$f" "$SEQ/frame-$(printf %04d $((10#$n))).jpeg"
  done
}

PROPS='{"voSrc":null,"musicSrc":null,"sfxSrc":null}'
for ((start = 0; start < FRAMES; start += CHUNK)); do
  end=$((start + CHUNK - 1))
  if ((end >= FRAMES)); then end=$((FRAMES - 1)); fi
  if [ -e "$SEQ/frame-$(printf %04d $end).jpeg" ] && [ -e "$SEQ/frame-$(printf %04d $start).jpeg" ]; then continue; fi
  # A long-running headless tab occasionally stalls; retry the chunk in a fresh browser.
  for attempt in 1 2 3; do
    echo "Rendering frames $start-$end (attempt $attempt)"
    if timeout 900 npx remotion render src/index.ts Episode01 "$SEQ" --sequence --image-format=jpeg \
      --jpeg-quality=95 --frames="$start-$end" --concurrency=4 --gl=angle --props="$PROPS" "$@" > "out/chunk-$start.log" 2>&1; then
      break
    fi
    tail -3 "out/chunk-$start.log"
    if ((attempt == 3)); then exit 1; fi
  done
  normalise
done
test "$(ls "$SEQ" | wc -l)" -eq "$FRAMES"

# Mix: music ducked by the VO (sidechain) and sat well under it; SFX slightly under the VO.
MIX="[1:a]asplit=2[vo][vokey];\
[2:a]volume=-5dB[mus];[mus][vokey]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350:makeup=1[musd];\
[3:a]volume=-1dB[sfx];\
[vo][musd][sfx]amix=inputs=3:normalize=0:duration=longest"
ffmpeg -v error -y -f lavfi -i "anullsrc=r=48000:cl=stereo" -i public/audio/vo.wav -i public/audio/music.wav -i public/audio/sfx.wav \
  -filter_complex "$MIX,aresample=48000[a]" -map "[a]" -t "$DURATION" -c:a pcm_f32le out/mix.wav

# Master: two-pass loudnorm to -14 LUFS, then a true-peak limiter with headroom for AAC.
read -r MI MTP MLRA MTH MOFF < <(ffmpeg -hide_banner -nostats -i out/mix.wav \
  -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 |
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s.slice(s.lastIndexOf("{")));console.log(j.input_i,j.input_tp,j.input_lra,j.input_thresh,j.target_offset)})')
ffmpeg -v error -y -i out/mix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$MOFF:linear=true,alimiter=limit=0.79:attack=1:release=60:level=false" \
  -ar 48000 -c:a pcm_s16le out/master.wav

ffmpeg -v error -y -framerate 30 -start_number 0 -i "$SEQ/frame-%04d.jpeg" -i out/master.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -r 30 \
  -movflags +faststart -c:a aac -b:a 192k -ar 48000 -t "$DURATION" out/growwithmh-ep01.mp4
echo "Wrote out/growwithmh-ep01.mp4"
