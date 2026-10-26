"""Draw the worker's raised right arm as vector art in the logo's ink style.

v3 (current): the ORIGINAL sleeve artwork (build/layers/uparm.png) is the
sleeve for the whole gesture - no swap, no dissolve. From its opening
emerges a thick bare upper arm, then elbow, forearm, wrist and hand, all in
the face's treatment: white fill, black ink outline, graphic black shading.
The hand is split into back-of-hand, fingers (index + middle) and thumb so
the fingers can open and close on the brim.

(The v2 notes below are kept for history.)

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
SW = 5.6          # outer ink weight (logo px) - matches the uniform outlines
SW_IN = 2.6       # interior line weight

# ---------------------------------------------------------------- geometry
P = np.array([566.0, 500.0])                 # shoulder joint = original sleeve pivot
REST_SLEEVE_END = np.array([522.0, 642.0])   # opening of the original sleeve at rest
L_SLEEVE = float(np.linalg.norm(REST_SLEEVE_END - P))
REST_ANG = math.degrees(math.atan2(*(REST_SLEEVE_END - P)[::-1]))
C = np.array([632.0, 224.0])                 # pinch centre on the brim front edge
HK = 1.45                                    # hand scale (hand authored around C)
E_TARGET = np.array([352.0, 468.0])          # elbow out to the side at shoulder height


def unit(deg):
    r = math.radians(deg); return np.array([math.cos(r), math.sin(r)])


def hand_pt(x, y):
    return C + HK * (np.array([x, y], float) - C)


W0 = hand_pt(572.0, 268.0)                   # wrist in the grip pose
E0 = E_TARGET
UP_ANG = math.degrees(math.atan2(*(E0 - P)[::-1]))
L_UP = float(np.linalg.norm(E0 - P))
SKIN_EXT = L_UP - L_SLEEVE                   # bare upper arm below the sleeve
L_FORE = float(np.linalg.norm(W0 - E0))
FORE_ANG = math.degrees(math.atan2(*(W0 - E0)[::-1]))
HAND_ANG = math.degrees(math.atan2(*(C - W0)[::-1]))
K_FING = hand_pt(597.0, 216.0)               # finger knuckle pivot
K_THUMB = hand_pt(582.0, 265.0)              # thumb base pivot
O = P + unit(UP_ANG) * L_SLEEVE              # sleeve opening in the raised pose


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
FILL = f'fill="{SKIN}" {STROKE}'


def side_sign(ang):
    """+1 if the frame's +t side points down on screen (underside) else -1."""
    return 1.0 if unit(ang - 90 + 180)[1] > 0 else -1.0


def bbox(pts, pad=40):
    pts = np.array(pts)
    return [int(pts[:, 0].min() - pad), int(pts[:, 1].min() - pad),
            int(pts[:, 0].max() + pad), int(pts[:, 1].max() + pad)]


# ---------------------------------------------------------------- upper arm (bare)
f = frame(O, UP_ANG)
d = side_sign(UP_ANG)                        # t * d > 0 is the underside
S0, S1 = -56.0, SKIN_EXT + 16
ua_pts = [(S0, -46), (0, -46), (SKIN_EXT * 0.45, -50), (SKIN_EXT * 0.85, -44), (S1, -36),
          (S1, 36), (SKIN_EXT * 0.5, 42), (0, 44), (S0, 44)]
ua_out = smooth_closed([f(s_, t_ * d) for s_, t_ in ua_pts], 0.4)
ua_shade = smooth_closed([f(s_, t_ * d) for s_, t_ in
                          [(S0, 4), (0, 6), (SKIN_EXT * 0.35, 12), (SKIN_EXT * 0.7, 6), (S1, 2), (S1, 36),
                           (SKIN_EXT * 0.5, 42), (0, 44), (S0, 44)]], 0.4)
ua_muscle = smooth_open([f(s_, t_ * d) for s_, t_ in [(4, -20), (SKIN_EXT * 0.5, -26), (SKIN_EXT, -18)]])
UB = bbox([f(S0, -50), f(S1, -50), f(S0, 50), f(S1, 50)])
svg("upskin",
    f'<path d="{ua_out}" fill="{SKIN}"/><path d="{ua_shade}" fill="{INK}"/>'
    f'<path d="{ua_muscle}" {THIN}/><path d="{ua_out}" fill="none" {STROKE}/>', UB)

# ---------------------------------------------------------------- forearm
# authored along +x from the elbow (axis angle 0) so the rig can foreshorten
# it along its own axis; shading side matches the raised pose
f = frame(E0, 0.0)
d = side_sign(FORE_ANG)
L = L_FORE + 16
fo_pts = [(-38, 0), (-26, -34), (10, -42), (60, -44), (120, -38), (185, -29), (L, -27),
          (L, 27), (190, 28), (120, 34), (60, 41), (10, 42), (-26, 34)]
fo_out = smooth_closed([f(s_, t_ * d) for s_, t_ in fo_pts], 0.45)
fo_shade = smooth_closed([f(s_, t_ * d) for s_, t_ in
                          [(-30, 12), (0, 4), (40, 10), (80, 2), (130, 8), (180, 4), (L, 8),
                           (L, 27), (190, 28), (120, 34), (60, 41), (10, 42), (-26, 34)]], 0.45)
fo_elbow = smooth_open([f(s_, t_ * d) for s_, t_ in [(-6, -18), (2, -6), (0, 8)]])
fo_muscle = smooth_open([f(s_, t_ * d) for s_, t_ in [(26, -26), (80, -24), (130, -20)]])
fo_wrist = smooth_open([f(s_, t_ * d) for s_, t_ in [(L - 30, -26), (L - 22, -12), (L - 26, 0)]])
fo_tendon = smooth_open([f(s_, t_ * d) for s_, t_ in [(L - 70, -8), (L - 40, -7), (L - 14, -5)]])
FB = bbox([f(-40, -45), f(L, -45), f(-40, 45), f(L, 45)])
svg("forearm",
    f'<path d="{fo_out}" fill="{SKIN}"/><path d="{fo_shade}" fill="{INK}"/>'
    f'<g {THIN}><path d="{fo_elbow}"/><path d="{fo_muscle}"/><path d="{fo_tendon}"/><path d="{fo_wrist}"/></g>'
    f'<path d="{fo_out}" fill="none" {STROKE}/>', FB)

# ---------------------------------------------------------------- hand
# authored around the brim: front tip (609,228), top edge y~202, underside y~246
H = hand_pt
HB = bbox([H(540, 170), H(680, 300)], pad=20)
thumb = finger([H(580, 266), H(598, 263), H(614, 258), H(626, 252)], 16 * HK, 12 * HK)
thumb_nail = smooth_open([H(616, 252), H(621, 250), H(624, 254)])
svg("thumb", f'<path d="{thumb}" {FILL}/><path d="{thumb_nail}" {THIN}/>', HB)

middle = finger([H(596, 222), H(614, 205), H(636, 200), H(652, 206)], 14.5 * HK, 12 * HK)
index = finger([H(592, 216), H(608, 199), H(630, 193), H(647, 198)], 14.5 * HK, 12 * HK)
crease1 = smooth_open([H(619, 196), H(621, 201), H(620, 206)])
crease2 = smooth_open([H(625, 202), H(627, 207), H(625, 212)])
svg("fingers", f'<path d="{middle}" {FILL}/><path d="{index}" {FILL}/>'
               f'<g {THIN}><path d="{crease1}"/><path d="{crease2}"/></g>', HB)

pinky = finger([H(588, 260), H(600, 268), H(612, 268), H(614, 258)], 12 * HK, 10.5 * HK)
ring = finger([H(592, 252), H(608, 258), H(620, 256), H(620, 246)], 13 * HK, 11 * HK)
wt = W0 + unit(FORE_ANG - 90) * 27; wb = W0 + unit(FORE_ANG + 90) * 27
back = smooth_closed([wt, H(577, 238), H(590, 214), H(602, 206), H(611, 213),
                      H(616, 232), H(612, 248), H(598, 262), wb], 0.45)
back_shade = smooth_closed([H(586, 266), H(598, 260), H(610, 250), H(612, 256), H(600, 268), wb], 0.45)
knuckles = smooth_open([H(594, 212), H(604, 209), H(611, 218)])
tendons = smooth_open([H(578, 252), H(588, 236), H(598, 222)])
svg("hand",
    f'<path d="{pinky}" {FILL}/><path d="{ring}" {FILL}/>'
    f'<path d="{back}" {FILL}/><path d="{back_shade}" fill="{INK}"/>'
    f'<g {THIN}><path d="{knuckles}"/><path d="{tendons}"/></g>', HB)

meta = {
    "shoulder": P.tolist(), "rest_angle": REST_ANG, "len_sleeve": L_SLEEVE,
    "skin_ext": SKIN_EXT, "len_upper": L_UP, "raised_angle": UP_ANG, "len_fore": L_FORE,
    "elbow_raised": E0.tolist(), "wrist_raised": W0.tolist(), "pinch": C.tolist(),
    "fore_angle_raised": FORE_ANG, "hand_angle_raised": HAND_ANG,
    "knuckle": K_FING.tolist(), "thumb_base": K_THUMB.tolist(), "forearm_axis": 0.0,
    "bbox": {"upskin": UB, "forearm": FB, "hand": HB, "fingers": HB, "thumb": HB},
}
json.dump(meta, open(os.path.join(ROOT, "build/arm.json"), "w"), indent=1)
print({k: (round(v, 2) if isinstance(v, float) else v) for k, v in meta.items() if k != "bbox"})
