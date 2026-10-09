'use strict'

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE = 'https://api.curse.tools/v1/cf'
const UA = 'XForge/1.0.0'

function fetchCf(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}${endpoint}`

    function doGet(u) {
      const client = u.startsWith('https') ? https : http
      const req = client.get(u, {
        headers: { 'Accept': 'application/json', 'User-Agent': UA },
        timeout: 15000,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doGet(res.headers.location)
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
    doGet(url)
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
    }]
  }))
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

async function installVersion(opts, onProgress) {
  const { versionId, projectId, projectType, instancePath } = opts

  let file = null
  if (projectId) {
    const fileData = await fetchCfSafe(`/mods/${projectId}/files/${versionId}`)
    if (fileData && fileData.data) file = fileData.data
  }
  if (!file && opts.downloadUrl && opts.filename) {
    file = { downloadUrl: opts.downloadUrl, fileName: opts.filename, fileLength: opts.fileLength || 0 }
  }
  if (!file) throw new Error('File not found')

  const downloadUrl = file.downloadUrl
  const filename = file.fileName

  if (!downloadUrl) throw new Error('No download URL available (possibly disabled by author)')

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

  if (onProgress) onProgress({ log: `Bắt đầu tải ${filename}...`, percent: 0, total: file.fileLength })

  await new Promise((resolve, reject) => {
    function doGet(url) {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { headers: { 'User-Agent': UA }, timeout: 60000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doGet(res.headers.location)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        const total = parseInt(res.headers['content-length'] || String(file.fileLength || 0), 10)
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
          try { fs.renameSync(tmpPath, destPath) } catch {
            try { fs.copyFileSync(tmpPath, destPath); fs.unlinkSync(tmpPath) } catch {}
          }
          resolve()
        })
        out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
        res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')) })
    }
    doGet(downloadUrl)
  })

  if (onProgress) onProgress({ log: `Đã cài đặt ${filename}`, percent: 100 })
  return { success: true, file: filename }
}

module.exports = {
  searchProjects,
  getProject,
  getProjectVersions,
  getCategories,
  installVersion
}
