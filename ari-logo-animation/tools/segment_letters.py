"""Extract the "Ari" letterforms from the original logo as vector outlines.

Output: build/letters.json  -> {piece: [contour, ...]} where each contour is a
list of cubic Bezier segments in ORIGINAL LOGO PIXEL coordinates.

Pieces (each animated independently during assembly):
  a_thick     thick right diagonal of the A + descending swash tail
  a_leg       thin left diagonal of the A (with foot serif)
  a_flourish  left curl that sweeps across as the A crossbar
  r           r stem + ball-terminal ear
  i           i stem

The tail is partly covered by the subtitle in the source artwork; that gap is
reconstructed by inpainting the letter matte only inside the subtitle band.
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image
import potrace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets/source/ari-logo-original.png")
OUT = os.path.join(ROOT, "build")
UP = 3  # trace at 3x for smooth curves
BEVEL_UP = 6  # 6 / UP = 2 logo px (= 2 mm bevel)

img = np.array(Image.open(SRC).convert("RGB")).astype(np.float32)
lum = img.mean(2)
H, W = lum.shape
BG = 224.0
alpha = np.clip((BG - lum) / (BG - 27.0), 0, 1)  # letter matte (black on grey)
dark = (lum < 120).astype(np.uint8)

n, lab, st, _ = cv2.connectedComponentsWithStats(dark, 8)
def comp_at(x, y):
    return lab == lab[y, x]

yy, xx = np.mgrid[0:H, 0:W]

# --- worker / A split -------------------------------------------------------
big = comp_at(600, 900)                     # A + worker (merged in source)
x_cut = 572 + (yy - 682) * (59.0 / 138.0)   # line through the grey wedge
worker_part = (yy < 681) | ((yy < 805) & (xx > x_cut))
A = big & ~worker_part
A |= comp_at(1000, 1330)                     # tail loop (separated by subtitle)
r = comp_at(900, 1000)
i_ = comp_at(1100, 1000)

# --- subtitle band: reconstruct the tail hidden under the subtitle ----------
Y0, Y1 = 1227, 1283          # rows of the subtitle band where the tail is hidden
def runs(row):
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))

def passage_edges(y, x_lo, x_hi):
    rr = [(a, b) for a, b in runs(A[y, x_lo:x_hi]) if b - a > 15]
    return (rr[0][0] + x_lo, rr[-1][1] + x_lo) if rr else None

A_alpha = np.where(A, alpha, 0).astype(np.float32)
A_alpha[Y0:Y1 + 1, 690:1130] = 0
fill = np.zeros((H, W), np.uint8)
# two passages: the diagonal stroke and the right side of the loop
for (x_lo, x_hi), top_rows in (((690, 960), range(1205, Y0)), ((960, 1130), range(1218, Y0))):
    ys, ls, rs = [], [], []
    for y in list(top_rows) + list(range(Y1 + 1, Y1 + 18)):
        e = passage_edges(y, x_lo, x_hi)
        if e: ys.append(y); ls.append(e[0]); rs.append(e[1])
    fl = np.polyfit(ys, ls, 3); fr = np.polyfit(ys, rs, 3)
    for y in range(Y0 - 2, Y1 + 3):
        fill[y, int(round(np.polyval(fl, y))):int(round(np.polyval(fr, y)))] = 1
fill = cv2.GaussianBlur(fill.astype(np.float32), (0, 0), 0.7)
A_alpha[Y0 - 2:Y1 + 3] = np.maximum(A_alpha[Y0 - 2:Y1 + 3], fill[Y0 - 2:Y1 + 3])
A_bin = A_alpha > 0.5

# --- split A into thick / leg / flourish ------------------------------------
# thick stroke left edge passes through the counter's vertices (500,842)-(570,1000)
xT = 500 + (yy - 842) * (70.0 / 158.0)
thick = A_bin & (xx > xT - 3)
left = A_bin & (xx < xT + 12)               # overlaps under the thick stroke

# fit the thin leg edges away from the crossing
pts_l, pts_r = [], []
for y in list(range(850, 892)) + list(range(962, 1060)):
    pred = 412 + (1000 - y) * 0.53
    for a0, a1 in runs(left[y]):
        if a0 - 25 < pred < a1 + 25 and (a1 - a0) < 45:
            pts_l.append((y, a0)); pts_r.append((y, a1))
pl = np.polyfit([p[0] for p in pts_l], [p[1] for p in pts_l], 1)
pr = np.polyfit([p[0] for p in pts_r], [p[1] for p in pts_r], 1)
xl = np.polyval(pl, yy); xr = np.polyval(pr, yy)
legband = (xx >= xl - 3) & (xx <= xr + 3) & (yy > 700) & (yy < 1150)

core_left = A_bin & (xx < xT - 3)
strip = A_bin & (xx >= xT - 3) & (xx < xT + 12)
rest = core_left & ~legband
n2, lab2, st2, _ = cv2.connectedComponentsWithStats(rest.astype(np.uint8), 8)
curl_id = lab2[980, 200]
fl_only = lab2 == curl_id
# right-hand part of the sweep between leg and thick stroke
for k in range(1, n2):
    x0, y0, w0, h0, a0 = st2[k]
    print("comp", k, st2[k], file=sys.stderr)
    if k != curl_id and 900 < y0 + h0 / 2 < 1060 and x0 > 430 and a0 > 400 and h0 < 140:
        fl_only |= lab2 == k
# flourish band across the leg: interpolate its edges from both sides
def fl_edges(xc):
    rr = runs(fl_only[850:1000, int(round(xc))])
    a0, a1 = min(rr, key=lambda t: abs((t[0] + t[1]) / 2 - 80))
    return a0 + 850, a1 + 850 - 1
yc = 925
xa = np.polyval(pl, yc) - 6; xb = np.polyval(pr, yc) + 6
ta, ba = fl_edges(xa); tb, bb = fl_edges(xb)
poly = np.array([[xa, ta], [xb, tb], [xb, bb], [xa, ba]], np.float32)
cross = np.zeros((H, W), np.uint8)
cv2.fillPoly(cross, [np.round(poly).astype(np.int32)], 1)
flourish = fl_only | (cross.astype(bool) & legband) | (strip & (yy > 960) & (yy < 1070))
leg = (core_left & ~fl_only) | (strip & (yy < 940))
print("leg fit", pl, pr, "crossing", poly.tolist(), file=sys.stderr)

pieces = {
    "a_thick": thick,
    "a_leg": leg,
    "a_flourish": flourish,
    "r": r,
    "i": i_,
}
mattes = {
    "a_thick": A_alpha, "a_leg": A_alpha, "a_flourish": A_alpha,
    "r": alpha, "i": alpha,
}

def trace(mask, matte):
    ys, xs = np.where(mask)
    x0, x1 = max(xs.min() - 6, 0), min(xs.max() + 7, W)
    y0, y1 = max(ys.min() - 6, 0), min(ys.max() + 7, H)
    m = mask[y0:y1, x0:x1].astype(np.uint8)
    a = matte[y0:y1, x0:x1]
    # anti-aliased matte restricted to the (slightly dilated) piece mask, so
    # natural edges keep sub-pixel precision while cut lines stay crisp
    md = cv2.dilate(m, np.ones((3, 3), np.uint8))
    v = a * md
    big = cv2.resize(v.astype(np.float32), None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), 1.6)
    # pre-shrink by the 3D bevel width (2 mm = 2 logo px) so the bevelled
    # letters keep the original silhouette
    ink = cv2.erode((big > 0.5).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * BEVEL_UP + 1,) * 2))
    bm = potrace.Bitmap(ink == 0)  # potracer treats False as ink
    path = bm.trace(turdsize=40, alphamax=1.1, opticurve=True, opttolerance=0.9)
    out = []
    for c in path:
        segs = []
        P = lambda q: [q.x, q.y] if hasattr(q, "x") else [q[0], q[1]]
        p = P(c.start_point)
        for s in c.segments:
            if s.is_corner:
                segs.append(["L", p, P(s.c)])
                segs.append(["L", P(s.c), P(s.end_point)])
            else:
                segs.append(["C", p, P(s.c1), P(s.c2), P(s.end_point)])
            p = P(s.end_point)
        # to logo pixel coordinates
        conv = []
        for sgm in segs:
            conv.append([sgm[0]] + [[x0 + q[0] / UP, y0 + q[1] / UP] for q in sgm[1:]])
        out.append(conv)
    return out

os.makedirs(OUT, exist_ok=True)
data = {}
dbg = np.full((H, W, 3), 255, np.uint8)
cols = {"a_thick": (30, 30, 30), "a_leg": (200, 60, 60), "a_flourish": (60, 60, 200), "r": (60, 150, 60), "i": (150, 100, 30)}
for name, mk in pieces.items():
    cs = trace(mk, mattes[name])
    # every piece is one solid shape: drop stray slivers from the cut lines
    span = lambda c: np.ptp(np.array([q for sg in c for q in sg[1:]]), 0).prod()
    data[name] = [max(cs, key=span)]
    dbg[mk] = cols[name]
    print(name, "contours", len(data[name]), file=sys.stderr)
with open(os.path.join(OUT, "letters.json"), "w") as f:
    json.dump(data, f)
Image.fromarray(dbg).save(os.path.join(OUT, "debug_letter_pieces.png"))
np.save(os.path.join(OUT, "worker_region.npy"), worker_part & big)
