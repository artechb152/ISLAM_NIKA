# Skin the traveller's body onto Rawi's Mixamo skeleton — by TRANSFERRING
# Rawi's own weights, nearest-face, instead of computing new ones. Bone-heat
# fails on this mesh (the robe fuses the arms — the same reason Mixamo's
# rigger refused it), but Rawi is a robed humanoid of the same height whose
# weights Mixamo already solved. Wearing his weights is the whole trick.
import bpy, os, sys

MODELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'chapter1', 'models')

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Rawi: rig, clips, and the donor mesh
bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, 'rawi.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
rawi_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
donor = max(rawi_meshes, key=lambda o: len(o.data.vertices))
print('rig:', arm.name, 'bones:', len(arm.data.bones), 'donor:', donor.name, len(donor.data.vertices), 'verts')

# 2. The traveller's body — mesh only, none of its old rig empties
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, 'traveler-stand.glb'))
newcomers = set(bpy.data.objects) - before
body = next(o for o in newcomers if o.type == 'MESH')
body.parent = None
for o in newcomers:
    if o is not body:
        bpy.data.objects.remove(o, do_unlink=True)
body.vertex_groups.clear()
print('body:', body.name, len(body.data.vertices), 'verts')

# 3. Align the body to the rig's rest height
def height(o):
    zs = [(o.matrix_world @ v.co).z for v in o.data.vertices]
    return min(zs), max(zs)
r_min = min(height(m)[0] for m in rawi_meshes)
r_max = max(height(m)[1] for m in rawi_meshes)
b_min, b_max = height(body)
s = (r_max - r_min) / max(b_max - b_min, 1e-6)
body.scale = tuple(c * s for c in body.scale)
bpy.context.view_layer.update()
body.location.z += r_min - height(body)[0]
bpy.context.view_layer.update()
print('aligned: %.1f..%.1f' % height(body))
# Bake the alignment into the vertices: a skinned mesh exported with an
# unapplied object scale gets inconsistent bind matrices and explodes.
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
print('transforms applied; body scale now', tuple(body.scale))

# 4. Wear Rawi's weights: active = source, selected = destination
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = donor
bpy.ops.object.data_transfer(
    data_type='VGROUP_WEIGHTS', use_create=True,
    vert_mapping='POLYINTERP_NEAREST',
    layers_select_src='ALL', layers_select_dst='NAME')
# Garment discipline, per real-time skirt-rigging practice: the lower robe is
# driven ONLY by hips/spine/legs — an arm bone owning a skirt vertex is what
# tears the robe open when the arm swings. Mid-torso may keep shoulders/arms
# (sleeves) but never forearms/hands; finger bones own nothing anywhere (the
# hands are fused into the cloth on this mesh).
SKIRT_TOP = 78.0    # world z, hips sit at ~68
CHEST_TOP = 115.0
leg_allow = {'mixamorig:Hips', 'mixamorig:Spine'} | {
    'mixamorig:%s%s' % (s, p) for s in ('Left', 'Right') for p in ('UpLeg', 'Leg', 'Foot', 'ToeBase')}
gname = {g.index: g.name for g in body.vertex_groups}
removals = {n: [] for n in gname.values()}
for v in body.data.vertices:
    z = v.co.z
    for ge in v.groups:
        n = gname[ge.group]
        core = n.replace('mixamorig:', '')
        deny = ('Hand' in core and core not in ('LeftHand', 'RightHand'))
        if z < SKIRT_TOP and n not in leg_allow:
            deny = True
        elif z < CHEST_TOP and ('Hand' in core or 'ForeArm' in core):
            deny = True
        if deny:
            removals[n].append(v.index)
for n, idxs in removals.items():
    if idxs:
        body.vertex_groups[n].remove(idxs)
print('garment filter:', sum(len(i) for i in removals.values()), 'influences removed')
# Nearest-face transfer leaves a few robe vertices holding a hand or arm bone
# from across a fold — they stretch into flaps when the arm swings. Smooth the
# weights over the surface, cap influences, renormalise.
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=4, expand=0.0)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
print('weights smoothed, limited to 4, normalized')
groups = len(body.vertex_groups)
weighted = sum(1 for v in body.data.vertices if v.groups)
print('groups:', groups, 'weighted verts: %d/%d' % (weighted, len(body.data.vertices)))
if groups < 10 or weighted < len(body.data.vertices) * 0.9:
    print('TRANSFER FAILED')
    sys.exit(1)

# 5. The donor's work is done — but its transform state is copied first (step 6
#    needs it), so the removal moves after the bind.

# 6. Bind exactly the way the donor was bound: same parent, same parent-inverse,
#    same basis — so the exporter sees the body in the same frame it saw char1.
print('donor parent:', donor.parent.name if donor.parent else None,
      'donor basis scale:', tuple(round(v, 4) for v in donor.matrix_basis.to_scale()),
      'donor parent-inverse scale:', tuple(round(v, 4) for v in donor.matrix_parent_inverse.to_scale()),
      'arm scale:', tuple(round(v, 4) for v in arm.scale))
#    The body's vertices are in world units (transforms applied); express them
#    in the donor's local frame, so that under the donor's exact transform
#    state they land back where they are — and in the frame the skin expects.
inv = donor.matrix_world.inverted()
for v in body.data.vertices:
    v.co = inv @ v.co
body.parent = arm
body.matrix_parent_inverse = donor.matrix_parent_inverse.copy()
body.matrix_basis = donor.matrix_basis.copy()
bpy.context.view_layer.update()
print('donor world height: %.2f..%.2f' % height(donor))
print('body world height after bind: %.2f..%.2f' % height(body))
mod = body.modifiers.new('Armature', 'ARMATURE')
mod.object = arm

for m in rawi_meshes:
    bpy.data.objects.remove(m, do_unlink=True)

# 7. Export everything that remains, every action as a clip
bpy.ops.object.select_all(action='SELECT')
out = os.path.join(MODELS, 'traveler-anim.glb')
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB',
    export_animations=True, export_skins=True, export_apply=False,
    export_yup=True, export_image_format='JPEG', export_jpeg_quality=88)
print('WROTE %s (%.2f MB)' % (out, os.path.getsize(out) / 1e6))
