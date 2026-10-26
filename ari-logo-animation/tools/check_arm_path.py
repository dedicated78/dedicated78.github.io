"""Arm-path QA in the 2D rig: per frame, how many arm/hand pixels cover the
face (outside the brim contact), and whether any joint jumps between frames.
usage: python3 tools/check_arm_path.py [t0 t1]"""
import json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import rig

ROOT = rig.ROOT
arm = json.load(open(os.path.join(ROOT, "build/arm.json")))
S = 2
crop = (300, 90, 1140, 830)
def sprite_mask(name, t):
    im = Image.open(os.path.join(ROOT, f"build/layers/{name}.png")).getchannel("A")
    org = np.array(arm["bbox"][name][:2], float) if name in arm["bbox"] else np.zeros(2)
    ang, piv, off, sx = rig.pose(t)[name]
    r = math.radians(-ang); c, s = math.cos(r), math.sin(r)
    A = np.diag([1 / sx, 1.0]) @ np.array([[c, -s], [s, c]])
    b = piv - A @ (piv + off)
    x0, y0 = crop[:2]
    A2 = A; b2 = S * (A @ np.array([x0, y0]) + b - org)
    A2 = S * A / S
    co = (A2[0, 0], A2[0, 1], b2[0], A2[1, 0], A2[1, 1], b2[1])
    w, h = (crop[2] - crop[0]) * S, (crop[3] - crop[1]) * S
    return np.array(im.transform((w, h), Image.AFFINE, co, resample=Image.BILINEAR)) > 128

face_rest = None
t0, t1 = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (4.8, 7.3)
worst = (0, None)
prev = None
for k in range(int(round((t1 - t0) * 30)) + 1):
    t = t0 + k / 30
    head = sprite_mask("head", t)
    armpx = np.zeros_like(head)
    for n in ("hand", "fingers", "thumb", "forearm"):
        armpx |= sprite_mask(n, t)
    torso = sprite_mask("torso", t) | sprite_mask("uparm", t)
    cover = head & armpx & ~torso
    n = int(cover.sum())
    grip = rig.T_CONTACT - 0.05 <= t <= rig.T_OPEN1 + 0.05
    if not grip and n > worst[0]:
        worst = (n, round(t, 3))
    up, ext, fo, hand, curl, th, sf = rig.arm_pose(t)
    cur = np.array([up, ext * 40, fo, hand])
    jump = float(np.abs(cur - prev).max()) if prev is not None else 0.0
    prev = cur
    print(f"t={t:.3f} face-cover {n:6d}{' (grip)' if grip else ''}  max joint step {jump:5.2f} deg")
print("WORST face cover outside the grip:", worst)
