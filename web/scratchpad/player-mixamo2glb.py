# Assemble one GLB from Mixamo exports: walk FBX (mesh+rig) + idle/talk FBX
# (animations only) + the original baked texture from the Higgsfield GLB.
import bpy

DIR = "C:/Users/nikag/ISLAM_NIKA/concept/chapter1/rawi-3d/mixamo"
GLB_TEX = "C:/Users/nikag/ISLAM_NIKA/web/scratchpad/candA.glb"
OUT = "C:/Users/nikag/ISLAM_NIKA/web/scratchpad/player-mixamo.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)

def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    return [o for o in bpy.data.objects if o not in before]

# 1) walk: mesh + armature + action
objs = import_fbx(DIR + r"\player-walk.fbx")
arm = next(o for o in objs if o.type == 'ARMATURE')
mesh = max((o for o in objs if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
walk_act = arm.animation_data.action
walk_act.name = 'walk'

# 2) other clips: same character rig, take the action only
CLIPS = [('player-idle', 'idle'), ('player-run', 'run'), ('alt-hands', 'talk'),
         ('alt-ack', 'talk-ack'), ('alt-happy', 'talk-happy'), ('alt-nod', 'talk-nod')]
for fname, name in CLIPS:
    objs = import_fbx(DIR + rf"\{fname}.fbx")
    a2 = next(o for o in objs if o.type == 'ARMATURE')
    act = a2.animation_data.action
    act.name = name
    act.use_fake_user = True
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)

# Rawi-sourced talk clips live in another rig's hip space (collapses the
# character): replace their location+scale tracks with idle's frame-1 pose.
idle_act = bpy.data.actions['idle']
for tname in ('talk', 'talk-ack', 'talk-happy', 'talk-nod'):
    tact = bpy.data.actions[tname]
    for fc in list(tact.fcurves):
        if fc.data_path == 'location' or fc.data_path.endswith(('.location', '.scale')) or fc.data_path == 'scale':
            tact.fcurves.remove(fc)
    for fc in idle_act.fcurves:
        if fc.data_path == 'location' or fc.data_path.endswith(('.location', '.scale')) or fc.data_path == 'scale':
            nf = tact.fcurves.new(fc.data_path, index=fc.array_index)
            nf.keyframe_points.insert(1.0, fc.evaluate(1.0))

# 3) texture from the original GLB
before = set(bpy.data.images)
bpy.ops.import_scene.gltf(filepath=GLB_TEX)
new_imgs = [i for i in bpy.data.images if i not in before and i.size[0] > 4]
tex_img = max(new_imgs, key=lambda i: i.size[0] * i.size[1])
tex_img.name = 'player_tex'
# remove the imported glb objects
for o in list(bpy.data.objects):
    if o not in {arm, mesh}:
        bpy.data.objects.remove(o, do_unlink=True)

mat = bpy.data.materials.new('player')
mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = tex_img
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.85
mesh.data.materials.clear()
mesh.data.materials.append(mat)

# Mixamo's stray icosphere survives the per-step sweeps — drop everything
# that is not the rig or the body before export.
for o in list(bpy.data.objects):
    if o not in {arm, mesh}:
        bpy.data.objects.remove(o, do_unlink=True)

# 4) stash all actions on the armature so the glTF exporter emits 3 animations
FINAL = ('idle', 'walk', 'run', 'talk', 'talk-ack', 'talk-happy', 'talk-nod')
# drop any stray actions (e.g. the leftover Higgsfield clip) before export
for act in list(bpy.data.actions):
    if act.name not in FINAL:
        bpy.data.actions.remove(act)
arm.animation_data.action = None
for act in FINAL:
    track = arm.animation_data.nla_tracks.new()
    track.name = act
    track.strips.new(act, 1, bpy.data.actions[act])

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                          export_image_format='JPEG', export_jpeg_quality=85)
print('exported:', OUT)
