"""ARI Painting & Construction Corp. - cinematic 3D logo animation.

Builds the complete Blender scene (geometry, materials, lighting, camera,
animation) from the assets prepared by tools/*.py, saves an editable .blend
and optionally renders.

usage (bpy as a Python module, Blender 5.2):
  python3 blender/build_scene.py                      # build + save .blend
  python3 blender/build_scene.py --render out/frames  # build + render all frames
  options: --frames 1-270  --samples 96  --alpha  --res 100  --step 1

Units: 1 logo pixel = 1 mm. Logo pixel (u, v) -> world X = (u-686)/1000,
Z = (1445-v)/1000. Letters stand in the XZ plane, camera looks toward +Y.
"""
import argparse, json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import rig  # noqa: E402
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector, Euler  # noqa: E402

FPS = 30
DURATION = 9.0
N_FRAMES = int(DURATION * FPS)
CX, CZ = 686.0, 1445.0
MM = 0.001


def W(u, v):
    """logo px -> world XZ (Y = 0)"""
    return Vector(((u - CX) * MM, 0.0, (CZ - v) * MM))


# ---------------------------------------------------------------- utilities
def clamp01(x):
    return max(0.0, min(1.0, x))


def ease_out(x, p=3.0):
    x = clamp01(x); return 1 - (1 - x) ** p


def ease_io(x, p=3.0):
    return rig.ease_io(x, p)


def smooth_keys(keys, t):
    return rig.hermite_keys(keys, t)


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links


def add_fade(mat, nodes, links, shader_out):
    """mix final shader with transparency driven by the object's ["fade"]."""
    attr = nodes.new("ShaderNodeAttribute"); attr.attribute_type = "OBJECT"; attr.attribute_name = "fade"
    tr = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(attr.outputs["Fac"], mix.inputs[0])
    links.new(tr.outputs[0], mix.inputs[1])
    links.new(shader_out, mix.inputs[2])
    out = nodes["Material Output"]
    links.new(mix.outputs[0], out.inputs["Surface"])


# ---------------------------------------------------------------- scene reset
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, N_FRAMES
    sc.unit_settings.system = "METRIC"
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    return sc


# ---------------------------------------------------------------- materials
def mat_black_satin():
    m, n, l = new_mat("Letter_MatteBlack")
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.0135, 0.0135, 0.014, 1)
    b.inputs["Roughness"].default_value = 0.34            # satin powder coat
    b.inputs["Specular IOR Level"].default_value = 0.45
    add_fade(m, n, l, b.outputs["BSDF"])
    return m


def mat_backer():
    m, n, l = new_mat("Subtitle_Backer")
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.80, 0.775, 0.735, 1)
    b.inputs["Roughness"].default_value = 0.7
    add_fade(m, n, l, b.outputs["BSDF"])
    return m


def mat_concrete():
    m, n, l = new_mat("Studio_Concrete")
    b = n["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Specular IOR Level"].default_value = 0.3
    tc = n.new("ShaderNodeTexCoord")
    n1 = n.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 2.2; n1.inputs["Detail"].default_value = 8.0
    n1.inputs["Roughness"].default_value = 0.62
    n2 = n.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 140.0; n2.inputs["Detail"].default_value = 4.0
    l.new(tc.outputs["Object"], n1.inputs["Vector"]); l.new(tc.outputs["Object"], n2.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.560, 0.548, 0.528, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.612, 0.600, 0.578, 1)
    l.new(n1.outputs["Fac"], ramp.inputs["Fac"]); l.new(ramp.outputs["Color"], b.inputs["Base Color"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.035; bump.inputs["Distance"].default_value = 0.002
    l.new(n2.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_sprite(name, img_path):
    m, n, l = new_mat("Worker_" + name)
    b = n["Principled BSDF"]
    tex = n.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(img_path, check_existing=True)
    tex.image.alpha_mode = "STRAIGHT"
    tex.interpolation = "Cubic"
    tex.extension = "EXTEND"
    l.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.52
    b.inputs["Specular IOR Level"].default_value = 0.32
    # printed-panel look: keep illustration colours faithful under soft light
    l.new(tex.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 0.10
    add_fade(m, n, l, b.outputs["BSDF"])
    return m


# ---------------------------------------------------------------- geometry
def curve_from_contours(name, contours, pivot_px, depth, bevel, mat):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"; cu.fill_mode = "BOTH"
    cu.extrude = depth / 2 - bevel
    cu.bevel_mode = "ROUND"; cu.bevel_depth = bevel; cu.bevel_resolution = 4
    cu.resolution_u = 20
    pu, pv = pivot_px
    for c in contours:
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(len(c) - 1)
        sp.use_cyclic_u = True
        L = lambda q: Vector(((q[0] - pu) * MM, (pv - q[1]) * MM, 0))
        for k, s in enumerate(c):
            p0 = L(s[1]); p3 = L(s[-1])
            if s[0] == "C":
                h1, h2 = L(s[2]), L(s[3])
            else:
                h1, h2 = p0.lerp(p3, 1 / 3), p0.lerp(p3, 2 / 3)
            bp = sp.bezier_points[k]
            bp.co = p0
            bp.handle_right_type = "FREE"; bp.handle_left_type = "FREE"
            bp.handle_right = h1
            nxt = sp.bezier_points[(k + 1) % len(c)]
            nxt.handle_left_type = "FREE"
            nxt.handle_left = h2
        # potrace joins consecutive curve segments tangentially: lock those
        # joints so tiny tangent mismatches don't show as shading seams
        for k, s in enumerate(c):
            prev = c[k - 1]
            if s[0] == "C" and prev[0] == "C":
                bp = sp.bezier_points[k]
                bp.handle_left_type = "ALIGNED"; bp.handle_right_type = "ALIGNED"
    ob = bpy.data.objects.new(name, cu)
    ob.data.materials.append(mat)
    ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def contour_centroid(contours):
    pts = np.array([q for c in contours for s in c for q in s[1:]], float)
    return float((pts[:, 0].min() + pts[:, 0].max()) / 2), float((pts[:, 1].min() + pts[:, 1].max()) / 2)


def sprite_mesh(name, png, org_px, scale, pivot_px, thickness, mat):
    """extruded cut-out from the PNG alpha; UVs are a front planar projection
    so the side walls carry the outline colour (printed-panel edge)."""
    import cv2
    from PIL import Image
    im = np.array(Image.open(png))
    a = im[..., 3].astype(np.float32) / 255.0
    a = cv2.GaussianBlur(a, (0, 0), 0.7)
    m = (a > 0.5).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    Hh, Ww = m.shape
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    pu, pv = pivot_px
    for c in cs:
        if cv2.contourArea(c) < 60:
            continue
        c = cv2.approxPolyDP(c, 0.55, True)[:, 0, :].astype(float)
        if len(c) < 3:
            continue
        # contour pixel centres -> pixel corners
        lp = [(x / scale + org_px[0], y / scale + org_px[1]) for x, y in c + 0.5]
        front = [bm.verts.new(((u - pu) * MM, 0.0, (pv - v) * MM)) for u, v in lp]
        back = [bm.verts.new(((u - pu) * MM, thickness, (pv - v) * MM)) for u, v in lp]
        try:
            f_front = bm.faces.new(front)
        except ValueError:
            continue
        f_back = bm.faces.new(list(reversed(back)))
        n = len(front)
        sides = []
        for i in range(n):
            j = (i + 1) % n
            sides.append(bm.faces.new((front[j], front[i], back[i], back[j])))
        uvmap = {}
        for vf, (u, v) in zip(front, lp):
            uvmap[vf] = ((u - org_px[0]) * scale / Ww, 1 - (v - org_px[1]) * scale / Hh)
        for vb, vf in zip(back, front):
            uvmap[vb] = uvmap[vf]
        for f in [f_front, f_back] + sides:
            for lo in f.loops:
                lo[uvl].uv = uvmap[lo.vert]
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def build_cyclorama(mat):
    """floor + cove + back wall (seamless studio sweep)."""
    me = bpy.data.meshes.new("Cyclorama")
    bm = bmesh.new()
    wall_y, r = 1.10, 0.55
    prof = [(-7.0, 0.0), (wall_y - r, 0.0)]
    for k in range(1, 16):
        a = math.radians(90 * k / 16)
        prof.append((wall_y - r + r * math.sin(a), r - r * math.cos(a)))
    prof += [(wall_y, r), (wall_y, 5.0)]
    xs = [-9.0, 9.0]
    rows = [[bm.verts.new((x, y, z)) for x in xs] for y, z in prof]
    for i in range(len(rows) - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new("Cyclorama", me)
    ob.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------------------------------------------------------------- build
def build(args):
    sc = reset()
    black = mat_black_satin()
    concrete = mat_concrete()
    letters = json.load(open(os.path.join(ROOT, "build/letters.json")))

    cyc = build_cyclorama(concrete)

    # ---- letter pieces ---------------------------------------------------
    DEPTH, BEVEL = 0.040, 0.0020
    layer_y = {"a_thick": -0.004, "a_flourish": -0.002, "a_leg": 0.0, "r": 0.0, "i": 0.0}
    pieces = {}
    for name, cont in letters.items():
        piv = contour_centroid(cont)
        ob = curve_from_contours("Ari_" + name, cont, piv, DEPTH, BEVEL, black)
        home = W(*piv) + Vector((0, layer_y[name], 0))
        ob["home"] = list(home)
        ob["fade"] = 1.0
        pieces[name] = ob

    # ---- subtitle ----------------------------------------------------------
    font = bpy.data.fonts.load(os.path.join(ROOT, "assets/fonts/Montserrat-800.ttf"))
    from PIL import ImageFont
    pil = ImageFont.truetype(os.path.join(ROOT, "assets/fonts/Montserrat-800.ttf"), 1000)
    EM = 56.3 * MM                       # matches the original subtitle width
    # calibrate Blender's font size against the font's em (PIL units)
    cal = bpy.data.curves.new("cal", "FONT"); cal.body = "Painting"; cal.font = font; cal.size = 1.0
    calo = bpy.data.objects.new("cal", cal); sc.collection.objects.link(calo)
    bpy.context.view_layer.update()
    l0, t0_, r0, b0 = pil.getbbox("Painting")
    SIZE = EM / (calo.dimensions.x / ((r0 - l0) / 1000.0))
    bpy.data.objects.remove(calo); bpy.data.curves.remove(cal)
    words = ["Painting", "&", "Construction", "Corp."]
    text = " ".join(words)
    x0_px, base_px = 316.0, 1274.0
    backer_mat = mat_backer()
    subs = []
    for k, w in enumerate(words):
        prefix = " ".join(words[:k]) + (" " if k else "")
        dx = pil.getlength(prefix) / 1000.0 * EM
        wwid = pil.getlength(w) / 1000.0 * EM
        objs = []
        for kind in ("text", "backer"):
            cu = bpy.data.curves.new(f"Sub_{k}_{kind}", "FONT")
            cu.body = w; cu.font = font; cu.size = SIZE
            cu.align_x = "LEFT"
            if kind == "text":
                cu.extrude = 0.0035; cu.bevel_depth = 0.0005; cu.bevel_resolution = 2
            else:
                # light knock-out outline behind the text (as in the original logo)
                cu.extrude = 0.0004; cu.bevel_depth = 0.0042; cu.bevel_resolution = 1
            ob = bpy.data.objects.new(f"Subtitle_{w}_{kind}", cu)
            ob.data.materials.append(black if kind == "text" else backer_mat)
            ob.rotation_euler = (math.radians(90), 0, 0)
            sc.collection.objects.link(ob)
            objs.append(ob)
        # word centre as the animation pivot
        base = W(x0_px, base_px)
        home = Vector((base.x + dx, -0.036, base.z))
        objs[0]["home"] = list(home); objs[1]["home"] = list(home + Vector((0, 0.0087, 0)))
        objs[0]["fade"] = 1.0; objs[1]["fade"] = 1.0
        subs.append((objs, wwid))

    # ---- worker ------------------------------------------------------------
    rj = json.load(open(os.path.join(ROOT, "build/rig.json")))
    aj = json.load(open(os.path.join(ROOT, "build/arm.json")))
    S = rj["scale"]
    HINGE_PX = (700.0, 792.0)
    root = bpy.data.objects.new("Worker_Root", None)
    sc.collection.objects.link(root)
    WORKER_Y = 0.034
    root["home"] = list(W(*HINGE_PX) + Vector((0, WORKER_Y, 0)))
    order = ["head", "hat", "upskin", "forearm", "hand", "torso", "uparm"]
    THICK = 0.004
    # depth of each layer (m, negative = toward camera); tight spacing keeps seams invisible
    LAYER_Y = {"upskin": -0.0050, "head": -0.0058, "hat": -0.0064, "forearm": -0.0066,
               "hand": -0.0070, "torso": -0.0074, "uparm": -0.0082}
    sprite_pivots = {n: tuple(v[1]) for n, v in rig.pose(0.0).items()}
    sprites = {}
    for i, n in enumerate(order):
        png = os.path.join(ROOT, f"build/layers/{n}.png")
        org = aj["bbox"][n][:2] if n in aj["bbox"] else [0, 0]
        piv = sprite_pivots[n]
        mat = mat_sprite(n, png)
        ob = sprite_mesh("Worker_" + n, png, org, S, piv, THICK, mat)
        ob.parent = root
        # local position relative to the hinge; later layers sit in front
        rel = W(*piv) - W(*HINGE_PX)
        ob["base"] = [rel.x, LAYER_Y[n], rel.z]
        ob["fade"] = 1.0
        sprites[n] = ob

    # ---- lighting ----------------------------------------------------------
    def area(name, loc, target, size, power, color=(1, 1, 1), shape="RECTANGLE", sy=None, spread=180):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = power; ld.color = color; ld.shape = shape
        ld.size = size; ld.size_y = sy or size
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        ld.spread = math.radians(spread)
        d = Vector(target) - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(ob)
        return ob
    area("Key_Softbox", (-2.6, -2.4, 3.1), (0.0, 0.0, 0.7), 1.4, 50, (1.0, 0.975, 0.94), spread=62)
    area("Fill_Softbox", (3.4, -3.2, 1.3), (0.0, 0.0, 0.6), 3.0, 16, (0.95, 0.97, 1.0), spread=80)
    area("Rim_Strip", (1.8, 0.75, 2.6), (0.0, 0.0, 0.9), 0.5, 70, (1.0, 0.96, 0.9), sy=2.5)
    area("Top_Bounce", (0.0, -1.0, 3.6), (0.0, 0.2, 0.5), 3.5, 25, (1.0, 0.98, 0.95))
    world = bpy.data.worlds.new("Studio"); sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.62, 0.60, 0.57, 1); bg.inputs["Strength"].default_value = 0.05

    # ---- camera ------------------------------------------------------------
    cd = bpy.data.cameras.new("Camera"); cd.sensor_width = 36.0
    cam = bpy.data.objects.new("Camera", cd); sc.collection.objects.link(cam); sc.camera = cam
    tgt = bpy.data.objects.new("Camera_Target", None); sc.collection.objects.link(tgt)
    con = cam.constraints.new("TRACK_TO"); con.target = tgt
    con.track_axis = "TRACK_NEGATIVE_Z"; con.up_axis = "UP_Y"
    cd.dof.use_dof = True; cd.dof.focus_object = None

    animate(sc, pieces, subs, root, sprites, cam, tgt)
    render_settings(sc, args)
    return sc, cyc


# ---------------------------------------------------------------- animation
# start offsets of the letter pieces (world m) and rotations (deg) - they
# float separated in space before the assembly
SCATTER = {
    "a_flourish": (Vector((0.10, -0.42, 0.10)), (18, -14, -9)),
    "a_leg":      (Vector((-0.30, 0.38, 0.30)), (-12, 22, 16)),
    "a_thick":    (Vector((0.30, 0.55, 0.22)), (10, -10, 14)),
    "r":          (Vector((0.55, -0.12, 0.34)), (-20, 18, -16)),
    "i":          (Vector((0.70, 0.30, -0.12)), (14, -24, 10)),
}
ASSEMBLY = {  # (start, end) seconds - staggered
    "a_flourish": (0.95, 1.80),
    "a_leg":      (1.05, 1.90),
    "a_thick":    (1.12, 2.00),
    "r":          (1.22, 2.08),
    "i":          (1.30, 2.16),
}
SUB_T0, SUB_STAGGER, SUB_DUR = 2.12, 0.10, 0.62
WORKER_T0, WORKER_T1 = 3.00, 3.78


def letter_state(name, t):
    t0, t1 = ASSEMBLY[name]
    off, rot = SCATTER[name]
    drift = (t0 - min(t, t0)) / t0 if t0 > 0 else 0       # 1 -> 0 before assembly
    # slow pre-assembly drift so the separated parts feel suspended, alive
    pre_off = off + Vector((0.025, 0.02, -0.015)) * drift
    x = (t - t0) / (t1 - t0)
    if x <= 0:
        k = 0.0
    else:
        k = 1 - (1 - clamp01(x)) ** 3.2                      # decelerate into place
        k = k * k * (3 - 2 * k) * 0.35 + k * 0.65            # soft start, no bounce
    k = clamp01(k)
    # curved path: the depth component lags the lateral one (engineered arc)
    kd = clamp01(k * 1.15 - 0.05) ** 1.15
    pos = Vector((pre_off.x * (1 - k), pre_off.y * (1 - kd), pre_off.z * (1 - k)))
    r = [math.radians(a) * (1 - k) for a in rot]
    return pos, r, k


def worker_entrance(t):
    """hinge angle (deg about X, negative = lying back) + rise (m)."""
    x = clamp01((t - WORKER_T0) / (WORKER_T1 - WORKER_T0))
    e = 1 - (1 - x) ** 3
    e = e * e * (3 - 2 * e) * 0.4 + e * 0.6
    ang = -84.0 * (1 - e)
    rise = -0.10 * (1 - e)
    return ang, rise, x


def follow_through(t):
    """damped secondary motion on head/hat after the worker plants (deg)."""
    dt = t - (WORKER_T1 - 0.12)
    if dt < 0:
        lag = clamp01((t - WORKER_T0) / (WORKER_T1 - WORKER_T0))
        return -2.5 * math.sin(math.pi * lag), -1.5 * math.sin(math.pi * lag)
    d = math.exp(-dt * 5.0)
    return 2.2 * d * math.sin(dt * 11.0), 3.0 * d * math.sin(dt * 11.0 - 0.6)


def idle(t):
    """breathing: tiny shoulder rise (px) on the torso chain."""
    return 1.4 * math.sin(2 * math.pi * (t - 3.8) / 2.6) * clamp01((t - 3.8) / 0.6)


def key_obj(ob, loc=None, rot=None, frame=1):
    if loc is not None:
        ob.location = loc; ob.keyframe_insert("location", frame=frame)
    if rot is not None:
        ob.rotation_euler = rot; ob.keyframe_insert("rotation_euler", frame=frame)


def key_fade(ob, v, frame):
    ob["fade"] = v; ob.keyframe_insert('["fade"]', frame=frame)


def animate(sc, pieces, subs, root, sprites, cam, tgt):
    for f in range(1, N_FRAMES + 1):
        t = (f - 1) / FPS
        # letters
        for name, ob in pieces.items():
            pos, r, k = letter_state(name, t)
            home = Vector(ob["home"])
            key_obj(ob, home + pos, Euler((math.radians(90) + r[0], r[1], r[2])), f)
        # subtitle words: rise + fade, staggered
        for k, (objs, wwid) in enumerate(subs):
            x = clamp01((t - SUB_T0 - k * SUB_STAGGER) / SUB_DUR)
            e = 1 - (1 - x) ** 3
            for ob in objs:
                home = Vector(ob["home"])
                key_obj(ob, home + Vector((0, -0.05 * (1 - e), -0.035 * (1 - e))), None, f)
                key_fade(ob, clamp01(x * 1.6), f)
                ob.hide_render = x <= 0; ob.keyframe_insert("hide_render", frame=f)
        # worker: hinge entrance on the root, rig on the sprites
        ang, rise, wx = worker_entrance(t)
        rhome = Vector(root["home"])
        key_obj(root, rhome + Vector((0, 0, rise)), Euler((math.radians(ang), 0, 0)), f)
        pose = rig.pose(t)
        hd_ft, hat_ft = follow_through(t) if t < 4.6 else (0.0, 0.0)
        br = idle(t)
        for n, ob in sprites.items():
            ang2, piv, off = pose[n]
            extra = 0.0
            if n == "head":
                extra = hd_ft
            if n == "hat":
                extra = hd_ft + hat_ft
                # keep the hat seated on the head while the head lags
                hp = rig.rot(rig.HAT_PIV, rig.HEAD_PIV, hd_ft)
                off = off + (hp - rig.HAT_PIV)
            base = Vector(ob["base"])
            dy_breath = -br if n in ("torso", "uparm", "upskin", "forearm", "hand", "head", "hat") else 0
            loc = base + Vector((off[0] * MM, 0, -(off[1] + dy_breath) * MM))
            key_obj(ob, loc, Euler((0, math.radians(ang2 + extra), 0)), f)
            key_fade(ob, clamp01((t - WORKER_T0 + 0.02) / 0.22), f)
            # fully transparent stacked layers would exhaust transparent bounces
            ob.hide_render = t < WORKER_T0 - 0.02; ob.keyframe_insert("hide_render", frame=f)
        # camera
        c, tg, lens, fstop = camera_at(t)
        key_obj(cam, c, None, f); key_obj(tgt, tg, None, f)
        cam.data.lens = lens; cam.data.keyframe_insert("lens", frame=f)
        cam.data.dof.aperture_fstop = fstop; cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
        cam.data.dof.focus_distance = (c - tg).length
        cam.data.dof.keyframe_insert("focus_distance", frame=f)


# camera keys: (time, camera position, look-at target, focal length, f-stop)
_LET = None


def piece_point(name, u, v, t, front=True):
    """world position of logo pixel (u, v) on a letter piece's front face at time t."""
    global _LET
    if _LET is None:
        _LET = json.load(open(os.path.join(ROOT, "build/letters.json")))
    piv = contour_centroid(_LET[name])
    pos, r, _ = letter_state(name, t)
    local = Vector(((u - piv[0]) * MM, (piv[1] - v) * MM, 0.02 if front else 0.0))
    rotm = Euler((math.radians(90) + r[0], r[1], r[2])).to_matrix()
    layer_y = {"a_thick": -0.004, "a_flourish": -0.002}.get(name, 0.0)
    return W(*piv) + Vector((0, layer_y, 0)) + pos + rotm @ local


def camera_at(t):
    fa = piece_point("a_flourish", 215, 985, 0.0)      # thick body of the curl
    fb = piece_point("a_flourish", 330, 905, 1.0)      # where the sweep leaves the curl
    keys = [
        # S1 macro: grazing glide along the flourish's bevelled edge
        (0.00, list(fa + Vector((-0.40, -0.62, 0.20))), list(fa), 85, 2.8),
        (1.00, list(fb + Vector((0.16, -0.80, 0.13))), list(fb + Vector((0.05, 0.0, 0.0))), 75, 3.5),
        # S2 pull back to a perspective angle while the parts assemble
        (2.00, [-1.40, -3.05, 1.22], [0.06, 0.0, 0.50], 50, 6.0),
        # S3 ease to a front three-quarter
        (3.00, [-0.92, -3.40, 1.12], [0.02, 0.0, 0.56], 50, 7.0),
        # S4 tilt up with the worker
        (4.00, [-0.50, -3.35, 1.42], [0.01, 0.03, 0.92], 50, 7.0),
        # S5 slightly elevated, front facing
        (5.00, [-0.20, -3.25, 1.35], [0.04, 0.03, 0.90], 52, 7.0),
        # S6 slow push toward the signature gesture
        (6.00, [-0.14, -2.95, 1.34], [0.03, 0.03, 0.95], 54, 7.0),
        # S7/S8 dolly back to the full logo
        (7.00, [-0.10, -3.30, 1.10], [0.0, 0.03, 0.84], 52, 8.0),
        (8.00, [-0.03, -3.82, 0.86], [0.0, 0.03, 0.735], 50, 9.0),
        (9.00, [0.0, -3.86, 0.84], [0.0, 0.03, 0.73], 50, 9.0),
    ]
    v = smooth_keys([(k[0], k[1] + k[2] + [k[3], k[4]]) for k in keys], t)
    return Vector(v[0:3]), Vector(v[3:6]), float(v[6]), float(v[7])


# ---------------------------------------------------------------- render
def render_settings(sc, args):
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = args.samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.015
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 6; cy.diffuse_bounces = 3; cy.glossy_bounces = 3
    cy.transparent_max_bounces = 32
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.42
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = args.res
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "Khronos PBR Neutral"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = args.exposure
    sc.render.use_persistent_data = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", default=None)
    ap.add_argument("--frames", default=None)
    ap.add_argument("--step", type=int, default=1)
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--res", type=int, default=100)
    ap.add_argument("--exposure", type=float, default=0.0)
    ap.add_argument("--alpha", action="store_true")
    ap.add_argument("--save", default=os.path.join(HERE, "ari_logo_animation.blend"))
    args = ap.parse_args()
    sc, cyc = build(args)
    if args.alpha:
        sc.render.film_transparent = True
        cyc.is_shadow_catcher = True
        sc.render.image_settings.color_mode = "RGBA"
    if args.save and not args.render:
        bpy.ops.wm.save_as_mainfile(filepath=args.save, relative_remap=True)
        print("saved", args.save)
    if args.render:
        os.makedirs(args.render, exist_ok=True)
        frames = list(range(1, N_FRAMES + 1, args.step))
        if args.frames and "-" not in args.frames:
            frames = [int(x) for x in args.frames.split(",")]
        elif args.frames:
            a, b = [int(x) for x in args.frames.split("-")]
            frames = list(range(a, b + 1, args.step))
        import time
        for f in frames:
            out = os.path.join(args.render, f"f{f:04d}.png")
            if os.path.exists(out):
                continue
            t0 = time.time()
            sc.frame_set(f)
            sc.render.filepath = out
            bpy.ops.render.render(write_still=True)
            print(f"frame {f} {time.time() - t0:.1f}s", flush=True)


if __name__ == "__main__":
    main()
