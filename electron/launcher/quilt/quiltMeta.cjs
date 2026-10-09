'use strict'

const { httpsGet } = require('../common/net.cjs')

const META_BASE = 'https://meta.quiltmc.org/v3'

/**
 * List Quilt loader versions for a given Minecraft version.
 * Falls back to the latest stable loader if the MC version is not supported.
 * @param {string} mcVersion
 * @returns {Promise<Array<{ version: string, stable: boolean }>>}
 */
async function listLoaders(mcVersion) {
  if (!mcVersion) return []
  try {
    const arr = await httpsGet(`${META_BASE}/versions/loader/${mcVersion}`)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((e) => e.loader?.version)
      .map((e) => ({
        version: e.loader.version,
        stable: !!e.loader.stable,
        build: e.loader.build,
        mcVersion,
      }))
  } catch {
    // Quilt API returns 404 for unsupported MC versions (e.g. 26.x snapshots).
    // Return an empty array so callers can handle gracefully.
    return []
  }
}

module.exports = { listLoaders }