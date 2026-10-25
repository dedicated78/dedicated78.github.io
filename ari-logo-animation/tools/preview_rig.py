"""2D composite of the worker rig at given times (fast iteration on the
performance without Blender). usage: preview_rig.py out.png t1 t2 ..."""
import json, os, sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import rig

ROOT = rig.ROOT
S = 2
arm = json.load(open(os.path.join(ROOT, "build/arm.json")))
ORDER = ["head", "hat", "upskin", "forearm", "hand", "torso", "uparm"]
layers = {}
for n in ORDER:
    im = Image.open(os.path.join(ROOT, f"build/layers/{n}.png")).convert("RGBA")
    org = np.array(arm["bbox"][n][:2], float) if n in arm["bbox"] else np.zeros(2)
    layers[n] = (im, org)

def compose(t, crop=(380, 90, 1140, 830)):
    x0, y0, x1, y1 = crop
    out = Image.new("RGBA", ((x1 - x0) * S, (y1 - y0) * S), (224, 224, 224, 255))
    tf = rig.pose(t)
    for n in ORDER:
        im, org = layers[n]
        ang, piv, off = tf[n]
        # output px (u,v) -> logo q = (u/S + x0, v/S + y0); source logo p = R^-1 (q - piv - off) + piv
        r = math.radians(-ang); c, s = math.cos(r), math.sin(r)
        # p = A q + b
        A = np.array([[c, -s], [s, c]])
        b = piv - A @ (piv + off)
        # layer px L = S (p - org) = S A q + S (b - org); q = M u + n
        M = np.eye(2) / S; nvec = np.array([x0, y0], float)
        A2 = S * A @ M; b2 = S * (A @ nvec + b - org)
        coeffs = (A2[0, 0], A2[0, 1], b2[0], A2[1, 0], A2[1, 1], b2[1])
        warped = im.transform(out.size, Image.AFFINE, coeffs, resample=Image.BICUBIC)
        out.alpha_composite(warped)
    return out

if __name__ == "__main__":
    ims = [compose(float(t)) for t in sys.argv[2:]]
    w, h = ims[0].size
    sheet = Image.new("RGBA", (w * len(ims), h))
    for i, im in enumerate(ims): sheet.paste(im, (i * w, 0))
    sheet.convert("RGB").resize((w * len(ims) // 2, h // 2), Image.LANCZOS).save(sys.argv[1])
