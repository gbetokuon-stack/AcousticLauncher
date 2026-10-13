'use strict'

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const modrinth = require('./modrinth/modrinthSearch.cjs')
const curseforge = require('./curseforge/curseForgeSearch.cjs')

/**
 * Normalizes a mod string for comparison:
 * Lowercases, strips non-alphanumeric characters.
 */
function normalizeId(str) {
  if (!str || typeof str !== 'string') return ''
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Checks if a remote URL returns HTTP 200 OK without downloading the full body
 */
function checkUrlReachable(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http
      const req = client.request(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 5000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location
          if (!nextUrl.startsWith('http')) {
            try { nextUrl = new URL(nextUrl, url).href } catch {}
          }
          return checkUrlReachable(nextUrl).then(resolve)
        }
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
      req.end()
    } catch {
      resolve(false)
    }
  })
}

/**
 * Inspects all installed mods in the instance's mods folder
 */
function getInstalledModsInfo(instancePath) {
  const modsDir = path.join(instancePath, 'mods')
  const results = {
    filenames: [],
    normalizedSet: new Set(),
    items: []
  }

  if (!fs.existsSync(modsDir)) return results

  try {
    const files = fs.readdirSync(modsDir)
    const jarFiles = files.filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))

    // Read cache if available
    const cachePath = path.join(instancePath, '.xforge_mods_cache.json')
    let cache = {}
    try {
      if (fs.existsSync(cachePath)) {
        cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
      }
    } catch {}

    for (const file of jarFiles) {
      results.filenames.push(file)
      
      // Clean filename (strip extension, .disabled, version tails)
      const base = file.replace(/\.disabled$/, '').replace(/\.jar$/, '')
      const cleanBase = base.replace(/[-_](v?\d+\.\d+[\w.-]*)$/i, '')
      
      results.normalizedSet.add(normalizeId(base))
      results.normalizedSet.add(normalizeId(cleanBase))

      // Also parse known delimiters (e.g. fabric-api-0.92 -> fabricapi)
      const parts = base.split(/[-_+.]/)
      if (parts.length > 0) {
        results.normalizedSet.add(normalizeId(parts[0]))
        if (parts.length > 1) {
          results.normalizedSet.add(normalizeId(`${parts[0]}${parts[1]}`))
        }
      }

      // If cached metadata exists
      const cached = cache[file]?.metadata
      if (cached) {
        if (cached.id) results.normalizedSet.add(normalizeId(cached.id))
        if (cached.name) results.normalizedSet.add(normalizeId(cached.name))
        results.items.push({
          filename: file,
          id: cached.id || '',
          name: cached.name || base
        })
      } else {
        results.items.push({
          filename: file,
          id: cleanBase,
          name: base
        })
      }
    }
  } catch (err) {
    console.error('[DependencyResolver] Error reading installed mods:', err.message)
  }

  return results
}

/**
 * Checks whether a mod with a given id / slug / title is already installed
 */
function isModInstalled(query, installedInfo) {
  if (!query) return false
  const norm = normalizeId(query)
  if (!norm) return false

  if (installedInfo.normalizedSet.has(norm)) return true

  // Check substring matches across filenames
  for (const fn of installedInfo.filenames) {
    const fnNorm = normalizeId(fn)
    if (fnNorm.includes(norm) || (norm.length >= 5 && norm.includes(fnNorm))) {
      return true
    }
  }

  return false
}

function getLoaderTypeCF(loader) {
  const map = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 }
  return map[(loader || '').toLowerCase()] || 0
}

/**
 * Recursively resolves dependencies for Modrinth
 */
async function resolveModrinthDeps(versionId, installedInfo, gameVersion, loader, visited = new Set()) {
  if (visited.has(versionId)) return { missing: [], satisfied: [] }
  visited.add(versionId)

  let verData = null
  try {
    verData = await modrinth.getVersion(versionId)
  } catch (err) {
    console.error('[DependencyResolver] Modrinth getVersion error:', err.message)
    return { missing: [], satisfied: [] }
  }

  if (!verData) return { missing: [], satisfied: [] }

  const requiredDeps = (verData.dependencies || []).filter(d => d.dependency_type === 'required')
  const missing = []
  const satisfied = []

  for (const dep of requiredDeps) {
    const projId = dep.project_id
    if (!projId) continue

    let proj = null
    try {
      proj = await modrinth.getProject(projId)
    } catch {}

    const slug = proj?.slug || projId
    const title = proj?.title || slug
    const icon = proj?.icon_url || null

    if (isModInstalled(slug, installedInfo) || isModInstalled(title, installedInfo) || isModInstalled(projId, installedInfo)) {
      satisfied.push({ platform: 'modrinth', id: projId, name: title, slug, icon })
      continue
    }

    // Find compatible version for missing mod
    let compVersion = null
    if (dep.version_id) {
      try { compVersion = await modrinth.getVersion(dep.version_id) } catch {}
    }

    if (!compVersion) {
      try {
        const filters = {
          gameVersions: gameVersion ? [gameVersion] : [],
          loaders: loader ? [loader] : []
        }
        const vers = await modrinth.getProjectVersions(projId, filters)
        if (Array.isArray(vers) && vers.length > 0) {
          // Prefer release versions
          compVersion = vers.find(v => v.version_type === 'release') || vers[0]
        }
      } catch {}
    }

    if (compVersion) {
      const primaryFile = compVersion.files?.find(f => f.primary) || compVersion.files?.[0]
      if (primaryFile) {
        missing.push({
          platform: 'modrinth',
          modId: projId,
          versionId: compVersion.id,
          name: title,
          slug,
          icon,
          fileName: primaryFile.filename,
          fileSize: primaryFile.size,
          downloadUrl: primaryFile.url,
          needsManualDownload: false,
          browserUrl: `https://modrinth.com/mod/${slug}/version/${compVersion.id}`
        })

        // Recursively check deeper dependencies
        const sub = await resolveModrinthDeps(compVersion.id, installedInfo, gameVersion, loader, visited)
        missing.push(...sub.missing)
        satisfied.push(...sub.satisfied)
      }
    } else {
      // Couldn't find specific version, but it is required!
      missing.push({
        platform: 'modrinth',
        modId: projId,
        versionId: null,
        name: title,
        slug,
        icon,
        fileName: `${slug}.jar`,
        fileSize: 0,
        downloadUrl: null,
        needsManualDownload: true,
        browserUrl: `https://modrinth.com/mod/${slug}`
      })
    }
  }

  return { missing, satisfied }
}

/**
 * Recursively resolves dependencies for CurseForge
 */
async function resolveCurseForgeDeps(modId, fileId, installedInfo, gameVersion, loader, visited = new Set()) {
  const visitKey = `${modId}:${fileId}`
  if (visited.has(visitKey)) return { missing: [], satisfied: [] }
  visited.add(visitKey)

  let fileData = null
  try {
    fileData = await curseforge.getFile(modId, fileId)
  } catch (err) {
    console.error('[DependencyResolver] CF getFile error:', err.message)
    return { missing: [], satisfied: [] }
  }

  if (!fileData) return { missing: [], satisfied: [] }

  // RelationType 3 = RequiredDependency in CurseForge API
  const requiredDeps = (fileData.dependencies || []).filter(d => d.relationType === 3)
  const missing = []
  const satisfied = []

  for (const dep of requiredDeps) {
    const depModId = dep.modId
    if (!depModId) continue

    let depMod = null
    try {
      depMod = await curseforge.getProject(depModId)
    } catch {}

    const slug = depMod?.slug || String(depModId)
    const title = depMod?.title || depMod?.name || slug
    const icon = depMod?.icon_url || ''

    if (isModInstalled(slug, installedInfo) || isModInstalled(title, installedInfo) || isModInstalled(String(depModId), installedInfo)) {
      satisfied.push({ platform: 'curseforge', id: depModId, name: title, slug, icon })
      continue
    }

    // Find compatible file
    let compFile = null
    try {
      const loaderType = getLoaderTypeCF(loader)
      const filters = {
        loaders: loader ? [loader] : [],
        gameVersions: gameVersion ? [gameVersion] : []
      }
      const files = await curseforge.getProjectVersions(depModId, filters)
      if (Array.isArray(files) && files.length > 0) {
        // Prefer release versions
        compFile = files.find(f => f.version_type === 'release') || files[0]
      }
    } catch {}

    if (compFile) {
      const fileName = compFile.files?.[0]?.filename || compFile.name || `${slug}.jar`
      const fileLength = compFile.files?.[0]?.size || 0
      let downloadUrl = compFile.files?.[0]?.url

      let edgeUrl = null
      if (!downloadUrl && compFile.id && fileName) {
        edgeUrl = `https://edge.forgecdn.net/files/${Math.floor(compFile.id / 1000)}/${compFile.id % 1000}/${encodeURIComponent(fileName)}`
      }

      let reachable = false
      if (downloadUrl) {
        reachable = true
      } else if (edgeUrl) {
        reachable = await checkUrlReachable(edgeUrl)
        if (reachable) downloadUrl = edgeUrl
      }

      const needsManualDownload = !reachable
      const browserUrl = slug
        ? `https://www.curseforge.com/minecraft/mc-mods/${slug}/download/${compFile.id}`
        : `https://www.curseforge.com/projects/${depModId}/files/${compFile.id}`

      missing.push({
        platform: 'curseforge',
        modId: depModId,
        versionId: compFile.id,
        name: title,
        slug,
        icon,
        fileName,
        fileSize: fileLength,
        downloadUrl: reachable ? downloadUrl : null,
        needsManualDownload,
        browserUrl
      })

      // Recursively check deeper dependencies
      const sub = await resolveCurseForgeDeps(depModId, compFile.id, installedInfo, gameVersion, loader, visited)
      missing.push(...sub.missing)
      satisfied.push(...sub.satisfied)
    } else {
      missing.push({
        platform: 'curseforge',
        modId: depModId,
        versionId: null,
        name: title,
        slug,
        icon,
        fileName: `${slug}.jar`,
        fileSize: 0,
        downloadUrl: null,
        needsManualDownload: true,
        browserUrl: `https://www.curseforge.com/minecraft/mc-mods/${slug}`
      })
    }
  }

  return { missing, satisfied }
}

/**
 * Main function: checks dependencies for a mod version being installed
 */
async function checkModDependencies(opts) {
  const { platform, modId, versionId, instancePath, gameVersion, loader } = opts

  const installedInfo = getInstalledModsInfo(instancePath)

  let targetMod = null
  let missing = []
  let satisfied = []

  if (platform === 'modrinth') {
    let proj = null
    let ver = null
    try {
      ;[proj, ver] = await Promise.all([
        modrinth.getProject(modId),
        modrinth.getVersion(versionId)
      ])
    } catch (e) {
      console.error('[DependencyResolver] Error getting target mod Modrinth:', e.message)
    }

    const primaryFile = ver?.files?.find(f => f.primary) || ver?.files?.[0]
    targetMod = {
      platform: 'modrinth',
      modId,
      versionId,
      name: proj?.title || modId,
      slug: proj?.slug || modId,
      icon: proj?.icon_url || null,
      fileName: primaryFile?.filename || `${modId}.jar`,
      fileSize: primaryFile?.size || 0,
      downloadUrl: primaryFile?.url || null,
      needsManualDownload: false,
      browserUrl: `https://modrinth.com/mod/${proj?.slug || modId}/version/${versionId}`
    }

    const res = await resolveModrinthDeps(versionId, installedInfo, gameVersion, loader)
    missing = res.missing
    satisfied = res.satisfied
  } else if (platform === 'curseforge') {
    let proj = null
    let file = null
    try {
      ;[proj, file] = await Promise.all([
        curseforge.getProject(modId),
        curseforge.getFile(modId, versionId)
      ])
    } catch (e) {
      console.error('[DependencyResolver] Error getting target mod CF:', e.message)
    }

    const fileName = file?.fileName || `${proj?.slug || modId}.jar`
    let downloadUrl = file?.downloadUrl || null
    let edgeUrl = null
    if (!downloadUrl && file?.id && fileName) {
      edgeUrl = `https://edge.forgecdn.net/files/${Math.floor(file.id / 1000)}/${file.id % 1000}/${encodeURIComponent(fileName)}`
    }

    let reachable = false
    if (downloadUrl) {
      reachable = true
    } else if (edgeUrl) {
      reachable = await checkUrlReachable(edgeUrl)
      if (reachable) downloadUrl = edgeUrl
    }

    const needsManualDownload = !reachable
    const browserUrl = proj?.slug
      ? `https://www.curseforge.com/minecraft/mc-mods/${proj.slug}/download/${versionId}`
      : `https://www.curseforge.com/projects/${modId}/files/${versionId}`

    targetMod = {
      platform: 'curseforge',
      modId,
      versionId,
      name: proj?.title || proj?.name || fileName,
      slug: proj?.slug || String(modId),
      icon: proj?.icon_url || '',
      fileName,
      fileSize: file?.fileLength || 0,
      downloadUrl: reachable ? downloadUrl : null,
      needsManualDownload,
      browserUrl
    }

    const res = await resolveCurseForgeDeps(modId, versionId, installedInfo, gameVersion, loader)
    missing = res.missing
    satisfied = res.satisfied
  }

  // Deduplicate missing by modId/slug
  const uniqueMissing = []
  const seenMissing = new Set()
  for (const m of missing) {
    const key = `${m.platform}:${m.modId || m.slug}`
    if (!seenMissing.has(key)) {
      seenMissing.add(key)
      uniqueMissing.push(m)
    }
  }

  const anyNeedsManualDownload = targetMod?.needsManualDownload || uniqueMissing.some(m => m.needsManualDownload)

  return {
    targetMod,
    missingDependencies: uniqueMissing,
    alreadySatisfied: satisfied,
    hasMissing: uniqueMissing.length > 0,
    anyNeedsManualDownload
  }
}

/**
 * Checks all installed mods in a profile for missing dependencies
 */
async function checkProfileMissingMods({ instancePath, gameVersion, loader }) {
  const installedInfo = getInstalledModsInfo(instancePath)
  // Scan all mod files and check if fabric.mod.json or mods.toml requires anything missing
  const missingMods = []
  const yauzl = require('yauzl')

  for (const item of installedInfo.items) {
    const jarPath = path.join(instancePath, 'mods', item.filename)
    try {
      await new Promise((resolve) => {
        yauzl.open(jarPath, { lazyEntries: true }, (err, zip) => {
          if (err) return resolve()
          let fabricEntry = null
          zip.on('entry', (entry) => {
            if (entry.fileName === 'fabric.mod.json') fabricEntry = entry
            zip.readEntry()
          })
          zip.on('end', () => {
            if (!fabricEntry) { zip.close(); return resolve() }
            zip.openReadStream(fabricEntry, (err2, rs) => {
              if (err2) { zip.close(); return resolve() }
              let data = ''
              rs.setEncoding('utf8')
              rs.on('data', chunk => data += chunk)
              rs.on('end', () => {
                zip.close()
                try {
                  const meta = JSON.parse(data)
                  const depends = meta.depends || {}
                  for (const [depId, depVer] of Object.entries(depends)) {
                    if (['minecraft', 'java', 'fabricloader'].includes(depId.toLowerCase())) continue
                    if (!isModInstalled(depId, installedInfo)) {
                      missingMods.push({
                        requiredBy: item.name,
                        depId,
                        depVer
                      })
                    }
                  }
                } catch {}
                resolve()
              })
            })
          })
        })
      })
    } catch {}
  }

  return { missingMods }
}

module.exports = {
  getInstalledModsInfo,
  isModInstalled,
  checkModDependencies,
  checkProfileMissingMods
}
