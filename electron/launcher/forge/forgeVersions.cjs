'use strict'

const { httpsGet } = require('../common/net.cjs')

const PROMOS_URL = 'https://maven.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'

let _cache = null
let _cacheTime = 0
const TTL = 30 * 60 * 1000

/**
 * Fetch Forge promotions map → { '1.20.1-latest': '47.2.0', '1.20.1-recommended': '47.2.0', ... }
 * We list every promoted version for the requested mcversion.
 */
async function fetchPromos() {
  if (_cache && Date.now() - _cacheTime < TTL) return _cache
  _cache = await httpsGet(PROMOS_URL)
  _cacheTime = Date.now()
  return _cache
}

/**
 * List Forge versions for a given Minecraft version.
 * Combines promotions (recommended/latest) and scans maven-metadata for full list.
 * @param {string} mcVersion e.g. "1.20.1"
 * @returns {Promise<Array<{ version: string, mcVersion: string, recommended?: boolean, latest?: boolean }>>}
 */
async function listVersions(mcVersion) {
  if (!mcVersion) return []
  const result = []
  try {
    const promos = await fetchPromos()
    const recKey = `${mcVersion}-recommended`
    const latKey = `${mcVersion}-latest`
    if (promos?.promos?.[recKey]) {
      result.push({ version: promos.promos[recKey], mcVersion, recommended: true })
    }
    if (promos?.promos?.[latKey] && promos.promos[latKey] !== promos?.promos?.[recKey]) {
      result.push({ version: promos.promos[latKey], mcVersion, latest: true })
    }
  } catch {}

  // Optionally scan maven-metadata for full list (best-effort)
  try {
    const metaUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml`
    const xml = await httpsGet(metaUrl, { raw: true })
    const versions = parseForgeMetadata(xml)
    for (const v of versions) {
      if (v.mcVersion === mcVersion) {
        if (!result.find((r) => r.version === v.version)) {
          result.push(v)
        }
      }
    }
  } catch {}

  // Sort newest first
  result.sort((a, b) => compareVersions(b.version, a.version))
  return result
}

function parseForgeMetadata(xml) {
  // Format: <version>X.Y.Z-{mcVersion}</version>
  // Examples: 47.2.0, 1.20.1-47.2.0
  const out = []
  const re = /<version>([^<]+)<\/version>/g
  let m
  while ((m = re.exec(xml))) {
    const v = m[1]
    const dash = v.indexOf('-')
    if (dash > 0) {
      const mc = v.substring(0, dash)
      const forge = v.substring(dash + 1)
      out.push({ mcVersion: mc, version: forge })
    } else {
      // Pure forge version (newer format starting at 1.20.4+)
      out.push({ mcVersion: null, version: v })
    }
  }
  return out
}

function compareVersions(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0
    if (x !== y) return x - y
  }
  return 0
}

module.exports = { listVersions, fetchPromos }