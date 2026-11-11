"""Headless Blender side of `npm run add-model`.

Reads env vars set by scripts/import-blend.mjs:
  CH1_OUT      absolute path of the .glb to write
  CH1_OBJECTS  optional comma-separated object names; default = every mesh
  CH1_TRIS     triangle budget per object (default 9000)
  CH1_TEX      max texture edge in pixels (default 1024)

Web budgets matter here: BlenderKit assets routinely ship 4K PBR textures and
subdivided meshes, which land at 30-40 MB per object — unusable in a browser.
"""
import bpy
import os

OUT = os.environ["CH1_OUT"]
NAMES = [n.strip() for n in os.environ.get("CH1_OBJECTS", "").split(",") if n.strip()]
TRI_BUDGET = int(os.environ.get("CH1_TRIS", "9000"))
MAX_TEX = int(os.environ.get("CH1_TEX", "1024"))

for img in bpy.data.images:
    if max(img.size) > MAX_TEX:
        w, h = img.size
        k = MAX_TEX / max(w, h)
        try:
            img.scale(max(4, int(w * k)), max(4, int(h * k)))
            print("SCALED", img.name, w, "->", img.size[0])
        except Exception as e:  # noqa: BLE001
            print("SCALE FAILED", img.name, e)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
if NAMES:
    meshes = [o for o in meshes if o.name in NAMES]
    missing = set(NAMES) - {o.name for o in meshes}
    for m in missing:
        print("MISSING OBJECT:", m)
if not meshes:
    raise SystemExit("NO MESH OBJECTS TO EXPORT")

for o in meshes:
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception:  # noqa: BLE001 - drop what cannot be applied headless
            o.modifiers.remove(m)
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tris > TRI_BUDGET:
        d = o.modifiers.new("dec", 'DECIMATE')
        d.ratio = max(0.02, TRI_BUDGET / tris)
        try:
            bpy.ops.object.modifier_apply(modifier=d.name)
        except Exception:  # noqa: BLE001
            o.modifiers.remove(d)
    print("OBJECT", o.name, tris, "->", sum(len(p.vertices) - 2 for p in o.data.polygons))

bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    use_selection=True,
    export_animations=False,
    export_apply=True,
    export_yup=True,
    export_image_format='JPEG',
    export_jpeg_quality=72,
)
print("EXPORTED-OK", OUT)
