# פרק 13 · אולם התרנים — פיילוט 1.
# 16 תחנות בסדר המקור (§1–§16), לסירוגין ימין/שמאל, מהכניסה פנימה.
# „דגל" תלוי על תורן עם זרוע עליונה; „סמל" יושב כמדליון על עמוד — ההבחנה של המקור עצמו.
# הדגלים והסמלים הם חיתוכים מהחוברת (tex/flags/sNN.png) — המחולל לא כותב ערבית (כלל 40).
# האדום: השטיח הרץ במרכז (כלל 37). בלי קשתות ובלי כיפות — האולם ניטרלי, לא מקום מזוהה.
# ריצה: "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b -P build-hall.py
import bpy, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)

# (§, סוג) — סדר המקור. 'flag' = „דגל …", 'emblem' = „סמל …"
STATIONS = [
    (1, 'flag'), (2, 'flag'), (3, 'flag'), (4, 'flag'),
    (5, 'flag'), (6, 'emblem'), (7, 'emblem'), (8, 'flag'),
    (9, 'emblem'), (10, 'emblem'), (11, 'flag'), (12, 'flag'),
    (13, 'emblem'), (14, 'flag'), (15, 'flag'), (16, 'flag'),
]
# §5 הוא צילום של דגל מוחזק ביד — חותכים את הקיר והיד בשוליים (u0,v0,u1,v1)
# (ב-0.07 הקיר הכתום בפינה השמאלית-תחתונה עוד נראה — שולי הבד בצילום אלכסוניים)
UV_CROP = {5: (0.15, 0.135, 0.86, 0.98)}

HALL_W, HALL_L, HALL_H = 13.0, 50.0, 7.0   # ב-10 מ' זה נקרא מסדרון
STEP = 5.0          # בין תחנות באותו צד. ב-3.8, בזוגות, כל דגל כיסה את הבא (OVERLAPPING)
HALF = STEP / 2     # הצדדים מדורגים: §1 ימין, §2 שמאל חצי צעד אחריו — זיגזג בסדר המקור
TURN = 15           # מעלות אל הכניסה. ב-28 הדגל נמתח לתוך התחנה שאחריו
SIDE_X = 4.3
FIRST_Y = 6.0       # ב-3.4 התחנה הראשונה (§1) נפלה מאחורי פריים הכניסה
Y0 = -7.0           # האולם ממשיך מאחורי מצלמת הכניסה — כדי שאפשר יהיה לסגת ולראות את §1 שלם

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c) + (a,)

def tex_img(nt, path, non_color=False, proj='BOX'):
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(path)
    n.projection = proj
    if proj == 'BOX': n.projection_blend = 0.2
    if non_color: n.image.colorspace_settings.name = 'Non-Color'
    return n

def pbr(name, base, scale, tint=None, nor_strength=1.0, rough_floor=0.0):
    """חומר PBR מ-Poly Haven על קואורדינטות Object בהטלת קופסה."""
    m = bpy.data.materials.new(name); nt = m.node_tree; L = nt.links
    bsdf = nt.nodes['Principled BSDF']
    co = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale,) * 3
    L.new(co.outputs['Object'], mp.inputs['Vector'])
    d = tex_img(nt, os.path.join(TEX, base + '_diff.jpg')); L.new(mp.outputs['Vector'], d.inputs['Vector'])
    col = d.outputs['Color']
    if tint:
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
        mx.inputs['Factor'].default_value = 1.0; mx.inputs[7].default_value = tint
        L.new(col, mx.inputs[6]); col = mx.outputs[2]
    L.new(col, bsdf.inputs['Base Color'])
    r = tex_img(nt, os.path.join(TEX, base + '_rough.jpg'), True); L.new(mp.outputs['Vector'], r.inputs['Vector'])
    rc = r.outputs['Color']
    if rough_floor:
        # הפרקט יצא מראה מבריקה — רצפת מוזיאון היא מט-למחצה
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = rough_floor
        L.new(rc, mr.inputs['Value']); rc = mr.outputs['Result']
    L.new(rc, bsdf.inputs['Roughness'])
    n = tex_img(nt, os.path.join(TEX, base + '_nor_gl.jpg'), True); L.new(mp.outputs['Vector'], n.inputs['Vector'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor_strength
    L.new(n.outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m

def plain(name, color, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name); b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m

def image_mat(name, path, crop=(0, 0, 1, 1), cloth=True, key_white=False, revive=False):
    """תמונה על UV. cloth: ברק בד ותבליט אריג. key_white: הלבן של הרקע נעשה שקוף (סמלים)."""
    m = bpy.data.materials.new(name); nt = m.node_tree; L = nt.links
    bsdf = nt.nodes['Principled BSDF']; out = nt.nodes['Material Output']
    uv = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    u0, v0, u1, v1 = crop
    mp.inputs['Location'].default_value = (u0, v0, 0); mp.inputs['Scale'].default_value = (u1 - u0, v1 - v0, 1)
    L.new(uv.outputs['UV'], mp.inputs['Vector'])
    im = tex_img(nt, path, proj='FLAT'); im.extension = 'EXTEND'; im.interpolation = 'Cubic'
    L.new(mp.outputs['Vector'], im.inputs['Vector'])
    col = im.outputs['Color']
    if revive:
        # §5 הוא צילום חשוף-יתר — מחזירים ניגודיות ורוויה, בלי לשנות גוון
        bc = nt.nodes.new('ShaderNodeBrightContrast'); bc.inputs['Bright'].default_value = -0.08
        bc.inputs['Contrast'].default_value = 0.35; L.new(col, bc.inputs['Color'])
        hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.35
        L.new(bc.outputs['Color'], hs.inputs['Color']); col = hs.outputs['Color']
    L.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.78 if cloth else 0.55
    if cloth:
        bsdf.inputs['Sheen Weight'].default_value = 0.35
        nz = nt.nodes.new('ShaderNodeTexWave'); nz.inputs['Scale'].default_value = 900
        nz.wave_type = 'BANDS'; L.new(uv.outputs['UV'], nz.inputs['Vector'])
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
        L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if key_white:
        sep = nt.nodes.new('ShaderNodeSeparateColor'); L.new(im.outputs['Color'], sep.inputs['Color'])
        mn1 = nt.nodes.new('ShaderNodeMath'); mn1.operation = 'MINIMUM'
        L.new(sep.outputs[0], mn1.inputs[0]); L.new(sep.outputs[1], mn1.inputs[1])
        mn2 = nt.nodes.new('ShaderNodeMath'); mn2.operation = 'MINIMUM'
        L.new(mn1.outputs[0], mn2.inputs[0]); L.new(sep.outputs[2], mn2.inputs[1])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = 0.80; mr.inputs['From Max'].default_value = 0.93
        mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 0.0
        L.new(mn2.outputs[0], mr.inputs['Value'])
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
        L.new(mr.outputs['Result'], mix.inputs['Fac'])
        L.new(tr.outputs[0], mix.inputs[1]); L.new(bsdf.outputs[0], mix.inputs[2])
        L.new(mix.outputs[0], out.inputs['Surface'])
    return m

def box(name, loc, size, mat, bevel=0.012):
    # הגודל נאפה לרשת (לא scale) — כך טקסטורות ה-Object במטרים אמיתיים ולא נמתחות לאורך האולם,
    # והשיפוע בפינות אחיד. פינות חדות לגמרי הן מה שעושה „מחשב".
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, scale=size)
    o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = min(bevel, min(size) * 0.3); bv.segments = 2
        bv.harden_normals = False
    o.data.materials.append(mat); return o

def cyl(name, loc, r, depth, mat, rot=(0, 0, 0), verts=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat)
    bpy.ops.object.shade_smooth(); return o

# ── חומרים ──
# קני מידה במטרים (הרשת אפויה): 1/scale = גודל אריח
parquet = pbr('parquet', 'herringbone_parquet', 0.5, tint=hexc('#b89c80'), rough_floor=0.55)
plaster = pbr('plaster', 'plastered_wall_02', 0.3, tint=hexc('#e6dcc6'), nor_strength=0.8)
velvet = pbr('runner', 'velour_velvet', 1.5, tint=hexc('#6e1c26'), nor_strength=0.6)
velvet_edge = plain('runner_edge', hexc('#3e0f16'), 0.7)
stone = plain('stone', hexc('#cdbb95'), 0.7)
ceil = plain('ceil', hexc('#a8946e'), 0.85)
walnut = pbr('walnut', 'herringbone_parquet', 1.2, tint=hexc('#5a3e2a'), rough_floor=0.4)
iron = plain('iron', hexc('#1e1b18'), 0.45, 0.6)
beam = plain('beam', hexc('#5a3d24'), 0.6)
brass = plain('brass', hexc('#c79a3c'), 0.32, 1.0)
pole_wood = plain('pole', hexc('#3c2c1d'), 0.45)
disc_paper = plain('disc', hexc('#ede4d0'), 0.8)

# ── האולם ──
L_ = HALL_L
LEN = L_ - Y0; MID = (L_ + Y0) / 2
box('floor', (0, MID, -0.05), (HALL_W, LEN, 0.1), parquet)
box('ceiling', (0, MID, HALL_H + 0.05), (HALL_W, LEN, 0.1), ceil)
for sx in (-1, 1):
    wx = sx * HALL_W / 2
    box(f'wall{sx}', (wx + sx * 0.1, MID, HALL_H / 2), (0.2, LEN, HALL_H), plaster)
    # חיפוי עץ כהה בחלק התחתון — שובר את הקיר האחיד ונותן לדגלים רקע עמוק
    box(f'wains{sx}', (wx - sx * 0.03, MID, 0.65), (0.06, LEN, 1.3), walnut)
    box(f'rail{sx}', (wx - sx * 0.06, MID, 1.31), (0.06, LEN, 0.05), brass)
    box(f'base{sx}', (wx - sx * 0.05, MID, 0.09), (0.1, LEN, 0.18), beam)
    box(f'cornice{sx}', (wx - sx * 0.1, MID, HALL_H - 0.9), (0.22, LEN, 0.24), stone)
    box(f'cornice2{sx}', (wx - sx * 0.05, MID, HALL_H - 1.06), (0.12, LEN, 0.08), stone)
    for k in range(-2, 11):
        # עמוד-קיר באמצע בין שתי תחנות של אותו צד, לא מאחורי דגל
        y = FIRST_Y + (0 if sx > 0 else HALF) + HALF + k * STEP
        px = wx - sx * 0.14
        box(f'pil{sx}{k}', (px, y, HALL_H / 2), (0.28, 0.6, HALL_H), plaster)
        box(f'pilb{sx}{k}', (px - sx * 0.03, y, 0.7), (0.32, 0.7, 1.4), walnut)
        box(f'pilc{sx}{k}', (px - sx * 0.03, y, HALL_H - 1.25), (0.34, 0.72, 0.18), stone)
box('endwall', (0, L_ + 0.1, HALL_H / 2), (HALL_W, 0.2, HALL_H), plaster)
box('endwains', (0, L_ - 0.03, 0.65), (HALL_W, 0.06, 1.3), walnut)
box('backwall', (0, Y0 - 0.1, HALL_H / 2), (HALL_W, 0.2, HALL_H), plaster)
# תקרת קורות מתפצלת לקסטות: קורות רוחב + שתי קורות אורך
for k in range(int(LEN / 3.0) + 1):
    box(f'beam{k}', (0, Y0 + 1.0 + k * 3.0, HALL_H - 0.2), (HALL_W, 0.3, 0.4), beam)
for bx in (-2.2, 2.2):
    box(f'lbeam{bx}', (bx, MID, HALL_H - 0.14), (0.24, LEN, 0.28), beam)
box('runner', (0, MID, 0.012), (2.2, LEN - 2.0, 0.02), velvet)
for ex in (-1.13, 1.13):
    box(f'redge{ex}', (ex, MID, 0.013), (0.08, LEN - 2.0, 0.022), velvet_edge)

# חלונות עליונים — מקור האור הטבעי, מעל הכרכוב
win_mat = bpy.data.materials.new('window'); wn = win_mat.node_tree
wn.nodes.remove(wn.nodes['Principled BSDF'])
em = wn.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = hexc('#ffe9c4')
em.inputs['Strength'].default_value = 6
wn.links.new(em.outputs[0], wn.nodes['Material Output'].inputs['Surface'])
for sx in (-1, 1):
    for k in range(-2, 11):
        y = FIRST_Y + (0 if sx > 0 else HALF) + k * STEP
        wx = sx * (HALL_W / 2 - 0.01); fz = HALL_H - 0.45
        box(f'win{sx}{k}', (wx, y, fz), (0.02, 1.6, 0.55), win_mat, bevel=0)
        # מסגרת וחלוקה — בלי זה החלון הוא מלבן זוהר שמודבק על הקיר
        fx = wx - sx * 0.04
        for dz in (-0.3, 0.3):
            box(f'wfh{sx}{k}{dz}', (fx, y, fz + dz), (0.08, 1.76, 0.07), beam)
        for dy in (-0.84, -0.28, 0.28, 0.84):
            box(f'wfv{sx}{k}{dy}', (fx, y + dy, fz), (0.08, 0.06, 0.6), beam)

# ── התחנות ──
def station(i, sid, kind):
    side = 1 if i % 2 == 0 else -1           # הראשון בימין, כמו קריאה בעברית
    y = FIRST_Y + i * HALF                   # מדורג: כל תחנה חצי צעד אחרי הקודמת, בצד השני
    x = side * SIDE_X
    root = bpy.data.objects.new(f's{sid:02d}', None); sc.collection.objects.link(root)
    root.location = (x, y, 0)
    # הפנים אל המרכז ומעט אל הכניסה, כדי שייקראו מהמעבר
    root.rotation_euler = (0, 0, math.radians(-90 * side + side * TURN))
    path = os.path.join(TEX, 'flags', f's{sid:02d}.png')
    img = bpy.data.images.load(path); w_px, h_px = img.size
    aspect = w_px / h_px
    if sid in UV_CROP:   # המטוס במידות החיתוך, לא התמונה — אחרת הבד נמתח
        u0, v0, u1, v1 = UV_CROP[sid]; aspect *= (u1 - u0) / (v1 - v0)
    def parent(o): o.parent = root; return o
    # בסיס אבן נמוך — מעגן את התחנה ברצפה
    parent(box('plinth', (0, 0, 0.06), (0.9, 0.9, 0.12), stone))
    parent(box('plinth2', (0, 0, 0.15), (0.6, 0.6, 0.06), stone))
    if kind == 'flag':
        # תורן תצוגה פנימי בגובה אדם וחצי — ב-4.4 מ' הדגלים ריחפו מעל הראש
        W = 1.75; H = W / aspect
        top = 3.3
        parent(cyl('pole', (0, 0, 1.75), 0.035, 3.5, pole_wood))
        parent(cyl('finial', (0, 0, 3.54), 0.06, 0.08, brass))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.065, location=(0, 0, 3.65)); parent(bpy.context.object).data.materials.append(brass)
        parent(cyl('arm', (W / 2, 0.06, top + 0.03), 0.018, W + 0.12, brass, rot=(0, math.radians(90), 0)))
        bpy.ops.mesh.primitive_plane_add(size=1, location=(W / 2 + 0.03, 0.06, top - H / 2),
                                         rotation=(math.radians(90), 0, 0))
        f = parent(bpy.context.object); f.name = 'cloth'; f.scale = (W, H, 1)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=60)
        bpy.ops.object.mode_set(mode='OBJECT')
        # קפלים אנכיים: גל רחב + גל צר, מתרחבים כלפי מטה (בד שתלוי מזרוע). z המקומי לא מוגדל — מטרים
        for v in f.data.vertices:
            u = v.co.x + 0.5; d = 0.5 - v.co.y
            v.co.z += (0.012 + 0.05 * d) * math.sin(u * math.pi * 3.5 + 0.6) \
                + (0.004 + 0.012 * d) * math.sin(u * math.pi * 11 + 1.3)
        bpy.ops.object.shade_smooth()
        sol = f.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = 0.003   # לבד יש עובי
        f.data.materials.append(image_mat(f'flag{sid}', path, UV_CROP.get(sid, (0.012, 0.012, 0.988, 0.988)),
                                          revive=(sid == 5)))
        aim = (W / 2, 0, top - H / 2)
    else:
        # „סמל" — לוח תצוגה עומד, כמו בתערוכה: מסגרת עץ, משטח נייר, שתי רגליים.
        # (המדליון על מקל נראה כמו סוכרייה על מקל — „מוזר")
        P = 1.15; cz = 1.75
        parent(box('frame', (0, 0.03, cz), (P + 0.1, 0.05, P + 0.1), beam))
        parent(box('face', (0, 0.0, cz), (P, 0.02, P), disc_paper, bevel=0.004))
        for lx in (-0.38, 0.38):
            parent(box(f'leg{lx}', (lx, 0.03, (cz - P / 2) / 2 + 0.09), (0.05, 0.05, cz - P / 2 - 0.1), beam))
        s = P * 0.86
        ew, eh = (s, s / aspect) if aspect >= 1 else (s * aspect, s)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.0125, cz), rotation=(math.radians(90), 0, 0))
        e = parent(bpy.context.object); e.name = 'emblem'; e.scale = (ew, eh, 1)
        e.data.materials.append(image_mat(f'emb{sid}', path, (0.01, 0.01, 0.99, 0.99), cloth=False, key_white=True))
        aim = (0, 0, cz)
    # ספוט מוזיאלי מהתקרה אל התחנה
    # הספוט הוא האור העיקרי עכשיו — כל תחנה היא בריכת אור, והמעבר ביניהן חשוך יותר
    sp = bpy.data.lights.new(f'spot{sid}', 'SPOT'); sp.energy = 2200; sp.spot_size = math.radians(30)
    sp.spot_blend = 0.45; sp.color = (1.0, 0.9, 0.76); sp.shadow_soft_size = 0.15
    so = bpy.data.objects.new(f'spot{sid}', sp); sc.collection.objects.link(so)
    from mathutils import Vector
    bpy.context.view_layer.update()
    target = root.matrix_world @ Vector(aim)
    so.location = Vector((x * 0.25, y - 1.8, HALL_H - 0.75))
    dirv = (target - so.location).normalized()
    so.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
    # גוף הפנס ומוט אל התקרה — אור שבא משום מקום הוא מה שנראה מזויף
    body = cyl(f'lamp{sid}', so.location - dirv * 0.13, 0.055, 0.2, iron, verts=24)
    body.rotation_euler = so.rotation_euler
    cyl(f'rod{sid}', (so.location.x, so.location.y, HALL_H - 0.4), 0.008, 0.7, iron, verts=8)

for i, (sid, kind) in enumerate(STATIONS):
    station(i, sid, kind)

# ── תאורה כללית ──
world = bpy.data.worlds.new('w'); sc.world = world; wt = world.node_tree
env = wt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.join(TEX, 'museum.hdr'))
wt.links.new(env.outputs['Color'], wt.nodes['Background'].inputs['Color'])
wt.nodes['Background'].inputs['Strength'].default_value = 0.12
# מילוי חלש בלבד — חמישה מילויים ב-650W ביטלו כל צל והאולם נראה שטוח
for k in range(8):
    a = bpy.data.lights.new(f'fill{k}', 'AREA'); a.energy = 160; a.size = 4; a.color = (0.95, 0.9, 0.82)
    o = bpy.data.objects.new(f'fill{k}', a); sc.collection.objects.link(o)
    o.location = (0, Y0 + 3 + k * 7.5, HALL_H - 0.6)
# ── רינדור ──
sc.render.engine = 'CYCLES'; sc.cycles.samples = 128; sc.cycles.use_denoising = True
sc.view_settings.exposure = 0.35
try:
    sc.cycles.device = 'GPU'
except Exception:
    pass
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.resolution_x, sc.render.resolution_y = 1600, 900

import sys
ONLY = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []   # ... -- mid station

def shot(name, loc, look_at, lens, focus=None, fstop=4.0):
    if ONLY and name not in ONLY: return
    cd = bpy.data.cameras.new(name); cd.lens = lens
    if focus:
        cd.dof.use_dof = True; cd.dof.focus_distance = focus; cd.dof.aperture_fstop = fstop
    cam = bpy.data.objects.new(name, cd); sc.collection.objects.link(cam)
    cam.location = loc
    from mathutils import Vector
    cam.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam; sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

# 28 מ"מ ולא 24 — העדשה הרחבה מתחה את האולם למנהרה
shot('entrance', (0, -4.8, 1.65), (0, 25, 2.1), 28)
shot('station', (0.4, FIRST_Y - 5.0, 1.65), (SIDE_X + 0.2, FIRST_Y - 0.8, 2.4), 32, focus=5.8, fstop=2.8)
shot('mid', (0.3, 17.0, 1.65), (-SIDE_X, 25.0, 2.1), 30, focus=8.0, fstop=4.0)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'hall.blend'))
