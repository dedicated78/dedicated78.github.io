"""Worker puppet rig + performance (the hard-hat tip).

Shared by the 2D preview (tools/preview_rig.py) and the Blender scene
(blender/build_scene.py) so both show exactly the same motion.

All coordinates are logo pixels, screen orientation (x right, y down);
angles are screen degrees (positive = clockwise on screen).

pose(t) returns, for every sprite, a 2D rigid transform that maps the sprite
as authored (its "bind" pose) to its current pose:  p' = R(angle) (p - pivot) + pivot + offset
"""
import json, math, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_rig = json.load(open(os.path.join(ROOT, "build/rig.json")))
_arm = json.load(open(os.path.join(ROOT, "build/arm.json")))

P = np.array(_arm["shoulder"])
HEAD_PIV = np.array(_rig["pivots"]["head"])
HAT_PIV = np.array(_rig["pivots"]["hat"])
REST_ANG = _arm["rest_angle"]
UP_ANG = _arm["raised_angle"]
L_SLEEVE = _arm["len_sleeve"]
SKIN_EXT = _arm["skin_ext"]
L_FORE = _arm["len_fore"]
E_RAISED = np.array(_arm["elbow_raised"])
W_RAISED = np.array(_arm["wrist_raised"])
GRIP = np.array(_arm["grip"])
FORE_RAISED = _arm["fore_angle_raised"]
HAND_RAISED = _arm["hand_angle_raised"]
L_GRIP = float(np.linalg.norm(GRIP - E_RAISED))       # elbow -> grip (rigid w/ hand)
HAND_OFS = HAND_RAISED - FORE_RAISED

FOREARM_REST = -8.0   # forearm angle at rest: pointing into the body, hidden behind torso
EXT_REST = -1.5       # elbow pulled up inside the sleeve at rest


def unit(deg):
    r = math.radians(deg)
    return np.array([math.cos(r), math.sin(r)])


def rot(p, piv, deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    d = np.asarray(p, float) - piv
    return piv + np.array([c * d[0] - s * d[1], s * d[0] + c * d[1]])


def ik(target, ext):
    """two-bone IK, elbow bending outward (to screen-left)."""
    L1 = L_SLEEVE + ext * SKIN_EXT
    L2 = L_GRIP
    d = target - P
    D = min(np.linalg.norm(d), L1 + L2 - 1e-3)
    base = math.degrees(math.atan2(d[1], d[0]))
    cos_a = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)
    a = math.degrees(math.acos(max(-1, min(1, cos_a))))
    up = base - a                                   # elbow to the left of the line
    E = P + unit(up) * L1
    v = target - E
    fore = math.degrees(math.atan2(v[1], v[0]))
    return up % 360, fore


# ------------------------------------------------------------------ easing
def smoothstep(x):
    x = min(1, max(0, x)); return x * x * (3 - 2 * x)

def ease_io(x, p=2.6):
    x = min(1, max(0, x))
    return 0.5 * (2 * x) ** p if x < 0.5 else 1 - 0.5 * (2 * (1 - x)) ** p

def seg(t, t0, t1):
    return min(1, max(0, (t - t0) / (t1 - t0)))

def lerp(a, b, x):
    return a + (b - a) * x

def unwrap(ref, ang):
    while ang - ref > 180: ang -= 360
    while ang - ref < -180: ang += 360
    return ang

def hermite_keys(keys, t):
    """keys: [(time, value)], monotone cubic (Catmull-Rom with zero end tangents)."""
    ts = [k[0] for k in keys]; vs = [np.asarray(k[1], float) for k in keys]
    if t <= ts[0]: return vs[0]
    if t >= ts[-1]: return vs[-1]
    i = max(j for j in range(len(ts) - 1) if ts[j] <= t)
    t0, t1 = ts[i], ts[i + 1]
    def tan(j):
        if j == 0 or j == len(ts) - 1: return np.zeros_like(vs[j])
        return (vs[j + 1] - vs[j - 1]) / (ts[j + 1] - ts[j - 1])
    h = t1 - t0; x = (t - t0) / h
    h00 = 2 * x**3 - 3 * x**2 + 1; h10 = x**3 - 2 * x**2 + x
    h01 = -2 * x**3 + 3 * x**2; h11 = x**3 - x**2
    return h00 * vs[i] + h10 * h * tan(i) + h01 * vs[i + 1] + h11 * h * tan(i + 1)


# --------------------------------------------------------------- timeline
# Times in seconds (30 fps master). Scene 06 = 5-6 s, scene 07 = 6-7 s.
T_RAISE0, T_CONTACT = 5.00, 5.48
T_TIP0, T_TIP1 = 5.56, 5.86
T_UNTIP0, T_UNTIP1 = 6.06, 6.34
T_RELEASE, T_LOWER1 = 6.42, 6.98
HAT_TIP = -7.0         # brim dips forward
HEAD_NOD = -2.2


def hat_angle(t):
    a = HAT_TIP * ease_io(seg(t, T_TIP0, T_TIP1))
    a -= HAT_TIP * ease_io(seg(t, T_UNTIP0, T_UNTIP1))
    # tiny settle after release
    a += 0.6 * math.sin(math.pi * seg(t, T_UNTIP1, T_UNTIP1 + 0.3)) * (t > T_UNTIP1)
    return a


def head_angle(t):
    # breathing-scale idle + nod with the tip + small turn back after
    a = HEAD_NOD * ease_io(seg(t, T_TIP0 - 0.04, T_TIP1 + 0.04))
    a -= HEAD_NOD * ease_io(seg(t, T_UNTIP0, T_UNTIP1 + 0.08))
    a += -0.8 * math.sin(math.pi * seg(t, 4.55, 5.05))               # anticipation glance
    a += 0.9 * math.sin(math.pi * seg(t, T_UNTIP1, T_UNTIP1 + 0.7))  # confident lift
    return a


def grip_point(t):
    """brim pinch point in head-local (unrotated) space, rotated with hat+head."""
    g = rot(GRIP, HAT_PIV, hat_angle(t))
    return rot(g, HEAD_PIV, head_angle(t))


def arm_pose(t):
    """returns (upper_arm_angle, ext, forearm_angle)."""
    rest = (REST_ANG, EXT_REST, FOREARM_REST)
    if t <= T_RAISE0 or t >= T_LOWER1:
        return rest
    pre = GRIP + np.array([-16.0, 16.0])          # approach point just off the brim
    up_c, fo_c = ik(grip_point(t), 1.0)
    if t < T_CONTACT:
        x = seg(t, T_RAISE0, T_CONTACT)
        up_p, fo_p = ik(pre, 0.95)
        keys = [
            (0.00, [REST_ANG, EXT_REST, FOREARM_REST]),
            (0.30, [REST_ANG + 30, 0.35, -48.0]),
            (0.72, [unwrap(REST_ANG, up_p), 0.95, unwrap(-48, fo_p)]),
            (1.00, [unwrap(REST_ANG, up_c), 1.0, unwrap(-48, fo_c)]),
        ]
        v = hermite_keys(keys, ease_io(x, 1.9))
        return float(v[0]), float(v[1]), float(v[2])
    if t < T_RELEASE:
        return up_c, 1.0, fo_c
    # release: hand lifts off the brim, then the arm lowers back into rest
    x = seg(t, T_RELEASE, T_LOWER1)
    off = GRIP + np.array([-20.0, 22.0])
    up_o, fo_o = ik(off, 0.95)
    up_r, fo_r = ik(grip_point(T_RELEASE), 1.0)
    keys = [
        (0.00, [up_r, 1.0, fo_r]),
        (0.18, [unwrap(up_r, up_o), 0.95, unwrap(fo_r, fo_o)]),
        (0.62, [unwrap(up_r, REST_ANG + 34), 0.35, -50.0]),
        (1.00, [unwrap(up_r, REST_ANG), EXT_REST, FOREARM_REST]),
    ]
    v = hermite_keys(keys, ease_io(x, 1.7))
    return float(v[0]), float(v[1]), float(v[2])


def pose(t):
    """sprite transforms at time t: {name: (angle_deg, pivot(xy), offset(xy))}.

    The arm is solved in the torso frame; head/hat chain rotates about the neck.
    """
    up, ext, fo = arm_pose(t)
    hd = head_angle(t); ht = hat_angle(t)
    out = {}
    out["torso"] = (0.0, P, np.zeros(2))
    out["head"] = (hd, HEAD_PIV, np.zeros(2))
    # hat: rotate about its pivot, then about the neck (compose)
    hp = rot(HAT_PIV, HEAD_PIV, hd)
    out["hat"] = (hd + ht, HAT_PIV, hp - HAT_PIV)
    out["uparm"] = (up - REST_ANG, P, np.zeros(2))
    # upskin authored at raised pose with ext=1
    shift = unit(up) * (ext - 1.0) * SKIN_EXT
    out["upskin"] = (up - UP_ANG, P, shift)
    E = P + unit(up) * (L_SLEEVE + ext * SKIN_EXT)
    out["forearm"] = (fo - FORE_RAISED, E_RAISED, E - E_RAISED)
    Wr = E + unit(fo) * L_FORE
    hand = fo + HAND_OFS
    out["hand"] = (hand - HAND_RAISED, W_RAISED, Wr - W_RAISED)
    return out


def apply(tf, p):
    ang, piv, off = tf
    return rot(p, piv, ang) + off
