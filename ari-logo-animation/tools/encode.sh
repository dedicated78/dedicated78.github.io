#!/usr/bin/env bash
# Encode rendered frames into the delivery files.
#   build/frames_main/f####.png   (opaque render)
#   build/frames_alpha/f####.png  (RGBA render, optional)
#   build/audio/sfx.wav           (tools/make_sfx.py)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=output
mkdir -p "$OUT"
NAME=ari-logo-animation
V709=(-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv)

# 1) silent master: H.264 High, 1920x1080, 30 fps, BT.709
ffmpeg -y -loglevel error -framerate 30 -i build/frames_main/f%04d.png \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 15 -profile:v high -tune film "${V709[@]}" \
  -movflags +faststart "$OUT/${NAME}_1080p_silent.mp4"

# 2) same picture + directional motion SFX (AAC 48 kHz stereo)
ffmpeg -y -loglevel error -i "$OUT/${NAME}_1080p_silent.mp4" -i build/audio/sfx.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -t 9.0 \
  -movflags +faststart "$OUT/${NAME}_1080p_sfx.mp4"

# 3) final frame stills
cp "build/frames_main/f0270.png" "$OUT/ari-logo-final-frame.png"

if [ -d build/frames_alpha ] && [ -f build/frames_alpha/f0270.png ]; then
  # 4) transparent versions: VP9 WebM with alpha + ProRes 4444
  ffmpeg -y -loglevel error -framerate 30 -i build/frames_alpha/f%04d.png \
    -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 20 -row-mt 1 -auto-alt-ref 0 \
    "$OUT/${NAME}_1080p_alpha.webm"
  ffmpeg -y -loglevel error -framerate 30 -i build/frames_alpha/f%04d.png \
    -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -vendor apl0 -qscale:v 11 \
    "$OUT/${NAME}_1080p_alpha_prores4444.mov"
  cp "build/frames_alpha/f0270.png" "$OUT/ari-logo-final-frame-transparent.png"
fi

# 5) one-frame-per-second overview sheet for review
python3 tools/contact.py "$OUT/frames-overview.jpg" build/frames_main 1 31 61 91 121 166 178 211 270
ls -la "$OUT"
