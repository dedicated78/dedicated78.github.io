"""Cut the original worker illustration into rig layers.

Layers (RGBA, 2x the source resolution, all sharing one canvas so a pixel
(u, v) of any layer maps to logo pixel (u/2, v/2)):
  torso   body, overalls, left sleeve (viewer right), collar
  head    face, hair, ear, neck; hair dome painted under the hat and a neck
          extension under the collar so the head can turn without gaps
  hat     hard hat
  uparm   character's right shoulder + sleeve (viewer left)

Outputs build/layers/<name>.png and build/rig.json (pivots in logo px).
"""
import json, os
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build/layers")
os.makedirs(OUT, exist_ok=True)
S = 2  # output scale

src = np.array(Image.open(os.path.join(ROOT, "assets/source/ari-logo-original.png")).convert("RGB")).astype(np.float32)
H, W, _ = src.shape
BG = np.array([224, 224, 224], np.float32)
yy, xx = np.mgrid[0:H, 0:W]

# ---------------------------------------------------------------- worker matte
letters_region = np.load(os.path.join(ROOT, "build/worker_region.npy"))
diff = np.abs(src - BG).max(2)
fg = (diff > 22) & (yy < 810) & (yy > 90) & (xx > 430) & (xx < 1130)
# remove the A apex / letter pixels that touch the worker
lum = src.mean(2)
x_cut = 572 + (yy - 682) * (59.0 / 138.0)
apex = (yy >= 681) & (xx <= x_cut)
fg &= ~apex
# remove the letter strokes (A apex, r) that touch the worker
dark = (lum < 120).astype(np.uint8)
_, dlab, _, _ = cv2.connectedComponentsWithStats(dark, 8)
big = dlab == dlab[900, 600]
letters = (big & ~letters_region) | (dlab == dlab[1000, 900])
fg &= ~cv2.dilate(letters.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
n, lab, st, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8), 8)
keep = np.zeros_like(fg)
for k in range(1, n):
    if st[k, 4] > 150:
        keep |= lab == k
# fill enclosed holes (e.g. JPEG specks)
inv = (~keep).astype(np.uint8)
m = np.zeros((H + 2, W + 2), np.uint8)
ff = inv.copy(); cv2.floodFill(ff, m, (5, 5), 0)
worker = keep | (ff > 0)

def below_curve(pts):
    """mask of pixels below a polyline given as [(x, y), ...] (screen y down)."""
    pts = np.array(pts, np.float32)
    ycurve = np.interp(xx, pts[:, 0], pts[:, 1])
    return yy > ycurve

def left_of_curve(pts):
    pts = np.array(pts, np.float32)
    xcurve = np.interp(yy, pts[:, 1], pts[:, 0])
    return xx < xcurve

HAT_CURVE = [(590, 238), (625, 247), (660, 253), (700, 253), (740, 244), (790, 241),
             (840, 251), (880, 262), (915, 270), (940, 272)]
NECK_CURVE = [(600, 402), (690, 400), (740, 404), (790, 392), (830, 373), (870, 352),
              (910, 336), (960, 320)]
ARM_CURVE = [(628, 405), (624, 418), (612, 470), (603, 515), (596, 560), (586, 610),
             (578, 660), (570, 720)]

hat_m = worker & ~below_curve(HAT_CURVE)
head_m = worker & below_curve(HAT_CURVE) & ~below_curve(NECK_CURVE)
# sleeve only: the black shoulder above the seam stays on the torso
SLEEVE_SEAM = [(440, 560), (486, 545), (540, 524), (600, 500), (640, 484)]
arm_m = worker & below_curve(SLEEVE_SEAM) & left_of_curve(ARM_CURVE)
torso_m = worker & ~hat_m & ~head_m & ~arm_m

# ------------------------------------------------------------- colour cleanup
PAL = np.array([[27, 22, 17], [243, 182, 27], [251, 251, 252]], np.float32)
def clean(img):
    """Snap near-palette pixels to the palette to remove compression noise."""
    d = np.linalg.norm(img[..., None, :] - PAL[None, None], axis=-1)
    k = d.argmin(-1); dm = d.min(-1)
    snapped = PAL[k]
    w = np.clip((60 - dm) / 30, 0, 1)[..., None]
    return img * (1 - w) + snapped * w

def edge_extend(rgb, mask, iters=6):
    """Push colours outward so geometry edges never sample background grey."""
    rgb = rgb.copy(); m = mask.astype(np.uint8)
    for _ in range(iters):
        dil = cv2.dilate(m, np.ones((3, 3), np.uint8))
        ring = (dil > 0) & (m == 0)
        acc = np.zeros_like(rgb); cnt = np.zeros(rgb.shape[:2], np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                sm = np.roll(np.roll(m, dy, 0), dx, 1).astype(np.float32)
                acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * sm[..., None]
                cnt += sm
        rgb[ring] = acc[ring] / np.maximum(cnt[ring], 1)[:, None]
        m = dil
    return rgb

up = cv2.resize(src, (W * S, H * S), interpolation=cv2.INTER_CUBIC)
up = clean(np.clip(up, 0, 255))

def upmask(mk):
    f = cv2.resize(mk.astype(np.float32), (W * S, H * S), interpolation=cv2.INTER_LINEAR)
    f = cv2.GaussianBlur(f, (0, 0), 0.6)
    return f > 0.5

BLACK = PAL[0]; WHITE = PAL[2]

def save(name, rgb, mask):
    rgb = edge_extend(rgb, mask)
    a = (mask * 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), a])).save(os.path.join(OUT, name + ".png"))

# hat
save("hat", up, upmask(hat_m))

# head + hair dome under the hat + neck extension behind the collar
head_rgb = up.copy()
# cranium under the hat: hair, so a tipped hat never reveals background
cranium = ((xx - 792) / 128.0) ** 2 + ((yy - 236) / 112.0) ** 2 < 1
hat_dl = cv2.dilate(hat_m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
dome = cranium & hat_dl & (xx > 668) & ~below_curve([(p[0], p[1] + 4) for p in HAT_CURVE])
dome_up = upmask(dome)
head_rgb[dome_up] = BLACK
neck_ext = worker & below_curve(NECK_CURVE) & ~below_curve([(p[0], p[1] + 34) for p in NECK_CURVE]) & (xx > 660) & (xx < 930)
neck_up = upmask(neck_ext)
# extension: skin in the throat area, black elsewhere (hidden behind collar at rest)
throat = (xx > 700) & (xx < 800)
ext_rgb = np.where(upmask(throat)[..., None], WHITE, BLACK)
head_rgb[neck_up] = ext_rgb[neck_up]
save("head", head_rgb, upmask(head_m) | dome_up | neck_up)

# upper arm
save("uparm", up, upmask(arm_m))
# side of the chest under the raised sleeve (covered by the sleeve at rest)
SIDE = [(492, 548), (536, 556), (566, 584), (582, 624), (578, 668)]
side_fill = below_curve(SLEEVE_SEAM) & left_of_curve(ARM_CURVE) & ~left_of_curve(SIDE) & (yy < 668)
torso_rgb = up.copy()
sf = upmask(side_fill) & ~upmask(torso_m)
torso_rgb[sf] = BLACK
save("torso", torso_rgb, upmask(torso_m) | sf)

rig = {
    "scale": S,
    "logo_size": [W, H],
    "pivots": {
        "head": [772, 398],
        "hat": [868, 236],
        "uparm": [556, 512],
    },
    "curves": {"hat": HAT_CURVE, "neck": NECK_CURVE, "arm": ARM_CURVE, "seam": SLEEVE_SEAM},
}
json.dump(rig, open(os.path.join(ROOT, "build/rig.json"), "w"), indent=1)

dbg = np.full((H, W, 3), 255, np.uint8)
for mk, c in ((torso_m, (60, 60, 200)), (head_m, (200, 60, 60)), (hat_m, (60, 160, 60)), (arm_m, (200, 150, 0))):
    dbg[mk] = c
Image.fromarray(dbg).save(os.path.join(ROOT, "build/debug_worker_layers.png"))
print("ok", {k: int(v.sum()) for k, v in dict(hat=hat_m, head=head_m, arm=arm_m, torso=torso_m).items()})
