'use strict'

/**
 * Fabric installer — no Java needed, just downloads.
 *
 * Steps:
 *   1. Resolve loader profile JSON (provides mainClass + full library list with URLs)
 *   2. Download fabric-loader-{loaderVersion}.jar → LIBRARIES_DIR
 *   3. Download all Fabric-sourced libs (sponge-mixin, ASM, etc.) → LIBRARIES_DIR
 *   4. Merge with vanilla version.json and write to instancePath/versions/
 *
 * Library downloads use hash verification (sha1/sha256) from the profile meta.
 */

const fs   = require('fs')
const path = require('path')
const { httpsGet, downloadToFile, ensureDir } = require('../common/net.cjs')

const META_BASE = 'https://meta.fabricmc.net/v2'
const FABRIC_MAVEN = 'https://maven.fabricmc.net/'

function loaderJarPath(loaderVersion, LIBRARIES_DIR) {
  return path.join(
    LIBRARIES_DIR,
    'net', 'fabricmc', 'fabric-loader', loaderVersion,
    `fabric-loader-${loaderVersion}.jar`,
  )
}

function fabricVersionDirName(mcVersion, loaderVersion) {
  return `fabric-loader-${mcVersion}-${loaderVersion}`
}

/**
 * Convert a Fabric profile library entry to a downloadable file.
 * Fabric meta libraries have { name, url, sha1?, sha256?, size }.
 * The URL is absolute (e.g. https://maven.fabricmc.net/...).
 */
function fabricLibToFile(lib, LIBRARIES_DIR) {
  const entry = lib
  if (!entry || !entry.name || !entry.url) return null

  const base = entry.url.startsWith('http') ? entry.url : FABRIC_MAVEN
  // Build the artifact path from maven coordinates: groupId/artifactId/version/filename
  const [group, artifact, version] = entry.name.split(':')
  const groupPath = group.replace(/\./g, '/')
  const fileName = `${artifact}-${version}.jar`
  const relPath = path.join(groupPath, artifact, version, fileName)
  const dest = path.join(LIBRARIES_DIR, relPath)

  const url = base.endsWith('/')
    ? `${base}${relPath}`
    : `${base}/${relPath}`

  return { url, dest, hash: entry.sha1 || entry.sha256, hashAlgo: entry.sha256 ? 'sha256' : 'sha1' }
}

/**
 * @param {object} profile       Profile entry
 * @param {object} vanillaMeta   Pre-fetched vanilla version.json
 * @param {object} paths         { INSTANCES_DIR, LIBRARIES_DIR }
 * @param {function} [onLog]
 * @param {function} [onProgress]
 */
async function prepare(profile, vanillaMeta, paths, onLog, onProgress) {
  const mcVersion = profile.gameVersion
  const loaderVersion = profile.loaderVersion
  if (!mcVersion) throw new Error('Profile thiếu gameVersion')
  if (!loaderVersion) throw new Error('Profile thiếu fabric loaderVersion')

  const { INSTANCES_DIR, LIBRARIES_DIR } = paths
  const instancePath = profile.instancePath
  ensureDir(instancePath)

  const versionDir = fabricVersionDirName(mcVersion, loaderVersion)
  const versionJsonPath = path.join(instancePath, 'versions', versionDir, `${mcVersion}.json`)

  if (fs.existsSync(versionJsonPath)) {
    onLog?.({ level: 'INFO', msg: `Fabric ${versionDir} đã cài sẵn.` })
    return {
      fabricJson: JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8')),
      versionDir,
      mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
      loaderJarPath: loaderJarPath(loaderVersion, LIBRARIES_DIR),
    }
  }

  // ── Fetch loader profile JSON (contains full lib list + mainClass) ──
  const profileMetaUrl = `${META_BASE}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`
  let profileMeta
  try {
    profileMeta = await httpsGet(profileMetaUrl)
  } catch (ex) {
    throw new Error(`Không tải được Fabric profile metadata: ${ex.message}`)
  }

  // ── Download fabric-loader JAR ────────────────────────────
  const loaderUrl = `${FABRIC_MAVEN}net/fabricmc/fabric-loader/${loaderVersion}/fabric-loader-${loaderVersion}.jar`
  const loaderDest = loaderJarPath(loaderVersion, LIBRARIES_DIR)
  if (!fs.existsSync(loaderDest)) {
    onLog?.({ level: 'INFO', msg: `Tải fabric-loader ${loaderVersion}…` })
    await downloadToFile(loaderUrl, loaderDest, (p) =>
      onProgress?.({ phase: 'loader', downloaded: p.downloaded, total: p.total }))
  }

  // ── Download all Fabric-sourced libs (sponge-mixin, ASM, etc.) ──
  const libList = Array.isArray(profileMeta.libraries) ? profileMeta.libraries : []
  if (libList.length > 0) {
    const downloadJobs = []
    const seen = new Set()

    for (const lib of libList) {
      const dl = fabricLibToFile(lib, LIBRARIES_DIR)
      if (!dl) continue
      if (seen.has(dl.dest)) continue
      seen.add(dl.dest)
      downloadJobs.push(dl)
    }

    if (downloadJobs.length > 0) {
      onLog?.({ level: 'INFO', msg: `Tải ${downloadJobs.length} Fabric libs (sponge-mixin, ASM…)…` })
      const conc = 8
      let idx = 0, done = 0
      async function libWorker() {
        while (idx < downloadJobs.length) {
          const job = downloadJobs[idx++]
          try {
            await downloadToFile(job.url, job.dest, null, { expectedHash: job.hash, hashAlgo: job.hashAlgo })
          } catch (ex) {
            onLog?.({ level: 'WARN', msg: `Không tải được ${path.basename(job.dest)}: ${ex.message}` })
          }
          done++
          onProgress?.({ phase: 'libraries', current: done, total: downloadJobs.length })
        }
      }
      await Promise.all(Array.from({ length: Math.min(conc, downloadJobs.length) }, libWorker))
      onLog?.({ level: 'INFO', msg: `Fabric libs: ${done}/${downloadJobs.length} hoàn tất.` })
    }
  }

  // ── Merge with vanilla version.json ───────────────────────
  const merged = mergeWithVanilla(vanillaMeta, profileMeta, loaderVersion)
  ensureDir(path.dirname(versionJsonPath))
  fs.writeFileSync(versionJsonPath, JSON.stringify(merged, null, 2))
  onLog?.({ level: 'INFO', msg: `Fabric ${versionDir} đã sẵn sàng.` })

  return {
    fabricJson: merged,
    versionDir,
    mainClass: profileMeta.mainClass || 'net.fabricmc.loader.impl.launch.knot.KnotClient',
    loaderJarPath: loaderDest,
  }
}

function mergeWithVanilla(vanilla, fabric, loaderVersion) {
  const libs = []
  const seen = new Set()
  function pushLibs(arr) {
    if (!Array.isArray(arr)) return
    for (const lib of arr) {
      // For Fabric libs, use 'name' as key; for vanilla, use 'name' or path
      const key = lib.name || lib.downloads?.artifact?.path || `${lib.url}`
      if (!key || seen.has(key)) return
      seen.add(key)
      libs.push(lib)
    }
  }
  // Vanilla first, then Fabric additions
  pushLibs(vanilla.libraries)
  pushLibs(fabric.libraries)

  return {
    id: vanilla.id,
    inheritsFrom: vanilla.id,
    releaseTime: vanilla.releaseTime || new Date().toISOString(),
    time: new Date().toISOString(),
    type: 'release',
    mainClass: fabric.mainClass || 'net.fabricmc.loader.impl.launch.knot.KnotClient',
    arguments: fabric.arguments || vanilla.arguments,
    libraries: libs,
    __xforge: { loader: 'fabric', loaderVersion },
  }
}

module.exports = { prepare, fabricVersionDirName, loaderJarPath }
