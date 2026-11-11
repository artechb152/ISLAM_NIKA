# Builds the player character, and the recoloured merchant that keeps him unique.
#
# Why: the traveller asset the player has been wearing is unrecoverable. Its
# only texture is a 123 KB WebP atlas whose per-triangle islands have bled into
# one another, and no higher-quality source survives anywhere on disk — the five
# NPCs have 5 MB source sheets under concept/chapter1/char-3d/src, the traveller
# has none. That bleed IS the grey diagonal streaking down his robe: it is
# painted into the texture, so no lighting or shadow work can reach it.
#
# The merchant is the right silhouette to inherit — a young man in a keffiyeh
# and cord, a sashed robe, sandals, standing in a near-A-pose that poses
# cleanly. He carries a 2048 texture where the traveller carried 1024.
#
# The player takes that mesh with its texture untouched, because he is on screen
# every second of the chapter and must be the best-looking thing in it. The
# merchant NPC — seen once, standing at a stall, for one conversation — is the
# one who gets recoloured, so the two never read as the same man. Recolouring
# the figure that matters least is the whole trick.
#
# The walk is not touched: still two poses, swapped and mirrored. This only
# replaces the meshes those poses live in.

import bpy, sys, os, math
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__ if '__file__' in dir() else bpy.data.filepath))
MODELS = os.path.normpath(os.path.join(HERE, '..', 'public', 'assets', 'chapter1', 'models'))
SRC = os.path.join(MODELS, '_src', 'npc-merchant.glb')
WORK = os.environ.get('CH1_OUT', MODELS)  # where the preview renders land

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default):
    for a in argv:
        if a.startswith(name + '='):
            return float(a.split('=', 1)[1])
    return default

MODE       = 'merchant' if any(a == 'mode=merchant' for a in argv) else 'player'
SAT_KEEP   = arg('sat', 0.62)   # how much of the original saturation survives
SAT_FLOOR  = arg('floor', 0.46)  # below this, a pixel is skin — leave it alone
VAL_LIFT   = arg('lift', 0.92)   # the merchant goes deeper, not paler
HUE_TARGET = arg('hue', 0.035)  # toward madder red, away from the player's tan
VAL_FLOOR  = arg('vfloor', 0.42) # below this a pixel is hair or shadow, not cloth
HUE_PULL   = arg('pull', 0.6)
STRIDE_DEG = arg('stride', 21.0)
RENDER     = arg('render', 1.0) > 0.5
EXPORT     = arg('export', 1.0) > 0.5

# ── load and normalise ──────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
assert meshes, 'no mesh in ' + SRC

bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.active_object
body.name = 'traveler'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def bounds(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))),
            Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb))))

lo, hi = bounds(body)
body.scale = (1.7 / (hi.z - lo.z),) * 3
bpy.ops.object.transform_apply(scale=True)
lo, hi = bounds(body)
body.location.z -= lo.z
bpy.ops.object.transform_apply(location=True)
lo, hi = bounds(body)
print('BODY height=%.3f' % (hi.z - lo.z))

# ── recolour (merchant only) ────────────────────────────────────────────────
# The atlas is per-triangle and chaotic, so there is no "robe" to select in
# texture space. What separates robe from skin here is saturation: the stripes
# are strongly saturated, skin is not. Everything below SAT_FLOOR passes
# through untouched, and the pull is ramped in above that line so no hard seam
# appears where cloth meets hand.
if MODE == 'merchant':
    img = None
    for m in body.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    img = n.image
                    break
    assert img is not None, 'no texture found'
    print('TEX %dx%d' % (img.size[0], img.size[1]))

    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    rgb = px[:, :3]
    mx, mn = rgb.max(axis=1), rgb.min(axis=1)
    d = mx - mn
    v = mx
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)

    hue = np.zeros_like(v)
    safe = d > 1e-6
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    sel = (mx == r) & safe; hue[sel] = ((g[sel] - b[sel]) / d[sel]) % 6.0
    sel = (mx == g) & safe; hue[sel] = (b[sel] - r[sel]) / d[sel] + 2.0
    sel = (mx == b) & safe; hue[sel] = (r[sel] - g[sel]) / d[sel] + 4.0
    hue = (hue / 6.0) % 1.0

    t = np.clip((s - SAT_FLOOR) / 0.20, 0.0, 1.0)
    t = t * t * (3.0 - 2.0 * t)
    # Saturation alone is not enough. Measured on this atlas, skin and the pale
    # keffiyeh sit at 0.2–0.45 saturation and the robe at 0.5–0.8, so the
    # saturation gate separates those correctly — but beard and hair are dark
    # brown, which is *higher* saturation than the robe and was being pulled
    # along with it, bleaching the one feature that makes the face read. They
    # part on value instead: cloth is mid-value, hair is not.
    vg = np.clip((v - VAL_FLOOR) / 0.16, 0.0, 1.0)
    t *= vg * vg * (3.0 - 2.0 * vg)

    s2 = s * (1.0 - t) + (s * SAT_KEEP) * t
    dh = ((HUE_TARGET - hue + 0.5) % 1.0) - 0.5
    h2 = (hue + dh * HUE_PULL * t) % 1.0
    v2 = np.clip(v * (1.0 + (VAL_LIFT - 1.0) * t), 0.0, 1.0)

    i = np.floor(h2 * 6.0)
    f = h2 * 6.0 - i
    p = v2 * (1.0 - s2)
    q = v2 * (1.0 - s2 * f)
    tt = v2 * (1.0 - s2 * (1.0 - f))
    i = (i % 6).astype(np.int32)
    out = np.empty_like(rgb)
    for k, (rr, gg, bb) in enumerate([(v2, tt, p), (q, v2, p), (p, v2, tt),
                                      (p, q, v2), (tt, p, v2), (v2, p, q)]):
        sel = i == k
        out[sel, 0] = rr[sel]; out[sel, 1] = gg[sel]; out[sel, 2] = bb[sel]
    px[:, :3] = out
    img.pixels[:] = px.reshape(-1).tolist()
    img.pack()
    print('RECOLOURED touched=%.1f%%' % (100.0 * (t > 0.02).mean()))

# ── rendering helper ────────────────────────────────────────────────────────
def render(tag):
    for o in list(bpy.data.objects):
        if o.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(o, do_unlink=True)
    ctr = Vector((0, 0, 0.85))
    for spec in ((3.2, -3.4, 3.0, 900), (-3.6, -2.2, 1.9, 260), (0.6, 4.0, 2.6, 420)):
        lt = bpy.data.lights.new('L', 'AREA'); lt.energy = spec[3]; lt.size = 3.0
        ob = bpy.data.objects.new('L', lt); bpy.context.collection.objects.link(ob)
        ob.location = spec[:3]
        ob.rotation_euler = (ctr - ob.location).to_track_quat('-Z', 'Y').to_euler()
    wd = bpy.data.worlds.new('W'); wd.use_nodes = True
    wd.node_tree.nodes['Background'].inputs[0].default_value = (0.62, 0.60, 0.56, 1)
    wd.node_tree.nodes['Background'].inputs[1].default_value = 0.55
    bpy.context.scene.world = wd
    cam = bpy.data.objects.new('C', bpy.data.cameras.new('C'))
    bpy.context.collection.objects.link(cam)
    cam.data.lens = 70
    cam.location = ctr + Vector((1.5, -3.4, 0.55))
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = 520; sc.render.resolution_y = 760
    sc.view_settings.view_transform = 'Standard'
    sc.render.filepath = os.path.join(WORK, 'p-%s.png' % tag)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', tag)

def export(path, extra=None):
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    if extra:
        extra.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_animations=False, export_skins=False, export_apply=True,
        export_yup=True, export_image_format='JPEG', export_jpeg_quality=88)
    print('WROTE %s (%.2f MB)' % (os.path.basename(path), os.path.getsize(path) / 1e6))

# The merchant only needs the recolour — he never strides.
if MODE == 'merchant':
    if EXPORT: export(os.path.join(MODELS, 'npc-merchant.glb'))
    if RENDER: render('merchant')
    print('DONE')
    sys.exit(0)

# ── armature: hips plus two legs, nothing more ─────────────────────────────
# Three bones is all a two-pose walk needs, and a small skeleton is what keeps
# the robe intact: everything above the hip rides one rigid bone, and only the
# hem is asked to follow the legs.
HIP_Z, KNEE_Z, ANKLE_Z, LEG_X = 0.94, 0.47, 0.07, 0.095

bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm = bpy.context.active_object
arm.name = 'traveler-rig'
eb = arm.data.edit_bones
for b in list(eb):
    eb.remove(b)
root = eb.new('root')
root.head, root.tail = (0, 0, HIP_Z), (0, 0, 1.62)
for side, sx in (('L', 1.0), ('R', -1.0)):
    thigh = eb.new('thigh.' + side)
    thigh.head, thigh.tail = (sx * LEG_X, 0, HIP_Z), (sx * LEG_X, 0, KNEE_Z)
    thigh.parent = root
    shin = eb.new('shin.' + side)
    shin.head, shin.tail = (sx * LEG_X, 0, KNEE_Z), (sx * LEG_X, 0, ANKLE_Z)
    shin.parent, shin.use_connect = thigh, True
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
# ARMATURE_NAME parents and creates the groups but leaves them empty. Blender's
# bone-heat solver silently produced no weights at all on this mesh — the
# armature bound, the pose moved nothing — so the weights are written here
# instead. Inverse distance to each bone segment, which is smooth everywhere by
# construction and therefore cannot tear the robe the way a hard left/right
# split does.
bpy.ops.object.parent_set(type='ARMATURE_NAME')

SEGMENTS = {
    'root':    ((0, 0, HIP_Z),        (0, 0, 1.62)),
    'thigh.L': ((LEG_X, 0, HIP_Z),    (LEG_X, 0, KNEE_Z)),
    'shin.L':  ((LEG_X, 0, KNEE_Z),   (LEG_X, 0, ANKLE_Z)),
    'thigh.R': ((-LEG_X, 0, HIP_Z),   (-LEG_X, 0, KNEE_Z)),
    'shin.R':  ((-LEG_X, 0, KNEE_Z),  (-LEG_X, 0, ANKLE_Z)),
}

co = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
body.data.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)

def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0.0, 1.0)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)

w = {k: 1.0 / np.power(seg_dist(co, np.array(a, float), np.array(b, float)) + 0.05, 3.5)
     for k, (a, b) in SEGMENTS.items()}

# Above the hip nothing may follow a leg, or the torso shears.
above = np.clip((co[:, 2] - (HIP_Z + 0.02)) / 0.18, 0.0, 1.0)
above = above * above * (3.0 - 2.0 * above)
for k in w:
    if k != 'root':
        w[k] *= (1.0 - above)
w['root'] = w['root'] * (1.0 - above) + above * 1e7
tot = sum(w.values())
for k in w:
    w[k] /= tot

for name, ww in w.items():
    vg = body.vertex_groups.get(name) or body.vertex_groups.new(name=name)
    # bucket the weights so this is a few hundred calls instead of 150,000
    q = np.clip((ww * 64).astype(np.int32), 0, 64)
    for level in range(1, 65):
        idx = np.nonzero(q == level)[0]
        if len(idx):
            vg.add(idx.tolist(), level / 64.0, 'REPLACE')
print('MODIFIERS on body:', [m.type for m in body.modifiers],
      'groups:', len(body.vertex_groups),
      'leg-driven verts:', int((w['root'] < 0.98).sum()))

def evaluated_span():
    """Foot separation along the walking axis, read off the deformed mesh.
       The pose is only real if this number moves."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    ys = [ (body.matrix_world @ v.co).y for v in me.vertices if (body.matrix_world @ v.co).z < 0.18 ]
    ev.to_mesh_clear()
    return (min(ys), max(ys), max(ys) - min(ys)) if ys else (0, 0, 0)

def set_pose(pairs):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    for name, rx in pairs:
        pb = arm.pose.bones[name]
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (math.radians(rx), 0.0, 0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()

set_pose([('thigh.L', 0), ('thigh.R', 0), ('shin.L', 0), ('shin.R', 0)])
print('STAND  feet y: %.3f..%.3f span=%.3f' % evaluated_span())
if EXPORT: export(os.path.join(MODELS, 'traveler-stand.glb'), arm)
if RENDER: render('stand')

set_pose([('thigh.L', -STRIDE_DEG), ('thigh.R', STRIDE_DEG),
          ('shin.L', STRIDE_DEG * 0.40), ('shin.R', -STRIDE_DEG * 0.18)])
print('STRIDE feet y: %.3f..%.3f span=%.3f' % evaluated_span())
if EXPORT: export(os.path.join(MODELS, 'traveler-stride.glb'), arm)
if RENDER: render('stride')

# The passing phase — legs crossing, trailing heel lifting. Until now the walk
# reused the neutral stand for this phase, which is what made it read as a
# flipbook: a walker mid-cycle is never simply standing. Small angles on
# purpose: this pose is on screen for a third of each step.
PASS_DEG = 7.0
set_pose([('thigh.L', -PASS_DEG), ('thigh.R', PASS_DEG),
          ('shin.L', PASS_DEG * 2.6), ('shin.R', PASS_DEG * 0.5)])
print('PASSING feet y: %.3f..%.3f span=%.3f' % evaluated_span())
if EXPORT: export(os.path.join(MODELS, 'traveler-passing.glb'), arm)
if RENDER: render('passing')


# ── a real walk: the same bones, keyframed ─────────────────────────────────
# The three baked poses read as a flipbook next to Rawi's skinned walk. The
# armature and weights already exist — so the honest fix is a keyframed cycle
# on those bones, exported WITH the skin, and played back like Rawi's clips.
# Neutral stand is the bind pose, so fading the clip out IS standing still.
import math as _math

def export_animated(path):
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_animations=True, export_skins=True, export_apply=False,
        export_yup=True, export_image_format='JPEG', export_jpeg_quality=88)
    print('WROTE %s (%.2f MB)' % (os.path.basename(path), os.path.getsize(path) / 1e6))

scene = bpy.context.scene
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 25

arm.animation_data_create()
walk_action = bpy.data.actions.new('walk')
arm.animation_data.action = walk_action

def key_pose(frame, pairs):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    for name, rx in pairs:
        pb = arm.pose.bones[name]
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (_math.radians(rx), 0.0, 0.0)
        pb.keyframe_insert(data_path='rotation_euler', frame=frame)
    bpy.ops.object.mode_set(mode='OBJECT')

S = STRIDE_DEG
contact_a = [('thigh.L', -S), ('thigh.R', S), ('shin.L', S * 0.40), ('shin.R', -S * 0.18)]
pass_1    = [('thigh.L', 2), ('thigh.R', -2), ('shin.L', 6), ('shin.R', 18)]
contact_b = [('thigh.L', S), ('thigh.R', -S), ('shin.L', -S * 0.18), ('shin.R', S * 0.40)]
pass_2    = [('thigh.L', -2), ('thigh.R', 2), ('shin.L', 18), ('shin.R', 6)]
key_pose(1, contact_a)
key_pose(7, pass_1)
key_pose(13, contact_b)
key_pose(19, pass_2)
key_pose(25, contact_a)
if EXPORT: export_animated(os.path.join(MODELS, 'traveler-walk.glb'))

print('DONE')

# Run:
#   blender --background --factory-startup --python scripts/make-player.py -- export=1 render=0
#   blender --background --factory-startup --python scripts/make-player.py -- mode=merchant export=1
#
# Inputs and outputs, all under public/assets/chapter1/models:
#   _src/npc-merchant.glb   pristine input, never written to
#   traveler-stand.glb      player, neutral pose
#   traveler-stride.glb     player, mid-stride (the game mirrors it for the other foot)
#   npc-merchant.glb        the recoloured merchant
