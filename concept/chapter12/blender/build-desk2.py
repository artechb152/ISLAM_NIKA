# פרק 12 · שולחן התיקים — סבב ריאליזם (2).
# הסבב הראשון (build-desk.py) נפסל: „לא נראה מספיק ריאליסטי". כאן: טקסטורות PBR אמיתיות
# (Poly Haven / ambientCG, CC0), תאורת HDRI של חדר קריאה + שמש מחלון, AgX, עומק שדה,
# תיקים שמתקפלים בתחתית כמו תיק מנילה, גומייה עגולה שעוטפת את התיק, דפים גליים, ועט.
# בלי אותיות על שום משטח (כלל 40). האדום: הגומיות והעט (כלל 37).
# ריצה: "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b -P build-desk2.py
import bpy, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
random.seed(12)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c) + (a,)

def img(nt, path, non_color=False):
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(path)
    n.projection = 'BOX'; n.projection_blend = 0.2
    if non_color: n.image.colorspace_settings.name = 'Non-Color'
    return n

def pbr(name, scale, color=None, diff=None, nor=None, rough=None, tint=None,
        nor_strength=1.0, rough_value=0.7, ao_darken=0.0, clearcoat=0.0):
    """חומר על קואורדינטות Object בהטלת קופסה — הטקסטורה לא נמתחת לפי גודל הפאה."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; L = nt.links; bsdf = nt.nodes['Principled BSDF']
    co = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    mp.inputs['Location'].default_value = (random.random() * 5, random.random() * 5, 0)
    L.new(co.outputs['Object'], mp.inputs['Vector'])
    base = None
    if diff:
        d = img(nt, diff); L.new(mp.outputs['Vector'], d.inputs['Vector']); base = d.outputs['Color']
    if tint:
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = tint
        if base is not None: L.new(base, mix.inputs[6])
        else: mix.inputs[6].default_value = (1, 1, 1, 1)
        base = mix.outputs[2]
    if base is None and color is not None:
        # בלי מפת צבע — רעש רך על הצבע, כדי שמשטח גדול לא יהיה אחיד כמו פלסטיק
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0
        nz.inputs['Detail'].default_value = 8
        L.new(mp.outputs['Vector'], nz.inputs['Vector'])
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = tuple(c * 0.86 for c in color[:3]) + (1,)
        ramp.color_ramp.elements[1].color = color
        L.new(nz.outputs['Fac'], ramp.inputs['Fac']); base = ramp.outputs['Color']
    if ao_darken and base is not None:
        ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.15
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
        mx.inputs['Factor'].default_value = ao_darken
        L.new(base, mx.inputs[6]); L.new(ao.outputs['Color'], mx.inputs[7]); base = mx.outputs[2]
    if base is not None: L.new(base, bsdf.inputs['Base Color'])
    if rough:
        r = img(nt, rough, True); L.new(mp.outputs['Vector'], r.inputs['Vector']); L.new(r.outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = rough_value
    if nor:
        n = img(nt, nor, True); L.new(mp.outputs['Vector'], n.inputs['Vector'])
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor_strength
        L.new(n.outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if clearcoat:
        bsdf.inputs['Coat Weight'].default_value = clearcoat; bsdf.inputs['Coat Roughness'].default_value = 0.15
    return m

def plain(name, color, rough=0.5, metallic=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color; b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metallic
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.1
    return m

def box(name, size, loc, material, bevel=0.0, parent=None, rot=(0, 0, 0), cuts=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if cuts:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=cuts)
        bpy.ops.object.mode_set(mode='OBJECT')
    o.rotation_euler = rot
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 2
    o.data.materials.append(material)
    if parent: o.parent = parent
    for p in o.data.polygons: p.use_smooth = True
    return o

P = lambda f: os.path.join(TEX, f)
PAPER_N = P('Paper005/Paper005_2K-JPG_NormalGL.jpg')
PAPER_C = P('Paper005/Paper005_2K-JPG_Color.jpg')
PAPER_R = P('Paper005/Paper005_2K-JPG_Roughness.jpg')

wood = pbr('wood', 0.09, diff=P('wood_table_worn_diff.jpg'), nor=P('wood_table_worn_nor.jpg'),
           rough=P('wood_table_worn_rough.jpg'), nor_strength=0.6)
leather = pbr('leather', 0.35, diff=P('leather_red_02_coll1.jpg'), nor=P('leather_red_02_nor.jpg'),
              rough=P('leather_red_02_rough.jpg'), tint=hexc('#b5454c'), nor_strength=0.5)
TONES = ['#d8c8a8', '#d1bf9c', '#dccdb0', '#cdb994', '#d6c5a3']   # כל תיק בגוון קרטון מעט אחר
manilas = [pbr(f'manila{j}', 0.5, diff=PAPER_C, tint=hexc(t), nor=PAPER_N, rough_value=0.95,
               nor_strength=0.14, ao_darken=0.6) for j, t in enumerate(TONES)]
manila_in = pbr('manila_in', 0.5, diff=PAPER_C, tint=hexc('#c5b08a'), nor=PAPER_N, rough_value=0.95,
                nor_strength=0.14, ao_darken=0.6)
sheet_a = pbr('sheet_a', 0.6, diff=PAPER_C, tint=hexc('#f0dcb4'), nor=PAPER_N, nor_strength=0.15, rough_value=0.9)
sheet_b = pbr('sheet_b', 0.6, diff=PAPER_C, tint=hexc('#e6cfa2'), nor=PAPER_N, nor_strength=0.15, rough_value=0.9)
for m in manilas + [manila_in, sheet_a, sheet_b]:
    m.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.18   # נייר לא מבריק
cord = plain('cord', hexc('#a5322f'), 0.55)                       # --stamp
pen_body = plain('pen_body', hexc('#3a1015'), 0.25, coat=0.8)
brass = plain('brass', hexc('#c79a3c'), 0.3, metallic=1.0)        # --gold

# ---------- השולחן ----------
box('desk', (22, 15, 0.5), (0, 1.5, -0.25), wood, bevel=0.04)
# משטח העור ירד (3.11, „למה השולחן מעור?") — התיקים מונחים על העץ
PAD_TOP = 0.0

# ---------- חמישה תיקים ----------
W, H, T = 2.05, 2.75, 0.022

def label_mat(n):
    m = bpy.data.materials.new(f'label{n}'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(HERE, 'labels', f'label{n}.png'))
    nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 0.85; b.inputs['Specular IOR Level'].default_value = 0.2
    return m

# הכריכה מתרוממת בפינה השמאלית — התווית יושבת בימין העליון, כמו בתיק עברי
def lift_at(x, y, lift):
    u = max(0.0, (W / 2 - x) / W - 0.5) / 0.5
    w = max(0.0, min(1.0, (y + H * 0.05) / (H * 0.55)))
    return lift * u * u * w
# מונחים כמו שמניחים תיקים ביד: זוויות שונות, והחמישי חופף מעט על השלישי (שכבה 1)
# בסדר עברי (4.11, „זה לא RTL"): 01 בימין העליון, והמספרים יורדים שמאלה ואז לשורה השנייה
SPOTS = [(2.85, 1.15, -14, 0), (-0.4, 1.7, -4, 0), (-3.5, 1.3, 9, 0), (2.3, -1.45, 11, 1), (-1.9, -1.6, -8, 0)]
for i, (x, y, rot, layer) in enumerate(SPOTS):
    root = bpy.data.objects.new(f'folder{i + 1}', None); sc.collection.objects.link(root)
    root.location = (x, y, PAD_TOP + layer * 0.09); root.rotation_euler[2] = math.radians(rot)
    nsheets = 3 + (i * 2) % 5
    gap = 0.012 + nsheets * 0.006
    # גב התיק, עם לשונית שמיקומה לפי מספר התיק
    box('back', (W, H, T), (0, 0, T / 2), manila_in, 0.004, root, cuts=6)
    tx = W / 2 - 0.36 - i * (W - 0.72) / 4      # הלשונית של 01 בימין, וכל תיק הבא שמאלה ממנו
    box('tab', (0.56, 0.3, T), (tx, H / 2 + 0.13, T / 2), manila_in, 0.05, root)
    # הדפים — כל אחד מוזז ומסובב מעט, גלי, וחלקם בולטים מהצד
    for k in range(nsheets):
        dx = random.uniform(0.0, 0.3); dy = random.uniform(-0.12, 0.2)
        s = box('sheet', (W - 0.1, H - 0.16, 0.004), (dx, dy, T + 0.004 + k * 0.006),
                sheet_a if k % 2 == 0 else sheet_b, 0.0015, root,
                (0, 0, math.radians(random.uniform(-5, 5))), cuts=10)
        tx_ = bpy.data.textures.new(f'wave{i}{k}', 'CLOUDS'); tx_.noise_scale = 1.4
        d = s.modifiers.new('wave', 'DISPLACE'); d.texture = tx_; d.strength = 0.012; d.direction = 'Z'
    top_z = T + gap
    # הכריכה הקדמית: קצרה מעט מהגב (הלשונית נחשפת), ומתקפלת לגב בתחתית
    fr = box('front', (W, H - 0.06, T), (0, -0.03, top_z + T / 2), manilas[i], 0.004, root, cuts=14)
    lift = 0.08 + 0.05 * (i % 3) / 2
    for v in fr.data.vertices:
        v.co.z += lift_at(v.co.x, v.co.y, lift)
    # התווית — מישור דק שמתעקם יחד עם הכריכה
    LW, LH = 1.36, 0.544; lx, ly = W / 2 - 0.14 - LW / 2, H / 2 - 0.65
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
    lb = bpy.context.object; lb.name = f'label{i + 1}'; lb.scale = (LW, LH, 1)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=10); bpy.ops.object.mode_set(mode='OBJECT')
    for v in lb.data.vertices:
        v.co.x += lx; v.co.y += ly
        v.co.z = top_z + T + 0.0025 + lift_at(v.co.x, v.co.y, lift)
    lb.parent = root; lb.data.materials.append(label_mat(f'{i + 1:02d}'))
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=(top_z + T) / 2, depth=W,
                                        location=(0, -H / 2, (top_z + T) / 2), rotation=(0, math.radians(90), 0))
    fold = bpy.context.object; fold.name = 'fold'; fold.parent = root; fold.data.materials.append(manilas[i])
    for p in fold.data.polygons: p.use_smooth = True
    # גומייה עגולה שעוטפת את התיק — עקומה סגורה סביב החתך
    by = -H * 0.2; e = 0.012; z1 = top_z + T + e
    cu = bpy.data.curves.new(f'cord{i}', 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = 0.011; cu.bevel_resolution = 4
    sp = cu.splines.new('POLY'); pts = [(-W / 2 - e, by, -0.002), (W / 2 + e, by, -0.002),
                                         (W / 2 + e, by, z1), (-W / 2 - e, by, z1)]
    sp.points.add(len(pts) - 1)
    for pt, c in zip(sp.points, pts): pt.co = c + (1,)
    sp.use_cyclic_u = True
    co = bpy.data.objects.new(f'cord{i}', cu); co.data.materials.append(cord); co.parent = root
    sc.collection.objects.link(co)

# ---------- עט על המשטח ----------
pen = bpy.data.objects.new('pen', None); sc.collection.objects.link(pen)
pen.location = (4.55, -0.9, PAD_TOP + 0.07); pen.rotation_euler = (0, 0, math.radians(76))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.07, depth=1.5, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
b = bpy.context.object; b.parent = pen; b.data.materials.append(pen_body)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.07, radius2=0.012, depth=0.32, location=(0.91, 0, 0), rotation=(0, math.radians(90), 0))
t = bpy.context.object; t.parent = pen; t.data.materials.append(brass)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.074, depth=0.06, location=(0.4, 0, 0), rotation=(0, math.radians(90), 0))
r = bpy.context.object; r.parent = pen; r.data.materials.append(brass)
box('clip', (0.6, 0.02, 0.025), (-0.35, 0, 0.085), brass, 0.008, pen)
for o in pen.children:
    for p in o.data.polygons: p.use_smooth = True

# ---------- אור ----------
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
wn = sc.world.node_tree; env = wn.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(P('reading_room.hdr'))
wn.links.new(env.outputs['Color'], wn.nodes['Background'].inputs['Color'])
wn.nodes['Background'].inputs['Strength'].default_value = 0.55
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 4.6; sun.data.color = (1.0, 0.94, 0.86); sun.data.angle = math.radians(2.5)
sun.rotation_euler = (math.radians(48), 0, math.radians(-135))
sc.collection.objects.link(sun)
# צל של מסגרת חלון על השולחן — שני מוטות, הרחק מחוץ למסגרת המצלמה, על קו השמש
from mathutils import Vector, Euler
to_sun = Euler(sun.rotation_euler).to_matrix() @ Vector((0, 0, 1))
gobo = bpy.data.objects.new('gobo', None); sc.collection.objects.link(gobo)
# הצלב נופל על העץ בפינה, לא על התיקים — צלב על תיק נקרא „מחוק"
gobo.location = Vector((-8.5, 5.5, 0)) + to_sun * 7
gobo.rotation_euler = sun.rotation_euler
shade = plain('shade', (0.02, 0.02, 0.02, 1), 1.0)
box('mullion_v', (0.18, 30, 0.1), (0, 0, 0), shade, parent=gobo)
box('mullion_h', (30, 0.18, 0.1), (0, 1.6, 0), shade, parent=gobo)
for o in gobo.children: o.visible_camera = False

sc.render.film_transparent = True
sc.render.engine = 'CYCLES'; sc.cycles.samples = 160; sc.cycles.use_denoising = True
sc.cycles.device = 'CPU'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000

def shoot(name, loc, rot, lens=None, ortho=None, focus=None, fstop=None):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    sc.collection.objects.link(cam); cam.location = loc; cam.rotation_euler = rot
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    if lens: cam.data.lens = lens
    if focus:
        cam.data.dof.use_dof = True; cam.data.dof.focus_distance = focus; cam.data.dof.aperture_fstop = fstop
    sc.camera = cam; sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

# build-desk3.py קורא את הקובץ הזה בשביל הסצנה בלבד (DESK_SCENE_ONLY)
if not os.environ.get('DESK_SCENE_ONLY'):
  shoot('real6-low', (0.3, -7.6, 8.6), (math.radians(42), 0, math.radians(2)), lens=40, focus=10.9, fstop=0.45)
  shoot('real6-top', (0, 0, 20), (0, 0, 0), ortho=12.2)
  bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'desk2.blend'))
