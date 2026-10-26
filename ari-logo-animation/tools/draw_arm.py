"""Draw the worker's raised right arm as vector art in the logo's ink style.

v2: the whole arm is redrawn so it reads as one connected limb of the
original uniform:
  sleeve   yellow sleeve (shoulder to just past the elbow) with the logo's
           black shadowed shoulder, curved fold strokes, hem and cuff tab
  forearm  skin with the logo's heavy graphic black shading on the underside
  hand     right hand gripping the hard-hat brim: index + middle fingers over
           the top of the brim, thumb underneath, ring + little fingers curled

The original foreshortened sleeve (build/layers/uparm.png) is kept for the
rest pose so the logo pose stays pixel-identical; tools/rig.py dissolves to
the drawn sleeve as the arm starts to move.

Authoring pose = arm raised, fingers on the (untipped) brim. The sleeve is
authored along its own +x axis (pivot at the shoulder) so the rig can apply
axial foreshortening. Output: build/svg/*.svg + build/arm.json.
"""
import json, math, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build/svg")
os.makedirs(OUT, exist_ok=True)

INK = "#1b1611"
SKIN = "#fbfbfc"
YEL = "#f3b61b"
SW = 5.0          # outer ink weight (logo px) - matches the uniform outlines
SW_IN = 2.6       # interior line weight

# ---------------------------------------------------------------- geometry
P = np.array([566.0, 500.0])          # shoulder joint (inside the black shoulder)
L_UP = 150.0                          # shoulder -> elbow (raised; upper arm angled toward camera)
SLEEVE_END = 168.0                    # sleeve covers just past the elbow
REST_SLEEVE_END = np.array([522.0, 642.0])  # tip of the original sleeve at rest
C = np.array([632.0, 224.0])          # pinch centre on the brim front edge
HK = 1.30                             # hand scale (hand authored around C)


def unit(deg):
    r = math.radians(deg); return np.array([math.cos(r), math.sin(r)])


def hand_pt(x, y):
    """hand authored in a box around the pinch centre, scaled by HK."""
    return C + HK * (np.array([x, y], float) - C)


W0 = hand_pt(572.0, 268.0)            # wrist centre in the authoring pose
L_FORE = 178.0                        # elbow -> wrist


def ik(target, L1, L2):
    d = target - P; D = float(np.linalg.norm(d))
    base = math.degrees(math.atan2(d[1], d[0]))
    a = math.degrees(math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)))))
    up = base - a
    E = P + unit(up) * L1
    v = target - E
    return up, math.degrees(math.atan2(v[1], v[0])), E


UP_ANG, FORE_ANG, E0 = ik(W0, L_UP, L_FORE)
HAND_ANG = math.degrees(math.atan2(*(C - W0)[::-1]))   # wrist -> pinch direction
REST_VEC = REST_SLEEVE_END - P
REST_ANG = math.degrees(math.atan2(REST_VEC[1], REST_VEC[0]))
REST_SCALE = float(np.linalg.norm(REST_VEC)) / SLEEVE_END


def frame(origin, ang):
    u = unit(ang); n = np.array([-u[1], u[0]])
    return lambda s, t: origin + u * s + n * t


def fmt(p):
    return f"{p[0]:.2f},{p[1]:.2f}"


def smooth_closed(pts, tension=0.5):
    """Catmull-Rom spline through pts -> closed cubic Bezier path."""
    pts = [np.asarray(p, float) for p in pts]; n = len(pts)
    d = [f"M {fmt(pts[0])}"]
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = p1 + (p2 - p0) * tension / 3; c2 = p2 - (p3 - p1) * tension / 3
        d.append(f"C {fmt(c1)} {fmt(c2)} {fmt(p2)}")
    return " ".join(d) + " Z"


def smooth_open(pts, tension=0.5):
    pts = [np.asarray(p, float) for p in pts]; n = len(pts)
    d = [f"M {fmt(pts[0])}"]
    for i in range(n - 1):
        p0 = pts[max(i - 1, 0)]; p1, p2 = pts[i], pts[i + 1]; p3 = pts[min(i + 2, n - 1)]
        c1 = p1 + (p2 - p0) * tension / 3; c2 = p2 - (p3 - p1) * tension / 3
        d.append(f"C {fmt(c1)} {fmt(c2)} {fmt(p2)}")
    return " ".join(d)


def bez(ctrl, n=24):
    ctrl = [np.asarray(c, float) for c in ctrl]
    t = np.linspace(0, 1, n)[:, None]
    if len(ctrl) == 3:
        return (1 - t) ** 2 * ctrl[0] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * ctrl[2]
    return ((1 - t) ** 3 * ctrl[0] + 3 * (1 - t) ** 2 * t * ctrl[1]
            + 3 * (1 - t) * t ** 2 * ctrl[2] + t ** 3 * ctrl[3])


def finger(ctrl, w0, w1):
    """tapered, round-tipped finger along a Bezier centreline -> closed path."""
    c = bez(ctrl, 28)
    tan = np.gradient(c, axis=0); tan /= np.linalg.norm(tan, axis=1)[:, None]
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    w = np.linspace(w0, w1, len(c))[:, None] / 2
    left = c + nor * w; right = c - nor * w
    tip = c[-1]; tdir = tan[-1]; tn = nor[-1]; r = w1 / 2
    cap = [tip + r * (math.cos(a) * tn + math.sin(a) * tdir) for a in np.linspace(0, math.pi, 9)]
    pts = list(left) + cap[1:-1] + list(right[::-1])
    return "M " + " L ".join(fmt(p) for p in pts) + " Z"


def svg(name, body, bbox):
    x0, y0, x1, y1 = bbox
    open(os.path.join(OUT, name + ".svg"), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1-x0} {y1-y0}" '
        f'width="{x1-x0}" height="{y1-y0}">{body}</svg>')


STROKE = f'stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"'
THIN = f'fill="none" stroke="{INK}" stroke-width="{SW_IN}" stroke-linecap="round"'

# ---------------------------------------------------------------- sleeve
# Authored along +x from the shoulder pivot (axis angle 0); the rig rotates it
# to UP_ANG and scales it along x for foreshortening. t < 0 is the top side
# (screen up when the arm is raised), t > 0 the underside.
f = frame(P, 0.0)
S_END = SLEEVE_END
top = [(-8, -50), (30, -57), (75, -57), (120, -53), (S_END, -46)]
bot = [(S_END, 45), (125, 50), (80, 53), (35, 52), (-8, 48)]
cap = [(-36, 32), (-52, 0), (-36, -34)]
outline_pts = [f(*p) for p in top + bot + cap]
sleeve_body = smooth_closed(outline_pts, 0.45)
# black shadowed shoulder (like the original shoulder) up to the seam
shoulder = smooth_closed([f(*p) for p in [(-52, 0), (-36, -34), (-8, -50), (30, -57), (50, -55),
                                          (40, -18), (48, 20), (34, 52), (-8, 48), (-36, 32)]], 0.45)
# yellow highlight stroke on the shoulder (as in the original)
sh_high = smooth_closed([f(*p) for p in [(-26, -30), (6, -44), (36, -47), (12, -34)]], 0.5)
# underside shadow + fold crescents
under = smooth_closed([f(*p) for p in [(50, 30), (90, 26), (125, 24), (150, 26), (S_END - 4, 42),
                                       (125, 49), (90, 52), (54, 51)]], 0.45)
fold1 = smooth_closed([f(*p) for p in [(64, -8), (92, -20), (128, -18), (100, -8), (78, 4)]], 0.5)
fold2 = smooth_closed([f(*p) for p in [(96, 10), (124, 2), (150, 8), (128, 16)]], 0.5)
top_line = smooth_open([f(*p) for p in [(56, -44), (96, -46), (136, -40)]])
# hem + rolled cuff with the uniform's square tab
hem = smooth_closed([f(*p) for p in [(146, -49), (155, -48), (155, 47), (146, 48)]], 0.2)
tab = "M " + " L ".join(fmt(f(*p)) for p in [(122, -50), (140, -49), (140, -34), (122, -35)]) + " Z"
SB = [P[0] - 70, P[1] - 70, P[0] + S_END + 20, P[1] + 70]
svg("sleeve",
    f'<path d="{sleeve_body}" fill="{YEL}"/>'
    f'<path d="{under}" fill="{INK}"/><path d="{fold1}" fill="{INK}"/><path d="{fold2}" fill="{INK}"/>'
    f'<path d="{shoulder}" fill="{INK}"/><path d="{sh_high}" fill="{YEL}"/>'
    f'<path d="{hem}" fill="{INK}"/>'
    f'<path d="{tab}" fill="{YEL}" stroke="{INK}" stroke-width="{SW_IN}"/>'
    f'<path d="{top_line}" {THIN}/>'
    f'<path d="{sleeve_body}" fill="none" {STROKE}/>',
    [int(v) for v in SB])

# ---------------------------------------------------------------- forearm
f = frame(E0, FORE_ANG)          # n (t > 0) = underside of the raised forearm
L = L_FORE + 14
fo_out = smooth_closed([f(*p) for p in [
    (-30, 0), (-18, -30), (12, -38), (60, -40), (120, -33), (L, -25),
    (L, 25), (125, 30), (65, 37), (12, 36), (-18, 28)]], 0.45)
fo_shade = smooth_closed([f(*p) for p in [
    (6, 14), (60, 16), (125, 12), (L, 8), (L, 25), (125, 30), (65, 37), (12, 36)]], 0.45)
fo_muscle = smooth_open([f(*p) for p in [(30, -20), (70, -16), (115, -14)]])
fo_tendon = smooth_open([f(*p) for p in [(120, -6), (150, -5), (176, -3)]])
FB = [int(min(E0[0], W0[0]) - 50), int(min(E0[1], W0[1]) - 50),
      int(max(E0[0], W0[0]) + 50), int(max(E0[1], W0[1]) + 50)]
svg("forearm",
    f'<path d="{fo_out}" fill="{SKIN}"/><path d="{fo_shade}" fill="{INK}"/>'
    f'<path d="{fo_muscle}" {THIN}/><path d="{fo_tendon}" {THIN}/>'
    f'<path d="{fo_out}" fill="none" {STROKE}/>',
    FB)

# ---------------------------------------------------------------- hand
H = hand_pt
# authored around the brim: front tip (609,228), top edge y~202, underside y~246
thumb = finger([H(580, 266), H(598, 263), H(614, 258), H(626, 252)], 16 * HK, 12 * HK)
pinky = finger([H(588, 260), H(600, 268), H(612, 268), H(614, 258)], 12 * HK, 10.5 * HK)
ring = finger([H(592, 252), H(608, 258), H(620, 256), H(620, 246)], 13 * HK, 11 * HK)
middle = finger([H(598, 222), H(614, 205), H(636, 200), H(652, 206)], 14.5 * HK, 12 * HK)
index = finger([H(594, 216), H(608, 199), H(630, 193), H(647, 198)], 14.5 * HK, 12 * HK)
wt = W0 + unit(FORE_ANG - 90) * 25; wb = W0 + unit(FORE_ANG + 90) * 25
back = smooth_closed([wt, H(577, 238), H(592, 214), H(604, 206), H(612, 214),
                      H(616, 232), H(612, 248), H(598, 262), wb], 0.45)
back_shade = smooth_closed([H(586, 266), H(598, 260), H(610, 250), H(612, 256), H(600, 268), wb], 0.45)
knuckles = smooth_open([H(596, 212), H(606, 210), H(612, 220)])
crease1 = smooth_open([H(619, 196), H(621, 201), H(620, 206)])
crease2 = smooth_open([H(625, 202), H(627, 207), H(625, 212)])
tendons = smooth_open([H(578, 252), H(590, 236), H(600, 222)])
HB = [int(v) for v in (H(540, 170)[0], H(540, 170)[1], H(680, 300)[0], H(680, 300)[1])]
fill = f'fill="{SKIN}" {STROKE}'
svg("hand",
    f'<path d="{thumb}" {fill}/><path d="{pinky}" {fill}/><path d="{ring}" {fill}/>'
    f'<path d="{middle}" {fill}/><path d="{back}" {fill}/><path d="{back_shade}" fill="{INK}"/>'
    f'<path d="{index}" {fill}/>'
    f'<g {THIN}><path d="{knuckles}"/><path d="{crease1}"/><path d="{crease2}"/><path d="{tendons}"/></g>',
    HB)

meta = {
    "shoulder": P.tolist(), "len_upper": L_UP, "sleeve_end": SLEEVE_END,
    "rest_angle": REST_ANG, "rest_scale": REST_SCALE,
    "raised_angle": UP_ANG, "len_fore": L_FORE,
    "elbow_raised": E0.tolist(), "wrist_raised": W0.tolist(), "pinch": C.tolist(),
    "fore_angle_raised": FORE_ANG, "hand_angle_raised": HAND_ANG,
    "bbox": {"sleeve": SB, "forearm": FB, "hand": HB},
    "sleeve_axis_angle": 0.0,
}
json.dump(meta, open(os.path.join(ROOT, "build/arm.json"), "w"), indent=1)
print({k: (round(v, 2) if isinstance(v, float) else v) for k, v in meta.items() if k != "bbox"})
