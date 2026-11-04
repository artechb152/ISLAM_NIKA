# פרק 11 · פיילוט מפת התבליט.
# בונה פני שטח מאריחי Terrarium (AWS elevation-tiles-prod, זום 5, x 14–21, y 9–15),
# נותן חומר קלף ומרנדר שתי תמונות: מבט על, ומבט נמוך מעל מצרים.
# ריצה: blender -b -P build-relief.py
import bpy, math, os, json
PILOT = os.environ.get('RELIEF_MODE') != 'export'   # export: נכסי האתר, ראו בסוף
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TILES = os.path.join(HERE, 'data', 'tiles')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
X0, X1, Y0, Y1, Z = 14, 21, 9, 15, 5
STEP = 1            # רזולוציה מלאה: 2048×1792
WIDTH = 20.0        # רוחב המפה ביחידות
EXAG = 0.22         # גובה של 5000 מ' ביחידות

# ---------- גובה ----------
cols = []
for x in range(X0, X1 + 1):
    col = []
    for y in range(Y0, Y1 + 1):
        img = bpy.data.images.load(os.path.join(TILES, f'{x}_{y}.png'))
        img.colorspace_settings.name = 'Non-Color'
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1] * 255.0
        col.append(px[..., 0] * 256 + px[..., 1] + px[..., 2] / 256 - 32768)
        bpy.data.images.remove(img)
    cols.append(np.vstack(col))
elev = np.hstack(cols)[::STEP, ::STEP]
H, W = elev.shape
print('grid', W, H, 'min', elev.min(), 'max', elev.max())

# טשטוש קל לפני הכול: בלי זה קו החוף יוצא מדרגות של פיקסל, והפסגות קוצים.
def blur(a, r):
    k = np.exp(-0.5 * (np.arange(-3 * r, 3 * r + 1) / r) ** 2); k /= k.sum()
    a = np.apply_along_axis(lambda v: np.convolve(np.pad(v, 3 * r, mode='edge'), k, 'valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, 3 * r, mode='edge'), k, 'valid'), 1, a)
mask = blur((elev > 0).astype(np.float32), 2)          # 0..1, חוף רך
landh = blur(np.clip(elev, 0, None), 1)
seah = blur(np.clip(elev, None, 0), 3)
z = np.where(True, (landh / 5000.0) ** 0.85 * EXAG, 0) * mask     + (mask - 0.5).clip(-0.5, 0.5) * 0.02     + (1 - mask) * np.clip(seah / 4000.0, -1, 0) * 0.03

# ---------- רשת ----------
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
sx = WIDTH / (W - 1)
depth = sx * (H - 1)
xs = np.arange(W) * sx - WIDTH / 2
ys = depth / 2 - np.arange(H) * sx
gx, gy = np.meshgrid(xs, ys)
verts = np.stack([gx, gy, z], -1).reshape(-1, 3)
i = np.arange(H - 1)[:, None] * W + np.arange(W - 1)[None, :]
faces = np.stack([i, i + 1, i + W + 1, i + W], -1).reshape(-1, 4)
me = bpy.data.meshes.new('relief')
me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
me.loops.add(faces.size); me.loops.foreach_set('vertex_index', faces.ravel())
me.polygons.add(len(faces))
me.polygons.foreach_set('loop_start', np.arange(len(faces)) * 4)
me.polygons.foreach_set('loop_total', np.full(len(faces), 4))
me.update(); me.validate()
me.shade_smooth()
ob = bpy.data.objects.new('relief', me)
bpy.context.scene.collection.objects.link(ob)

# ---------- חומר קלף ----------
def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[k:k + 2], 16) / 255 for k in (0, 2, 4)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c] + [a]

mat = bpy.data.materials.new('parchment'); mat.use_nodes = True
nt = mat.node_tree; N = nt.nodes; L = nt.links
bsdf = N['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.92
geo = N.new('ShaderNodeNewGeometry')
sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
L.new(sep.outputs['Z'], ramp.inputs['Fac'])
# Fac = גובה ביחידות (0..~0.45). ים מתחת ל-0, קו חוף דק בדיו, יבשה קלף שמעמיק בהרים.
r.elements[0].position = -0.004;  r.elements[0].color = hexc('#cdbb94')   # ים
r.elements[1].position = 0.30; r.elements[1].color = hexc('#b9925a')   # רכסים
for pos, col in [(0.0005, '#d3c29c'), (0.0025, '#6f5c43'), (0.0055, '#e6dbc2'),
                 (0.05, '#ede4d0'), (0.14, '#dcc79c')]:
    e = r.elements.new(pos); e.color = hexc(col)
noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 60
noise.inputs['Detail'].default_value = 8
mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
mix.inputs['Factor'].default_value = 0.10
L.new(ramp.outputs['Color'], mix.inputs['A'])
L.new(noise.outputs['Color'], mix.inputs['B'])
L.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
ob.data.materials.append(mat)

# ---------- סמן אדום: מצרים (כלל 37) ----------
def lonlat(lon, lat):
    tx = (lon + 180) / 360 * 2 ** Z
    ty = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * 2 ** Z
    u = (tx - X0) / (X1 - X0 + 1); v = (ty - Y0) / (Y1 - Y0 + 1)
    return u * WIDTH - WIDTH / 2, depth / 2 - v * depth
pm = bpy.data.materials.new('stamp'); pm.use_nodes = True
pm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = hexc('#a5322f')
def pin(lon, lat):
    x, y = lonlat(lon, lat)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.22, location=(x, y, 0.11))
    bpy.context.object.data.materials.append(pm)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=(x, y, 0.23))
    bpy.context.object.data.materials.append(pm); bpy.ops.object.shade_smooth()
    return x, y
ex, ey = pin(31.24, 30.04)      # קהיר — מצרים
qx, qy = pin(51.53, 25.29)      # דוחא — קטר

# ---------- שטיפת אזור: „נפוצה בעיקר בטורקיה" — אליפסה רכה, לא גבול מדיני ----------
def wash(lon, lat, rx, ry, hexcol, strength):
    cx, cy = lonlat(lon, lat)
    sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
    L.new(geo.outputs['Position'], sub.inputs[0]); sub.inputs[1].default_value = (cx, cy, 0)
    scl = N.new('ShaderNodeVectorMath'); scl.operation = 'MULTIPLY'
    L.new(sub.outputs[0], scl.inputs[0]); scl.inputs[1].default_value = (1 / rx, 1 / ry, 0)
    ln = N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; L.new(scl.outputs[0], ln.inputs[0])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6
    add = N.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'
    L.new(nz.outputs['Fac'], add.inputs[0]); add.inputs[1].default_value = 0.35
    L.new(ln.outputs['Value'], add.inputs[2])
    mr = N.new('ShaderNodeMapRange'); L.new(add.outputs[0], mr.inputs['Value'])
    mr.inputs['From Min'].default_value = 0.85; mr.inputs['From Max'].default_value = 1.25
    mr.inputs['To Min'].default_value = strength; mr.inputs['To Max'].default_value = 0.0
    onland = N.new('ShaderNodeMath'); onland.operation = 'GREATER_THAN'
    L.new(sep.outputs['Z'], onland.inputs[0]); onland.inputs[1].default_value = 0.004
    f = N.new('ShaderNodeMath'); f.operation = 'MULTIPLY'
    L.new(mr.outputs['Result'], f.inputs[0]); L.new(onland.outputs[0], f.inputs[1])
    m = N.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = 'MULTIPLY'
    L.new(f.outputs[0], m.inputs['Factor'])
    prev = bsdf.inputs['Base Color'].links[0].from_socket
    L.new(prev, m.inputs['A']); m.inputs['B'].default_value = hexc(hexcol)
    L.new(m.outputs['Result'], bsdf.inputs['Base Color'])
wash(35.0, 39.0, 1.9, 0.75, '#c79a3c', 0.75)

# ---------- הקו האדום: „גורש לקטר" ----------
cu = bpy.data.curves.new('exile', 'CURVE'); cu.dimensions = '3D'
cu.bevel_depth = 0.010; cu.bevel_resolution = 3
sp = cu.splines.new('BEZIER'); sp.bezier_points.add(1)
for bp, (x, y) in zip(sp.bezier_points, [(ex, ey), (qx, qy)]):
    bp.co = (x, y, 0.23); bp.handle_left_type = bp.handle_right_type = 'FREE'
a, b = sp.bezier_points
a.handle_right = (ex + (qx - ex) * 0.3, ey + (qy - ey) * 0.3, 0.9)
b.handle_left = (ex + (qx - ex) * 0.7, ey + (qy - ey) * 0.7, 0.9)
arc = bpy.data.objects.new('exile', cu); arc.data.materials.append(pm)
bpy.context.scene.collection.objects.link(arc)

# ---------- עולם, אור, רינדור ----------
sc = bpy.context.scene
sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.use_nodes = True
bg = sc.world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = hexc('#f3ead6'); bg.inputs['Strength'].default_value = 0.55
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.2; sun.data.color = (1.0, 0.93, 0.82); sun.data.angle = math.radians(3)
sun.rotation_euler = (math.radians(62), 0, math.radians(-135))   # אור נמוך מצפון-מערב
sc.collection.objects.link(sun)
sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.cycles.device = 'CPU'
sc.view_settings.view_transform = 'Standard'
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000

def shoot(name, loc, rot, lens=None, ortho=None):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    sc.collection.objects.link(cam); cam.location = loc; cam.rotation_euler = rot
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    if lens: cam.data.lens = lens
    sc.camera = cam; sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

if PILOT:
    shoot('top', (0, 0, 30), (0, 0, 0), ortho=WIDTH * 0.97)
    # מעל הים התיכון, מסתכל דרום-מזרחה אל מצרים, סיני וחצי האי ערב
    shoot('low', (ex - 1.6, ey + 2.6, 2.1), (math.radians(54), 0, math.radians(-140)), lens=32)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'relief.blend'))
else:
    # ---------- ייצוא לאתר (RELIEF_MODE=export) ----------
    # בלי סיכות, בלי קשת ובלי שטיפה: אלה חיים באתר ומונפשים בגלילה.
    for o in list(bpy.data.objects):
        if o.type in ('MESH', 'CURVE') and o.name != 'relief':
            bpy.data.objects.remove(o, do_unlink=True)
    L.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    SITE = os.path.join(HERE, '..', '..', '..', 'web', 'public', 'assets', 'chapter11')
    os.makedirs(SITE, exist_ok=True)

    # 1 · הטקסטורה: מבט על אורתוגרפי בדיוק על גבולות הרשת, עם האור המאושר אפוי בתוכה.
    #     אור מפוזר אינו תלוי בזווית הצפייה, ולכן באתר הוא נכון גם כשהמצלמה נוטה.
    TW = 4096; TH = round(TW * depth / WIDTH)
    sc.render.resolution_x, sc.render.resolution_y = TW, TH
    sc.cycles.samples = 32
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 82
    sc.render.filepath = os.path.join(SITE, 'relief.jpg')
    cam = bpy.data.objects.new('bake', bpy.data.cameras.new('bake'))
    sc.collection.objects.link(cam); cam.location = (0, 0, 30)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = WIDTH
    sc.camera = cam; bpy.ops.render.render(write_still=True)

    # 2 · הגובה: רשת 512×448, מקודדת 16 ביט ב-R/G, ומסכת היבשה ב-B (לשטיפות).
    GW, GH = 512, 448
    iy = np.round(np.linspace(0, H - 1, GH)).astype(int)
    ix = np.round(np.linspace(0, W - 1, GW)).astype(int)
    zg = z[np.ix_(iy, ix)]; mg = mask[np.ix_(iy, ix)]
    zmin, zmax = float(zg.min()), float(zg.max())
    q = np.round((zg - zmin) / (zmax - zmin) * 65535).astype(np.int64)
    px = np.zeros((GH, GW, 4), dtype=np.float32)
    px[..., 0] = ((q >> 8) + 0.25) / 255; px[..., 1] = ((q & 255) + 0.25) / 255
    px[..., 2] = np.round(np.clip(mg, 0, 1) * 255) / 255; px[..., 3] = 1
    im = bpy.data.images.new('height', GW, GH, alpha=True)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels = px[::-1].ravel()
    im.filepath_raw = os.path.join(SITE, 'height.png'); im.file_format = 'PNG'; im.save()
    with open(os.path.join(SITE, 'relief.json'), 'w') as f:
        json.dump({'width': WIDTH, 'depth': depth, 'zmin': zmin, 'zmax': zmax, 'grid': [GW, GH],
                   'tiles': {'z': Z, 'x0': X0, 'x1': X1, 'y0': Y0, 'y1': Y1}}, f, indent=2)

    # 3 · הבאנר: מבט נמוך ומואר (כלל 42) מעל הים התיכון אל המזרח.
    sc.render.resolution_x, sc.render.resolution_y = 2400, 760
    sc.cycles.samples = 48
    bg.inputs['Strength'].default_value = 0.68
    sc.render.filepath = os.path.join(SITE, 'hero-1.jpg')
    hx, hy = lonlat(30.0, 36.5)
    cam2 = bpy.data.objects.new('hero', bpy.data.cameras.new('hero'))
    sc.collection.objects.link(cam2); cam2.location = (hx - 2.6, hy + 3.4, 3.4)
    cam2.rotation_euler = (math.radians(60), 0, math.radians(-132)); cam2.data.lens = 36
    sc.camera = cam2; bpy.ops.render.render(write_still=True)
print('done')
