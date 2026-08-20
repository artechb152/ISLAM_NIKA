def butte_rock():
    """A flat-topped desert butte: a broad talus skirt, near-vertical strata
    above it, a table on top. Written as radii that actually narrow — in the
    first pass they collapsed and it came out a smooth boulder."""
    verts = []
    faces = []
    LAYERS = [(1.30, 0.00), (1.02, 0.14), (0.86, 0.30), (0.82, 0.55),
              (0.78, 0.78), (0.74, 0.92), (0.70, 0.97), (0.62, 1.00)]
    SEG = 15
    wob = [random.uniform(0.86, 1.14) for _ in range(SEG)]
    for li, (r, z) in enumerate(LAYERS):
        for sgi in range(SEG):
            a = sgi / SEG * math.tau
            rr = r * wob[sgi] * random.uniform(0.98, 1.02)
            verts.append((math.cos(a) * rr, math.sin(a) * rr, z))
        if li:
            for sgi in range(SEG):
                a0 = (li - 1) * SEG + sgi
                a1 = (li - 1) * SEG + (sgi + 1) % SEG
                b0 = li * SEG + sgi
                b1 = li * SEG + (sgi + 1) % SEG
                faces.append((a0, a1, b1, b0))
    cap = len(verts)
    verts.append((0, 0, 1.01))
    for sgi in range(SEG):
        faces.append(((len(LAYERS) - 1) * SEG + sgi, (len(LAYERS) - 1) * SEG + (sgi + 1) % SEG, cap))
    me = bpy.data.meshes.new("butte")
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("butte", me)
    bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    surface(o, "rubble", 1.4)
    return o


# Rebuild the props that were broken, and add the ones the world was missing.
#
# A contact sheet of every model the chapter stands on showed why it read as
# grey rubble: the "dry stone wall" placed a hundred and one times was a heap of
# brown chips, the houses were roofless open shells, the "pergola" was a modern
# patio table, and the sack pile was black cloth with white speckles. None of
# those are fixable by tinting — the geometry is not the thing it claims to be.
#
# Everything here is modelled rather than scanned, from primitives, with its
# surface from scripts/assets/tex. That trades photoreal detail for props that
# are actually what they say they are, and it lets a single wall become three
# walls and a single house become four houses — which is the other half of the
# problem, because nine regions were dressed from one shelf.
#
# Run with Blender CLOSED:
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P scripts/assets/build-props.py

import bpy, bmesh, math, random, os
from mathutils import Vector

_mats = {}

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "public", "assets", "chapter1", "models"))

# ---------------------------------------------------------------- helpers


def wipe():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(block):
            block.remove(item)
    # The material cache has to go with them, or the next prop is handed a
    # Material whose data Blender has already freed and the build stops on
    # "StructRNA of type Material has been removed".
    _mats.clear()


def material(name):
    """One material per surface, textured from the generated tile."""
    if name in _mats:
        return _mats[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    img = nt.nodes.new("ShaderNodeTexImage")
    img.image = bpy.data.images.load(os.path.join(TEX, name + ".jpg"))
    nt.links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
    _mats[name] = mat
    return mat


def box(x, y, z, sx, sy, sz, rz=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.object
    o.scale = (sx, sy, sz)
    o.rotation_euler[2] = rz
    return o


def cyl(x, y, z, r, h, rz=0.0, verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z))
    o = bpy.context.object
    o.rotation_euler[2] = rz
    return o


def join(objs, name):
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def surface(obj, mat_name, scale=1.0):
    """Box-project UVs at a real-world scale, so the grain is the same size on
    every prop however big the prop is."""
    obj.data.materials.clear()
    obj.data.materials.append(material(mat_name))
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=scale)
    bpy.ops.object.mode_set(mode="OBJECT")


def cut(target, tool):
    """Subtract one solid from another. Without this a "doorway" is a box stuck
    on the wall, which is exactly how the first pass of these houses read: four
    sealed crates with panels glued to them."""
    m = target.modifiers.new("cut", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.object = tool
    m.solver = "FLOAT"   # Blender 5 renamed the solvers: FAST is now FLOAT
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(tool, do_unlink=True)
    return target


def rough(obj, amount=0.03, cuts=0):
    """Knock the machined edge off a primitive."""
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    if cuts:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        v.co += Vector((random.uniform(-amount, amount), random.uniform(-amount, amount), random.uniform(-amount, amount)))
    bm.to_mesh(me)
    bm.free()
    me.update()


def export(obj, name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth() if False else None
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format="JPEG",
    )
    print("  wrote", name + ".glb")


def build(name, fn):
    wipe()
    random.seed(hash(name) & 0xFFFF)
    obj = fn()
    obj.name = name
    export(obj, name)


# ---------------------------------------------------------------- the props


def drystone_wall(length=3.2, height=1.05, seed_off=0):
    """A field wall of undressed stones laid without mortar — the thing that was
    standing in for this was a heap of chips."""
    random.seed(1000 + seed_off)
    parts = []
    z = 0.0
    course = 0
    while z < height:
        h = random.uniform(0.15, 0.24)
        x = -length / 2 + random.uniform(0, 0.12)
        while x < length / 2:
            w = random.uniform(0.22, 0.44)
            if x + w > length / 2:
                w = length / 2 - x
            if w < 0.08:
                break
            d = random.uniform(0.34, 0.52) * (1 - course * 0.06)
            s = box(x + w / 2, random.uniform(-0.03, 0.03), z + h / 2, w, d, h,
                    rz=random.uniform(-0.12, 0.12))
            rough(s, 0.018)
            parts.append(s)
            x += w + random.uniform(0.005, 0.03)
        z += h
        course += 1
    # a few stones fallen at the foot, because nothing dry-laid stays perfect
    for _ in range(3):
        s = box(random.uniform(-length / 2, length / 2), random.uniform(0.28, 0.42),
                0.07, random.uniform(0.18, 0.3), random.uniform(0.16, 0.26), 0.14,
                rz=random.uniform(0, 3.14))
        rough(s, 0.02)
        parts.append(s)
    o = join(parts, "wall")
    surface(o, "rubble", 0.55)
    return o


def mudbrick_house(w=4.2, d=4.6, h=3.4, storeys=1, stair=False, wing=False,
                   plan="block", batter=0.12):
    """A mud-brick house, in one of several plans.

    Four cubes of the same proportion standing in a row is still one house four
    times, so the plan varies: a plain block, an L round a yard, a court with a
    wall and a gate, a tower. And a real mud-brick wall leans inward as it rises
    — the `batter` — which is most of what stops a box reading as a box.

    Every face carries something: openings, a niche, the ends of the roof beams,
    merlons along the parapet. An earlier pass cut a doorway into ONE wall, which
    is fine until you walk past the building, and in a town you walk past three
    for every one you face."""

    def wall_block(cx, cy, ww, dd, hh, door=None, windows=(), niche=None):
        b = box(cx, cy, hh / 2, ww, dd, hh)
        rough(b, 0.012)
        # batter: taper the top so the walls lean in the way mud brick must
        me = b.data
        bm = bmesh.new()
        bm.from_mesh(me)
        for v in bm.verts:
            if v.co.z > 0:
                v.co.x *= 1 - batter
                v.co.y *= 1 - batter
        bm.to_mesh(me)
        bm.free()
        me.update()
        cut(b, box(cx, cy, hh - 0.06, ww - 0.5, dd - 0.5, 0.34))
        if door:
            cut(b, box(cx + door[0], cy + door[1], 0.92, 0.95, 0.7, 1.84))
        for wx, wy, wz, sx, sy in windows:
            cut(b, box(cx + wx, cy + wy, wz, sx, sy, 0.44))
        if niche:
            cut(b, box(cx + niche[0], cy + niche[1], 1.15, 0.5, 0.28, 0.9))
        return b

    def fill(cx, cy, ww, dd, hh):
        """A solid core just inside the walls. Without it every doorway and
        window is a hole straight through the building and you see the sky on
        the far side — which reads as a ruin, not a house."""
        c = box(cx, cy, hh * 0.44, ww - 0.62, dd - 0.62, hh * 0.88)
        rough(c, 0.01)
        return c

    parts = []
    hw, hd = w / 2, d / 2

    if plan == "tower":
        w, d = w * 0.62, d * 0.62
        hw, hd = w / 2, d / 2
        h = h * 1.55

    body = wall_block(
        0, 0, w, d, h,
        door=(0, -hd),
        windows=[(-0.95, -hd, h - 0.85, 0.34, 0.7), (0.95, -hd, h - 0.85, 0.34, 0.7),
                 (hw, 0.7, h - 0.9, 0.7, 0.34), (-hw, 0.7, h - 0.9, 0.7, 0.34),
                 (hw, -0.8, h * 0.45, 0.7, 0.3), (-hw, -0.8, h * 0.45, 0.7, 0.3),
                 (0.8, hd, h - 0.85, 0.32, 0.7), (-0.8, hd, h - 0.85, 0.32, 0.7)],
        niche=(0, hd),
    )
    parts.append(body)
    parts.append(fill(0, 0, w, d, h))

    if plan == "ell":
        # a second range at right angles, lower, round two sides of a yard
        parts.append(wall_block(hw + 1.4, hd - 1.2, 2.8, d * 0.7, h * 0.66,
                                door=(0, -(d * 0.7) / 2),
                                windows=[(1.4, 0.4, h * 0.42, 0.5, 0.3)]))
        parts.append(fill(hw + 1.4, hd - 1.2, 2.8, d * 0.7, h * 0.66))
    if plan == "court":
        # a yard wall with a gateway, which is how a town actually encloses space
        for sx, sy, ww, dd in ((0, -hd - 3.2, w + 1.6, 0.34), (hw + 0.8, -hd - 1.6, 0.34, 3.2),
                               (-hw - 0.8, -hd - 1.6, 0.34, 3.2)):
            yard = box(sx, sy, 0.95, ww, dd, 1.9)
            rough(yard, 0.01)
            if ww > dd:
                cut(yard, box(sx, sy, 0.9, 1.3, 1.0, 1.8))
            parts.append(yard)
        parts.append(box(0, -hd - 3.2, 2.1, 2.0, 0.5, 0.4))

    if wing:
        parts.append(wall_block(hw + 1.1, -d / 4, 2.2, d * 0.55, h * 0.64,
                                door=(0, -(d * 0.55) / 2),
                                windows=[(1.1, 0, h * 0.42, 0.5, 0.4)]))
        parts.append(fill(hw + 1.1, -d / 4, 2.2, d * 0.55, h * 0.64))

    if storeys > 1:
        up = wall_block(w * 0.12, d * 0.1, w * 0.6, d * 0.6, h * 0.72,
                        door=(0, -(d * 0.6) / 2),
                        windows=[((w * 0.6) / 2, 0, h * 0.4, 0.6, 0.34),
                                 (-(w * 0.6) / 2, 0, h * 0.4, 0.6, 0.34)])
        up.location.z += h
        parts.append(up)
        core = fill(w * 0.12, d * 0.1, w * 0.6, d * 0.6, h * 0.72)
        core.location.z += h
        parts.append(core)

    # parapets and merlons on the main block
    tw, td = w * (1 - batter), d * (1 - batter)
    for sx, sy, bw, bd in ((0, td / 2 - 0.08, tw, 0.18), (0, -td / 2 + 0.08, tw, 0.18),
                           (tw / 2 - 0.08, 0, 0.18, td), (-tw / 2 + 0.08, 0, 0.18, td)):
        parts.append(box(sx, sy, h + 0.17, bw, bd, 0.34))
    n = max(4, int(tw / 0.6))
    for i in range(n):
        x = -tw / 2 + (i + 0.5) * (tw / n)
        for sy in (td / 2 - 0.08, -td / 2 + 0.08):
            parts.append(box(x, sy, h + 0.42, 0.2, 0.2, 0.22))
    nb = max(3, int(tw / 0.8))
    for i in range(nb):
        x = -tw / 2 + (i + 0.5) * (tw / nb)
        for sy, sign in ((-td / 2 - 0.11, 1), (td / 2 + 0.11, -1)):
            b = cyl(x, sy, h - 0.34, 0.055, 0.55, verts=6)
            b.rotation_euler[0] = math.pi / 2 * sign
            parts.append(b)
    parts.append(box(0, -hd + 0.09, 0.9, 0.88, 0.07, 1.76))

    if stair:
        steps = 8
        for i in range(steps):
            parts.append(box(hw + 0.34, -hd + 0.55 + i * 0.3, 0.14 + i * 0.28, 0.86, 0.3, 0.14))
        parts.append(box(hw + 0.34, -hd + 0.55 + steps * 0.3 / 2, 0.06, 0.86, steps * 0.3, 0.12))

    o = join(parts, "house")
    surface(o, "mudbrick", 1.4)
    return o


def crate():
    """A bound wooden crate — what a caravan actually carries."""
    parts = []
    body = box(0, 0, 0.32, 0.78, 0.6, 0.64)
    rough(body, 0.008)
    parts.append(body)
    for z in (0.14, 0.5):
        parts.append(box(0, 0, z, 0.82, 0.64, 0.06))
    for x in (-0.34, 0.34):
        parts.append(box(x, 0, 0.32, 0.06, 0.64, 0.6))
    o = join(parts, "crate")
    surface(o, "wood", 0.5)
    return o


def sack_pile():
    """Five grain sacks slumped against each other, the way they stack against a
    stall wall. One smooth lump is not a pile."""
    parts = []
    spots = [(-0.34, -0.1, 0.26), (0.3, -0.16, 0.26), (0.02, 0.26, 0.26),
             (-0.14, 0.02, 0.72), (0.3, 0.2, 0.68)]
    for x, y, z in spots:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.27, location=(x, y, z))
        sk = bpy.context.object
        sk.scale = (1.0, 0.86, 1.05 if z < 0.5 else 0.9)
        sk.rotation_euler = (random.uniform(-0.25, 0.25), random.uniform(-0.25, 0.25), random.uniform(0, 3.14))
        rough(sk, 0.045)
        parts.append(sk)
        neck = cyl(x + random.uniform(-0.04, 0.04), y, z + 0.26, 0.06, 0.16, verts=6)
        neck.rotation_euler = (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), 0)
        parts.append(neck)
    o = join(parts, "sacks")
    surface(o, "sack", 0.45)
    return o


def awning():
    """Goat-hair cloth slung over a ridge pole between four uprights: the shade
    a market stall lives under. The first pass stretched the cloth flat across
    the tops of the poles, which is a table — and what it replaced was, quite
    literally, a modern patio table."""
    parts = []
    for x in (-1.7, 1.7):
        for y in (-1.3, 1.3):
            parts.append(cyl(x, y, 1.15, 0.075, 2.3, verts=7))
    ridge = cyl(0, 0, 2.24, 0.06, 3.6, verts=7)
    ridge.rotation_euler[1] = math.pi / 2
    parts.append(ridge)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=14, y_subdivisions=10, size=1, location=(0, 0, 0))
    cloth = bpy.context.object
    cloth.scale = (3.8, 3.0, 1)
    bpy.ops.object.transform_apply(scale=True)
    me = cloth.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        u = abs(v.co.y) / 1.5
        v.co.z = 2.24 - u * 1.05 - (1 - (v.co.x / 1.9) ** 2) * 0.16
        v.co.x *= 1 - u * 0.06
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.035)
    bm.to_mesh(me)
    bm.free()
    parts.append(cloth)
    o = join(parts, "awning")
    surface(o, "goathair", 1.2)
    return o


def storage_jar():
    """A tall clay storage jar, turned rather than modelled — the one this
    replaces had a saw-tooth rim and its texture in chunks."""
    profile = [(0.10, 0.0), (0.22, 0.08), (0.33, 0.28), (0.36, 0.52), (0.30, 0.76),
               (0.20, 0.92), (0.17, 1.0), (0.20, 1.06)]
    verts = []
    faces = []
    SEG = 16
    for ri, (r, z) in enumerate(profile):
        for s in range(SEG):
            a = s / SEG * math.tau
            verts.append((math.cos(a) * r, math.sin(a) * r, z))
        if ri:
            for s in range(SEG):
                a0 = (ri - 1) * SEG + s
                a1 = (ri - 1) * SEG + (s + 1) % SEG
                b0 = ri * SEG + s
                b1 = ri * SEG + (s + 1) % SEG
                faces.append((a0, a1, b1, b0))
    me = bpy.data.meshes.new("jar")
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("jar", me)
    bpy.context.collection.objects.link(o)
    parts = [o]
    for a in (0.6, math.pi - 0.6):
        h = cyl(math.cos(a) * 0.3, math.sin(a) * 0.3, 0.82, 0.05, 0.26, verts=6)
        h.rotation_euler[1] = 0.5
        parts.append(h)
    j = join(parts, "storage-jar")
    surface(j, "wood", 0.6)
    for m in j.data.materials:
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.42, 0.24, 0.16, 1)
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE":
                m.node_tree.links.new(n.outputs["Color"], m.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    return j


def waterskin():
    """A goatskin hung from a tripod so the draught keeps the water cool. The
    first pass left the two poles floating in the air beside the bag."""
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(segments=13, ring_count=9, radius=0.28, location=(0, 0, 0.52))
    sk = bpy.context.object
    sk.scale = (0.85, 0.62, 1.05)
    rough(sk, 0.03)
    parts.append(sk)
    parts.append(cyl(0, 0, 0.86, 0.055, 0.2, verts=7))
    for a in (0.0, 2.094, 4.188):
        leg = cyl(math.cos(a) * 0.3, math.sin(a) * 0.3, 0.5, 0.04, 1.14, verts=6)
        leg.rotation_euler = (math.sin(a) * 0.5, -math.cos(a) * 0.5, 0)
        parts.append(leg)
    parts.append(cyl(0, 0, 0.98, 0.055, 0.12, verts=7))
    o = join(parts, "waterskin")
    surface(o, "sack", 0.4)
    return o


def fodder_pile():
    """Cut fodder heaped for the camels: stalks lying over a low mound, densest
    at the top. Scattered flat on the ground they read as spilled timber."""
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.6, location=(0, 0, -0.12))
    mound = bpy.context.object
    mound.scale = (1.0, 0.85, 0.55)
    rough(mound, 0.04)
    parts.append(mound)
    for _ in range(40):
        a = random.uniform(0, math.tau)
        r = random.uniform(0, 0.66)
        z = 0.16 + (1 - r / 0.66) * 0.2
        st = box(math.cos(a) * r, math.sin(a) * r * 0.85, z,
                 random.uniform(0.45, 0.85), 0.04, 0.035, rz=random.uniform(0, math.pi))
        st.rotation_euler[1] = random.uniform(-0.3, 0.3)
        parts.append(st)
    o = join(parts, "fodder")
    surface(o, "straw", 0.45)
    return o


def desert_shrub():
    """A living desert bush: thin branches from one root, each carrying its
    leaves along its own length. The first pass scattered leaf blocks in the air
    around the branches, which is exactly how it looked."""
    parts = []
    for _ in range(11):
        a = random.uniform(0, math.tau)
        lean = random.uniform(0.5, 1.0)
        L = random.uniform(0.42, 0.62)
        dx, dy = math.sin(lean) * math.cos(a), math.sin(lean) * math.sin(a)
        dz = math.cos(lean)
        b = cyl(dx * L / 2, dy * L / 2, dz * L / 2 + 0.02, 0.016, L, verts=5)
        b.rotation_euler = (math.sin(a) * lean, -math.cos(a) * lean, 0)
        parts.append(b)
        for k in range(5):
            t = 0.35 + k * 0.16
            leaf = box(dx * L * t, dy * L * t, dz * L * t + 0.02,
                       0.1, 0.075, 0.012, rz=random.uniform(0, math.pi))
            leaf.rotation_euler[0] = random.uniform(-0.5, 0.5)
            leaf.rotation_euler[1] = random.uniform(-0.5, 0.5)
            parts.append(leaf)
    o = join(parts, "shrub")
    surface(o, "straw", 0.3)
    return o


def butte_rock():
    """A flat-topped desert butte with its own strata, to stand on the horizon.
    The one this replaces rendered as a featureless black lump."""
    verts = []
    faces = []
    LAYERS = [(1.0, 0.0), (0.95, 0.22), (0.9, 0.26), (0.78, 0.52), (0.74, 0.56), (0.62, 0.82), (0.58, 0.92), (0.3, 1.0)]
    SEG = 13
    wob = [random.uniform(0.82, 1.18) for _ in range(SEG)]
    for li, (r, z) in enumerate(LAYERS):
        for s in range(SEG):
            a = s / SEG * math.tau
            rr = r * wob[s] * random.uniform(0.97, 1.03)
            verts.append((math.cos(a) * rr, math.sin(a) * rr, z))
        if li:
            for s in range(SEG):
                a0 = (li - 1) * SEG + s
                a1 = (li - 1) * SEG + (s + 1) % SEG
                b0 = li * SEG + s
                b1 = li * SEG + (s + 1) % SEG
                faces.append((a0, a1, b1, b0))
    cap = len(verts)
    verts.append((0, 0, 1.02))
    for s in range(SEG):
        faces.append(((len(LAYERS) - 1) * SEG + s, (len(LAYERS) - 1) * SEG + (s + 1) % SEG, cap))
    me = bpy.data.meshes.new("butte")
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("butte", me)
    bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    surface(o, "rubble", 1.6)
    return o




def bayt_tent(length=6.2, depth=3.4, ridge=2.05, back=True):
    """A goat-hair tent — a bayt ash-sha'ar, the house of hair.

    The tent this replaces is nine metres long and four and a half deep, which
    is a communal hall, not a household. In a night camp of that size a ring of
    them does not fit between the palm grove and the road, and the camp came out
    with almost nothing standing in it. This one is six metres by three and a
    half: one family, pitched with its back to the wind and its front open.

    Built the way the real thing is: one cloth over two ridge poles, falling to
    the ground behind and held out on shorter poles in front, with the guy ropes
    running out to their pegs."""
    parts = []
    hl, hd = length / 2, depth / 2

    # the two ridge poles
    for x in (-hl + 0.5, hl - 0.5):
        parts.append(cyl(x, 0.1, ridge / 2, 0.055, ridge, verts=7))
    # the shorter front poles the eaves are held out on
    for x in (-hl + 0.3, 0, hl - 0.3):
        parts.append(cyl(x, -hd, ridge * 0.42, 0.045, ridge * 0.84, verts=6))

    # the cloth: a grid draped over the ridge, to the ground at the back and to
    # the front poles at the front
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=12, y_subdivisions=10, size=1, location=(0, 0, 0))
    cloth = bpy.context.object
    cloth.scale = (length, depth * 2.0, 1)
    bpy.ops.object.transform_apply(scale=True)
    me = cloth.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        u = v.co.y / (depth)             # −1 at the back, +1 at the front
        if u < 0:
            # behind the ridge the cloth runs down to the sand
            t = min(1.0, -u)
            v.co.z = ridge * (1 - t * t)
            v.co.y = 0.1 - t * hd * 1.15
        else:
            t = min(1.0, u)
            v.co.z = ridge - t * (ridge * 0.16)
            v.co.y = 0.1 - t * -hd
        # a cloth pitched on poles bellies between them
        v.co.z -= (1 - (v.co.x / hl) ** 2) * 0.13
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.035)
    bm.to_mesh(me)
    bm.free()
    parts.append(cloth)

    if back:
        # the back wall, a separate panel hung from the ridge
        wall = box(0, hd * 0.92, ridge * 0.34, length * 0.96, 0.05, ridge * 0.68)
        parts.append(wall)

    # guy ropes out to their pegs
    for sx in (-1, 1):
        for sy, reach in ((-1, 1.5), (1, 1.3)):
            rope = cyl(sx * (hl - 0.4), 0.1 + sy * hd * 1.1, ridge * 0.45, 0.018, ridge * 1.25, verts=4)
            rope.rotation_euler = (sy * 0.85, 0, sx * 0.12)
            parts.append(rope)
            parts.append(cyl(sx * (hl - 0.2), 0.1 + sy * hd * 1.55, 0.12, 0.035, 0.3, verts=5))

    o = join(parts, "bayt")
    surface(o, "goathair", 1.1)
    return o


# ---------------------------------------------------------------- evidence
#
# The chapter's own first lesson is that we know this period badly: the sources
# are few, most of them are later Muslim tradition, and the text says to take
# them "with limited surety". So the thing the player collects is evidence —
# small objects lying where they would actually lie, each one a scrap Rawi can
# write the notebook from. They are modelled small and read at arm's length.


def evidence_coin():
    """A struck silver coin, half buried, propped against a stone."""
    parts = []
    c = cyl(0, 0, 0.035, 0.13, 0.014, verts=20)
    c.rotation_euler = (1.15, 0, 0.4)
    parts.append(c)
    for a in (0.9, 3.5):
        parts.append(cyl(math.cos(a) * 0.17, math.sin(a) * 0.17, 0.03, 0.07, 0.06, verts=7))
    o = join(parts, "find-coin")
    surface(o, "rubble", 0.14)
    return o


def evidence_seal():
    """A clay sealing with its cord still through it — how a document travelled."""
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=7, radius=0.1, location=(0, 0, 0.06))
    b = bpy.context.object
    b.scale = (1.0, 1.0, 0.5)
    parts.append(b)
    cord = cyl(0, 0.1, 0.04, 0.014, 0.34, verts=6)
    cord.rotation_euler = (1.4, 0, 0.3)
    parts.append(cord)
    o = join(parts, "find-seal")
    surface(o, "rubble", 0.12)
    return o


def evidence_scroll():
    """A leather scroll case, the kind a community keeps its text in."""
    parts = []
    body = cyl(0, 0, 0.11, 0.075, 0.44, verts=14)
    body.rotation_euler = (1.4, 0, 0.6)
    parts.append(body)
    for t in (-1, 1):
        cap = cyl(math.sin(0.6) * t * 0.22, -math.cos(0.6) * t * 0.22, 0.11, 0.088, 0.05, verts=14)
        cap.rotation_euler = (1.4, 0, 0.6)
        parts.append(cap)
    o = join(parts, "find-scroll")
    surface(o, "wood", 0.2)
    return o


def evidence_inscription():
    """A stone slab with letters cut into it — the one kind of source that does
    not come down to us through anybody else's telling."""
    parts = []
    slab = box(0, 0, 0.3, 0.62, 0.1, 0.6)
    slab.rotation_euler = (0.12, 0, 0)
    rough(slab, 0.008)
    parts.append(slab)
    random.seed(41)
    for row in range(4):
        for gl in range(5):
            parts.append(box(-0.22 + gl * 0.11, -0.055, 0.5 - row * 0.11,
                             0.055, 0.035, random.uniform(0.03, 0.06)))
    parts.append(box(0, 0.06, 0.05, 0.7, 0.34, 0.1))
    o = join(parts, "find-inscription")
    surface(o, "rubble", 0.4)
    return o


def evidence_incense():
    """A bundle of resin tied in cloth: the cargo the whole road exists for."""
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(segments=11, ring_count=7, radius=0.16, location=(0, 0, 0.14))
    b = bpy.context.object
    b.scale = (1.0, 0.78, 0.82)
    rough(b, 0.02)
    parts.append(b)
    for a in (0.5, 2.6, 4.7):
        parts.append(box(math.cos(a) * 0.06, math.sin(a) * 0.06, 0.14, 0.34, 0.03, 0.02, rz=a))
    knot = cyl(0, 0, 0.29, 0.04, 0.09, verts=6)
    parts.append(knot)
    o = join(parts, "find-incense")
    surface(o, "sack", 0.16)
    return o


def evidence_sherd():
    """A broken pot: the most common thing an archaeologist ever holds."""
    parts = []
    for i in range(3):
        random.seed(70 + i)
        p = box(random.uniform(-0.14, 0.14), random.uniform(-0.12, 0.12), 0.03,
                random.uniform(0.14, 0.24), random.uniform(0.1, 0.18), 0.035,
                rz=random.uniform(0, 3.14))
        p.rotation_euler[0] = random.uniform(-0.3, 0.3)
        rough(p, 0.012)
        parts.append(p)
    o = join(parts, "find-sherd")
    surface(o, "wood", 0.15)
    return o


def ansab_stone():
    """An unworked standing stone: what a god was, before anybody carved one."""
    parts = []
    st = box(0, 0, 0.55, 0.34, 0.28, 1.1)
    rough(st, 0.045, cuts=1)
    parts.append(st)
    parts.append(box(0, 0, 0.05, 0.62, 0.54, 0.12))
    o = join(parts, "ansab")
    surface(o, "rubble", 0.45)
    return o


# ---------------------------------------------------------------- run

os.makedirs(OUT, exist_ok=True)
print("building props into", OUT)

build("drywall", lambda: drystone_wall(3.2, 1.05, 0))
build("drywall2", lambda: drystone_wall(2.6, 0.8, 7))
build("drywall3", lambda: drystone_wall(3.8, 1.25, 13))
build("house-a", lambda: mudbrick_house(3.9, 4.4, 3.6, 1, False, False, "block", 0.14))
build("house-b", lambda: mudbrick_house(4.4, 4.8, 3.4, 2, True, False, "block", 0.11))
build("house-c", lambda: mudbrick_house(3.6, 3.9, 3.1, 1, False, True, "ell", 0.15))
build("house-d", lambda: mudbrick_house(4.6, 4.0, 3.5, 2, False, False, "court", 0.12))
build("house-e", lambda: mudbrick_house(3.2, 3.4, 3.2, 1, True, False, "tower", 0.16))
build("house-f", lambda: mudbrick_house(5.0, 4.2, 3.3, 1, False, True, "ell", 0.10))
build("crate", crate)
build("sackpile", sack_pile)
build("awning", awning)
build("bigjar", storage_jar)
build("waterskin", waterskin)
build("fodder", fodder_pile)
build("desert-bush", desert_shrub)
build("butte", butte_rock)
build("bayt", bayt_tent)
build("bayt2", lambda: bayt_tent(7.0, 3.8, 2.15))
build("find-coin", evidence_coin)
build("find-seal", evidence_seal)
build("find-scroll", evidence_scroll)
build("find-inscription", evidence_inscription)
build("find-incense", evidence_incense)
build("find-sherd", evidence_sherd)
build("ansab", ansab_stone)
print("done")
