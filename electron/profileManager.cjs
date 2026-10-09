'use strict'

const fs = require('fs')
const path = require('path')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

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

function writeProfiles(file, data) {
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, file)
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
}

/**
 * Quick directory size approximation (depth-limited).
 */
function dirSize(dir, depth = 0) {
  if (depth > 4 || !fs.existsSync(dir)) return 0
  try {
    let total = 0
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'natives' || entry.name === 'logs' || entry.name === '.git') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) total += dirSize(full, depth + 1)
      else {
        try { total += fs.statSync(full).size } catch {}
      }
    }
    return total
  } catch {
    return 0
  }
}

function register({ ipcMain, files, readJson, atomicWriteJson }) {
  const { PROFILES_FILE, INSTANCES_DIR, SETTINGS_FILE } = files

  ipcMain.handle('profiles:get', () => {
    const data = readProfiles(PROFILES_FILE)
    data.profiles = data.profiles.map((p) => ({
      ...p,
      sizeBytes: fs.existsSync(p.instancePath) ? dirSize(p.instancePath) : 0,
    }))
    return data
  })

  ipcMain.handle('profiles:create', (_e, payload) => {
    if (!payload || typeof payload !== 'object') {
      return { error: 'Invalid payload' }
    }
    const loader = payload.loader
    const gameVersion = payload.gameVersion
    // OptiFine H9+ only ships as a Forge mod (no standalone drop-in for
    // modern MC). Hide it from the loader list until Forge+OptiFine flow
    // is wired up; existing profiles keep working for now.
    const SUPPORTED = ['vanilla', 'forge', 'fabric']
    if (!SUPPORTED.includes(loader)) {
      return { error: `Loader "${loader}" chưa được hỗ trợ. Hỗ trợ: ${SUPPORTED.join(', ')}.` }
    }
    if (!gameVersion || typeof gameVersion !== 'string') {
      return { error: 'Vui lòng chọn phiên bản Minecraft' }
    }
    // Loader-specific validation
    if (loader === 'forge' && !payload.loaderVersion) {
      return { error: 'Forge yêu cầu chọn phiên bản loader (loaderVersion).' }
    }
    if (loader === 'fabric' && !payload.loaderVersion) {
      return { error: `${loader} yêu cầu chọn phiên bản loader (loaderVersion).` }
    }
    if (loader === 'optifine' && !payload.optifineVersion) {
      return { error: 'OptiFine yêu cầu chọn phiên bản (optifineVersion, ví dụ HD_U_I7).' }
    }

    const id = generateUUID()
    const now = new Date().toISOString()

    let instancePath = (payload.instancePath || '').trim()
    const isCustomPath = !!instancePath
    if (!isCustomPath) {
      instancePath = path.join(INSTANCES_DIR, id)
    }
    try {
      ensureDir(instancePath)
      // Pre-create expected subdirs so the instance looks "ready"
      ensureDir(path.join(instancePath, 'mods'))
      ensureDir(path.join(instancePath, 'saves'))
      ensureDir(path.join(instancePath, 'logs'))
      ensureDir(path.join(instancePath, 'resourcepacks'))
      ensureDir(path.join(instancePath, 'shaderpacks'))
    } catch (ex) {
      return { error: `Không thể tạo thư mục: ${ex.message}` }
    }

    const loaderLabel = loader.charAt(0).toUpperCase() + loader.slice(1)
    const name = (payload.name && payload.name.trim())
      ? payload.name.trim()
      : `${loaderLabel} ${gameVersion}`

    const settings = readJson(SETTINGS_FILE, { ramGb: 10 })
    const defaultRam = settings?.ramGb || 10

    const profile = {
      id,
      name,
      loader,
      gameVersion,
      loaderVersion:    payload.loaderVersion    || '',
      optifineVersion:  payload.optifineVersion  || '',
      instancePath,
      isCustomPath,
      createdAt: now,
      lastPlayed: null,
      installedAt: null,
      sizeBytes: 0,
      ramGb: payload.ramGb || defaultRam,
      // Advanced settings — optional, defaults applied if missing.
      jvmArgs:        typeof payload.jvmArgs === 'string' ? payload.jvmArgs : '',
      releaseChannel:  payload.releaseChannel === 'beta' ? 'beta' : 'release',
      javaPath:        typeof payload.javaPath === 'string' ? payload.javaPath : '',
    }

    const data = readProfiles(PROFILES_FILE)
    data.profiles.push(profile)
    if (!data.selectedProfileId) data.selectedProfileId = id
    writeProfiles(PROFILES_FILE, data)
    return { ok: true, profile, data }
  })

  ipcMain.handle('profiles:update', (_e, id, patch) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    if (!patch || typeof patch !== 'object') return { error: 'Dữ liệu cập nhật không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }

    // Only allow specific keys to be patched
    const allowed = [
      'name', 'ramGb', 'gameVersion', 'loaderVersion', 'optifineVersion',
      'installedAt', 'jvmArgs', 'jvmPreset', 'releaseChannel', 'javaPath',
      'lastPlayed', 'customResolution', 'fullscreen'
    ]
    for (const k of allowed) {
      if (k in patch) profile[k] = patch[k]
    }
    writeProfiles(PROFILES_FILE, data)
    return { ok: true, profile }
  })

  ipcMain.handle('profiles:clone', async (_e, id, newName) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    const original = data.profiles.find((p) => p.id === id)
    if (!original) return { error: 'Profile không tồn tại' }

    const cloneId = generateUUID()
    const cloneName = newName?.trim() || `${original.name} (Bản sao)`
    const newInstancePath = path.join(INSTANCES_DIR, cloneId)
    ensureDir(newInstancePath)

    // Copy directory structure and mods/configs if present
    try {
      if (fs.existsSync(original.instancePath)) {
        const copyDirs = ['mods', 'config', 'resourcepacks', 'shaderpacks', 'options.txt']
        for (const item of copyDirs) {
          const srcPath = path.join(original.instancePath, item)
          const destPath = path.join(newInstancePath, item)
          if (fs.existsSync(srcPath)) {
            const stat = fs.statSync(srcPath)
            if (stat.isDirectory()) {
              fs.cpSync(srcPath, destPath, { recursive: true })
            } else {
              fs.copyFileSync(srcPath, destPath)
            }
          }
        }
      }
      ensureDir(path.join(newInstancePath, 'saves'))
      ensureDir(path.join(newInstancePath, 'logs'))
      ensureDir(path.join(newInstancePath, 'screenshots'))
    } catch (e) {
      console.warn('Lỗi copy file khi clone profile:', e.message)
    }

    const clonedProfile = {
      ...original,
      id: cloneId,
      name: cloneName,
      instancePath: newInstancePath,
      isCustomPath: false,
      createdAt: new Date().toISOString(),
      lastPlayed: null,
      installedAt: original.installedAt,
      sizeBytes: dirSize(newInstancePath),
    }

    data.profiles.push(clonedProfile)
    writeProfiles(PROFILES_FILE, data)
    return { ok: true, profile: clonedProfile }
  })

  ipcMain.handle('profiles:delete', (_e, id) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }

    // Don't delete custom-path instances automatically
    if (!profile.isCustomPath) {
      try {
        const normalized = path.resolve(profile.instancePath)
        const root = path.resolve(INSTANCES_DIR)
        if (normalized.startsWith(root) && fs.existsSync(normalized)) {
          fs.rmSync(normalized, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
        }
      } catch {
        try { fs.rmSync(profile.instancePath, { recursive: true, force: true }) } catch {}
      }
    }

    data.profiles = data.profiles.filter((p) => p.id !== id)
    if (data.selectedProfileId === id) {
      data.selectedProfileId = data.profiles[0]?.id ?? null
    }
    writeProfiles(PROFILES_FILE, data)
    return { ok: true, data }
  })

  ipcMain.handle('profiles:select', (_e, id) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    if (!data.profiles.find((p) => p.id === id)) return { error: 'Profile không tồn tại' }
    data.selectedProfileId = id
    writeProfiles(PROFILES_FILE, data)
    return { ok: true, data }
  })

  ipcMain.handle('profiles:browse', () => {
    return { ok: true }
  })

  ipcMain.handle('profiles:openFolder', async (_e, id) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }
    const folderPath = profile.instancePath
    if (!fs.existsSync(folderPath)) {
      try { ensureDir(folderPath) } catch {}
    }
    const { shell } = require('electron')
    const err = await shell.openPath(folderPath)
    if (err) return { error: err }
    return { ok: true }
  })

  ipcMain.handle('profiles:openSubfolder', async (_e, id, subfolder) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }
    const targetDir = path.join(profile.instancePath, subfolder)
    ensureDir(targetDir)
    const { shell } = require('electron')
    const err = await shell.openPath(targetDir)
    if (err) return { error: err }
    return { ok: true }
  })

  ipcMain.handle('profiles:listScreenshots', async (_e, id) => {
    if (!isUuid(id)) return []
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return []
    const scrDir = path.join(profile.instancePath, 'screenshots')
    if (!fs.existsSync(scrDir)) return []

    try {
      const files = fs.readdirSync(scrDir)
      const imageFiles = files.filter(f => /\.(png|jpe?g|webp)$/i.test(f))
      const results = []

      for (const name of imageFiles) {
        const full = path.join(scrDir, name)
        try {
          const st = fs.statSync(full)
          // Read base64 thumbnail for fast in-launcher lightbox/grid
          const fileBuf = fs.readFileSync(full)
          const mime = name.endsWith('.png') ? 'image/png' : 'image/jpeg'
          const dataUrl = `data:${mime};base64,${fileBuf.toString('base64')}`

          results.push({
            name,
            path: full,
            sizeBytes: st.size,
            mtimeMs: st.mtimeMs,
            dataUrl,
          })
        } catch {}
      }

      // Newest first
      results.sort((a, b) => b.mtimeMs - a.mtimeMs)
      return results
    } catch {
      return []
    }
  })

  ipcMain.handle('profiles:deleteScreenshot', async (_e, id, filename) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }
    const filePath = path.join(profile.instancePath, 'screenshots', filename)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        return { ok: true }
      } catch (e) {
        return { error: e.message }
      }
    }
    return { error: 'File không tồn tại' }
  })

  ipcMain.handle('profiles:listResourcePacks', async (_e, id) => {
    if (!isUuid(id)) return []
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return []
    const rpDir = path.join(profile.instancePath, 'resourcepacks')
    if (!fs.existsSync(rpDir)) return []
    try {
      const entries = fs.readdirSync(rpDir, { withFileTypes: true })
      return entries
        .filter(e => e.isDirectory() || e.name.endsWith('.zip'))
        .map(e => {
          const full = path.join(rpDir, e.name)
          let size = 0
          try { size = fs.statSync(full).size } catch {}
          return {
            name: e.name,
            isDirectory: e.isDirectory(),
            sizeBytes: size,
          }
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('profiles:listShaders', async (_e, id) => {
    if (!isUuid(id)) return []
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return []
    const spDir = path.join(profile.instancePath, 'shaderpacks')
    if (!fs.existsSync(spDir)) return []
    try {
      const entries = fs.readdirSync(spDir, { withFileTypes: true })
      return entries
        .filter(e => e.isDirectory() || e.name.endsWith('.zip'))
        .map(e => {
          const full = path.join(spDir, e.name)
          let size = 0
          try { size = fs.statSync(full).size } catch {}
          return {
            name: e.name,
            isDirectory: e.isDirectory(),
            sizeBytes: size,
          }
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('profiles:listWorlds', async (_e, id) => {
    if (!isUuid(id)) return []
    const data = readProfiles(PROFILES_FILE)
    const profile = data.profiles.find((p) => p.id === id)
    if (!profile) return []
    const savesDir = path.join(profile.instancePath, 'saves')
    if (!fs.existsSync(savesDir)) return []
    try {
      const entries = fs.readdirSync(savesDir, { withFileTypes: true })
      return entries
        .filter(e => e.isDirectory())
        .map(e => {
          const full = path.join(savesDir, e.name)
          let mtimeMs = 0
          try { mtimeMs = fs.statSync(full).mtimeMs } catch {}
          return {
            name: e.name,
            path: full,
            mtimeMs,
          }
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
    } catch {
      return []
    }
  })
}

module.exports = { register }

