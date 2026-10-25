"""Synthesize the motion-graphics sound design (no music, no voice, no
ambience). Every cue is derived from the animation constants in
blender/build_scene.py and tools/rig.py, so audio stays frame-locked.

Signatures:
  assembly   directional filtered-air passes + soft mechanical placement clicks
  subtitle   short, bright tonal ticks (distinct from the assembly)
  worker     soft rising air pass + low settle as he plants
  helmet     very subtle plastic contact taps (touch, release)

usage: python3 tools/make_sfx.py build/audio/sfx.wav
"""
import math, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "blender"))
sys.path.insert(0, HERE)
import build_scene as B  # noqa: E402  (constants only; main() is not run)
import rig  # noqa: E402

SR = 48000
DUR = B.DURATION + 0.6          # short tail after the final frame
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)


def place(sig, t, pan, gain=1.0):
    """add mono signal at time t with constant-power pan (-1 left .. 1 right).
    pan may be an array (moving source)."""
    i0 = int(t * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0] * gain
    pan = np.broadcast_to(np.asarray(pan, float), sig.shape) if np.ndim(pan) else np.full(sig.shape, pan)
    pan = pan[: len(sig)]
    a = (pan + 1) * math.pi / 4
    L[i0:i0 + len(sig)] += sig * np.cos(a)
    R[i0:i0 + len(sig)] += sig * np.sin(a)


def svf_bandpass(x, fc, q):
    """Chamberlin state-variable band-pass with per-sample cutoff."""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    damp = 1.0 / q
    low = band = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        high = x[i] - low - damp * band
        band += f[i] * high
        low += f[i] * band
        out[i] = band
    return out


def onepole_lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s
        y[i] = s
    return y


def whoosh(dur, f0, f1, peak=0.62, q=1.4, air=0.35):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    env = np.where(t < peak, (t / peak) ** 2.2, ((1 - t) / (1 - peak)) ** 1.6)
    env = env * (0.5 - 0.5 * np.cos(np.pi * np.clip(t * 6, 0, 1)))
    fc = f0 * (f1 / f0) ** (np.sin(np.pi * t * 0.5) ** 1.2)
    noise = rng.standard_normal(n)
    sig = svf_bandpass(noise, fc, q) * 0.9 + onepole_lp(noise, 380) * air
    return sig * env


def click(gain=1.0, bright=1.0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    burst = rng.standard_normal(n) * np.exp(-t / 0.0022)
    burst = burst - onepole_lp(burst, 1800)                       # high-passed transient
    tone = np.sin(2 * np.pi * 2350 * bright * t) * np.exp(-t / 0.012) * 0.35
    thump = np.sin(2 * np.pi * 92 * t) * np.exp(-t / 0.035) * 0.55
    return (burst * 0.6 + tone + thump) * gain


def text_tick(gain=1.0, pitch=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 3150 * pitch * t) * 0.55 + np.sin(2 * np.pi * 4720 * pitch * t) * 0.3) * np.exp(-t / 0.028)
    s *= 1 - np.exp(-t / 0.0015)
    shimmer = svf_bandpass(rng.standard_normal(n), 7000, 3.0) * np.exp(-t / 0.04) * 0.25
    return (s + shimmer) * gain


def plastic_tap(gain=1.0):
    n = int(0.15 * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 910 * t) * 0.5 + np.sin(2 * np.pi * 1660 * t) * 0.35 + np.sin(2 * np.pi * 2870 * t) * 0.2)
    s *= np.exp(-t / 0.022) * (1 - np.exp(-t / 0.0008))
    s += rng.standard_normal(n) * np.exp(-t / 0.003) * 0.15
    return s * gain


def low_settle(gain=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 58 * t + 4 * np.exp(-t / 0.05)) * np.exp(-t / 0.12) * (1 - np.exp(-t / 0.004)) * gain


# ---------------------------------------------------------------- cues
# S1: camera glide past the flourish - barely-there air, left -> right
g = whoosh(1.15, 220, 520, peak=0.55, q=0.9, air=0.6)
place(g, 0.0, np.linspace(-0.6, 0.5, len(g)), 0.16)

# S2: each letter part travels from its scatter position into place
for name, (t0, t1) in B.ASSEMBLY.items():
    off = B.SCATTER[name][0]
    pan0 = float(np.clip(off.x * 1.6, -0.85, 0.85))
    dur = t1 - t0
    w = whoosh(dur + 0.05, 420 + 260 * abs(off.y), 1500 + 500 * (off.z > 0), peak=0.58)
    place(w, t0, np.linspace(pan0, pan0 * 0.15, len(w)), 0.20)
    # placement: lands when the decelerating part is ~97% home
    land = t0 + dur * 0.86
    place(click(1.0, bright=0.9 + 0.05 * len(name)), land, pan0 * 0.15, 0.42)

# S3: subtitle words - refined tonal ticks, stepping left to right
for k in range(4):
    t = B.SUB_T0 + k * B.SUB_STAGGER + 0.06
    place(text_tick(1.0, pitch=1.0 + 0.04 * k), t, -0.35 + 0.23 * k, 0.17)

# S4: worker rises from behind the lettering
w = whoosh(B.WORKER_T1 - B.WORKER_T0 + 0.1, 160, 900, peak=0.7, q=1.1, air=0.5)
place(w, B.WORKER_T0, 0.05, 0.40)
place(low_settle(), B.WORKER_T1 - 0.06, 0.05, 0.30)
place(click(0.6, bright=0.8), B.WORKER_T1 - 0.05, 0.05, 0.12)

# S6/S7: hat tip - arm raise air, contact tap, release tap, arm lowers
w = whoosh(rig.T_CONTACT - rig.T_RAISE0 + 0.05, 500, 1300, peak=0.6, q=1.6, air=0.2)
place(w, rig.T_RAISE0, np.linspace(-0.25, -0.1, len(w)), 0.13)
place(plastic_tap(), rig.T_CONTACT - 0.01, -0.1, 0.22)
place(plastic_tap(0.8), rig.T_UNTIP1 - 0.02, -0.1, 0.14)
w = whoosh(rig.T_LOWER1 - rig.T_RELEASE, 1100, 420, peak=0.4, q=1.6, air=0.2)
place(w, rig.T_RELEASE, np.linspace(-0.1, -0.25, len(w)), 0.10)

# ---------------------------------------------------------------- master
def small_room(x):
    n = int(0.42 * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / 0.09)
    ir = onepole_lp(ir, 5200); ir /= np.sqrt((ir ** 2).sum())
    return np.convolve(x, ir)[: len(x)]

mixL = L + small_room(L) * 0.14
mixR = R + small_room(R) * 0.14
peak = max(np.abs(mixL).max(), np.abs(mixR).max())
gain = 10 ** (-3.0 / 20) / peak
out = np.tanh(np.stack([mixL, mixR], 1) * gain * 1.05) / np.tanh(1.05)
fade = np.ones(N); fade[-int(0.3 * SR):] = np.linspace(1, 0, int(0.3 * SR))
out *= fade[:, None]
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])), exist_ok=True)
with wave.open(sys.argv[1], "wb") as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((out * 32767).astype("<i2").tobytes())
print("wrote", sys.argv[1], f"{DUR:.2f}s")
