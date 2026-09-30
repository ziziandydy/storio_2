#!/usr/bin/env bash
# Blend sub-frames into 30fps with a 180-degree shutter (motion blur), mux audio,
# encode to Instagram Story spec (1080x1920, H.264 High, AAC, BT.709).
#   tools/encode.sh [SUB] [NAME] [AUDIO]
#   NAME defaults to v1 (frames in out/v1/frames); AUDIO defaults to audio/soundtrack.wav
set -euo pipefail
cd "$(dirname "$0")/.."
SUB=${1:-4}
NAME=${2:-v1}
AUDIO=${3:-audio/soundtrack.wav}
RATE=$((30 * SUB))
MIX=$((SUB / 2))
WEIGHTS=$(printf '1 %.0s' $(seq 1 "$MIX"))
OUT="out/storio-${NAME}.mp4"
[ "$NAME" = "v1" ] && OUT="out/storio-ig-story-15s.mp4"
ffmpeg -y -hide_banner -loglevel error \
  -framerate "$RATE" -i "out/${NAME}/frames/%05d.jpg" \
  -i "$AUDIO" \
  -filter_complex "[0:v]tmix=frames=${MIX}:weights='${WEIGHTS% }',fps=30,scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -r 30 -g 30 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 44100 \
  -movflags +faststart -t 15 \
  "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of compact "$OUT"
