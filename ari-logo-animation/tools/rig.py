"""Worker puppet rig + performance (the hard-hat tip), v2.

Shared by the 2D preview (tools/preview_rig.py) and the Blender scene
(blender/build_scene.py) so both show exactly the same motion.

All coordinates are logo pixels, screen orientation (x right, y down);
angles are screen degrees (positive = clockwise on screen).

pose(t) returns, for every sprite, the transform that maps the sprite as
authored to its current pose:
    p' = R(angle) (S(sx) (p - pivot)) + pivot + offset
where S scales along the sprite's authored x axis (used for the sleeve's
foreshortening; 1.0 for everything else).

Arm chain: shoulder (P) -> elbow -> wrist, two-bone IK on the wrist. While
the fingers hold the brim, the hand is rigidly attached to the hard hat, so
contact is exact (no sliding) and the wrist turns with the hat.
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
REST_SCALE = _arm["rest_scale"]
UP_ANG = _arm["raised_angle"]
L_UP = _arm["len_upper"]
L_FORE = _arm["len_fore"]
E_RAISED = np.array(_arm["elbow_raised"])
W_RAISED = np.array(_arm["wrist_raised"])
FORE_RAISED = _arm["fore_angle_raised"]
HAND_RAISED = _arm["hand_angle_raised"]
HAND_REL = HAND_RAISED - FORE_RAISED          # wrist bend at the grip

FOREARM_REST = -8.0    # at rest the forearm points into the body, hidden by the torso


def unit(deg):
    r = math.radians(deg)
    return np.array([math.cos(r), math.sin(r)])


def rot(p, piv, deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    d = np.asarray(p, float) - piv
    return piv + np.array([c * d[0] - s * d[1], s * d[0] + c * d[1]])


def ik(target, L1, L2=L_FORE):
    """two-bone IK on the wrist; the elbow bends outward (screen-left)."""
    d = np.asarray(target, float) - P
    D = min(float(np.linalg.norm(d)), L1 + L2 - 1e-3)
    base = math.degrees(math.atan2(d[1], d[0]))
    a = math.degrees(math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)))))
    up = base - a
    E = P + unit(up) * L1
    v = np.asarray(target, float) - E
    return up % 360, math.degrees(math.atan2(v[1], v[0]))


# ------------------------------------------------------------------ easing
def smoothstep(x):
    x = min(1, max(0, x)); return x * x * (3 - 2 * x)


def ease_io(x, p=2.6):
    x = min(1, max(0, x))
    return 0.5 * (2 * x) ** p if x < 0.5 else 1 - 0.5 * (2 * (1 - x)) ** p


def seg(t, t0, t1):
    return min(1, max(0, (t - t0) / (t1 - t0)))


def unwrap(ref, ang):
    while ang - ref > 180: ang -= 360
    while ang - ref < -180: ang += 360
    return ang


def hermite_keys(keys, t):
    """keys: [(time, value)], Catmull-Rom with zero tangents at the ends."""
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
# Scene 06 = 5-6 s (gesture), scene 07 = 6-7 s (return).
T_ANTIC = 4.86            # shoulder prepares
T_RAISE0, T_CONTACT = 5.02, 5.50
T_TIP0, T_TIP1 = 5.60, 5.94
T_UNTIP0, T_UNTIP1 = 6.12, 6.42
T_RELEASE, T_LOWER1 = 6.46, 7.02
XFADE = 0.10              # original sleeve <-> drawn sleeve dissolve (s)
HAT_TIP = -8.0            # hat rotates forward on the head (brim down)
HEAD_NOD = -3.0           # head follows: ~11 deg total visible tip


def hat_angle(t):
    """hat rotation relative to the head."""
    a = HAT_TIP * ease_io(seg(t, T_TIP0, T_TIP1), 2.2)
    a -= HAT_TIP * ease_io(seg(t, T_UNTIP0, T_UNTIP1), 2.2)
    return a


def head_angle(t):
    a = HEAD_NOD * ease_io(seg(t, T_TIP0 + 0.04, T_TIP1 + 0.06), 2.2)
    a -= HEAD_NOD * ease_io(seg(t, T_UNTIP0 + 0.03, T_UNTIP1 + 0.10), 2.2)
    a += -0.9 * math.sin(math.pi * seg(t, T_ANTIC - 0.2, T_RAISE0 + 0.15))   # anticipation glance
    a += 1.0 * math.sin(math.pi * seg(t, T_UNTIP1, T_UNTIP1 + 0.75))          # confident lift
    return a


def hat_world(p, t):
    """map a point fixed to the hat (authored space) into the current pose."""
    return rot(rot(p, HAT_PIV, hat_angle(t)), HEAD_PIV, head_angle(t))


def grip_target(t):
    """wrist position + hand angle while holding the brim."""
    return hat_world(W_RAISED, t), HAND_RAISED + hat_angle(t) + head_angle(t)


def _keys_pose(keys, x):
    v = hermite_keys(keys, x)
    return float(v[0]), float(v[1]), float(v[2]), float(v[3])


def arm_pose(t):
    """(upper-arm angle, foreshortening scale, forearm angle, hand angle)."""
    rest = (REST_ANG, REST_SCALE, FOREARM_REST, FOREARM_REST + HAND_REL)
    if t < T_ANTIC or t >= T_LOWER1:
        return rest
    if t < T_RAISE0:
        # preparation: the shoulder settles back a touch before lifting
        k = math.sin(math.pi * seg(t, T_ANTIC, T_RAISE0 + 0.06))
        return (REST_ANG - 3.0 * k, REST_SCALE, FOREARM_REST, FOREARM_REST + HAND_REL)
    if t < T_CONTACT:
        x = ease_io(seg(t, T_RAISE0, T_CONTACT), 1.8)
        wt, ht = grip_target(T_CONTACT)
        up_c, fo_c = ik(wt, L_UP)
        up_p, fo_p = ik(W_RAISED + np.array([-20.0, 26.0]), L_UP * 0.97)
        k0 = REST_ANG - 3.0 * math.sin(math.pi * (T_RAISE0 - T_ANTIC) / (T_RAISE0 + 0.06 - T_ANTIC))
        keys = [
            (0.00, [k0, REST_SCALE, FOREARM_REST, FOREARM_REST + HAND_REL]),
            (0.30, [REST_ANG + 52, 0.80, -62.0, -62.0 + 8]),
            (0.74, [unwrap(REST_ANG, up_p), 0.97, unwrap(-62, fo_p), unwrap(-62, fo_p) + HAND_REL + 14]),
            (1.00, [unwrap(REST_ANG, up_c), 1.00, unwrap(-62, fo_c), unwrap(-62, ht)]),
        ]
        return _keys_pose(keys, x)
    if t < T_RELEASE:
        wt, ht = grip_target(t)
        up, fo = ik(wt, L_UP)
        return up, 1.0, fo, ht
    x = ease_io(seg(t, T_RELEASE, T_LOWER1), 1.7)
    wt, ht = grip_target(T_RELEASE)
    up_r, fo_r = ik(wt, L_UP)
    up_o, fo_o = ik(W_RAISED + np.array([-24.0, 30.0]), L_UP * 0.97)
    keys = [
        (0.00, [up_r, 1.00, fo_r, ht]),
        (0.20, [unwrap(up_r, up_o), 0.97, unwrap(fo_r, fo_o), unwrap(fo_r, fo_o) + HAND_REL + 16]),
        (0.64, [unwrap(up_r, REST_ANG + 48), 0.80, -60.0, -60.0 + 8]),
        (1.00, [unwrap(up_r, REST_ANG), REST_SCALE, FOREARM_REST, FOREARM_REST + HAND_REL]),
    ]
    return _keys_pose(keys, x)


def sleeve_mix(t):
    """0 = original foreshortened sleeve pixels, 1 = drawn raised sleeve."""
    return seg(t, T_RAISE0, T_RAISE0 + XFADE) * (1 - seg(t, T_LOWER1 - XFADE, T_LOWER1))


def pose(t):
    """sprite transforms at time t: {name: (angle_deg, pivot, offset, sx)}."""
    up, s, fo, hand = arm_pose(t)
    hd = head_angle(t); ht = hat_angle(t)
    z = np.zeros(2)
    out = {}
    out["torso"] = (0.0, P, z, 1.0)
    out["head"] = (hd, HEAD_PIV, z, 1.0)
    hp = rot(HAT_PIV, HEAD_PIV, hd)
    out["hat"] = (hd + ht, HAT_PIV, hp - HAT_PIV, 1.0)
    out["uparm"] = (up - REST_ANG, P, z, 1.0)          # original pixels (rest art)
    out["sleeve"] = (up, P, z, s)                      # drawn sleeve, authored along +x
    E = P + unit(up) * L_UP * s
    out["forearm"] = (fo - FORE_RAISED, E_RAISED, E - E_RAISED, 1.0)
    Wr = E + unit(fo) * L_FORE
    out["hand"] = (hand - HAND_RAISED, W_RAISED, Wr - W_RAISED, 1.0)
    return out


def fades(t):
    m = sleeve_mix(t)
    return {"uparm": 1.0 - m, "sleeve": m}


def apply(tf, p):
    ang, piv, off, sx = tf
    d = np.asarray(p, float) - piv
    return rot(piv + np.array([d[0] * sx, d[1]]), piv, ang) + off
