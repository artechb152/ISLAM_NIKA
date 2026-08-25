import bpy, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, '..', 'public', 'assets', 'chapter1', 'models')

def setup_and_render(path_glb, out_png, drop_armature):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path_glb)
    if drop_armature:
        for o in [o for o in bpy.data.objects if o.type != 'MESH']:
            bpy.data.objects.remove(o, do_unlink=True)
        for o in bpy.data.objects:
            for m in list(o.modifiers):
                o.modifiers.remove(m)
            o.parent = None
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    zs = [(o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
    ys = [(o.matrix_world @ v.co).y for o in meshes for v in o.data.vertices]
    xs = [(o.matrix_world @ v.co).x for o in meshes for v in o.data.vertices]
    h = max(zs) - min(zs)
    cx, cy, cz = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zs) + min(zs)) / 2
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (cx + h * 1.2, cy - h * 1.6, cz + h * 0.15)
    cam.rotation_euler = (math.radians(84), 0, math.radians(37))
    bpy.context.scene.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(45), 0, math.radians(40))
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 520, 760
    sc.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print('RENDERED', os.path.basename(out_png), 'height', round(h, 2))

setup_and_render(os.path.join(MODELS, 'traveler-stand.glb'), os.path.join(HERE, 'tour', 'uv-stand.png'), False)
setup_and_render(os.path.join(MODELS, 'traveler-anim.glb'), os.path.join(HERE, 'tour', 'uv-anim.png'), True)
