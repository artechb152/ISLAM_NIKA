"""Read camp.blend back into the layout JSON — the "Blender → game" direction.

Objects named `ch1.<model>.<n>` map to an existing GLB. Any OTHER mesh you add
— appended from BlenderKit, or modelled yourself — is exported to its own GLB
automatically and joins the layout; the object is then renamed `ch1.<slug>.<n>`
and the .blend is re-saved so later trips are stable.

Objects whose name starts with `ref.` (the reference ground, the campfire
marker, the camel-route circles) are always ignored, as are lights and cameras.
"""
import bpy
import json
import math
import os
import re
import unicodedata
from mathutils import Vector

WEB = os.environ["CH1_WEB"]
# איזה אזור עורכים. camp.mjs מעביר את זה; ברירת המחדל היא המחנה,
# כך שכל קריאה ישנה לסקריפט ממשיכה לעבוד בדיוק כמו קודם.
LAYOUT = os.environ.get(
    "CH1_LAYOUT",
    os.path.join(WEB, "src", "lib", "chapter1", "camp-layout.json"),
)
MODELS = os.path.join(WEB, "public", "assets", "chapter1", "models")
MAX_TEX = 1024
# CH1_REFRESH=1 re-exports every model, so material and texture edits you made
# in Blender overwrite the existing GLBs
REFRESH = os.environ.get("CH1_REFRESH") == "1"
TRI_BUDGET = 25000

with open(LAYOUT, encoding="utf-8") as fh:
    old = json.load(fh)

# remember the radius each model had, so hand-tuned values survive a round trip
prev_r = {}
for p in old["props"]:
    prev_r.setdefault(p["model"], p["r"])


def mesh_signature(obj):
    """Identify the same asset appended or duplicated several times.

    Shift+D and a second Append both create a fresh mesh datablock, so keying
    on the datablock alone exported the very same cactus six times at 12 MB
    each. Vertex/face counts plus local size and material names recognise a
    repeat reliably enough.
    """
    me = obj.data
    dims = tuple(round(v, 3) for v in obj.dimensions)
    mats = tuple(sorted(m.name.split(".")[0] for m in me.materials if m))
    return (len(me.vertices), len(me.polygons), dims, mats)


def slugify(name):
    """Blender object name -> a safe GLB filename stem."""
    base = name.split(".")[0]
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9]+", "-", base).strip("-").lower()
    return base or "prop"


def pack_images():
    """Embed external textures before exporting.

    Library assets reference their maps as files on disk. If the .blend is not
    packed, the glTF exporter silently writes a material with no image at all —
    which is why some cacti arrived untextured.
    """
    missing = set()
    for img in bpy.data.images:
        if img.source == 'FILE' and not img.packed_file:
            try:
                img.pack()
            except Exception:  # noqa: BLE001 - file gone from disk
                missing.add(img.name)
    if missing:
        print("TEXTURES MISSING ON DISK:", ", ".join(sorted(missing)[:6]))


def shrink_images():
    for img in bpy.data.images:
        if max(img.size) > MAX_TEX:
            w, h = img.size
            k = MAX_TEX / max(w, h)
            try:
                img.scale(max(4, int(w * k)), max(4, int(h * k)))
            except Exception:  # noqa: BLE001
                pass


def procedural_materials(obj):
    """List materials whose Base Color is driven by nodes rather than an image.

    glTF has no concept of Blender's node graphs, so these export with no colour
    at all and the model renders pure white - which is exactly how one cactus
    arrived. They have to be baked; see bake_materials.
    """
    to_bake = []
    for slot in obj.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes:
            continue
        principled = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not principled:
            continue
        base = principled.inputs.get("Base Color")
        if base is None or not base.links:
            continue
        # walk upstream a couple of hops looking for a real image
        seen = set()
        stack = [base.links[0].from_node]
        has_image = False
        while stack and len(seen) < 40:
            node = stack.pop()
            if node in seen:
                continue
            seen.add(node)
            if node.type == 'TEX_IMAGE' and node.image:
                has_image = True
                break
            for inp in node.inputs:
                for link in inp.links:
                    stack.append(link.from_node)
        if has_image:
            continue

        to_bake.append(mat)

    return to_bake


def bake_materials(obj, mats):
    """Render each procedural material into an image texture.

    Guessing a flat colour from the node graph does not work — on a cactus the
    most saturated value in the tree turned out to be the brown of its spines.
    Baking is the only faithful answer: Cycles renders the material into a UV
    map, and the resulting image travels through glTF like any other texture.
    """
    if not mats:
        return
    scene = bpy.context.scene
    prev_engine = scene.render.engine
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 4
    scene.cycles.use_denoising = False

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    if not obj.data.uv_layers:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.15)
        bpy.ops.object.mode_set(mode='OBJECT')

    for mat in mats:
        img = bpy.data.images.new("bake_" + mat.name, 1024, 1024)
        nodes = mat.node_tree.nodes
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = img
        nodes.active = tex
        try:
            bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_clear=True, margin=6)
            principled = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if principled:
                base = principled.inputs.get("Base Color")
                for link in list(base.links):
                    mat.node_tree.links.remove(link)
                mat.node_tree.links.new(tex.outputs['Color'], base)
            print("BAKED MATERIAL", mat.name)
        except Exception as e:  # noqa: BLE001 - fall back to the viewport colour
            print("BAKE FAILED", mat.name, e)
            principled = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if principled:
                base = principled.inputs.get("Base Color")
                for link in list(base.links):
                    mat.node_tree.links.remove(link)
                base.default_value = tuple(mat.diffuse_color)

    scene.render.engine = prev_engine


def export_new_model(obj, slug, decimate=True):  # noqa: ARG001 - budget applies either way
    """Write a brand-new object out as its own GLB, upright and centred.

    Placement (yaw, height, position) lives in the layout, so the asset itself
    is exported neutral: no rotation, unit scale, centred on X/Y with its base
    at z = 0. That is exactly what the game's Prop component expects.
    """
    path = os.path.join(MODELS, slug + ".glb")
    if os.path.exists(path) and not REFRESH:
        return False

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.duplicate()
    dup = bpy.context.view_layer.objects.active
    dup.animation_data_clear()

    # Always take our own copy. transform_apply and modifier_apply both refuse
    # multi-user meshes, and that silent refusal is what let a 320k-vertex
    # cactus straight through the triangle budget.
    dup.data = dup.data.copy()
    dup.rotation_mode = 'XYZ'
    dup.rotation_euler = (0, 0, 0)
    dup.scale = (1, 1, 1)
    dup.location = (0, 0, 0)
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    corners = [dup.matrix_world @ Vector(v) for v in dup.bound_box]
    cx = (max(c.x for c in corners) + min(c.x for c in corners)) / 2
    cy = (max(c.y for c in corners) + min(c.y for c in corners)) / 2
    cz = min(c.z for c in corners)
    dup.location = (-cx, -cy, -cz)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    for m in list(dup.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception:  # noqa: BLE001
            dup.modifiers.remove(m)
    # Decimation runs whenever the mesh is over budget, refresh or not. It can
    # only ever bring a model DOWN to the budget, so repeating it is safe - an
    # asset already under the limit is never touched.
    #
    # Two things defeated a single pass on BlenderKit assets: meshes with
    # invalid indices (Blender decimate silently bails) and geometry where one
    # collapse pass falls far short. Hence validate-then-retry.
    # Shape keys block both transform_apply and decimate, and BlenderKit plants
    # frequently ship with a wind key. Drop them; the game has no use for them.
    if dup.data.shape_keys:
        bpy.ops.object.shape_key_remove(all=True)
    bake_materials(dup, procedural_materials(dup))
    dup.data.validate(verbose=False)

    # Collapse decimation needs connected edges. Some library assets arrive as
    # loose, unwelded triangles, and on those the modifier applies cleanly and
    # reduces nothing at all - which is how a 175k-triangle cactus kept slipping
    # through. Welding first gives the collapse something to work with.
    try:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0002)
        bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as e:  # noqa: BLE001
        print("WELD SKIPPED", slug, e)
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except Exception:  # noqa: BLE001
            pass

    tris = sum(len(p.vertices) - 2 for p in dup.data.polygons)
    for attempt in range(4):
        if tris <= TRI_BUDGET:
            break
        d = dup.modifiers.new("dec", 'DECIMATE')
        d.decimate_type = 'COLLAPSE'
        d.ratio = max(0.01, TRI_BUDGET / tris)
        try:
            bpy.ops.object.modifier_apply(modifier=d.name)
        except Exception as e:  # noqa: BLE001
            print("DECIMATE FAILED", slug, e)
            dup.modifiers.remove(d)
            break
        after = sum(len(p.vertices) - 2 for p in dup.data.polygons)
        if after >= tris:  # no progress — stop rather than loop forever
            tris = after
            break
        tris = after
    if tris > TRI_BUDGET * 1.5:
        print("WARNING", slug, "still", tris, "tris after decimation")

    bpy.ops.object.select_all(action='DESELECT')
    dup.select_set(True)
    bpy.context.view_layer.objects.active = dup
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_animations=False,
        export_apply=True,
        export_yup=True,
        export_image_format='JPEG',
        export_jpeg_quality=72,
    )
    bpy.data.objects.remove(dup, do_unlink=True)
    print("NEW-MODEL", slug, "->", os.path.basename(path), "%d tris" % tris)
    return True


# new assets are exported once, then reused by every copy that shares the mesh
new_by_mesh = {}
refreshed = set()
renamed = False
shrunk = False

props = []
for o in list(bpy.data.objects):
    if o.type != 'MESH' or o.name.startswith("ref.") or o.get("ch1_terrain"):
        continue

    if o.name.startswith("ch1."):
        model = o.get("ch1_model") or o.name.split(".")[1]
        if REFRESH and model not in refreshed:
            if not shrunk:
                pack_images()
                shrink_images()
                shrunk = True
            export_new_model(o, model, decimate=False)
            refreshed.add(model)
    else:
        # something you added in Blender — turn it into a game asset
        key = mesh_signature(o)
        if key in new_by_mesh:
            model = new_by_mesh[key]
        else:
            model = slugify(o.name)
            n = 2
            while model in new_by_mesh.values() or (
                os.path.exists(os.path.join(MODELS, model + ".glb")) and model not in prev_r
            ):
                model = "%s-%d" % (slugify(o.name), n)
                n += 1
            if not shrunk:
                pack_images()
                shrink_images()
                shrunk = True
            export_new_model(o, model)
            new_by_mesh[key] = model
        o["ch1_model"] = model
        o.name = "ch1.%s.%03d" % (model, len(props))
        renamed = True

    # Measure in WORLD space. obj.dimensions ignores rotation, and every prop
    # carries the glTF importer Y-up-to-Z-up rotation, so dimensions.z is the
    # model depth rather than its height.
    corners = [o.matrix_world @ Vector(v) for v in o.bound_box]
    h = round(max(c.z for c in corners) - min(c.z for c in corners), 3)
    span_x = max(c.x for c in corners) - min(c.x for c in corners)
    span_y = max(c.y for c in corners) - min(c.y for c in corners)
    footprint = round(math.hypot(span_x, span_y) / 2, 2)

    r = o.get("ch1_r")
    r = round(float(r), 2) if r is not None else footprint

    # Yaw only - props stand upright. Sign convention: the value is stored
    # exactly as Blender reports it, and the game applies the same number as a
    # Y rotation. Negating it here (as an earlier version did) mirrored every
    # rotation between Blender and the game.
    yaw = o.matrix_world.to_euler('ZYX').z

    entry = {
        "model": model,
        "x": round(o.location.x, 2),
        "z": round(-o.location.y, 2),
        "ry": round(yaw, 3),
        "h": h,
        "r": max(r, 0.2),
    }
    # campfire / torch props are drawn by their own component, not the generic
    # prop loop — the tag has to survive the trip through Blender
    role = o.get("ch1_role")
    if role:
        entry["role"] = str(role)
    props.append(entry)


# --- terrain -------------------------------------------------------------
terrain = None
for o in bpy.data.objects:
    if o.get("ch1_terrain") or o.name == "ch1terrain":
        terrain = o
        break
if terrain is not None:
    pack_images()
    shrink_images()
    bpy.ops.object.select_all(action='DESELECT')
    terrain.select_set(True)
    bpy.context.view_layer.objects.active = terrain
    tpath = os.path.join(MODELS, "terrain.glb")
    bpy.ops.export_scene.gltf(
        filepath=tpath,
        export_format='GLB',
        use_selection=True,
        export_animations=False,
        export_apply=True,
        export_yup=True,
        export_image_format='JPEG',
        export_jpeg_quality=78,
    )
    print("TERRAIN-EXPORTED", os.path.basename(tpath))

    # A procedural material (noise, musgrave...) cannot travel through glTF, so
    # the exported terrain may arrive with no image at all. Read the Principled
    # base colour so the game can at least tint its own tiling sand to match.
    tint = None
    has_image = False
    for mat in terrain.data.materials:
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                has_image = True
            if node.type == 'BSDF_PRINCIPLED' and tint is None:
                c = node.inputs['Base Color'].default_value
                tint = '#%02x%02x%02x' % tuple(
                    max(0, min(255, int((v ** (1 / 2.2)) * 255))) for v in c[:3]
                )
    print("TERRAIN-MATERIAL image=%s tint=%s" % (has_image, tint))

props.sort(key=lambda p: (p["model"], p["x"], p["z"]))
if not props:
    raise SystemExit("NO ch1.* OBJECTS FOUND — nothing to import")

out = dict(old)
out["props"] = props
if terrain is not None:
    t = dict(old.get("terrain") or {})
    t["model"] = "terrain"
    t["baked"] = True  # already scaled, positioned and flattened in Blender
    t["hasImage"] = bool(has_image)
    # גוון הקרקע הוא החלטת צבע של האזור, לא תכונה של קובץ ה-blend.
    # ה-BSDF בבלנדר חוזר כמעט לבן, ולכן ייבוא היה מלבין את הקרקע
    # ומוחק כיול שנעשה במשחק — מכה חזרה #e6e6e6 במקום #c19d7a.
    # מכבדים גוון שכבר קיים ב-JSON, וכותבים מבלנדר רק כשאין אחד.
    if tint and not t.get("tint"):
        t["tint"] = tint
    out["terrain"] = t

# the campfire marker can be moved too
fire = bpy.data.objects.get("ref.campfire")
if fire:
    out["campfire"] = {
        "x": round(fire.location.x, 2),
        "z": round(-fire.location.y, 2),
        "r": round(fire.empty_display_size, 2),
    }

# camel routes follow their circle empties
herd = list(old.get("herd", []))
for i, h in enumerate(herd):
    e = bpy.data.objects.get("ref.camel-route.%d" % i)
    if not e:
        continue
    h["cx"] = round(e.location.x, 2)
    h["cz"] = round(-e.location.y, 2)
    h["rx"] = round(abs(e.scale.x), 2)
    h["rz"] = round(abs(e.scale.y), 2)
out["herd"] = herd

with open(LAYOUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
if renamed:
    bpy.ops.wm.save_mainfile()
    print("BLEND-RESAVED (new objects renamed to ch1.*)")
print("LAYOUT-OK", len(props), "props written to", os.path.basename(LAYOUT))
