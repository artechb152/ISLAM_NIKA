import bpy, os
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, '..', 'public', 'assets', 'chapter1', 'models')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, 'rawi.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    bpy.data.objects.remove(o, do_unlink=True)
print('deform flags:', {b.use_deform for b in arm.data.bones})
bpy.ops.mesh.primitive_cube_add(size=50, location=(0, 0, 80))
cube = bpy.context.active_object
bpy.ops.object.select_all(action='DESELECT')
cube.select_set(True); arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print('cube groups:', len(cube.vertex_groups))
out = os.path.join(HERE, 'minskin2.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_skins=True, export_apply=False, export_yup=True)
print('done')
