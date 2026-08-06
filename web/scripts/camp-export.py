"""Build camp.blend from the game's layout JSON — the "game → Blender" direction.

Every prop is imported from its GLB, scaled to the height the game uses, placed
at the same coordinates and given a name that encodes the model, so the reverse
script can read the scene back. Edit freely in Blender, save, then run
`npm run camp:import`.

Names look like:  ch1.tent2.001   ->  model "tent2"
Anything whose name does not start with `ch1.` is ignored on import, so you can
add reference objects, lights or cameras without polluting the layout.
"""
import bpy
import json
import math
import os
from mathutils import Quaternion, Vector

WEB = os.environ["CH1_WEB"]
LAYOUT = os.path.join(WEB, "src", "lib", "chapter1", "camp-layout.json")
MODELS = os.path.join(WEB, "public", "assets", "chapter1", "models")
OUT = os.environ["CH1_BLEND"]

with open(LAYOUT, encoding="utf-8") as fh:
    layout = json.load(fh)

bpy.ops.wm.read_factory_settings(use_empty=True)

cache = {}


def build_terrain(spec):
    """Import the canyon and reproduce exactly what the game does to it:
    scale to `span`, shift so the chosen basin sits at the origin, then flatten
    that basin with a smooth falloff. The result is the real ground, editable."""
    path = os.path.join(MODELS, spec["model"] + ".glb")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    if not new:
        print("TERRAIN IMPORT FAILED")
        return
    obj = new[0]

    # bake the importer's Y-up→Z-up rotation so we can work in world axes
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    d = obj.dimensions
    s = spec["span"] / max(d.x, d.y) if max(d.x, d.y) > 0 else 1
    obj.scale = (s, s, s)
    # glTF (x, z) maps to Blender (x, -y)
    obj.location = (-spec["campLocal"]["x"] * s, spec["campLocal"]["z"] * s, 0)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

    inner = spec["flatInner"]
    outer = spec["flatOuter"]
    verts = obj.data.vertices
    near = [v.co.z for v in verts if math.hypot(v.co.x, v.co.y) < inner]
    target = sum(near) / len(near) if near else 0.0
    for v in verts:
        d2 = math.hypot(v.co.x, v.co.y)
        if d2 >= outer:
            continue
        t = 0.0 if d2 <= inner else (d2 - inner) / (outer - inner)
        t = t * t * (3 - 2 * t)  # smoothstep, same curve as the game
        v.co.z = target * (1 - t) + v.co.z * t
    for v in verts:
        v.co.z -= target
    obj.data.update()

    obj.name = "ch1terrain"
    obj["ch1_terrain"] = 1
    print("TERRAIN-OK scale=%.4f flat=%.2f" % (s, target))


def load(model):
    """Import a GLB once; later copies reuse its mesh data."""
    if model in cache:
        return cache[model]
    path = os.path.join(MODELS, model + ".glb")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [o for o in bpy.data.objects if o not in before]
    for o in imported:
        o.hide_set(True)
        o.hide_render = True
    cache[model] = imported
    return imported


for i, p in enumerate(layout["props"]):
    src = load(p["model"])
    copies = []
    for o in src:
        if o.type != 'MESH':
            continue
        c = o.copy()
        c.data = o.data
        bpy.context.collection.objects.link(c)
        c.hide_set(False)
        c.hide_render = False
        copies.append(c)
    if not copies:
        print("NO MESH IN", p["model"])
        continue

    # group the copies so one transform moves the whole prop
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    if len(copies) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active

    # glTF imports carry a +90 deg X rotation (Y-up to Z-up). We must NOT bake
    # it away - the copies share mesh data and transform_apply refuses
    # multi-user meshes. Instead the desired yaw is composed on top of the
    # import rotation, and every measurement is taken in world space, which is
    # rotation-aware (obj.dimensions is not).
    obj.location = (0, 0, 0)
    obj.scale = (1, 1, 1)
    base_rot = obj.matrix_world.to_quaternion()
    bpy.context.view_layer.update()
    zs = [(obj.matrix_world @ Vector(v)).z for v in obj.bound_box]
    natural_h = max(zs) - min(zs)
    s = p["h"] / natural_h if natural_h > 0 else 1

    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Quaternion((0, 0, 1), p["ry"]) @ base_rot
    obj.scale = (s, s, s)
    obj.location = (p["x"], -p["z"], -min(zs) * s)
    obj.name = "ch1.%s.%03d" % (p["model"], i)
    obj["ch1_model"] = p["model"]
    obj["ch1_r"] = p["r"]
    obj["ch1_natural_h"] = natural_h
    if p.get("role"):
        obj["ch1_role"] = p["role"]

if layout.get("terrain"):
    build_terrain(layout["terrain"])

# a camel standing on each patrol route, so the herd is visible while editing
for i, h in enumerate(layout.get("herd", [])):
    src = load("camel")
    copies = []
    for o in src:
        if o.type != 'MESH':
            continue
        c = o.copy()
        c.data = o.data
        bpy.context.collection.objects.link(c)
        c.hide_set(False)
        c.hide_render = False
        copies.append(c)
    if not copies:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    if len(copies) > 1:
        bpy.ops.object.join()
    cam = bpy.context.view_layer.objects.active
    cam.location = (0, 0, 0)
    cam.scale = (1, 1, 1)
    base_rot = cam.matrix_world.to_quaternion()
    bpy.context.view_layer.update()
    zs = [(cam.matrix_world @ Vector(v)).z for v in cam.bound_box]
    nat = max(zs) - min(zs)
    cs = h["h"] / nat if nat > 0 else 1
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = base_rot
    cam.scale = (cs, cs, cs)
    cam.location = (h["cx"] + h["rx"], -h["cz"], -min(zs) * cs)
    cam.name = "ref.camel.%d" % i

# markers for the campfire and the camel routes, so nothing gets placed on them
fire = layout["campfire"]
bpy.ops.object.empty_add(type='SPHERE', radius=fire["r"], location=(fire["x"], -fire["z"], 0))
bpy.context.active_object.name = "ref.campfire"
for i, h in enumerate(layout.get("herd", [])):
    bpy.ops.object.empty_add(type='CIRCLE', radius=1, location=(h["cx"], -h["cz"], 0))
    e = bpy.context.active_object
    e.name = "ref.camel-route.%d" % i
    e.scale = (h["rx"], h["rz"], 1)

for model, objs in cache.items():
    for o in objs:
        try:
            bpy.data.objects.remove(o, do_unlink=True)
        except Exception:  # noqa: BLE001
            pass

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("BLEND-OK", OUT, len(layout["props"]), "props")
