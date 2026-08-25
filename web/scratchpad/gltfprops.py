import bpy
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
print('SKIN-RELATED:', [p for p in props if 'skin' in p.lower() or 'arm' in p.lower() or 'anim' in p.lower()])
