'use strict'

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE = 'https://api.modrinth.com/v2'
const UA = 'XForge/1.0.0'

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url)
    const client = opts.protocol === 'https:' ? https : http

    const req = client.get({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGetJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON from ${url}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url)
    const client = opts.protocol === 'https:' ? https : http
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'

    const req = client.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let received = 0
      const out = fs.createWriteStream(tmpPath)
      res.on('data', chunk => {
        received += chunk.length
        if (total > 0) onProgress?.({ received, total, percent: Math.round(received / total * 100) })
      })
      res.pipe(out)
      out.on('finish', () => { fs.renameSync(tmpPath, destPath); resolve() })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
      res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
    })
    req.on('error', reject)
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Download timeout')) })
  })
}

async function searchProjects(opts = {}) {
  const {
    query = '',
    projectType = 'mod',
    gameVersions = [],
    loaders = [],
    categories = [],
    sortBy = 'relevance',
    limit = 20,
    offset = 0,
  } = opts

  const facets = []
  facets.push([`project_type:${projectType}`])
  if (gameVersions.length > 0)
    facets.push(gameVersions.map(v => `versions:${v}`))
  if (loaders.length > 0)
    facets.push(loaders.map(l => `categories:${l}`))
  if (categories.length > 0)
    facets.push(categories.map(c => `categories:${c}`))

  const params = new URLSearchParams({
    query,
    index: sortBy,
    limit: String(limit),
    offset: String(offset),
    facets: JSON.stringify(facets),
  })

  const url = `${BASE}/search?${params}`
  return httpsGetJson(url)
}

async function getProject(idOrSlug) {
  return httpsGetJson(`${BASE}/project/${idOrSlug}`)
}

async function getProjectVersions(idOrSlug, { gameVersions = [], loaders = [] } = {}) {
  const params = new URLSearchParams()
  if (gameVersions.length > 0) params.set('game_versions', JSON.stringify(gameVersions))
  if (loaders.length > 0) params.set('loaders', JSON.stringify(loaders))
  const qs = params.toString() ? `?${params}` : ''
  return httpsGetJson(`${BASE}/project/${idOrSlug}/version${qs}`)
}

async function getVersion(versionId) {
  return httpsGetJson(`${BASE}/version/${versionId}`)
}

async function installVersion(opts) {
  const { versionId, projectType, instancePath, onProgress } = opts

  const version = await getVersion(versionId)
  const primaryFile = version.files?.find(f => f.primary) || version.files?.[0]
  if (!primaryFile) throw new Error('No file found for this version')

  const folderMap = {
    mod: 'mods',
    modpack: 'modpacks',
    shader: 'shaderpacks',
    resourcepack: 'resourcepacks',
    datapack: 'datapacks',
  }
  const folder = folderMap[projectType] || 'mods'
  const destDir = path.join(instancePath, folder)
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  const destPath = path.join(destDir, primaryFile.filename)

  if (fs.existsSync(destPath)) {
    onProgress?.({ log: `Already installed: ${primaryFile.filename}`, percent: 100 })
    return { ok: true, path: destPath, alreadyInstalled: true }
  }

  onProgress?.({ log: `Downloading ${primaryFile.filename}...`, percent: 0 })
  await downloadFile(primaryFile.url, destPath, (p) => {
    onProgress?.({ ...p, log: `${primaryFile.filename}: ${p.percent}%` })
  })
  onProgress?.({ log: `Installed: ${primaryFile.filename}`, percent: 100 })

  return { ok: true, path: destPath, filename: primaryFile.filename }
}

async function getGameVersions() {
  try {
    const versions = await httpsGetJson(`${BASE}/tag/game_version`)
    return versions.map(v => ({ version: v.version, type: v.version_type || 'release' }))
  } catch {
    return []
  }
}

async function getCategories() {
  return httpsGetJson(`${BASE}/tag/category`)
}

module.exports = {
  searchProjects,
  getProject,
  getProjectVersions,
  getVersion,
  installVersion,
  getGameVersions,
  getCategories,
}
