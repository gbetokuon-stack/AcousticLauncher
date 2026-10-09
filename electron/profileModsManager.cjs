'use strict'

const fs = require('fs')
const path = require('path')
const yauzl = require('yauzl')

function readProfiles(file) {
  try {
    if (!fs.existsSync(file)) return { profiles: [], selectedProfileId: null }
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    if (!Array.isArray(data.profiles)) data.profiles = []
    return data
  } catch {
    return { profiles: [], selectedProfileId: null }
  }
}

function getModMetadata(jarPath) {
  return new Promise((resolve) => {
    yauzl.open(jarPath, { lazyEntries: true }, (err, zip) => {
      if (err) return resolve(null)
      
      let fabricEntry = null
      let modsTomlEntry = null
      let mcmodInfoEntry = null
      
      zip.on('entry', (entry) => {
        if (entry.fileName === 'fabric.mod.json') {
          fabricEntry = entry
        } else if (entry.fileName === 'META-INF/mods.toml') {
          modsTomlEntry = entry
        } else if (entry.fileName === 'mcmod.info') {
          mcmodInfoEntry = entry
        }
        zip.readEntry()
      })
      
      zip.on('end', () => {
        const targetEntry = fabricEntry || modsTomlEntry || mcmodInfoEntry
        if (!targetEntry) {
          zip.close()
          return resolve(null)
        }
        
        zip.openReadStream(targetEntry, (err2, rs) => {
          if (err2) {
            zip.close()
            return resolve(null)
          }
          let data = ''
          rs.setEncoding('utf8')
          rs.on('data', chunk => data += chunk)
          rs.on('end', () => {
            zip.close()
            try {
              if (targetEntry === fabricEntry) {
                const parsed = JSON.parse(data)
                resolve({
                  id: parsed.id || '',
                  name: parsed.name || '',
                  version: parsed.version || '',
                  description: parsed.description || '',
                  loader: 'fabric'
                })
              } else if (targetEntry === mcmodInfoEntry) {
                const parsed = JSON.parse(data)
                const list = Array.isArray(parsed) ? parsed : (parsed.modList || [])
                const first = list[0] || {}
                resolve({
                  id: first.modid || first.id || '',
                  name: first.name || '',
                  version: first.version || '',
                  description: first.description || '',
                  loader: 'forge'
                })
              } else {
                // mods.toml
                const nameMatch = data.match(/displayName\s*=\s*"([^"]+)"/) || data.match(/name\s*=\s*"([^"]+)"/)
                const idMatch = data.match(/modId\s*=\s*"([^"]+)"/)
                const verMatch = data.match(/version\s*=\s*"([^"]+)"/)
                const descMatch = data.match(/description\s*=\s*"""([\s\S]*?)"""/) || data.match(/description\s*=\s*"([^"]*)"/)
                resolve({
                  id: idMatch ? idMatch[1] : '',
                  name: nameMatch ? nameMatch[1] : '',
                  version: verMatch ? verMatch[1] : '',
                  description: descMatch ? descMatch[1].trim() : '',
                  loader: 'forge'
                })
              }
            } catch {
              resolve(null)
            }
          })
          rs.on('error', () => {
            zip.close()
            resolve(null)
          })
        })
      })
      
      zip.on('error', () => {
        resolve(null)
      })
      
      zip.readEntry()
    })
  })
}

function parseFilenameFallback(filename) {
  let baseName = filename.replace(/\.disabled$/, '').replace(/\.jar$/, '')
  
  const verRegex = /[-_]([vV]?\d+\.\d+[\w\.\-]*)$/
  const match = baseName.match(verRegex)
  let version = 'unknown'
  let name = baseName
  
  if (match) {
    version = match[1]
    name = baseName.substring(0, baseName.indexOf(match[0]))
  }
  
  name = name.replace(/[-_]+/g, ' ').trim()
  name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  
  return {
    id: filename.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: name || filename,
    version: version,
    description: 'Không có thông tin mô tả (Metadata dự phòng).'
  }
}

function register({ ipcMain, files, readJson }) {
  const { PROFILES_FILE, INSTANCES_DIR } = files

  ipcMain.handle('profiles:listMods', async (_e, profileId, options = {}) => {
    const { page = 1, pageSize = 10, search = '' } = options
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === profileId)
    if (!profile) return { mods: [], total: 0 }

    const instancePath = profile.instancePath || path.join(INSTANCES_DIR, profileId)
    const modsDir = path.join(instancePath, 'mods')

    if (!fs.existsSync(modsDir)) {
      try {
        fs.mkdirSync(modsDir, { recursive: true })
      } catch {
        return { mods: [], total: 0 }
      }
    }

    try {
      const cachePath = path.join(instancePath, '.xforge_mods_cache.json')
      let cache = {}
      try {
        if (fs.existsSync(cachePath)) {
          cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
        }
      } catch (e) {}

      let cacheUpdated = false

      const filesInDir = fs.readdirSync(modsDir)
      const modFiles = filesInDir.filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))

      // Filter by search query (checks filename or cached mod display name)
      let filteredFiles = modFiles
      if (search) {
        const query = search.toLowerCase()
        filteredFiles = modFiles.filter(f => {
          const fileMatch = f.toLowerCase().includes(query)
          const cacheMatch = cache[f]?.metadata?.name?.toLowerCase()?.includes(query)
          return fileMatch || cacheMatch
        })
      }

      // Sort files alphabetically to ensure consistent pagination ordering
      filteredFiles.sort((a, b) => a.localeCompare(b))

      const total = filteredFiles.length
      const startIndex = (page - 1) * pageSize
      const endIndex = Math.min(startIndex + pageSize, total)
      const pageFiles = filteredFiles.slice(startIndex, endIndex)

      const list = []
      const processFile = async (filename) => {
        const fullPath = path.join(modsDir, filename)
        const enabled = !filename.endsWith('.disabled')

        let stat = { size: 0, mtimeMs: 0 }
        try {
          const s = fs.statSync(fullPath)
          stat.size = s.size
          stat.mtimeMs = Math.round(s.mtimeMs)
        } catch {}

        // Check cache first
        const cachedItem = cache[filename]
        if (cachedItem && cachedItem.size === stat.size && Math.round(cachedItem.mtimeMs) === stat.mtimeMs && cachedItem.metadata) {
          return {
            filename,
            enabled,
            name: cachedItem.metadata.name,
            id: cachedItem.metadata.id,
            version: cachedItem.metadata.version,
            description: cachedItem.metadata.description,
            loader: cachedItem.metadata.loader || 'unknown',
            sizeBytes: stat.size,
            updatedAt: stat.mtimeMs
          }
        }

        // Parse from ZIP if modified/not cached
        let metadata = null
        try {
          metadata = await getModMetadata(fullPath)
        } catch (ex) {}

        if (!metadata || !metadata.name) {
          metadata = parseFilenameFallback(filename)
        }

        cache[filename] = {
          size: stat.size,
          mtimeMs: Math.round(stat.mtimeMs),
          metadata
        }
        cacheUpdated = true

        return {
          filename,
          enabled,
          name: metadata.name,
          id: metadata.id,
          version: metadata.version,
          description: metadata.description,
          loader: metadata.loader || 'unknown',
          sizeBytes: stat.size,
          updatedAt: stat.mtimeMs
        }
      }

      // Scan pageFiles in parallel (only max 10 files, extremely fast!)
      const scanPromises = pageFiles.map(f => processFile(f))
      const results = await Promise.all(scanPromises)
      list.push(...results)

      if (cacheUpdated) {
        try {
          fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
        } catch (err) {}
      }

      // Sort current page items by status (enabled first) and then name
      const sortedMods = list.sort((a, b) => {
        if (a.enabled !== b.enabled) {
          return a.enabled ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      return {
        mods: sortedMods,
        total
      }
    } catch {
      return { mods: [], total: 0 }
    }
  })

  // Toggle mod status
  ipcMain.handle('profiles:toggleMod', async (_e, profileId, filename, enable) => {
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === profileId)
    if (!profile) return { error: 'Profile không tồn tại' }

    const instancePath = profile.instancePath || path.join(INSTANCES_DIR, profileId)
    const modsDir = path.join(instancePath, 'mods')
    const oldPath = path.join(modsDir, filename)

    if (!fs.existsSync(oldPath)) {
      return { error: `Không tìm thấy file mod: ${filename}` }
    }

    let newFilename = filename
    if (enable && filename.endsWith('.disabled')) {
      newFilename = filename.substring(0, filename.length - 9) // Remove '.disabled'
    } else if (!enable && !filename.endsWith('.disabled')) {
      newFilename = filename + '.disabled'
    }

    if (newFilename === filename) {
      return { ok: true } // No change needed
    }

    const newPath = path.join(modsDir, newFilename)
    try {
      fs.renameSync(oldPath, newPath)
      return { ok: true, newFilename }
    } catch (err) {
      return { error: `Lỗi khi chuyển đổi trạng thái mod: ${err.message}` }
    }
  })

  // Delete mod
  ipcMain.handle('profiles:deleteMod', async (_e, profileId, filename) => {
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === profileId)
    if (!profile) return { error: 'Profile không tồn tại' }

    const instancePath = profile.instancePath || path.join(INSTANCES_DIR, profileId)
    const modsDir = path.join(instancePath, 'mods')
    const filePath = path.join(modsDir, filename)

    if (!fs.existsSync(filePath)) {
      return { error: `Không tìm thấy file mod: ${filename}` }
    }

    try {
      fs.unlinkSync(filePath)
      return { ok: true }
    } catch (err) {
      return { error: `Lỗi khi xóa file mod: ${err.message}` }
    }
  })
}

module.exports = { register }
