# Evaluated (skinned) world height of the GLB at rest and idle frame 1,
# plus the raw static bounds three.js's Box3 would see.
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="C:/Users/nikag/ISLAM_NIKA/web/scratchpad/player-mixamo.glb")
dg = bpy.context.evaluated_depsgraph_get()
for o in bpy.data.objects:
    if o.type == 'MESH':
        ev = o.evaluated_get(dg)
        m = ev.to_mesh()
        ys = [ (ev.matrix_world @ v.co).z for v in m.vertices ]  # glTF Y-up -> Blender Z-up
        print("SKIN height:", round(max(ys) - min(ys), 4), "min:", round(min(ys), 4))
        ev.to_mesh_clear()
        # raw geometry bounds through node matrix only (what Box3 sees)
        ys2 = [ (o.matrix_world @ v.co).z for v in o.data.vertices ]
        print("STATIC height:", round(max(ys2) - min(ys2), 4))
    if o.type == 'ARMATURE':
        print("armature scale:", tuple(round(s, 4) for s in o.scale))
