/* Write plain (uncompressed) copies of meshopt-compressed GLBs so Blender can read them.
   node scripts/_unmeshopt.mjs <out dir> <in.glb>... — uses only the project's own packages. */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import path from 'node:path'
const [out, ...files] = process.argv.slice(2)
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
for (const f of files) {
  const doc = await io.read(f)
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext instanceof EXTMeshoptCompression) ext.dispose()
  const dst = path.join(out, path.basename(f))
  await io.write(dst, doc)
  console.log('wrote', dst)
}
