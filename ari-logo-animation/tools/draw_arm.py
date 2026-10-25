"""Draw the parts of the worker's right arm that are NOT in the original logo
(upper-arm skin, forearm, hand) as vector art in the logo's ink style:
white skin, heavy black outline, graphic black shading.

Everything is authored in logo-pixel space at the RAISED pose (two fingers
resting on the hard-hat brim), so the raised pose is the identity transform
for these sprites. Output: build/svg/<part>.svg + build/arm.json.
"""
import json, math, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build/svg")
os.makedirs(OUT, exist_ok=True)

INK = "#1b1611"
SKIN = "#fbfbfc"
SW = 4.4          # outer ink weight (logo px) - matches the face outline
SW_IN = 2.5       # interior line weight

rig = json.load(open(os.path.join(ROOT, "build/rig.json")))
P = np.array(rig["pivots"]["uparm"], float)          # shoulder pivot
SLEEVE_END = np.array([522.0, 642.0])                 # sleeve opening centre at rest
REST_VEC = SLEEVE_END - P
L_SLEEVE = float(np.linalg.norm(REST_VEC))
REST_ANG = math.degrees(math.atan2(REST_VEC[1], REST_VEC[0]))
UP_ANG = 205.0                                        # raised upper-arm angle (screen deg)
SKIN_EXT = 18.0                                       # visible upper-arm skin below sleeve
L_UP = L_SLEEVE + SKIN_EXT
GRIP = np.array([627.0, 223.0])                       # fingertips on the brim (logo px)
TIP_P = 97.0                                          # wrist -> fingertip distance
HAND_BEND = -6.0                                      # hand vs forearm angle

def unit(deg):
    r = math.radians(deg)
    return np.array([math.cos(r), math.sin(r)])

a = unit(UP_ANG)
E = P + a * L_UP                                      # elbow at raised pose
O = P + a * L_SLEEVE                                  # sleeve opening at raised pose
# forearm angle so that wrist + hand (bent by HAND_BEND) lands the tips on GRIP
v = GRIP - E
D = float(np.linalg.norm(v))
base = math.degrees(math.atan2(v[1], v[0]))
# solve |E + u(f) Lf + u(f+bend) TIP_P - GRIP| = 0 with Lf free: pick f s.t. tips on line
def solve():
    best = None
    for f in np.linspace(base - 15, base + 15, 3001):
        # project: Lf such that remaining vector is u(f+bend)*TIP_P
        w = GRIP - E - unit(f + HAND_BEND) * TIP_P
        Lf = float(np.dot(w, unit(f)))
        err = np.linalg.norm(w - unit(f) * Lf)
        if best is None or err < best[0]:
            best = (err, f, Lf)
    return best[1], best[2]
FORE_ANG, L_FORE = solve()
WR = E + unit(FORE_ANG) * L_FORE                      # wrist
HAND_ANG = FORE_ANG + HAND_BEND

def frame(origin, ang):
    u = unit(ang); n = np.array([-u[1], u[0]])        # n: 90deg clockwise on screen
    return lambda s, t: origin + u * s + n * t

def path(cmds):
    out = []
    for c in cmds:
        out.append("Z" if c[0] == "Z" else c[0] + " " + " ".join(f"{q[0]:.2f},{q[1]:.2f}" for q in c[1:]))
    return " ".join(out)

def capsule(f, p0, p1, q, hw0, hw1, bend=0.0):
    """finger-like rounded capsule along p from p0 to p1 at offset q."""
    m = (p0 + p1) / 2
    return path([
        ("M", f(p0, q - hw0)),
        ("C", f(m, q - hw0 + bend), f(p1 - hw1, q - hw1 + bend), f(p1 - hw1 * 0.3, q - hw1 + bend)),
        ("C", f(p1 + hw1 * 0.55, q - hw1 * 0.8 + bend), f(p1 + hw1 * 0.55, q + hw1 * 0.8 + bend), f(p1 - hw1 * 0.3, q + hw1 + bend)),
        ("C", f(p1 - hw1, q + hw1 + bend), f(m, q + hw0 + bend), f(p0, q + hw0)),
        ("Z",),
    ])

def svg(name, body, bbox):
    x0, y0, x1, y1 = bbox
    open(os.path.join(OUT, name + ".svg"), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1-x0} {y1-y0}" '
        f'width="{x1-x0}" height="{y1-y0}">{body}</svg>')

BOX = {"upskin": [330, 340, 520, 520], "forearm": [340, 190, 640, 520], "hand": [520, 150, 720, 330]}

# ------------------------------------------------------------ upper-arm skin
f = frame(O, UP_ANG)
hw = 29.0
s0, s1 = -46.0, SKIN_EXT + 10
up_body = path([("M", f(s0, -hw)), ("L", f(s1, -hw + 1)), ("L", f(s1, hw - 1)), ("L", f(s0, hw)), ("Z",)])
up_lines = (f'<path d="{path([("M", f(s0, -hw)), ("L", f(s1, -hw + 1))])}"/>'
            f'<path d="{path([("M", f(s0, hw)), ("L", f(s1, hw - 1))])}"/>')
up_shade = path([("M", f(s0, 10)), ("L", f(s1, 12)), ("L", f(s1, hw - 1)), ("L", f(s0, hw)), ("Z",)])
svg("upskin", f'<path d="{up_body}" fill="{SKIN}"/><path d="{up_shade}" fill="{INK}"/>'
              f'<g fill="none" stroke="{INK}" stroke-width="{SW}" stroke-linecap="round">{up_lines}</g>',
    BOX["upskin"])

# ------------------------------------------------------------------- forearm
# n points to the forearm's underside (toward the body / screen-right-down)
f = frame(E, FORE_ANG)
L = L_FORE + 12
outline = path([
    ("M", f(0, -30)),
    ("C", f(45, -38), f(110, -30), f(L, -21)),      # outer edge, brachioradialis bulge
    ("L", f(L, 20)),
    ("C", f(140, 24), f(70, 33), f(14, 30)),        # inner edge, flexor bulge
    ("C", f(-12, 29), f(-32, 16), f(-32, 0)),       # elbow
    ("C", f(-32, -17), f(-17, -30), f(0, -30)),
    ("Z",),
])
shade = path([
    ("M", f(18, 30)), ("C", f(70, 32), f(140, 24), f(L, 20)),
    ("L", f(L, 9)), ("C", f(150, 13), f(90, 19), f(18, 30)), ("Z",),
])
elbow_shade = path([("M", f(-30, 8)), ("C", f(-24, 22), f(-8, 29), f(14, 30)),
                    ("C", f(-4, 23), f(-18, 17), f(-30, 8)), ("Z",)])
crease = path([("M", f(-6, -14)), ("C", f(0, -8), f(2, -1), f(0, 6))])
muscle = path([("M", f(40, -30)), ("C", f(70, -22), f(100, -20), f(130, -21))])
svg("forearm",
    f'<path d="{outline}" fill="{SKIN}" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"/>'
    f'<path d="{shade}" fill="{INK}"/><path d="{elbow_shade}" fill="{INK}"/>'
    f'<path d="{crease}" fill="none" stroke="{INK}" stroke-width="{SW_IN}" stroke-linecap="round"/>'
    f'<path d="{muscle}" fill="none" stroke="{INK}" stroke-width="{SW_IN*0.8}" stroke-linecap="round"/>',
    BOX["forearm"])

# ---------------------------------------------------------------------- hand
# Back of the right hand toward camera; index + middle fingers extended and
# resting on the brim, ring + little finger curled, thumb tucked on the
# upper (q<0) side.
f = frame(WR, HAND_ANG)
thumb = capsule(f, 2, 44, -22, 9.5, 7.5, bend=-2)
ring = path([("M", f(36, 8)), ("C", f(48, 6), f(60, 9), f(61, 15)),
             ("C", f(62, 22), f(54, 25), f(44, 24)), ("C", f(38, 23), f(34, 20), f(34, 16)), ("Z",)])
pinky = path([("M", f(32, 18)), ("C", f(42, 18), f(53, 21), f(53, 27)),
              ("C", f(53, 33), f(45, 34), f(38, 32)), ("C", f(31, 30), f(28, 26), f(29, 22)), ("Z",)])
middle = capsule(f, 36, TIP_P + 3, 1.5, 8.6, 6.4, bend=2.5)
index = capsule(f, 36, TIP_P, -13.0, 8.6, 6.4, bend=2.0)
back = path([
    ("M", f(-8, -19)),
    ("C", f(10, -22), f(30, -26), f(44, -23)),
    ("C", f(51, -21), f(53, -13), f(50, -7)),        # index knuckle
    ("C", f(54, -3), f(54, 6), f(50, 10)),           # middle knuckle
    ("C", f(50, 18), f(44, 26), f(35, 28)),
    ("C", f(22, 29), f(6, 25), f(-8, 20)),
    ("Z",),
])
shade_back = path([("M", f(-8, 13)), ("C", f(8, 18), f(24, 22), f(38, 24)),
                   ("C", f(26, 27), f(8, 25), f(-8, 20)), ("Z",)])
shade_fing = path([("M", f(50, 7)), ("C", f(70, 8), f(88, 8), f(TIP_P - 2, 7)),
                   ("C", f(88, 11), f(70, 11), f(50, 9.5)), ("Z",)])
lines = "".join(f'<path d="{d}"/>' for d in [
    path([("M", f(68, -17)), ("C", f(67, -14), f(67, -11), f(68, -9))]),       # index PIP
    path([("M", f(71, -2)), ("C", f(70, 1), f(70, 4), f(71, 7))]),             # middle PIP
    path([("M", f(20, -14)), ("C", f(30, -12), f(38, -8), f(44, -6))]),        # tendon
])
stroke = f'fill="{SKIN}" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"'
svg("hand",
    f'<path d="{thumb}" {stroke}/><path d="{pinky}" {stroke}/><path d="{ring}" {stroke}/>'
    f'<path d="{middle}" {stroke}/><path d="{index}" {stroke}/>'
    f'<path d="{back}" {stroke}/><path d="{shade_back}" fill="{INK}"/><path d="{shade_fing}" fill="{INK}"/>'
    f'<g fill="none" stroke="{INK}" stroke-width="{SW_IN}" stroke-linecap="round">{lines}</g>',
    BOX["hand"])

meta = {
    "shoulder": P.tolist(), "sleeve_end_rest": SLEEVE_END.tolist(),
    "rest_angle": REST_ANG, "raised_angle": UP_ANG, "len_sleeve": L_SLEEVE,
    "skin_ext": SKIN_EXT, "len_upper": L_UP, "len_fore": L_FORE,
    "elbow_raised": E.tolist(), "wrist_raised": WR.tolist(), "grip": GRIP.tolist(),
    "fore_angle_raised": FORE_ANG, "hand_angle_raised": HAND_ANG,
    "bbox": BOX,
}
json.dump(meta, open(os.path.join(ROOT, "build/arm.json"), "w"), indent=1)
print({k: (round(v, 2) if isinstance(v, float) else v) for k, v in meta.items() if k != "bbox"})
