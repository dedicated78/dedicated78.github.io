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
# back -> front (same depth order as the Blender scene)
ORDER = ["head", "hat", "upskin", "forearm", "thumb", "fingers", "hand", "torso", "uparm"]
layers = {}
for n in ORDER:
    im = Image.open(os.path.join(ROOT, f"build/layers/{n}.png")).convert("RGBA")
    org = np.array(arm["bbox"][n][:2], float) if n in arm["bbox"] else np.zeros(2)
    layers[n] = (im, org)


def compose(t, crop=(380, 90, 1140, 830)):
    x0, y0, x1, y1 = crop
    out = Image.new("RGBA", ((x1 - x0) * S, (y1 - y0) * S), (224, 224, 224, 255))
    tf = rig.pose(t); fd = rig.fades(t)
    for n in ORDER:
        im, org = layers[n]
        ang, piv, off, sx = tf[n]
        if fd.get(n, 1.0) <= 0:
            continue
        # forward: q = R(ang) S (p - piv) + piv + off  ->  p = S^-1 R^-1 (q - piv - off) + piv
        r = math.radians(-ang); c, s = math.cos(r), math.sin(r)
        A = np.diag([1 / sx, 1.0]) @ np.array([[c, -s], [s, c]])
        b = piv - A @ (piv + off)
        M = np.eye(2) / S; nvec = np.array([x0, y0], float)
        A2 = S * A @ M; b2 = S * (A @ nvec + b - org)
        coeffs = (A2[0, 0], A2[0, 1], b2[0], A2[1, 0], A2[1, 1], b2[1])
        warped = im.transform(out.size, Image.AFFINE, coeffs, resample=Image.BICUBIC)
        if fd.get(n, 1.0) < 1:
            a = np.array(warped); a[..., 3] = (a[..., 3] * fd[n]).astype(np.uint8)
            warped = Image.fromarray(a)
        out.alpha_composite(warped)
    return out


if __name__ == "__main__":
    crop = (380, 90, 1140, 830)
    if os.environ.get("CROP"):
        crop = tuple(int(v) for v in os.environ["CROP"].split(","))
    ims = [compose(float(t), crop) for t in sys.argv[2:]]
    w, h = ims[0].size
    sheet = Image.new("RGBA", (w * len(ims), h))
    for i, im in enumerate(ims): sheet.paste(im, (i * w, 0))
    sheet.convert("RGB").resize((w * len(ims) // 2, h // 2), Image.LANCZOS).save(sys.argv[1])
