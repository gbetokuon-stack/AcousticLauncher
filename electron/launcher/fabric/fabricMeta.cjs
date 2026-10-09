'use strict'

const { httpsGet } = require('../common/net.cjs')

const META_BASE = 'https://meta.fabricmc.net/v2'

/**
 * List Fabric loader versions.
 * @param {string} mcVersion
 * @returns {Promise<Array<{ version: string, stable: boolean }>>}
 */
async function listLoaders(mcVersion) {
  if (!mcVersion) return []
  const arr = await httpsGet(`${META_BASE}/versions/loader/${mcVersion}`)
  if (!Array.isArray(arr)) return []
  return arr.map((e) => ({ version: e.loader?.version, stable: !!e.loader?.stable, mcVersion }))
}

async function listIntermediaries(mcVersion) {
  if (!mcVersion) return []
  const arr = await httpsGet(`${META_BASE}/versions/intermediary/${mcVersion}`)
  return Array.isArray(arr) ? arr : []
}

module.exports = { listLoaders, listIntermediaries }