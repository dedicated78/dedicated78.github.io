"""Worker puppet rig + performance (the hard-hat tip), v3.

Shared by the 2D preview (tools/preview_rig.py) and the Blender scene
(blender/build_scene.py) so both show exactly the same motion.

All coordinates are logo pixels, screen orientation (x right, y down);
angles are screen degrees (positive = clockwise on screen).

pose(t) returns, for every sprite, the transform that maps the sprite as
authored to its current pose:
    p' = R(angle) (S(sx) (p - pivot)) + pivot + offset

Controls of the right arm (all continuous, no sprite swaps or fades):
  shoulder   small lift of the shoulder joint (px)
  upper arm  angle of the ORIGINAL sleeve + bare upper arm about the shoulder
  extension  how far the bare upper arm shows below the sleeve (foreshortening)
  elbow      two-bone IK on the wrist
  forearm    angle
  wrist      hand angle (independent of the forearm)
  fingers    curl of index + middle about the knuckles (0 = gripping the brim)
  thumb      thumb angle about its base (0 = under the brim)
While the hand holds the brim it is rigidly attached to the hard hat, so the
contact point cannot slide and the wrist turns with the hat.
At rest the bare arm, forearm and hand sit behind the torso and sleeve, so
the rest pose is the original logo artwork exactly.
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
FORE_RAISED = _arm["fore_angle_raised"]
HAND_RAISED = _arm["hand_angle_raised"]
K_FING = np.array(_arm["knuckle"])
K_THUMB = np.array(_arm["thumb_base"])
HAND_REL = HAND_RAISED - FORE_RAISED          # wrist bend at the grip

FOREARM_REST = -8.0    # at rest the forearm points into the body, behind the torso
EXT_REST = -1.5        # bare upper arm tucked inside the sleeve at rest


def unit(deg):
    r = math.radians(deg)
    return np.array([math.cos(r), math.sin(r)])


def rot(p, piv, deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    d = np.asarray(p, float) - piv
    return piv + np.array([c * d[0] - s * d[1], s * d[0] + c * d[1]])


def ik(target, L1, shoulder=None, L2=L_FORE):
    """two-bone IK on the wrist; the elbow bends outward (screen-left)."""
    S = P if shoulder is None else shoulder
    d = np.asarray(target, float) - S
    D = min(float(np.linalg.norm(d)), L1 + L2 - 1e-3)
    base = math.degrees(math.atan2(d[1], d[0]))
    a = math.degrees(math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)))))
    up = base - a
    E = S + unit(up) * L1
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
T_ANTIC = 4.84                    # A  preparation: shoulder sets, glance
T_RAISE0, T_CONTACT = 5.00, 5.62  # B  arm raise (two phases)
T_GRIP1 = 5.72                    # C  fingers close on the brim
T_TIP0, T_TIP1 = 5.74, 6.06       # D  hat tips forward, head follows
T_UNTIP0, T_UNTIP1 = 6.20, 6.48   # E  hat returns
T_RELEASE, T_OPEN1 = 6.50, 6.60   #    fingers release the brim
T_LOWER1 = 7.26                   #    arm lowers back to rest (two phases)
HAT_TIP = -9.0                    # hat rotates forward on the head (brim down)
HEAD_NOD = -3.0                   # head follows: ~12 deg total visible tip
SHOULDER_LIFT = 5.0               # px


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


def shoulder_lift(t):
    up = smoothstep(seg(t, T_ANTIC, T_CONTACT))
    down = smoothstep(seg(t, T_RELEASE, T_LOWER1))
    return SHOULDER_LIFT * up * (1 - down)


def shoulder(t):
    return P + np.array([0.0, -shoulder_lift(t)])


def hat_world(p, t):
    """map a point fixed to the hat (authored space) into the current pose."""
    return rot(rot(p, HAT_PIV, hat_angle(t)), HEAD_PIV, head_angle(t))


def grip_target(t):
    """wrist position + hand angle while holding the brim."""
    return hat_world(W_RAISED, t), HAND_RAISED + hat_angle(t) + head_angle(t)


REST = [REST_ANG, EXT_REST, FOREARM_REST, FOREARM_REST + HAND_REL, -6.0, 6.0, 1.0]


def arm_pose(t):
    """(upper arm angle, extension, forearm angle, hand angle, finger curl, thumb,
    forearm foreshortening scale)."""
    S = shoulder(t)
    if t < T_ANTIC or t >= T_LOWER1:
        return tuple(REST)
    if t < T_RAISE0:
        # A: preparation - the shoulder sets and the arm tucks a touch before lifting
        k = math.sin(math.pi * 0.5 * seg(t, T_ANTIC, T_RAISE0))
        return (REST_ANG - 3.0 * k, EXT_REST, FOREARM_REST, FOREARM_REST + HAND_REL, -6.0, 6.0, 1.0)
    if t < T_CONTACT:
        return _travel(ease_io(seg(t, T_RAISE0, T_CONTACT), 1.7), T_CONTACT, -18.0, 12.0)
    if t < T_RELEASE:
        # C/D: contact - IK keeps the wrist on the brim through the tip
        wt, ht = grip_target(t)
        up, fo = ik(wt, L_SLEEVE + SKIN_EXT, shoulder(t))
        g = ease_io(seg(t, T_CONTACT, T_GRIP1), 2.0)
        return (up, 1.0, fo, ht, -18.0 * (1 - g), 12.0 * (1 - g), 1.0)
    if t < T_OPEN1:
        # E: release - fingers open off the brim before the arm moves away
        wt, ht = grip_target(t)
        up, fo = ik(wt, L_SLEEVE + SKIN_EXT, shoulder(t))
        o = ease_io(seg(t, T_RELEASE, T_OPEN1), 2.0)
        return (up, 1.0, fo, ht, -20.0 * o, 14.0 * o, 1.0)
    # E: lower = the raise path run backwards (same arc, beside the face)
    return _travel(1.0 - ease_io(seg(t, T_OPEN1, T_LOWER1), 1.7), T_OPEN1, -20.0, 14.0, REST_ANG)


def _travel(x, t_grip, curl_g, thumb_g, up0=REST_ANG - 3.0):
    """B / E: arm path between rest (x=0) and the brim grip at t_grip (x=1),
    as joint-space keys (upper arm, extension, forearm, hand, fingers, thumb,
    forearm foreshortening).

    Phase 1: the elbow swings out and the bare upper arm slides out of the
    sleeve while the forearm stays folded behind the torso.
    Phase 2: the forearm swings up TOWARD the camera, so in 2D it is
    foreshortened and the hand rises beside the face (never across it).
    Phase 3: the forearm straightens to full length as the fingers reach the
    brim; the last key is the IK grip pose. The lower is this path run
    backwards. tools/check_arm_path.py verifies face clearance per frame."""
    wt, ht = grip_target(t_grip)
    up_c, fo_c = ik(wt, L_SLEEVE + SKIN_EXT, shoulder(t_grip))
    keys = [
        (0.00, [up0, EXT_REST, FOREARM_REST, FOREARM_REST + HAND_REL, -6.0, 6.0, 1.00]),
        (KEY1, [ARM1[0], ARM1[1], ARM1[2], ARM1[2] + HAND_REL, -10.0, 10.0, ARM1[3]]),
        (KEY2, [ARM2[0], ARM2[1], ARM2[2], ARM2[2] + HAND_REL + ARM2[4], -30.0, 18.0, ARM2[3]]),
        (1.00, [unwrap(ARM2[0], up_c), 1.00, unwrap(ARM2[2], fo_c), unwrap(ARM2[2], ht), curl_g, thumb_g, 1.00]),
    ]
    v = hermite_keys(keys, x)
    return tuple(float(a) for a in v)


# path keys: (upper-arm angle, extension, forearm angle, forearm scale[, wrist])
KEY1, ARM1 = 0.35, (150.0, 0.20, -10.0, 0.75)
KEY2, ARM2 = 0.68, (175.0, 0.80, -72.0, 0.55, 10.0)


def pose(t):
    """sprite transforms at time t: {name: (angle_deg, pivot, offset, sx)}."""
    up, ext, fo, hand, curl, thumb, sf = arm_pose(t)
    hd = head_angle(t); ht = hat_angle(t)
    S = shoulder(t)
    lift = S - P
    z = np.zeros(2)
    out = {}
    out["torso"] = (0.0, P, z, 1.0)
    out["head"] = (hd, HEAD_PIV, z, 1.0)
    hp = rot(HAT_PIV, HEAD_PIV, hd)
    out["hat"] = (hd + ht, HAT_PIV, hp - HAT_PIV, 1.0)
    # original sleeve artwork, rotated about the shoulder
    out["uparm"] = (up - REST_ANG, P, lift, 1.0)
    # bare upper arm emerging from the sleeve opening
    out["upskin"] = (up - UP_ANG, P, lift + unit(up) * (ext - 1.0) * SKIN_EXT, 1.0)
    E = S + unit(up) * (L_SLEEVE + ext * SKIN_EXT)
    # forearm authored along +x from the elbow: angle = fo, scaled along its axis
    out["forearm"] = (fo, E_RAISED, E - E_RAISED, sf)
    Wr = E + unit(fo) * L_FORE * sf
    hand_tf = (hand - HAND_RAISED, W_RAISED, Wr - W_RAISED, 1.0)
    out["hand"] = hand_tf
    kf = apply(hand_tf, K_FING)
    out["fingers"] = (hand - HAND_RAISED + curl, K_FING, kf - K_FING, 1.0)
    kt = apply(hand_tf, K_THUMB)
    out["thumb"] = (hand - HAND_RAISED + thumb, K_THUMB, kt - K_THUMB, 1.0)
    return out


def fades(t):
    """kept for API compatibility: v3 uses no opacity on the character."""
    return {}


def apply(tf, p):
    ang, piv, off, sx = tf
    d = np.asarray(p, float) - piv
    return rot(piv + np.array([d[0] * sx, d[1]]), piv, ang) + off
