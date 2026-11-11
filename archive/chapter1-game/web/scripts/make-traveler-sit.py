"""Bake the rigged traveler into a stable, static seated GLB.

The browser uses static character meshes because the source skin was unreliable
on some GPUs. This script poses the source rig in Blender, evaluates the skin,
and exports the deformed result without an armature.
"""

import math
import os

import bpy
from mathutils import Matrix, Vector


SOURCE = os.environ["CH1_TRAVELER"]
OUTPUT = os.environ["CH1_SIT_OUT"]
PREVIEW = os.environ.get("CH1_SIT_PREVIEW")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)

armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
body = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == armature)

bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode="POSE")


def rotate_at_head(name, axis, degrees):
    """Rotate a pose bone around an armature-space axis at its current joint."""
    bone = armature.pose.bones[name]
    head = bone.head.copy()
    rotation = Matrix.Rotation(math.radians(degrees), 4, axis)
    bone.matrix = Matrix.Translation(head) @ rotation @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


def point_bone(name, target):
    """Aim a bone at an armature-space direction without changing its length."""
    bone = armature.pose.bones[name]
    head = bone.head.copy()
    current = (bone.tail - head).normalized()
    desired = Vector(target).normalized()
    rotation = current.rotation_difference(desired).to_matrix().to_4x4()
    bone.matrix = Matrix.Translation(head) @ rotation @ Matrix.Translation(-head) @ bone.matrix
    bpy.context.view_layer.update()


# Thighs swing forward; shins return downward so both feet meet the ground.
for thigh in ("tripo::1_Left_Limb_0", "tripo::1_Right_Limb_0"):
    rotate_at_head(thigh, "Y", -76)
for shin in ("tripo::1_Left_Limb_1", "tripo::1_Right_Limb_1"):
    rotate_at_head(shin, "Y", 82)

# Lower the upper arms, then rest both forearms naturally over the thighs.
point_bone("bone_5", (0.075, 0.065, -0.22))
point_bone("tripo::0_Right_Limb_2", (0.075, -0.065, -0.22))
point_bone("bone_6", (0.1, -0.025, -0.13))
point_bone("tripo::0_Right_Limb_3", (0.1, 0.025, -0.13))

# A slight forward lean keeps the pose from looking rigid against the stool.
rotate_at_head("tripo::0_Right_Limb_0", "Y", -5)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()

# Bake the evaluated skinned surface into a plain mesh.
depsgraph = bpy.context.evaluated_depsgraph_get()
evaluated = body.evaluated_get(depsgraph)
baked_data = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
baked = bpy.data.objects.new("traveler_seated", baked_data)
bpy.context.collection.objects.link(baked)
baked.matrix_world = body.matrix_world.copy()

for obj in list(bpy.context.scene.objects):
    if obj != baked:
        bpy.data.objects.remove(obj, do_unlink=True)

# Put the lowest point on the ground and centre the figure horizontally.
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
print("SEATED MODEL", OUTPUT)

if PREVIEW:
    # Neutral preview used only to validate the pose during development.
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

    key_data = bpy.data.lights.new("Key", "AREA")
    key_data.energy = 850
    key_data.shape = "DISK"
    key_data.size = 4
    key = bpy.data.objects.new("Key", key_data)
    key.location = (2.5, -3.0, 4.0)
    bpy.context.collection.objects.link(key)

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
    scene.render.film_transparent = False
    bpy.ops.render.render(write_still=True)
    print("SEATED PREVIEW", PREVIEW)
