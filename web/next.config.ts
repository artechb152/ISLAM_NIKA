import path from 'node:path'
import type { NextConfig } from 'next'

/* Two things here are not boilerplate, and both are forced by this project's own facts.

   1. WEBPACK, NOT TURBOPACK. Turbopack cannot build from this directory at all. It derives
      an internal asset name from the absolute path and then slices that string at a byte
      offset, which lands mid-character inside the Hebrew folder name (אסלאם) and panics:
        "start byte index 9 is not a char boundary; it is inside 'א'"
      That is a Turbopack bug, not a fixable config mistake, so the build and the dev server
      both run on webpack. If Turbopack ever fixes its byte handling, drop the --webpack
      flags in package.json and this comment with them.

   2. THE @/ ALIAS IS DECLARED HERE, NOT IN tsconfig. The usual way is tsconfig's
      "baseUrl" + "paths", but TypeScript 7 has deprecated baseUrl and errors on it. tsconfig
      still carries "paths" so the editor and tsc resolve @/, and webpack is told separately
      here so the two agree. */

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* there is a stray package-lock.json in C:\Users\wolft, and without this Next walks up and
     picks that as the workspace root — which is also where it then goes looking for the
     project's own dependencies */
  outputFileTracingRoot: path.resolve(process.cwd()),
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), 'src'),
    }
    return config
  },
}

export default nextConfig
