#!/usr/bin/env bash
cd "$(dirname "$0")/.."
python3 blender/build_scene.py --render build/frames_main --samples 12 > build/render_main.log 2>&1
python3 blender/build_scene.py --render build/frames_alpha --samples 8 --alpha --save "" > build/render_alpha.log 2>&1
