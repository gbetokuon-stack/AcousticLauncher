'use strict'

/**
 * Quilt installer — mirror of Fabric flow but uses Quilt meta + org.quiltmc namespace.
 *
 * Steps:
 *   1. Fetch Quilt loader profile JSON (full library list + mainClass)
 *   2. Download quilt-loader-{version}.jar → LIBRARIES_DIR
 *   3. Download all Quilt-sourced libs → LIBRARIES_DIR
 *   4. Merge with vanilla version.json
 */

const fs   = require('fs')
const path = require('path')
const { httpsGet, downloadToFile, ensureDir } = require('../common/net.cjs')

const META_BASE = 'https://meta.quiltmc.org/v3'
const QUILT_MAVEN = 'https://maven.quiltmc.org/repository/release/'

function loaderJarPath(loaderVersion, LIBRARIES_DIR) {
  return path.join(
    LIBRARIES_DIR,
    'org', 'quiltmc', 'quilt-loader', loaderVersion,
    `quilt-loader-${loaderVersion}.jar`,
  )
}

function quiltVersionDirName(mcVersion, loaderVersion) {
  return `quilt-loader-${mcVersion}-${loaderVersion}`
}

/**
 * Convert a Quilt profile library entry to a downloadable file.
 */
function quiltLibToFile(lib, LIBRARIES_DIR) {
  const entry = lib
  if (!entry || !entry.name || !entry.url) return null

  const base = entry.url.startsWith('http') ? entry.url : QUILT_MAVEN
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

async function prepare(profile, vanillaMeta, paths, onLog, onProgress) {
  const mcVersion = profile.gameVersion
  const loaderVersion = profile.loaderVersion
  if (!mcVersion) throw new Error('Profile thiếu gameVersion')
  if (!loaderVersion) throw new Error('Profile thiếu quilt loaderVersion')

  const { INSTANCES_DIR, LIBRARIES_DIR } = paths
  const instancePath = profile.instancePath
  ensureDir(instancePath)

  const versionDir = quiltVersionDirName(mcVersion, loaderVersion)
  const versionJsonPath = path.join(instancePath, 'versions', versionDir, `${mcVersion}.json`)

  if (fs.existsSync(versionJsonPath)) {
    onLog?.({ level: 'INFO', msg: `Quilt ${versionDir} đã cài sẵn.` })
    return {
      fabricJson: JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8')),
      versionDir,
      mainClass: 'org.quiltmc.loader.impl.launch.knot.KnotClient',
      loaderJarPath: loaderJarPath(loaderVersion, LIBRARIES_DIR),
    }
  }

  // ── Fetch loader profile JSON ──────────────────────────────
  const profileMetaUrl = `${META_BASE}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`
  let profileMeta
  try {
    profileMeta = await httpsGet(profileMetaUrl)
  } catch (ex) {
    throw new Error(`Không tải được Quilt profile metadata: ${ex.message}`)
  }

  // ── Download quilt-loader JAR ─────────────────────────────
  const loaderUrl = `https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-loader/${loaderVersion}/quilt-loader-${loaderVersion}.jar`
  const loaderDest = loaderJarPath(loaderVersion, LIBRARIES_DIR)
  if (!fs.existsSync(loaderDest)) {
    onLog?.({ level: 'INFO', msg: `Tải quilt-loader ${loaderVersion}…` })
    await downloadToFile(loaderUrl, loaderDest, (p) =>
      onProgress?.({ phase: 'loader', downloaded: p.downloaded, total: p.total }))
  }

  // ── Download all Quilt-sourced libs ────────────────────────
  const libList = Array.isArray(profileMeta.libraries) ? profileMeta.libraries : []
  if (libList.length > 0) {
    const downloadJobs = []
    const seen = new Set()

    for (const lib of libList) {
      const dl = quiltLibToFile(lib, LIBRARIES_DIR)
      if (!dl) continue
      if (seen.has(dl.dest)) continue
      seen.add(dl.dest)
      downloadJobs.push(dl)
    }

    if (downloadJobs.length > 0) {
      onLog?.({ level: 'INFO', msg: `Tải ${downloadJobs.length} Quilt libs…` })
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
      onLog?.({ level: 'INFO', msg: `Quilt libs: ${done}/${downloadJobs.length} hoàn tất.` })
    }
  }

  const merged = mergeWithVanilla(vanillaMeta, profileMeta, loaderVersion)
  ensureDir(path.dirname(versionJsonPath))
  fs.writeFileSync(versionJsonPath, JSON.stringify(merged, null, 2))
  onLog?.({ level: 'INFO', msg: `Quilt ${versionDir} đã sẵn sàng.` })

  return {
    fabricJson: merged,
    versionDir,
    mainClass: profileMeta.mainClass || 'org.quiltmc.loader.impl.launch.knot.KnotClient',
    loaderJarPath: loaderDest,
  }
}

function mergeWithVanilla(vanilla, quilt, loaderVersion) {
  const libs = []
  const seen = new Set()
  function pushLibs(arr) {
    if (!Array.isArray(arr)) return
    for (const lib of arr) {
      const key = lib.name || lib.downloads?.artifact?.path || `${lib.url}`
      if (!key || seen.has(key)) return
      seen.add(key)
      libs.push(lib)
    }
  }
  pushLibs(vanilla.libraries)
  pushLibs(quilt.libraries)

  return {
    id: vanilla.id,
    inheritsFrom: vanilla.id,
    releaseTime: vanilla.releaseTime || new Date().toISOString(),
    time: new Date().toISOString(),
    type: 'release',
    mainClass: quilt.mainClass || 'org.quiltmc.loader.impl.launch.knot.KnotClient',
    arguments: quilt.arguments || vanilla.arguments,
    libraries: libs,
    __xforge: { loader: 'quilt', loaderVersion },
  }
}

module.exports = { prepare, quiltVersionDirName, loaderJarPath }
