
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

