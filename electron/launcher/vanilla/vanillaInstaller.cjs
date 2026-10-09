'use strict'

/**
 * Vanilla Minecraft installer.
 * Replaces the inline install logic from vanillaRunner.cjs.
 * Returns { versionJson, classpath, jarName, workDir } for the gameLauncher.
 */

const fs   = require('fs')
const path = require('path')
const { httpsGet, downloadToFile, ensureDir } = require('../common/net.cjs')

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'

let _manifest = null
let _manifestTime = 0
const MANIFEST_TTL = 10 * 60 * 1000

async function getManifest() {
  if (_manifest && Date.now() - _manifestTime < MANIFEST_TTL) return _manifest
  _manifest = await httpsGet(MANIFEST_URL)
  _manifestTime = Date.now()
  return _manifest
}

async function listVersions() {
  const m = await getManifest()
  return m.versions.map((v) => ({ id: v.id, type: v.type, releaseTime: v.releaseTime }))
}

async function getVersionMeta(versionId, cacheDir) {
  // Per-version cache file so requesting 1.19 doesn't return a stale 26.2
  // metadata that was cached from an earlier install.
  const cacheFile = path.join(cacheDir, 'versions', `${versionId}.json`)
  if (fs.existsSync(cacheFile)) {
    try { return JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) } catch {}
  }
  const m = await getManifest()
  const entry = m.versions.find((v) => v.id === versionId)
  if (!entry) throw new Error(`Không tìm thấy phiên bản: ${versionId}`)
  const meta = await httpsGet(entry.url)
  const dir = path.dirname(cacheFile)
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  fs.writeFileSync(cacheFile, JSON.stringify(meta, null, 2))
  return meta
}

function libPathFor(lib, LIBRARIES_DIR) {
  const parts = lib.name.split(':')
  if (parts.length < 3) return null
  const [group, artifact, version, classifier] = parts
  const groupPath = group.replace(/\./g, '/')
  const fileName = classifier
    ? `${artifact}-${version}-${classifier}.jar`
    : `${artifact}-${version}.jar`
  return path.join(LIBRARIES_DIR, groupPath, artifact, version, fileName)
}

/**
 * Locate the vanilla client.jar for a profile (downloaded by installerHub).
 * Used by Forge/Fabric/Quilt installers to place it before invoking loader.
 */
function locateClientJar(profile, paths) {
  const workDir = path.join(paths.INSTANCES_DIR, '__runtime', profile.id)
  if (!fs.existsSync(workDir)) return null
  const candidates = fs.readdirSync(workDir).filter((n) => n.endsWith('-client.jar'))
  if (!candidates.length) return null
  return path.join(workDir, candidates[0])
}

/**
 * Copy vanilla client.jar to <instancePath>/versions/<mc>/<mc>.jar so loaders
 * (Forge installer, Fabric Knot, OptiFine variant) can find it at the Minecraft
 * canonical location.
 */
function placeClientJarForLoader(profile, paths, vanillaMeta) {
  const mc = vanillaMeta?.id || profile.gameVersion
  if (!mc) return null
  const src = locateClientJar(profile, paths)
  if (!src || !fs.existsSync(src)) return null
  const destDir = path.join(profile.instancePath, 'versions', mc)
  const dest = path.join(destDir, `${mc}.jar`)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest
  ensureDir(destDir)
  fs.copyFileSync(src, dest)
  return dest
}

/**
 * Install vanilla Minecraft: libraries + client jar + assets index + asset objects.
 * Skips files that already exist on disk with matching size.
 *
 * @param {object} profile       Profile entry
 * @param {object} meta          Version metadata (from getVersionMeta)
 * @param {object} paths         { ASSETS_DIR, LIBRARIES_DIR, INSTANCES_DIR }
 * @param {function} [onLog]     log callback ({ level, msg })
 * @param {function} [onProgress] progress callback ({ phase, current, total })
 * @returns {Promise<{ workDir, jarName, classpath, versionJson }>}
 */
async function prepare(profile, meta, paths, onLog, onProgress) {
  const { ASSETS_DIR, LIBRARIES_DIR, INSTANCES_DIR } = paths
  const workDir = path.join(INSTANCES_DIR, '__runtime', profile.id)
  ensureDir(workDir)
  ensureDir(ASSETS_DIR)

  onLog?.({ level: 'INFO', msg: `Đang chuẩn bị phiên bản ${profile.gameVersion} (vanilla)…` })

  // ── Libraries ───────────────────────────────────────
  const libraries = Array.isArray(meta.libraries) ? meta.libraries : []
  if (libraries.length > 0) {
    onLog?.({ level: 'INFO', msg: `Đang chuẩn bị ${libraries.length} libraries…` })
    ensureDir(LIBRARIES_DIR)
    const libConcurrency = 16
    let libIdx = 0, libDone = 0, libSkipped = 0, libFailed = 0

    async function libWorker() {
      while (libIdx < libraries.length) {
        const myIdx = libIdx++
        const lib = libraries[myIdx]
        if (!lib) continue
        const artifact = lib.downloads?.artifact
        if (!artifact || !artifact.url) { libSkipped++; continue }

        const dest = libPathFor(lib, LIBRARIES_DIR)
        if (!dest) { libSkipped++; continue }

        if (fs.existsSync(dest)) {
          try {
            const stat = fs.statSync(dest)
            if (artifact.size && stat.size === artifact.size) { libDone++; continue }
          } catch {}
        }

        try {
          await downloadToFile(artifact.url, dest)
          libDone++
        } catch (ex) {
          libFailed++
          onLog?.({ level: 'WARN', msg: `Không tải được lib ${lib.name}: ${ex.message}` })
        }
        onProgress?.({ phase: 'libraries', current: libDone + libSkipped + libFailed, total: libraries.length })
      }
    }
    await Promise.all(Array.from({ length: libConcurrency }, () => libWorker()))
    onLog?.({ level: 'INFO', msg: `Libraries: ${libDone} tải, ${libSkipped} bỏ qua, ${libFailed} lỗi.` })
  }

  // ── Client jar ──────────────────────────────────────
  // Use a game-version-aware filename so two profiles (or a reused workDir
  // from a previous gameVersion) don't accidentally load the wrong jar.
  const clientUrl = meta.downloads?.client?.url
  let jarName = null
  if (clientUrl) {
    jarName = `${profile.id}-${profile.gameVersion}-client.jar`
    const jarDest = path.join(workDir, jarName)
    if (!fs.existsSync(jarDest)) {
      onLog?.({ level: 'INFO', msg: 'Tải client.jar…' })
      await downloadToFile(clientUrl, jarDest)
    }
  }

  // ── Assets ──────────────────────────────────────────
  const assetIndexId = meta.assetIndex?.id
  const assetIndexUrl = meta.assetIndex?.url
  if (assetIndexId && assetIndexUrl) {
    const indexFile = path.join(ASSETS_DIR, 'indexes', `${assetIndexId}.json`)
    const objectsDir = path.join(ASSETS_DIR, 'objects')
    ensureDir(path.join(ASSETS_DIR, 'indexes'))
    ensureDir(objectsDir)

    let index
    if (fs.existsSync(indexFile)) {
      index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'))
    } else {
      onLog?.({ level: 'INFO', msg: 'Tải asset index…' })
      index = await httpsGet(assetIndexUrl)
      fs.writeFileSync(indexFile, JSON.stringify(index))
    }

    const objects = index.objects || {}
    const objectNames = Object.values(objects).map((o) => o.hash)
    const concurrency = 16
    let i = 0, done = 0
    const total = objectNames.length
    onLog?.({ level: 'INFO', msg: `Đang tải ${total} assets…` })
    onProgress?.({ phase: 'assets', current: 0, total })

    async function worker() {
      while (i < total) {
        const myIdx = i++
        const hash = objectNames[myIdx]
        if (!hash) continue
        const prefix = hash.substring(0, 2)
        const objPath = path.join(objectsDir, prefix, hash)
        if (fs.existsSync(objPath)) {
          done++
          if (done % 200 === 0) onLog?.({ level: 'INFO', msg: `Assets: ${done}/${total}` })
          if (done % 50 === 0) onProgress?.({ phase: 'assets', current: done, total })
          continue
        }
        const url = `https://resources.download.minecraft.net/${prefix}/${hash}`
        try {
          ensureDir(path.dirname(objPath))
          await downloadToFile(url, objPath)
          done++
          if (done % 50 === 0 || done === total) onLog?.({ level: 'INFO', msg: `Assets: ${done}/${total}` })
          if (done % 25 === 0 || done === total) onProgress?.({ phase: 'assets', current: done, total })
        } catch (ex) {
          onLog?.({ level: 'WARN', msg: `Không tải được asset ${hash}: ${ex.message}` })
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    onLog?.({ level: 'INFO', msg: `Assets hoàn tất (${done}/${total}).` })
  }

  // ── Build classpath ─────────────────────────────────
  const classpathParts = []
  if (jarName) classpathParts.push(path.join(workDir, jarName))
  if (fs.existsSync(LIBRARIES_DIR)) {
    function walkLibs(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walkLibs(full)
        else if (entry.isFile() && entry.name.endsWith('.jar')) classpathParts.push(full)
      }
    }
    walkLibs(LIBRARIES_DIR)
  }
  const classpath = classpathParts.join(path.delimiter)

  onLog?.({ level: 'INFO', msg: 'Đã chuẩn bị xong phiên bản vanilla.' })
  return { workDir, jarName, classpath, versionJson: meta }
}

module.exports = { prepare, libPathFor, listVersions, getManifest, getVersionMeta, locateClientJar, placeClientJarForLoader }