# Every character GLB -> clean FBX for Mixamo upload: no armature, no
# materials, joined + triangulated, transforms applied.
import bpy, os

SRC = "C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter1/models"
DST = "C:/Users/nikag/ISLAM_NIKA/concept/chapter1/mixamo-upload"
CHARS = ["npc-chief", "npc-envoy", "npc-jewish", "npc-merchant", "npc-monk", "rawi"]

for name in CHARS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    for obj in list(bpy.data.objects):
        if obj.type == 'ARMATURE':
            bpy.data.objects.remove(obj, do_unlink=True)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    if not meshes:
        print("SKIP (no mesh):", name); continue
    for obj in meshes:
        for m in list(obj.modifiers):
            obj.modifiers.remove(m)
        obj.parent = None
        obj.data.materials.clear()
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
    out = f"{DST}/{name}.fbx"
    bpy.ops.export_scene.fbx(filepath=out, use_selection=False, path_mode='STRIP', add_leaf_bones=False)
    print("exported:", out)
