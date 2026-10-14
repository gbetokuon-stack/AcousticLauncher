/**
 * VoxelXLauncher — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * Source code : https://github.com/foxstudio-201/VoxelXLauncher
 * Website     : https://voxxelxclient.vercel.app
 *
 * NOTICE:
 *   - This software is provided as-is without warranty of any kind.
 *   - Do not redistribute or resell without explicit permission from FoxStudio.
 *   - If you use or reference this code, please credit FoxStudio.
 *   - Minecraft is a trademark of Mojang Studios / Microsoft. This project is not affiliated with Mojang.
 */

'use strict'

const https  = require('https')
const http   = require('http')
const fs     = require('fs')
const path   = require('path')
const zlib   = require('zlib')

const CF_API_BASE  = 'https://api.curseforge.com/v1'
const CF_PROXY     = 'https://api.curse.tools/v1/cf'

function inflateRawAsync(buf) {
  return new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

async function readZipEntry(buf, entryName) {
  let eocdOffset = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break }
  }
  if (eocdOffset < 0) return null

  const cdOffset = buf.readUInt32LE(eocdOffset + 16)
  const cdCount  = buf.readUInt16LE(eocdOffset + 10)
  let pos = cdOffset

  for (let i = 0; i < cdCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break
    const compMethod  = buf.readUInt16LE(pos + 10)
    const compSize    = buf.readUInt32LE(pos + 20)
    const fnLen       = buf.readUInt16LE(pos + 28)
    const extraLen    = buf.readUInt16LE(pos + 30)
    const commentLen  = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const fileName    = buf.slice(pos + 46, pos + 46 + fnLen).toString('utf8')

    if (fileName === entryName) {
      const lfnLen  = buf.readUInt16LE(localOffset + 26)
      const lexLen  = buf.readUInt16LE(localOffset + 28)
      const dataOff = localOffset + 30 + lfnLen + lexLen
      const comp    = buf.slice(dataOff, dataOff + compSize)
      if (compMethod === 0) return comp
      if (compMethod === 8) return inflateRawAsync(comp)
      return null
    }
    pos += 46 + fnLen + extraLen + commentLen
  }
  return null
}

async function iterZipEntries(buf, cb) {
  let eocdOffset = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break }
  }
  if (eocdOffset < 0) return

  const cdOffset = buf.readUInt32LE(eocdOffset + 16)
  const cdCount  = buf.readUInt16LE(eocdOffset + 10)
  let pos = cdOffset

  for (let i = 0; i < cdCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break
    const compMethod  = buf.readUInt16LE(pos + 10)
    const compSize    = buf.readUInt32LE(pos + 20)
    const fnLen       = buf.readUInt16LE(pos + 28)
    const extraLen    = buf.readUInt16LE(pos + 30)
    const commentLen  = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const fileName    = buf.slice(pos + 46, pos + 46 + fnLen).toString('utf8')

    await cb(fileName, async () => {
      const lfnLen  = buf.readUInt16LE(localOffset + 26)
      const lexLen  = buf.readUInt16LE(localOffset + 28)
      const dataOff = localOffset + 30 + lfnLen + lexLen
      const comp    = buf.slice(dataOff, dataOff + compSize)
      if (compMethod === 0) return comp
      if (compMethod === 8) return inflateRawAsync(comp)
      return null
    })
    pos += 46 + fnLen + extraLen + commentLen
    if (i % 10 === 0) await new Promise(r => setImmediate(r))
  }
}

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { headers: { 'User-Agent': 'VoxelXLauncher/1.0', ...headers }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return httpsGetJson(res.headers.location, headers).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out: ${url}`)) })
  })
}

async function downloadFile(url, destPath, headers = {}) {
  const dir     = path.dirname(destPath)
  await fs.promises.mkdir(dir, { recursive: true })
  const tmpPath = destPath + '.tmp'

  return new Promise((resolve, reject) => {
    let settled = false
    function done(err) {
      if (settled) return
      settled = true
      if (err) reject(err); else resolve()
    }

    const MAX_REDIRECTS = 10
    function doGet(reqUrl, redirectCount) {
      if (redirectCount > MAX_REDIRECTS) return done(new Error('Too many redirects'))
      const client = reqUrl.startsWith('https') ? https : http
      client.get(reqUrl, { headers: { 'User-Agent': 'VoxelXLauncher/1.0', ...headers } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doGet(res.headers.location, redirectCount + 1)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return done(new Error(`HTTP ${res.statusCode}: ${reqUrl}`))
        }
        const out = fs.createWriteStream(tmpPath)
        res.pipe(out)
        out.on('finish', async () => {
          try { await fs.promises.rename(tmpPath, destPath) } catch {
            await fs.promises.copyFile(tmpPath, destPath).catch(() => {})
            await fs.promises.unlink(tmpPath).catch(() => {})
          }
          done()
        })
        out.on('error', async err => { await fs.promises.unlink(tmpPath).catch(() => {}); done(err) })
        res.on('error',  async err => { await fs.promises.unlink(tmpPath).catch(() => {}); done(err) })
      }).on('error', err => done(err))
    }
    doGet(url, 0)
  })
}

async function getModDownloadUrl(projectId, fileId, apiKey) {
  if (apiKey) {
    try {
      const data = await httpsGetJson(
        `${CF_API_BASE}/mods/${projectId}/files/${fileId}/download-url`,
        { 'x-api-key': apiKey }
      )
      if (data?.data) return data.data
    } catch {}
  }

  try {
    const data = await httpsGetJson(`${CF_PROXY}/mods/${projectId}/files/${fileId}/download-url`)
    if (data?.data) return data.data
  } catch {}

  return null
}

async function importCurseForgePack(zipPath, instancePath, onProgress, apiKey) {
  onProgress?.({ phase: 'read', log: 'Đọc file modpack...', percent: 2 })

  const buf = await fs.promises.readFile(zipPath)

  const manifestData = await readZipEntry(buf, 'manifest.json')
  if (!manifestData) throw new Error('manifest.json không tìm thấy trong file')

  const manifest = JSON.parse(manifestData.toString('utf8'))
  const name        = manifest.name || path.basename(zipPath, '.zip')
  const gameVersion = manifest.minecraft?.version || ''
  const loaderArr   = manifest.minecraft?.modLoaders || []
  const loaderRaw   = loaderArr[0]?.id || ''
  const iconUrl     = manifest.image || null

  let loader = 'forge', loaderVersion = ''
  if (loaderRaw.startsWith('forge-'))     { loader = 'forge';    loaderVersion = loaderRaw.replace('forge-', '') }
  else if (loaderRaw.startsWith('fabric-'))   { loader = 'fabric';   loaderVersion = loaderRaw.replace('fabric-', '') }
  else if (loaderRaw.startsWith('neoforge-')) { loader = 'neoforge'; loaderVersion = loaderRaw.replace('neoforge-', '') }

  const mods  = manifest.files || []
  const total = mods.length
  const modsDir = path.join(instancePath, 'mods')
  await fs.promises.mkdir(modsDir, { recursive: true })

  onProgress?.({ phase: 'mods', log: `Bắt đầu tải ${total} mods...`, done: 0, total, percent: 5 })

  let done = 0
  let skipped = 0
  const blockedMods = []

  onProgress?.({ phase: 'mods', log: `[1/${total}] Đang lấy danh sách URL...`, done: 0, total, percent: 5 })

  for (let i = 0; i < total; i++) {
    const mod = mods[i]
    done++
    const pct = 5 + Math.round((done / total) * 75)

    let url = await getModDownloadUrl(mod.projectID, mod.fileID, apiKey)
    let fileName = ''
    let modName = ''

    // Fetch file metadata for filename and CDN fallbacks
    let fileInfo = null
    try {
      const fi = await httpsGetJson(`${CF_PROXY}/mods/${mod.projectID}/files/${mod.fileID}`)
      if (fi?.data) {
        fileInfo = fi.data
        fileName = fi.data.fileName || ''
        modName = fi.data.displayName || fileName
      }
    } catch {}

    if (!fileName && url) {
      fileName = url.split('/').pop().split('?')[0]
    }
    if (!fileName) {
      fileName = `mod-${mod.projectID}-${mod.fileID}.jar`
    }

    const destPath = path.join(modsDir, decodeURIComponent(fileName))
    const exists = await fs.promises.access(destPath).then(() => true).catch(() => false)
    if (exists) {
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Đã có: ${fileName}`, done, total, percent: pct })
      if (done % 3 === 0) await new Promise(r => setImmediate(r))
      continue
    }

    // Build candidate URL list
    const candidateUrls = []
    if (url) candidateUrls.push(url)
    if (fileName && mod.fileID) {
      const id1 = Math.floor(mod.fileID / 1000)
      const id2 = mod.fileID % 1000
      const enc = encodeURIComponent(fileName)
      candidateUrls.push(`https://edge.forgecdn.net/files/${id1}/${id2}/${enc}`)
      candidateUrls.push(`https://mediafilez.forgecdn.net/files/${id1}/${id2}/${enc}`)
      candidateUrls.push(`https://media.forgecdn.net/files/${id1}/${id2}/${enc}`)
    }
    // CurseForge website download API
    candidateUrls.push(`https://www.curseforge.com/api/v1/mods/${mod.projectID}/files/${mod.fileID}/download`)

    // Deduplicate
    const uniqueUrls = [...new Set(candidateUrls)]

    let downloadSuccess = false
    for (const tryUrl of uniqueUrls) {
      if (downloadSuccess) break
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Đang tải: ${fileName}`, done, total, percent: pct })
      try {
        await downloadFile(tryUrl, destPath)
        downloadSuccess = true
      } catch {}
    }

    // Modrinth cross-lookup fallback
    if (!downloadSuccess && modName) {
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Tìm trên Modrinth: ${modName}`, done, total, percent: pct })
      try {
        const searchName = modName.replace(/[-_]\d+\.\d+.*$/, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim()
        const mrSearch = await httpsGetJson(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(searchName)}&limit=3&facets=${encodeURIComponent(JSON.stringify([["project_type:mod"]]))}`, { 'User-Agent': 'AcousticForge/1.0' })
        if (mrSearch?.hits?.length > 0) {
          const bestHit = mrSearch.hits[0]
          // Get versions for this mod
          const vParams = new URLSearchParams()
          if (gameVersion) vParams.append('game_versions', JSON.stringify([gameVersion]))
          const mrVersions = await httpsGetJson(`https://api.modrinth.com/v2/project/${bestHit.project_id}/version?${vParams.toString()}`, { 'User-Agent': 'AcousticForge/1.0' })
          if (Array.isArray(mrVersions) && mrVersions.length > 0) {
            const mrVer = mrVersions[0]
            const mrFile = mrVer.files?.find(f => f.primary) || mrVer.files?.[0]
            if (mrFile?.url) {
              const mrDestPath = path.join(modsDir, mrFile.filename || fileName)
              try {
                await downloadFile(mrFile.url, mrDestPath)
                downloadSuccess = true
                onProgress?.({ phase: 'mods', log: `[${done}/${total}] Tải từ Modrinth: ${mrFile.filename}`, done, total, percent: pct })
              } catch {}
            }
          }
        }
      } catch {}
    }

    if (!downloadSuccess) {
      skipped++
      blockedMods.push({
        id: mod.fileID,
        projectId: mod.projectID,
        fileId: mod.fileID,
        fileName,
        name: modName || fileName,
        browserUrl: `https://www.curseforge.com/projects/${mod.projectID}/files/${mod.fileID}`
      })
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Không thể tải tự động: ${fileName}`, done, total, percent: pct })
    }

    if (done % 3 === 0) await new Promise(r => setImmediate(r))
  }

  onProgress?.({ phase: 'overrides', log: 'Giải nén overrides...', percent: 85 })

  await iterZipEntries(buf, async (fileName, getData) => {
    if (!fileName.startsWith('overrides/') || fileName.endsWith('/')) return
    const relPath  = fileName.slice('overrides/'.length)
    const destPath = path.join(instancePath, relPath)
    const destDir  = path.dirname(destPath)

    try {
      await fs.promises.mkdir(destDir, { recursive: true })
      const data = await getData()
      if (data) await fs.promises.writeFile(destPath, data)
    } catch {}
  })

  const msg = blockedMods.length > 0
    ? `Import hoàn tất: ${name} (${blockedMods.length} mod đang thử tải từ nguồn thay thế...)`
    : `Import hoàn tất: ${name}`
  onProgress?.({ phase: 'done', log: msg, percent: 100, blockedMods })

  return { name, gameVersion, loader, loaderVersion, iconUrl, bgUrl: iconUrl, blockedMods }
}

module.exports = { importCurseForgePack }
