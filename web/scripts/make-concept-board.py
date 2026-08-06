"""Build the chapter-1 concepts board as a textured, self-contained GLB."""

import math
import os

import bpy
from mathutils import Vector


FACE = os.environ["CH1_BOARD_FACE"]
OUTPUT = os.environ["CH1_BOARD_OUT"]
PREVIEW = os.environ.get("CH1_BOARD_PREVIEW")

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, colour, roughness=0.9):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*colour, 1)
    principled.inputs["Roughness"].default_value = roughness
    return mat


wood = material("dark_walnut", (0.20, 0.075, 0.025), 0.96)
frame = material("worn_frame", (0.39, 0.18, 0.055), 0.9)

face_mat = bpy.data.materials.new("painted_hebrew_board")
face_mat.use_nodes = True
nodes = face_mat.node_tree.nodes
links = face_mat.node_tree.links
principled = nodes.get("Principled BSDF")
principled.inputs["Roughness"].default_value = 0.86
image = bpy.data.images.load(FACE, check_existing=True)
image.colorspace_settings.name = "sRGB"
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
links.new(tex.outputs["Color"], principled.inputs["Base Color"])


def cube(name, location, dimensions, mat, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("soft_worn_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


parts = []
parts.append(cube("board_back", (0, 0, 1.22), (2.22, 0.16, 1.28), wood, 0.045))
parts.append(cube("left_post", (-0.87, 0.015, 0.72), (0.14, 0.18, 1.44), frame, 0.035))
parts.append(cube("right_post", (0.87, 0.015, 0.72), (0.14, 0.18, 1.44), frame, 0.035))
parts.append(cube("top_frame", (0, -0.095, 1.82), (2.2, 0.12, 0.12), frame, 0.025))
parts.append(cube("bottom_frame", (0, -0.095, 0.62), (2.2, 0.12, 0.12), frame, 0.025))
parts.append(cube("left_frame", (-1.04, -0.095, 1.22), (0.12, 0.12, 1.1), frame, 0.025))
parts.append(cube("right_frame", (1.04, -0.095, 1.22), (0.12, 0.12, 1.1), frame, 0.025))

# Textured face, slightly in front of the solid backing. UVs from the primitive
# plane fill the whole source image and are embedded in the exported GLB.
bpy.ops.mesh.primitive_plane_add(location=(0, -0.086, 1.22), rotation=(math.pi / 2, 0, 0))
front = bpy.context.object
front.name = "readable_hebrew_face"
front.dimensions = (1.96, 1.08, 0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
front.data.materials.append(face_mat)
parts.append(front)

# A correctly oriented copy makes the sign readable from either approach.
bpy.ops.mesh.primitive_plane_add(location=(0, 0.086, 1.22), rotation=(-math.pi / 2, 0, math.pi))
back = bpy.context.object
back.name = "readable_hebrew_back"
back.dimensions = (1.96, 1.08, 0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
back.data.materials.append(face_mat)
parts.append(back)

for obj in bpy.context.scene.objects:
    obj.select_set(obj in parts)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_materials="EXPORT",
    export_image_format="AUTO",
    export_yup=True,
)
print("CONCEPT BOARD", OUTPUT)

if PREVIEW:
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.color = (0.035, 0.022, 0.012)
    ground = cube("preview_ground", (0, 0, -0.04), (8, 8, 0.08), material("sand", (0.55, 0.34, 0.16)), 0)
    key_data = bpy.data.lights.new("Key", "AREA")
    key_data.energy = 900
    key_data.size = 4
    key = bpy.data.objects.new("Key", key_data)
    key.location = (-3, -4, 5)
    bpy.context.collection.objects.link(key)
    camera_data = bpy.data.cameras.new("Camera")
    camera = bpy.data.objects.new("Camera", camera_data)
    camera.location = (2.8, -5.2, 2.5)
    target = Vector((0, 0, 1.0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 62
    bpy.context.collection.objects.link(camera)
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print("BOARD PREVIEW", PREVIEW)
