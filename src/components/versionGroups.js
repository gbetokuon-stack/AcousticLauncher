import v112 from '../assets/minecraft-versions/1.12.png'
import v115 from '../assets/minecraft-versions/1.15.png'
import v116 from '../assets/minecraft-versions/1.16.png'
import v117 from '../assets/minecraft-versions/1.17.png'
import v118 from '../assets/minecraft-versions/1.18.png'
import v119 from '../assets/minecraft-versions/1.19.png'
import v120 from '../assets/minecraft-versions/1.20.png'
import v121 from '../assets/minecraft-versions/1.21.png'
import vDef from '../assets/minecraft-versions/default.png'

/** Map MC major version → bundled hero image. Unknown → default. */
const VERSION_IMAGES = {
  '1.12': v112, '1.15': v115, '1.16': v116, '1.17': v117,
  '1.18': v118, '1.19': v119, '1.20': v120, '1.21': v121,
}
const DEFAULT_IMAGE = vDef

/**
 * Derive the major version key (e.g. "1.21.4" → "1.21", "26.0.1" → "26").
 * Falls back to the raw id if no major can be parsed.
 */
export function getMajorVersion(versionId) {
  if (!versionId) return ''
  const parts = versionId.split('.')
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : versionId
}

/** Return the hero image for a given MC version id. */
export function getVersionImage(versionId) {
  if (!versionId) return DEFAULT_IMAGE
  const major = getMajorVersion(versionId)
  return VERSION_IMAGES[major] || DEFAULT_IMAGE
}

/**
 * Group a flat version list (each with `{ id, type }`) by major version,
 * matching VoxelX behavior. Falls back to a curated list when running
 * outside Electron or the fetch fails.
 */
const FALLBACK = [
  { major: '1.21', versions: ['1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4'] },
  { major: '1.20', versions: ['1.20.6', '1.20.4', '1.20.1', '1.20'] },
  { major: '1.19', versions: ['1.19.4', '1.19.2', '1.19'] },
  { major: '1.18', versions: ['1.18.2', '1.18.1', '1.18'] },
  { major: '1.16', versions: ['1.16.5', '1.16.4', '1.16.1', '1.16'] },
]

export async function fetchVersionGroups() {
  let versions
  if (typeof window !== 'undefined' && window.electronAPI?.listVanillaVersions) {
    const r = await window.electronAPI.listVanillaVersions()
    if (r?.error) throw new Error(r.error)
    versions = r.versions || []
  } else {
    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    versions = (await res.json()).versions
  }

  const majorMap = new Map()
  const ensureMajor = (m) => {
    if (!majorMap.has(m)) majorMap.set(m, { release: [], pre: [], snapshot: [] })
    return majorMap.get(m)
  }
  let currentMajor = null

  for (const v of versions) {
    const id   = v.id
    const type = v.type
    if (type !== 'release' && type !== 'snapshot' && type !== 'old_beta' && type !== 'old_alpha') continue

    let major = null
    if (type === 'old_beta')      major = 'Beta'
    else if (type === 'old_alpha') major = 'Alpha'
    else {
      const m1 = id.match(/^(1\.\d+)/)
      const m2 = id.match(/^(\d+)/)
      major = m1 ? m1[1] : (m2 ? m2[1] : currentMajor)
    }
    if (!major) continue

    if (type === 'release') currentMajor = major
    const bucket = ensureMajor(major)
    if (type === 'release') bucket.release.push(id)
    else if (type === 'old_beta' || type === 'old_alpha') bucket.release.push(id)
    else if (/-pre\d+|pre\d+|rc\d+|^1\.\d+(-|\.).*-pre/i.test(id)) bucket.pre.push(id)
    else bucket.snapshot.push(id)
  }

  const numericMajors = Array.from(majorMap.keys())
    .filter((m) => m !== 'Beta' && m !== 'Alpha')
    .sort((a, b) => {
      const ap = a.split('.').map(Number), bp = b.split('.').map(Number)
      for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
        const d = (bp[i] ?? 0) - (ap[i] ?? 0)
        if (d) return d
      }
      return 0
    })
  const sortedMajors = [...numericMajors, 'Beta', 'Alpha'].filter((m) => majorMap.has(m))

  const releaseGroups = numericMajors
    .filter((m) => majorMap.get(m).release.length > 0)
    .map((m) => ({ major: m, versions: majorMap.get(m).release }))

  const vanillaGroups = sortedMajors
    .filter((m) => {
      const g = majorMap.get(m)
      return g.release.length + g.pre.length + g.snapshot.length > 0
    })
    .map((m) => {
      const g = majorMap.get(m)
      const sections = []
      if (g.release.length)  sections.push({ label: 'Release', versions: g.release })
      if (g.pre.length)      sections.push({ label: 'Pre-release / RC', versions: g.pre })
      if (g.snapshot.length) sections.push({ label: 'Snapshot', versions: g.snapshot })
      return { major: m, sections }
    })

  return { releaseGroups, vanillaGroups }
}

let _cache = null
export async function getVersionGroups() {
  if (_cache) return _cache
  try {
    _cache = await fetchVersionGroups()
    return _cache
  } catch (e) {
    console.warn('[VersionGroups] fetch failed, using fallback:', e?.message)
    const fallback = { releaseGroups: FALLBACK, vanillaGroups: null }
    _cache = fallback
    return fallback
  }
}