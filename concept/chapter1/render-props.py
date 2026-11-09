"""Render the game's own prop models as transparent cut-outs for the article's crate.

The chapter-1 game shipped 3D props for the loading task (task-loading in tasks.ts):
prop-silk, prop-spice, find-scroll and crate. The article keeps that interaction, so it
keeps those objects — rendered once, here, to transparent PNGs with a warm side light that
matches the loading-yard painting.

Run (headless):
  blender -b -P concept/chapter1/render-props.py -- <models dir> <out dir>
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
MODELS, OUT = argv[0], argv[1]
os.makedirs(OUT, exist_ok=True)

PROPS = [
    # name, file, camera elevation (deg), azimuth (deg)
    ("silk", "prop-silk.glb", 24, 30),
    ("spice", "prop-spice.glb", 26, 30),
    ("scroll", "find-scroll.glb", 34, 20),
    ("crate", "crate.glb", 22, 32),
]
SIZE = 640


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = SIZE
    sc.render.resolution_y = SIZE
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "Medium High Contrast"
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.42, 0.32, 0.22, 1)  # warm ambient, like the yard
    bg.inputs[1].default_value = 0.55
    sc.world = world


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


for name, file, elev, azim in PROPS:
    reset()
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, file))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    lo, hi = bounds(meshes)
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 1e-3)

    # camera on a sphere around the prop, framing it with a little margin
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 60
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    e, a = math.radians(elev), math.radians(azim)
    fov = 2 * math.atan(cam_data.sensor_width / (2 * cam_data.lens))
    dist = radius / math.sin(fov / 2) * 1.08
    cam.location = centre + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    # a warm key from the low sun side, and a soft cool fill
    for lname, energy, color, offset in [
        ("key", 900, (1.0, 0.78, 0.52), Vector((-2.2, -1.6, 2.4))),
        ("fill", 260, (0.75, 0.82, 1.0), Vector((2.4, -1.2, 1.2))),
        ("rim", 500, (1.0, 0.86, 0.66), Vector((0.4, 2.6, 2.0))),
    ]:
        ld = bpy.data.lights.new(lname, "AREA")
        ld.energy = energy * radius * radius
        ld.color = color
        ld.size = radius * 2.5
        lo_ = bpy.data.objects.new(lname, ld)
        bpy.context.scene.collection.objects.link(lo_)
        lo_.location = centre + offset * radius * 1.6
        lo_.rotation_euler = (centre - lo_.location).to_track_quat("-Z", "Y").to_euler()

    bpy.context.scene.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name, "radius", round(radius, 3))
