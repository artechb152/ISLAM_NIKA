import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add()
cube = bpy.context.active_object
bpy.ops.object.armature_add()
arm = bpy.context.active_object
bpy.ops.object.select_all(action='DESELECT')
cube.select_set(True); arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'minskin.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_skins=True, export_apply=False, export_yup=True)
print('minimal export done')
