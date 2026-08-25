import bpy, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, '..', 'public', 'assets', 'chapter1', 'models')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, 'traveler-anim.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
# mid-stride pose from the walk clip
act = bpy.data.actions.get('walk')
arm.animation_data_create()
arm.animation_data.action = act
bpy.context.scene.frame_set(7)
# camera + light
h = 160
cam_data = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (250, -250, h * 0.55)
cam.rotation_euler = (math.radians(80), 0, math.radians(45))
bpy.context.scene.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 4
bpy.context.scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(30))
sc = bpy.context.scene
sc.render.resolution_x = 700
sc.render.resolution_y = 900
sc.render.filepath = os.path.join(HERE, 'tour', 'anim-render.png')
bpy.ops.render.render(write_still=True)
print('RENDERED')
