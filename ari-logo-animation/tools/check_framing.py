"""Framing QA: project key points of the worker / logo through the animated
camera for every frame and report clipping.

  - before the rise the whole worker must be below the frame edge
  - after the rise the hard hat (and, during the gesture, the hand and
    elbow) must stay inside the frame with a margin
usage: python3 tools/check_framing.py
"""
import math, os, sys
import numpy as np
sys.argv = sys.argv[:1]
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "blender"))
import build_scene as B  # noqa: E402
import rig  # noqa: E402

HINGE_PX = (700.0, 792.0)
WORKER_Y = 0.065
SENSOR_W, SENSOR_H = 36.0, 36.0 * 9 / 16


def project(q, c, tg, lens):
    f = np.array(tg - c); f /= np.linalg.norm(f)
    r = np.cross(f, [0, 0, 1.0]); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    d = np.asarray(q) - np.array(c)
    x, y, z = d @ r, d @ u, d @ f
    return x / z * lens / (SENSOR_W / 2), y / z * lens / (SENSOR_H / 2)


def worker_point(px, t, sprite):
    """world position of a logo pixel attached to a worker sprite at time t."""
    p = rig.apply(rig.pose(t)[sprite], px) if sprite else np.asarray(px, float)
    lift, pitch, roll, _ = B.worker_entrance(t)
    hinge = np.array(B.W(*HINGE_PX)) + np.array([0, WORKER_Y, lift])
    rel = np.array(B.W(*p)) - np.array(B.W(*HINGE_PX))
    a = math.radians(pitch)                       # rotation about X at the hinge
    y = rel[1] * math.cos(a) - rel[2] * math.sin(a)
    z = rel[1] * math.sin(a) + rel[2] * math.cos(a)
    return hinge + np.array([rel[0], y, z])


POINTS = {
    "hat top": ((780.0, 116.0), "hat"),
    "hat back": ((905.0, 200.0), "hat"),
    "brim tip": ((609.0, 228.0), "hat"),
    "fingertips": ((660.0, 196.0), "fingers"),
    "elbow": (tuple(rig.E_RAISED + np.array([-30.0, 0.0])), "forearm"),
    "sleeve R": ((1110.0, 690.0), None),
}

problems = []
worst_top = (9, None)
for f in range(1, B.N_FRAMES + 1):
    t = (f - 1) / B.FPS
    c, tg, lens, _ = B.camera_at(t)
    c, tg = np.array(c), np.array(tg)
    ys = {}
    for name, (px, spr) in POINTS.items():
        q = worker_point(px, t, spr)
        ys[name] = project(q, c, tg, lens)
    if t < B.WORKER_T0:
        hy = ys["hat top"][1]
        if hy > -1.0:
            problems.append(f"f{f} t={t:.2f}: worker visible before entrance (hat top ndc_y={hy:.2f})")
    if t >= B.WORKER_T1 - 0.25:
        for name in ("hat top", "hat back", "brim tip"):
            x, y = ys[name]
            if y > 0.94 or abs(x) > 0.97:
                problems.append(f"f{f} t={t:.2f}: {name} clipped/too close to edge (ndc {x:.2f},{y:.2f})")
        worst_top = min(worst_top, (1 - ys["hat top"][1], f))
    if rig.T_RAISE0 <= t <= rig.T_LOWER1:
        for name in ("fingertips", "elbow"):
            x, y = ys[name]
            if abs(x) > 0.95 or abs(y) > 0.95:
                problems.append(f"f{f} t={t:.2f}: {name} near/outside edge (ndc {x:.2f},{y:.2f})")
print("smallest hat-top margin after the rise: %.3f (ndc) at frame %s" % worst_top)
print("\n".join(problems) if problems else "framing OK: no clipping, worker hidden before his entrance")
