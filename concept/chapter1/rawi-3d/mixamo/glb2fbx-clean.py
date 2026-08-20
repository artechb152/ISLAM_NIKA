# Clean FBX for Mixamo: single joined mesh, no textures/materials, transforms
# applied, triangulated. Texture is re-applied on the way back via UVs.
import bpy

src = r"c:\Users\nikag\Downloads\ISLAM_NIKA\concept\chapter1\rawi-poc\rawi3-chat.glb"
dst = r"c:\Users\nikag\Downloads\ISLAM_NIKA\concept\chapter1\rawi-3d\rawi-for-mixamo-clean.fbx"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

for obj in list(bpy.data.objects):
    if obj.type == 'ARMATURE':
        bpy.data.objects.remove(obj, do_unlink=True)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for obj in meshes:
    for m in list(obj.modifiers):
        obj.modifiers.remove(m)
    obj.parent = None
    obj.data.materials.clear()
    # strip attributes Mixamo may choke on
    for attr in list(obj.data.color_attributes):
        obj.data.color_attributes.remove(attr)
    if obj.data.shape_keys:
        obj.shape_key_clear()

bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.export_scene.fbx(filepath=dst, use_selection=False, path_mode='STRIP', add_leaf_bones=False)
print("exported:", dst)
