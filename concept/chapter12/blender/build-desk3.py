# פרק 12 · השולחן לאתר — הסצנה המאושרת של build-desk2.py (real6, „סבבה מעולה", 3.11), בלי לגעת בה.
# שלושה תוצרים:
#   out/desk-hero.png      — אותה זווית של real6-low, ברזולוציה של מסך מלא.
#   out/hotspots.json      — קו המתאר של כל תיק בתמונה הזו (קמור, 0..1), כדי שהלחיצה תהיה על התיק עצמו.
#   out/open-0N.png        — כל תיק לבדו על העץ, פתוח: הכריכה נפתחת ימינה כמו ספר עברי, הדף העליון
#                            ריק — הכותרת שעליו היא DOM (כלל 40). הגומייה והתווית ירדו עם הפתיחה.
# ריצה: "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b -P build-desk3.py
import bpy, math, os, json
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix

os.environ['DESK_SCENE_ONLY'] = '1'
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'build-desk2.py'), encoding='utf8').read())

sc = bpy.context.scene
sc.cycles.samples = 128

def cam_obj(name, loc, rot, lens=None, ortho=None, focus=None, fstop=None):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    sc.collection.objects.link(cam); cam.location = loc; cam.rotation_euler = rot
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    if lens: cam.data.lens = lens
    if focus:
        cam.data.dof.use_dof = True; cam.data.dof.focus_distance = focus; cam.data.dof.aperture_fstop = fstop
    return cam

def render(cam, name):
    sc.camera = cam; sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

roots = [bpy.data.objects[f'folder{i + 1}'] for i in range(5)]
kids = lambda r: [o for o in bpy.data.objects if o.parent == r]

# ---------- 1 · הגיבור + קווי המתאר ----------
sc.render.resolution_x, sc.render.resolution_y = 2400, 1500
hero = cam_obj('hero', (0.3, -7.6, 8.6), (math.radians(42), 0, math.radians(2)), lens=40, focus=10.9, fstop=0.45)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()

def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3: return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    return lo[:-1] + hi[:-1]

spots = []
for i, r in enumerate(roots):
    pts = []
    for o in kids(r):
        if o.type not in ('MESH', 'CURVE'): continue
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        for v in me.vertices:
            c = world_to_camera_view(sc, hero, ev.matrix_world @ v.co)
            pts.append((round(c.x, 4), round(1 - c.y, 4)))
        ev.to_mesh_clear()
    h = hull(pts)
    c = world_to_camera_view(sc, hero, r.matrix_world.translation)
    spots.append({'n': i + 1, 'poly': h, 'center': [round(c.x, 4), round(1 - c.y, 4)]})
if not os.environ.get('SKIP_HERO'):      # הגיבור לא משתנה — אפשר לרנדר רק את התיקים הפתוחים
    json.dump({'image': [2400, 1500], 'folders': spots}, open(os.path.join(OUT, 'hotspots.json'), 'w'), indent=1)
    render(hero, 'desk-hero')

# ---------- 2 · כל תיק פתוח ----------
for o in bpy.data.objects:
    if o.name.startswith('mullion'): o.hide_render = True      # צל החלון — רק בשולחן כולו
# השולחן גדל לתקריבים — תיק 04 שוכב קרוב לקצה, והכריכה הפתוחה יצאה ממנו. הגאומטריה גדלה ולא
# האובייקט, כך שגרעין העץ (קואורדינטות Object) נשאר באותו גודל.
bpy.data.objects['desk'].data.transform(Matrix.Diagonal((1.9, 1.9, 1.0, 1.0)))
pen = bpy.data.objects['pen']

sc.render.resolution_x, sc.render.resolution_y = 2400, 1100
# דף הכותרת: קלף בהיר מעט מהדפים שמתחתיו — לא לבן (כלל 35)
page_mat = pbr('page', 0.6, diff=PAPER_C, tint=hexc('#f6e6c4'), nor=PAPER_N, nor_strength=0.12, rough_value=0.9)
page_mat.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.18
sc.cycles.samples = int(os.environ.get('SAMPLES', 96))
if os.environ.get('SAMPLES'): sc.render.resolution_percentage = 50
pages = []
for i, r in enumerate(roots):
    for j, other in enumerate(roots):
        for o in kids(other): o.hide_render = (j != i)
    parts = kids(r)
    for o in parts:
        if o.name.startswith(('front', 'label', 'cord', 'fold')): o.hide_render = True   # הקפל הסגור נקרא כצינור כשהתיק פתוח
    sheets = [o for o in parts if o.name.startswith('sheet')]
    # הגובה האמיתי של הערימה — הדפים נבנו עם הגובה בתוך הגאומטריה, ו-location.z שלהם 0
    dg = bpy.context.evaluated_depsgraph_get(); inv = r.matrix_world.inverted(); top = 0.0
    for o in sheets:
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        top = max(top, max((inv @ ev.matrix_world @ v.co).z for v in me.vertices)); ev.to_mesh_clear()
    top += 0.004
    # הדף העליון: ישר ונקי — עליו יושבת הכותרת של היחידה, ב-DOM
    page = box(f'page{i}', (W - 0.16, H - 0.22, 0.003), (0.02, 0.02, top), page_mat, 0.001, r)
    # הכריכה הפתוחה, בצד השני של הקפל, הפנים כלפי מעלה
    cover = box(f'open{i}', (W, H - 0.06, T), (0, -H / 2 - (H - 0.06) / 2 - 0.02, T / 2), manilas[i], 0.004, r, cuts=8)   # אותו גוון של הכריכה מבחוץ
    tx_ = bpy.data.textures.new(f'cv{i}', 'CLOUDS'); tx_.noise_scale = 2.2
    d = cover.modifiers.new('wave', 'DISPLACE'); d.texture = tx_; d.strength = 0.02; d.direction = 'Z'
    # המצלמה: מכיסא הקורא, בזווית של השולחן. סבב ראשון צולם מלמעלה, אורתוגרפי — ויצא גרפי
    # ושטוח, לא תצלום. הקפל אנכי בתמונה: הדפים משמאל, הכריכה מימין.
    M = r.matrix_world.to_3x3()
    # העט מונח על הכריכה הפתוחה, באלכסון — כמו שמניחים עט על תיק שפתחו
    pen.location = r.matrix_world @ Vector((0.25, -H - 0.2, T + 0.08)); pen.rotation_euler = (0, 0, r.rotation_euler[2] + math.radians(58))
    R = (M @ Vector((0, -1, 0))).normalized(); U = (M @ Vector((1, 0, 0))).normalized()
    mid = r.matrix_world @ Vector((0, -H / 2 + 0.12, 0.05))
    t, dist = math.radians(40), 9.6
    pos = mid - U * dist * math.sin(t) + Vector((0, 0, 1)) * dist * math.cos(t)
    zc = (pos - mid).normalized(); xc = R; yc = zc.cross(xc)
    rot = Matrix((xc, yc, zc)).transposed().to_euler()
    cam = cam_obj(f'open{i}', pos, rot, lens=50, focus=dist, fstop=1.4)
    bpy.context.view_layer.update()
    # ארבע הפינות של הדף העליון בתמונה — שם יושבת הכותרת, ב-DOM, באותה פרספקטיבה (matrix3d)
    a_, b_ = (W - 0.16) / 2, (H - 0.22) / 2; zt = top + 0.0015
    quad = []
    for lx, ly in ((a_, 0.02 + b_), (a_, 0.02 - b_), (-a_, 0.02 - b_), (-a_, 0.02 + b_)):   # TL TR BR BL
        c = world_to_camera_view(sc, cam, r.matrix_world @ Vector((lx, ly, zt)))
        quad.append([round(c.x, 4), round(1 - c.y, 4)])
    pages.append({'n': i + 1, 'quad': quad})
    print('PAGE', i + 1, 'top', round(top, 4), 'sheets', sorted(round(o.location.z, 4) for o in sheets))
    render(cam, f'open-{i + 1:02d}')
    for o in (page, cover): o.hide_render = True
    for o in parts: o.hide_render = False
json.dump({'image': [2400, 1100], 'page': [round(W - 0.16, 3), round(H - 0.22, 3)], 'folders': pages},
          open(os.path.join(OUT, 'open.json'), 'w'), indent=1)
print('DESK3 DONE')
