'use strict'

/**
 * OptiFine installer.
 *
 * Version list source: BMCLAPI2 mirror (chính thức từ bangbang93/BMCL)
 *   GET https://bmclapi2.bangbang93.com/optifine/{mcVersion}
 *   → Array<{ mcversion, type, patch, filename, forge? }>
 *
 * Download (try in order, first success wins — must be ≥100KB & start with PK zip signature):
 *   1. https://bmclapi2.bangbang93.com/optifine/{mc}/{type}/{patch}     (BMCL CDN, no 302)
 *   2. https://github.com/SynArchive/OptiFine-Archive/raw/main/{mc}/{filename}  (GitHub archive)
 *
 * Install: drop the jar straight into instance/mods/OptiFine.jar.
 */

const fs   = require('fs')
const path = require('path')
const { httpsGet, downloadToFile, ensureDir } = require('../common/net.cjs')

const BMCLAPI_BASE = 'https://bmclapi2.bangbang93.com/optifine'
const GH_ARCHIVE   = 'https://github.com/SynArchive/OptiFine-Archive/raw/main'
const OPTIFINE_CDN = 'https://optifine.net/adloadx'

// In-memory cache for the scraped optifine.net/downloads page.
const scrapeCache = new Map()

// Verify the downloaded file is actually a JAR (PK header) and large enough.
function isValidJar(filePath) {
  if (!fs.existsSync(filePath)) return false
  const stat = fs.statSync(filePath)
  if (stat.size < 100000) return false
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(4)
    fs.readSync(fd, buf, 0, 4, 0)
    fs.closeSync(fd)
    return buf[0] === 0x50 && buf[1] === 0x4b  // 'PK'
  } catch {
    return false
  }
}

async function listVersions(mcVersion) {
  if (!mcVersion) return []
  // Primary source: BMCLAPI2 (fast, structured)
  let list = []
  try {
    const arr = await httpsGet(`${BMCLAPI_BASE}/${mcVersion}`)
    if (Array.isArray(arr)) list = arr
  } catch {}
  if (list.length > 0) {
    return list
      .map((e) => ({
        version: e.patch,
        type: e.type,
        mcVersion: e.mcversion,
        filename: e.filename,
        forge: e.forge,
      }))
      .sort((a, b) => (a.version < b.version ? 1 : -1))
  }
  // Fallback: scrape optifine.net/downloads for the closest MC version.
  return scrapeOptifinePage(mcVersion)
}

/**
 * Parse the optifine.net/downloads HTML page for OptiFine entries whose
 * Minecraft version matches `mcVersion` (exact, then prefix matches).
 *
 * Returns Array<{ version, type, mcVersion, filename, forge }> shaped like
 * the BMCL payload so callers don't need to special-case anything.
 */
async function scrapeOptifinePage(mcVersion) {
  const cached = scrapeCache.get('optifineDownloads')
  const now = Date.now()
  let html
  if (cached && cached.expires > now) {
    html = cached.html
  } else {
    try {
      html = await httpsGet('https://optifine.net/downloads', { raw: true, timeoutMs: 20000 })
    } catch {
      return []
    }
    scrapeCache.set('optifineDownloads', { html, expires: now + 30 * 60 * 1000 }) // 30 min
  }

  // The page is structured as a sequence of <h2>Minecraft X.Y.Z</h2> blocks,
  // each followed by a <table> with <a href="...adloadx?f=OptiFine_X.Y.Z_HD_U_P.jar..."> rows.
  // We walk line-by-line and pin the current MC version from the most recent <h2>.
  const lines = html.split(/\r?\n/)
  const out = []
  let curMc = null
  // Match filenames like: preview_OptiFine_26.1.2_HD_U_K1_pre2.jar OR OptiFine_1.20.1_HD_U_I5.jar
  const jarRe = /(preview_)?(OptiFine)_([0-9][0-9A-Za-z\.]*?)_(HD_U_[A-Z]+[0-9]*|HD_[A-Z]+_[0-9]+)_([A-Z]?[0-9]+(?:_[a-z0-9]+)?)\.jar/gi
  const h2Re = /<h2>Minecraft\s+(?:[^<]+?for\s+)?([0-9][0-9A-Za-z\.]*)\s*<\/h2>/i

  for (const line of lines) {
    const h2 = h2Re.exec(line)
    if (h2) {
      curMc = h2[1].trim()
      continue
    }
    if (!curMc) continue
    // Only consider MC versions that match (or fuzzy-prefix) the requested one.
    if (curMc !== mcVersion && !curMc.startsWith(mcVersion + '.')) continue
    let m
    jarRe.lastIndex = 0
    while ((m = jarRe.exec(line)) !== null) {
      const preview = m[1] ? 'preview_' : ''
      const mc = m[3]
      const type = m[4]
      const patchPart = m[5]
      if (mc !== curMc) continue  // filename MC must match section MC
      out.push({
        version: patchPart,
        type,
        mcVersion: mc,
        filename: `${preview}OptiFine_${mc}_${type}_${patchPart}.jar`,
        forge: null,
      })
    }
  }
  // Dedupe by (mcVersion, patch) preferring non-preview entries.
  const seen = new Map()
  for (const e of out) {
    const key = `${e.mcVersion}__${e.version}`
    const prev = seen.get(key)
    if (!prev || (prev.filename.startsWith('preview_') && !e.filename.startsWith('preview_'))) {
      seen.set(key, e)
    }
  }
  return Array.from(seen.values()).sort((a, b) => (a.version < b.version ? 1 : -1))
}

function buildDownloadUrls(entry) {
  const urls = [
    // GitHub community archive — stable, no redirect, mirrors every official
    // release (including preview_/HD_U_K1). Works for MC 1.7.10 → 1.21.x.
    `${GH_ARCHIVE}/${encodeURIComponent(entry.mcVersion)}/${encodeURIComponent(entry.filename)}`,
    // BMCL CDN, no 302 — works for stable and preview filenames.
    `${BMCLAPI_BASE}/${encodeURIComponent(entry.mcVersion)}/${encodeURIComponent(entry.type)}/${encodeURIComponent(entry.version)}`,
  ]
  // For preview filenames, optifine.net's adloadx is the canonical mirror
  // (after an ad-frame redirect). Sometimes works without following ad links.
  if (entry.filename.startsWith('preview_')) {
    urls.push(`${OPTIFINE_CDN}?f=${encodeURIComponent(entry.filename)}`)
  }
  return urls
}

async function prepare(profile, paths, onLog, onProgress) {
  const mcVersion = profile.gameVersion
  const optifinePatch = profile.optifineVersion
  if (!mcVersion) throw new Error('Profile thiếu gameVersion')
  if (!optifinePatch) throw new Error('Profile thiếu optifineVersion (patch, ví dụ I7, J1)')

  const { INSTANCES_DIR } = paths
  const instancePath = profile.instancePath
  ensureDir(instancePath)
  const modsDir = path.join(instancePath, 'mods')
  ensureDir(modsDir)

  const dest = path.join(modsDir, 'OptiFine.jar')
  if (isValidJar(dest)) {
    onLog?.({ level: 'INFO', msg: 'OptiFine đã cài sẵn.' })
    return { jarPath: dest }
  }

  const list = await listVersions(mcVersion)
  const entry = list.find((e) => e.version === optifinePatch || e.patch === optifinePatch)
  if (!entry) {
    throw new Error(
      `Không tìm thấy OptiFine patch "${optifinePatch}" cho MC ${mcVersion}. ` +
      `Có thể patch đã lỗi thời hoặc chưa phát hành.`,
    )
  }

  const urls = buildDownloadUrls(entry)
  onLog?.({ level: 'INFO', msg: `Tải OptiFine ${entry.filename}…` })
  let lastErr = null
  for (const url of urls) {
    try {
      try { fs.unlinkSync(dest) } catch {}
      await downloadToFile(url, dest, (p) =>
        onProgress?.({ phase: 'download', downloaded: p.downloaded, total: p.total }))
      if (isValidJar(dest)) {
        onLog?.({ level: 'INFO', msg: `OptiFine đã cài vào mods/ (size=${fs.statSync(dest).size}).` })
        return { jarPath: dest }
      }
      lastErr = new Error(`Downloaded file is not a valid JAR (size=${fs.statSync(dest).size})`)
    } catch (ex) {
      lastErr = ex
      onLog?.({ level: 'WARN', msg: `Mirror fail (${url.split('?')[0]}): ${ex.message}` })
    }
  }

  try { fs.unlinkSync(dest) } catch {}
  throw new Error(
    `Không tải được OptiFine ${entry.filename}.\nLỗi cuối: ${lastErr?.message || 'unknown'}`,
  )
}

module.exports = { prepare, listVersions, buildDownloadUrls, isValidJar }