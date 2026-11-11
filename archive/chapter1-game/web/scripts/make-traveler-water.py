"""Bake a static traveler pose that reaches toward the well rope."""

import math
import os

import bpy
from mathutils import Matrix, Vector


SOURCE = os.environ["CH1_TRAVELER"]
OUTPUT = os.environ["CH1_WATER_OUT"]
PREVIEW = os.environ.get("CH1_WATER_PREVIEW")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)

armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
body = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == armature)
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode="POSE")


def rotate_at_head(name, axis, degrees):
    bone = armature.pose.bones[name]
    head = bone.head.copy()
    rotation = Matrix.Rotation(math.radians(degrees), 4, axis)
    bone.matrix = Matrix.Translation(head) @ rotation @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


def point_bone(name, target):
    bone = armature.pose.bones[name]
    head = bone.head.copy()
    current = (bone.tail - head).normalized()
    desired = Vector(target).normalized()
    rotation = current.rotation_difference(desired).to_matrix().to_4x4()
    bone.matrix = Matrix.Translation(head) @ rotation @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


# Lean from the hips and reach both hands forward/down toward the rope.
rotate_at_head("tripo::0_Right_Limb_0", "Y", -13)
point_bone("bone_5", (0.14, 0.065, -0.14))
point_bone("tripo::0_Right_Limb_2", (0.14, -0.065, -0.14))
point_bone("bone_6", (0.16, -0.025, -0.045))
point_bone("tripo::0_Right_Limb_3", (0.16, 0.025, -0.045))

bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
evaluated = body.evaluated_get(depsgraph)
baked_data = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
baked = bpy.data.objects.new("traveler_drawing_water", baked_data)
bpy.context.collection.objects.link(baked)
baked.matrix_world = body.matrix_world.copy()

for obj in list(bpy.context.scene.objects):
    if obj != baked:
        bpy.data.objects.remove(obj, do_unlink=True)

corners = [baked.matrix_world @ Vector(corner) for corner in baked.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
centre = (minimum + maximum) * 0.5
baked.location.x -= centre.x
baked.location.y -= centre.y
baked.location.z -= minimum.z
bpy.context.view_layer.update()

baked.select_set(True)
bpy.context.view_layer.objects.active = baked
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
print("WATER MODEL", OUTPUT)

if PREVIEW:
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.color = (0.055, 0.04, 0.025)
    ground = bpy.data.meshes.new("preview_ground")
    ground.from_pydata([(-3, -3, 0), (3, -3, 0), (3, 3, 0), (-3, 3, 0)], [], [(0, 1, 2, 3)])
    ground_obj = bpy.data.objects.new("preview_ground", ground)
    bpy.context.collection.objects.link(ground_obj)
    mat = bpy.data.materials.new("sand")
    mat.diffuse_color = (0.55, 0.35, 0.18, 1)
    ground_obj.data.materials.append(mat)
    light_data = bpy.data.lights.new("Key", "AREA")
    light_data.energy = 850
    light_data.size = 4
    light = bpy.data.objects.new("Key", light_data)
    light.location = (2.5, -3, 4)
    bpy.context.collection.objects.link(light)

    bounds = [baked.matrix_world @ Vector(corner) for corner in baked.bound_box]
    height = max(v.z for v in bounds) - min(v.z for v in bounds)
    target = Vector((0, 0, height * 0.48))
    camera_data = bpy.data.cameras.new("Camera")
    camera = bpy.data.objects.new("Camera", camera_data)
    camera.location = (height * 1.75, -height * 2.6, height * 1.25)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 58
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 700
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print("WATER PREVIEW", PREVIEW)
