"""Rasterize build/letters.json over the original logo for a fidelity check."""
import json, sys, numpy as np
from PIL import Image, ImageDraw
d = json.load(open("build/letters.json"))
S = 2
base = Image.open("assets/source/ari-logo-original.png").convert("RGB").resize((1536 * S, 1536 * S))
ov = Image.new("L", base.size, 0)
def bez(p0, p1, p2, p3, n=16):
    t = np.linspace(0, 1, n)[:, None]
    return ((1-t)**3*p0 + 3*(1-t)**2*t*p1 + 3*(1-t)*t**2*p2 + t**3*p3)
for name, contours in d.items():
    m = Image.new("L", base.size, 0); dr = ImageDraw.Draw(m)
    for c in contours:
        pts = []
        for s in c:
            P = [np.array(q) * S for q in s[1:]]
            pts += [tuple(p) for p in (bez(*P) if s[0] == "C" else np.array(P))]
        # even-odd via XOR
        t = Image.new("L", base.size, 0); ImageDraw.Draw(t).polygon(pts, fill=255)
        m = Image.fromarray(np.array(m) ^ np.array(t))
    ov = Image.fromarray(np.maximum(np.array(ov), np.array(m)))
a = np.array(base).astype(float); o = np.array(ov)[..., None] / 255.0
out = a * (1 - o * 0.6) + np.array([255, 0, 80]) * o * 0.6
Image.fromarray(out.astype(np.uint8)).save(sys.argv[1])
