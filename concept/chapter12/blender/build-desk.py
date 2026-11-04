# פרק 12 · שולחן התיקים — פיילוט.
# שולחן עץ, ועליו חמישה תיקי קרטון סגורים: חמש כותרות המקור. בלי אותיות על שום משטח —
# המספרים והשמות יושבים ב-DOM (כלל 40). האדום: גומיית הסגירה של כל תיק (כלל 37).
# ריצה: "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b -P build-desk.py
import bpy, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
random.seed(12)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c) + (a,)          # sRGB → ליניארי

def mat(name, color, rough=0.8, noise=0.0, noise_scale=40.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    if noise:
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = noise_scale
        tex.inputs['Detail'].default_value = 6
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        lo, hi = ramp.color_ramp.elements
        lo.color = tuple(c * (1 - noise) for c in color[:3]) + (1,); hi.color = color
        nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = color
    return m

def box(name, size, loc, material, bevel=0.0, parent=None, rot_z=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.rotation_euler[2] = rot_z
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 3
    o.data.materials.append(material)
    if parent: o.parent = parent
    return o

# ---------- חומרים — מתוך הפלטה של chapter6-article.css ----------
wood = bpy.data.materials.new('wood'); wood.use_nodes = True
nt = wood.node_tree; bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.55
wave = nt.nodes.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Y'
wave.inputs['Scale'].default_value = 1.6; wave.inputs['Distortion'].default_value = 9
wave.inputs['Detail'].default_value = 8; wave.inputs['Detail Scale'].default_value = 0.7
wave.inputs['Detail Roughness'].default_value = 0.6
coord = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
mp.inputs['Scale'].default_value = (0.12, 1.0, 1.0)
nt.links.new(coord.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], wave.inputs['Vector'])
wr = nt.nodes.new('ShaderNodeValToRGB')
wr.color_ramp.elements[0].color = hexc('#3a2416'); wr.color_ramp.elements[1].color = hexc('#6b4429')
nt.links.new(wave.outputs['Fac'], wr.inputs['Fac']); nt.links.new(wr.outputs['Color'], bsdf.inputs['Base Color'])

kraft = mat('kraft', hexc('#c9ad7c'), 0.9, noise=0.10, noise_scale=60)
kraft_dark = mat('kraft_dark', hexc('#b39669'), 0.9, noise=0.10, noise_scale=60)
paper = mat('paper', hexc('#e6dbc2'), 0.85, noise=0.05, noise_scale=90)   # קלף, לא לבן (כלל 35)
paper2 = mat('paper2', hexc('#ddcfb0'), 0.85, noise=0.05, noise_scale=90)
band = mat('band', hexc('#a5322f'), 0.6)                                    # --stamp
felt = mat('felt', hexc('#571820'), 0.95, noise=0.08, noise_scale=120)     # משטח כתיבה בורדו

# ---------- השולחן ----------
box('desk', (14, 9, 0.4), (0, 0, -0.2), wood, bevel=0.03)
box('blotter', (10.6, 6.6, 0.02), (0, 0, 0.01), felt, bevel=0.01)

# ---------- חמישה תיקים ----------
W, H, T = 2.05, 2.75, 0.035          # רוחב, גובה (לאורך y), עובי קרטון
# שלוש למעלה, שתיים למטה — לא חופפים, כדי שכל תיק יהיה מטרה ללחיצה אחת
SPOTS = [(-3.3, 1.45), (0, 1.6), (3.3, 1.4), (-1.7, -1.75), (1.7, -1.65)]
for i, (x, y) in enumerate(SPOTS):
    rz = math.radians(random.uniform(-5, 5))
    root = bpy.data.objects.new(f'folder{i + 1}', None); sc.collection.objects.link(root)
    root.location = (x, y, 0.02); root.rotation_euler[2] = rz
    z = 0
    box('back', (W, H, T), (0, 0, z + T / 2), kraft_dark, 0.006, root)
    # הלשונית — המיקום שלה זז עם מספר התיק, כמו בארון תיקים אמיתי
    tx = -W / 2 + 0.35 + i * (W - 0.7) / 4
    box('tab', (0.55, 0.28, T), (tx, H / 2 + 0.12, z + T / 2), kraft_dark, 0.04, root)
    # דפים שבולטים מהצד, כל תיק במספר אחר
    for k in range(2 + i % 3):
        dx = 0.06 + 0.05 * k + random.uniform(0, 0.04); dy = random.uniform(-0.08, 0.05)
        box('sheet', (W - 0.08, H - 0.12, 0.006), (dx, dy, z + T + 0.004 + k * 0.007),
            paper if k % 2 == 0 else paper2, 0.002, root, math.radians(random.uniform(-1.5, 1.5)))
    top_z = z + T + 0.03 + (2 + i % 3) * 0.007
    fr = box('front', (W, H - 0.05, T), (0, -0.025, top_z + T / 2), kraft, 0.006, root)
    bpy.context.view_layer.objects.active = fr; bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=12); bpy.ops.object.mode_set(mode='OBJECT')
    # הפינה החופשית מתרוממת מעט — רק מעל הגומייה, כדי שהגומייה תישאר צמודה לכריכה
    for v in fr.data.vertices:
        u = max(0.0, (v.co.x + W / 2) / W - 0.55) / 0.45
        w = max(0.0, min(1.0, (v.co.y + H * 0.08) / (H * 0.5)))
        v.co.z += 0.09 * u * u * w * (0.6 + 0.4 * (i % 2))
    # גומיית סגירה אדומה לרוחב התיק
    box('band', (W + 0.03, 0.07, top_z + T + 0.012), (0, -H * 0.22, (top_z + T) / 2 + 0.003), band, 0.01, root)

# ---------- אור, עולם, רינדור ----------
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
bg = sc.world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = hexc('#f3ead6'); bg.inputs['Strength'].default_value = 0.35
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 2.6; sun.data.color = (1.0, 0.92, 0.80); sun.data.angle = math.radians(9)
sun.rotation_euler = (math.radians(50), 0, math.radians(-135))   # אותו אור של פרק 11
sc.collection.objects.link(sun)
area = bpy.data.objects.new('lamp', bpy.data.lights.new('lamp', 'AREA'))
area.data.energy = 650; area.data.size = 6; area.data.color = (1.0, 0.88, 0.72)
area.location = (-2, 6, 8); area.rotation_euler = (math.radians(35), 0, math.radians(-160))
sc.collection.objects.link(area)
sc.render.film_transparent = True
sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.cycles.device = 'CPU'; sc.view_settings.view_transform = 'Standard'
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000

def shoot(name, loc, rot, lens=None, ortho=None):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    sc.collection.objects.link(cam); cam.location = loc; cam.rotation_euler = rot
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    if lens: cam.data.lens = lens
    sc.camera = cam; sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

shoot('top', (0, 0, 20), (0, 0, 0), ortho=11.0)
shoot('low', (0, -8.2, 6.8), (math.radians(52), 0, 0), lens=34)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'desk.blend'))
