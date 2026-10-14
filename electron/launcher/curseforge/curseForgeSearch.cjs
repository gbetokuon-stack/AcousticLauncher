'use strict'

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE = 'https://api.curse.tools/v1/cf'
const UA = 'XForge/1.0.0'

function fetchCf(endpoint) {
  return new Promise((resolve, reject) => {
    const startUrl = `${BASE}${endpoint}`
    const MAX_REDIRECTS = 10

    function doGet(u, hops = 0) {
      if (hops > MAX_REDIRECTS) return reject(new Error(`Too many redirects: ${u}`))
      const client = u.startsWith('https') ? https : http
      const req = client.get(u, {
        headers: { 'Accept': 'application/json', 'User-Agent': UA },
        timeout: 15000,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          let nextUrl = res.headers.location
          if (!nextUrl.startsWith('http')) {
            try { nextUrl = new URL(nextUrl, u).href } catch {}
          }
          return doGet(nextUrl, hops + 1)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`CF API Error: ${res.statusCode} ${u}`))
        }
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch { reject(new Error(`Invalid JSON from ${u}`)) }
        })
        res.on('error', reject)
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${u}`)) })
    }
    doGet(startUrl, 0)
  })
}

async function fetchCfSafe(endpoint) {
  try {
    return await fetchCf(endpoint)
  } catch (error) {
    console.error(`[CurseForge API] Error fetching ${endpoint}:`, error.message)
    return null
  }
}

async function searchProjects(opts) {
  const { query = '', gameVersions = [], loaders = [], categoryId, sortBy = 'relevance', offset = 0, limit = 20, projectType = 'mod' } = opts
  const params = new URLSearchParams()
  params.append('gameId', '432')

  const classMap = {
    'mod': 6,
    'modpack': 4471,
    'shader': 6552,
    'resourcepack': 12,
    'datapack': 12
  }
  params.append('classId', classMap[projectType] || 6)

  if (query) params.append('searchFilter', query)
  if (categoryId) params.append('categoryId', categoryId)
  if (gameVersions.length > 0) params.append('gameVersion', gameVersions[0])
  if (loaders.length > 0) params.append('modLoaderType', getModLoaderType(loaders[0]))

  const sortMap = {
    relevance: 1,
    downloads: 2,
    updated: 3,
    newest: 4,
  }
  params.append('sortField', sortMap[sortBy] || 1)
  params.append('sortOrder', 'desc')

  params.append('index', offset)
  params.append('pageSize', limit)

  const data = await fetchCfSafe(`/mods/search?${params.toString()}`)
  if (!data || !data.data) return { hits: [], total_hits: 0 }

  return {
    hits: data.data.map(p => formatProject(p)),
    total_hits: data.pagination ? data.pagination.totalCount : data.data.length
  }
}

function getModLoaderType(loader) {
  const map = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 }
  return map[loader.toLowerCase()] || 0
}

function formatProject(p) {
  return {
    project_id: p.id,
    slug: p.slug,
    title: p.name,
    description: p.summary,
    author: p.authors ? p.authors.map(a => a.name).join(', ') : 'Unknown',
    downloads: p.downloadCount,
    follows: 0,
    icon_url: p.logo ? p.logo.thumbnailUrl : '',
    date_modified: p.dateModified,
    date_created: p.dateCreated,
    categories: p.categories ? p.categories.map(c => c.name) : [],
    display_categories: p.categories ? p.categories.map(c => c.name) : [],
    versions: [],
    client_side: 'optional',
    server_side: 'optional',
    source: 'curseforge'
  }
}

async function getProject(id) {
  const data = await fetchCfSafe(`/mods/${id}`)
  if (!data || !data.data) return null
  const p = data.data
  const proj = formatProject(p)
  proj.body = p.summary

  const descData = await fetchCfSafe(`/mods/${id}/description`)
  if (descData && descData.data) {
    proj.body = descData.data
  }
  return proj
}

async function getProjectVersions(id, filters = {}) {
  const data = await fetchCfSafe(`/mods/${id}/files`)
  if (!data || !data.data) return []

  let files = data.data
  if (filters.loaders && filters.loaders.length > 0) {
    files = files.filter(f => f.gameVersions.some(gv => filters.loaders.some(l => gv.toLowerCase().includes(l.toLowerCase()))))
  }
  if (filters.gameVersions && filters.gameVersions.length > 0) {
    files = files.filter(f => f.gameVersions.some(gv => filters.gameVersions.includes(gv)))
  }

  return files.map(f => ({
    id: f.id,
    project_id: f.modId,
    name: f.displayName,
    version_number: f.displayName,
    version_type: f.releaseType === 1 ? 'release' : f.releaseType === 2 ? 'beta' : 'alpha',
    date_published: f.fileDate,
    downloads: f.downloadCount,
    game_versions: f.gameVersions.filter(v => /^1\.\d+/.test(v)),
    loaders: f.gameVersions.filter(v => ['forge', 'fabric', 'quilt', 'neoforge'].includes(v.toLowerCase())).map(v => v.toLowerCase()),
    files: [{
      url: f.downloadUrl,
      filename: f.fileName,
      size: f.fileLength,
      primary: true
    }],
    dependencies: f.dependencies || []
  }))
}

async function getFile(projectId, fileId) {
  const data = await fetchCfSafe(`/mods/${projectId}/files/${fileId}`)
  return data?.data || null
}

async function getCategories(projectType = 'mod') {
  const classMap = {
    'mod': 6,
    'modpack': 4471,
    'shader': 6552,
    'resourcepack': 12,
    'datapack': 12
  }
  const classId = classMap[projectType] || 6
  const data = await fetchCfSafe(`/categories?gameId=432&classId=${classId}&classesOnly=false`)
  if (!data || !data.data) return []
  return data.data.filter(c => c.classId === classId).map(c => ({
    id: c.id,
    icon: c.iconUrl,
    name: c.name,
    project_type: projectType
  }))
}

function downloadUrlToFile(url, destPath, tmpPath, expectedSize, onProgress, filename) {
  return new Promise((resolve, reject) => {
    const MAX_REDIRECTS = 10
    let settled = false
    function done(err) {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve()
    }

    function doGet(reqUrl, hops = 0) {
      if (hops > MAX_REDIRECTS) return done(new Error('Too many redirects'))
      const client = reqUrl.startsWith('https') ? https : http
      const req = client.get(reqUrl, { headers: { 'User-Agent': UA }, timeout: 60000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          let nextUrl = res.headers.location
          if (!nextUrl.startsWith('http')) {
            try { nextUrl = new URL(nextUrl, reqUrl).href } catch {}
          }
          return doGet(nextUrl, hops + 1)
        }
        if (res.statusCode !== 200) {
          res.resume()
          const err = new Error(`HTTP ${res.statusCode}`)
          err.statusCode = res.statusCode
          return done(err)
        }

        const total = parseInt(res.headers['content-length'] || String(expectedSize || 0), 10)
        let received = 0
        const startTime = Date.now()
        const out = fs.createWriteStream(tmpPath)

        res.on('data', chunk => {
          received += chunk.length
          if (total > 0 && onProgress) {
            const pct = Math.round(received / total * 100)
            const elapsed = (Date.now() - startTime) / 1000
            const speed = elapsed > 0 ? Math.round(received / elapsed / 1024) : 0
            onProgress({ log: `Đang tải ${filename}: ${pct}%`, percent: pct, total, received, speed })
          }
        })
        res.pipe(out)
        out.on('finish', () => {
          try {
            fs.renameSync(tmpPath, destPath)
          } catch {
            try {
              fs.copyFileSync(tmpPath, destPath)
              fs.unlinkSync(tmpPath)
            } catch {}
          }
          done()
        })
        out.on('error', err => {
          try { fs.unlinkSync(tmpPath) } catch {}
          done(err)
        })
        res.on('error', err => {
          try { fs.unlinkSync(tmpPath) } catch {}
          done(err)
        })
      })
      req.on('error', err => done(err))
      req.on('timeout', () => {
        req.destroy()
        done(new Error('Download timeout'))
      })
    }
    doGet(url, 0)
  })
}

async function searchModOnModrinth(modName, gameVersion, loader) {
  try {
    const params = new URLSearchParams()
    params.append('query', modName)
    params.append('limit', '5')
    params.append('facets', JSON.stringify([
      ['project_type:mod'],
      ...(gameVersion ? [['versions:' + gameVersion]] : []),
      ...(loader ? [['categories:' + loader]] : [])
    ]))

    const url = `https://api.modrinth.com/v2/search?${params.toString()}`
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'AcousticForge/1.0', 'Accept': 'application/json' },
        timeout: 10000
      }, (res) => {
        if (res.statusCode !== 200) { res.resume(); return resolve(null) }
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (parsed.hits && parsed.hits.length > 0) {
              resolve(parsed.hits[0])
            } else {
              resolve(null)
            }
          } catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.on('timeout', () => { req.destroy(); resolve(null) })
    })
  } catch {
    return null
  }
}

async function getModrinthDownloadUrl(slug, gameVersion, loader) {
  try {
    let facets = `[["project_type:mod"]]`
    const params = new URLSearchParams()
    if (gameVersion) params.append('game_versions', JSON.stringify([gameVersion]))
    if (loader) params.append('loaders', JSON.stringify([loader]))

    const url = `https://api.modrinth.com/v2/project/${slug}/version?${params.toString()}`
    return new Promise((resolve) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'AcousticForge/1.0', 'Accept': 'application/json' },
        timeout: 10000
      }, (res) => {
        if (res.statusCode !== 200) { res.resume(); return resolve(null) }
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          try {
            const versions = JSON.parse(data)
            if (Array.isArray(versions) && versions.length > 0) {
              const ver = versions[0]
              const file = ver.files?.find(f => f.primary) || ver.files?.[0]
              resolve(file?.url || null)
            } else { resolve(null) }
          } catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.on('timeout', () => { req.destroy(); resolve(null) })
    })
  } catch { return null }
}

async function installVersion(opts, onProgress) {
  const { versionId, projectId, projectType, instancePath } = opts
  const progressCb = onProgress || opts.onProgress

  let file = null
  if (projectId) {
    const fileData = await fetchCfSafe(`/mods/${projectId}/files/${versionId}`)
    if (fileData && fileData.data) file = fileData.data
  }
  if (!file && opts.downloadUrl && opts.filename) {
    file = { downloadUrl: opts.downloadUrl, fileName: opts.filename, fileLength: opts.fileLength || 0, id: versionId, modId: projectId }
  }
  if (!file) throw new Error('File not found')

  const filename = file.fileName
  const folderMap = {
    mod: 'mods',
    shader: 'shaderpacks',
    resourcepack: 'resourcepacks',
  }
  const folder = folderMap[projectType] || 'mods'
  const destDir = path.join(instancePath, folder)
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  const destPath = path.join(destDir, filename)
  const tmpPath = destPath + '.tmp'

  // Build list of candidate download URLs to try
  const candidateUrls = []

  // Strategy 1: Official API URL
  if (file.downloadUrl) {
    candidateUrls.push(file.downloadUrl)
  }

  // Strategy 2-4: Multiple CDN patterns  
  if (file.id && filename) {
    const id1 = Math.floor(file.id / 1000)
    const id2 = file.id % 1000
    const encodedName = encodeURIComponent(filename)
    candidateUrls.push(`https://edge.forgecdn.net/files/${id1}/${id2}/${encodedName}`)
    candidateUrls.push(`https://mediafilez.forgecdn.net/files/${id1}/${id2}/${encodedName}`)
    candidateUrls.push(`https://media.forgecdn.net/files/${id1}/${id2}/${encodedName}`)
  }

  // Strategy 5: CurseForge website download API (works for most blocked mods)
  const actualProjectId = projectId || file.modId
  if (actualProjectId && file.id) {
    candidateUrls.push(`https://www.curseforge.com/api/v1/mods/${actualProjectId}/files/${file.id}/download`)
  }

  const uniqueUrls = [...new Set(candidateUrls.filter(Boolean))]

  if (progressCb) progressCb({ log: `Bắt đầu tải ${filename}...`, percent: 0, total: file.fileLength || 0 })

  let downloaded = false

  for (const tryUrl of uniqueUrls) {
    try {
      await downloadUrlToFile(tryUrl, destPath, tmpPath, file.fileLength, progressCb, filename)
      downloaded = true
      break
    } catch {
      try { fs.unlinkSync(tmpPath) } catch {}
    }
  }

  // Strategy 6: Modrinth cross-lookup fallback
  if (!downloaded) {
    try {
      const rawName = file.displayName || filename || ''
      const searchName = rawName.replace(/[-_]\d+\.\d+.*$/, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || rawName
      const gameVersion = opts.gameVersion || (file.gameVersions?.find(v => /^1\.\d+/.test(v)))
      const loader = opts.loader || (file.gameVersions?.find(v => ['forge', 'fabric', 'quilt', 'neoforge'].includes(v.toLowerCase()))?.toLowerCase())

      if (progressCb) progressCb({ log: `Tìm trên Modrinth: ${searchName}...`, percent: 0 })
      const hit = await searchModOnModrinth(searchName, gameVersion, loader)
      if (hit && (hit.project_id || hit.slug)) {
        const mrUrl = await getModrinthDownloadUrl(hit.project_id || hit.slug, gameVersion, loader)
        if (mrUrl) {
          if (progressCb) progressCb({ log: `Đang tải từ Modrinth: ${filename}...`, percent: 0 })
          await downloadUrlToFile(mrUrl, destPath, tmpPath, file.fileLength, progressCb, filename)
          downloaded = true
        }
      }
    } catch {
      try { fs.unlinkSync(tmpPath) } catch {}
    }
  }

  if (!downloaded) {
    return {
      success: false,
      needsManualDownload: true,
      platform: 'curseforge',
      modId: actualProjectId,
      versionId: file.id,
      fileName: filename,
      name: file.displayName || filename,
      browserUrl: `https://www.curseforge.com/projects/${actualProjectId}/files/${file.id}`
    }
  }

  if (progressCb) progressCb({ log: `Đã cài đặt ${filename}`, percent: 100 })
  return { success: true, file: filename, path: destPath }
}

module.exports = {
  searchProjects,
  getProject,
  getProjectVersions,
  getFile,
  getCategories,
  installVersion,
  searchModOnModrinth,
  getModrinthDownloadUrl
}
