'use strict'

const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const rpc = require('./discordRPC.cjs')

const isDev = process.env.NODE_ENV === 'development'

// Portable mode support (for running from portable drives / USB without host traces)
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || (
  !isDev && fs.existsSync(path.join(path.dirname(process.execPath), 'portable.dat'))
    ? path.dirname(process.execPath)
    : null
)
const isPortable = Boolean(portableDir)

if (isPortable) {
  try {
    const portableUserData = path.join(portableDir, 'data', 'userData')
    if (!fs.existsSync(portableUserData)) {
      fs.mkdirSync(portableUserData, { recursive: true })
    }
    app.setPath('userData', portableUserData)
  } catch (e) {
    console.warn('Could not set portable userData path:', e)
  }
}

// Data location: %APPDATA%/AcousticForge on Windows, or <portableDir>/data in portable mode
const APP_DIR_NAME = 'AcousticForge'
const OLD_APP_DIR_NAME = 'XForge'
const appDataRoot = isPortable ? portableDir : app.getPath('appData')
const DATA_DIR = isPortable ? path.join(portableDir, 'data') : path.join(appDataRoot, APP_DIR_NAME)
const OLD_DATA_DIR = path.join(app.getPath('appData'), OLD_APP_DIR_NAME)

// Tự động di chuyển dữ liệu từ XForge cũ sang AcousticForge nếu có (chỉ áp dụng khi không portable)
try {
  if (!isPortable && !fs.existsSync(DATA_DIR) && fs.existsSync(OLD_DATA_DIR)) {
    fs.cpSync(OLD_DATA_DIR, DATA_DIR, { recursive: true })
  }
} catch (e) {
  console.warn('Lỗi migrate XForge data:', e)
}

const PROFILES_FILE  = path.join(DATA_DIR, 'profiles.json')
const ACCOUNTS_FILE  = path.join(DATA_DIR, 'accounts.json')
const SETTINGS_FILE  = path.join(DATA_DIR, 'settings.json')
const RUNTIMES_DIR   = path.join(DATA_DIR, 'runtimes')
const INSTANCES_DIR  = path.join(DATA_DIR, 'instances')
const ASSETS_DIR     = path.join(DATA_DIR, 'assets')
const LIBRARIES_DIR  = path.join(DATA_DIR, 'libraries')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function atomicWriteJson(filePath, data) {
  ensureDir(path.dirname(filePath))
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, filePath)
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return fallback
  }
}

function ensureAllDirs() {
  ensureDir(DATA_DIR)
  ensureDir(RUNTIMES_DIR)
  ensureDir(INSTANCES_DIR)
  ensureDir(ASSETS_DIR)
  ensureDir(LIBRARIES_DIR)
  ensureDir(path.join(DATA_DIR, 'logs'))
  if (!fs.existsSync(PROFILES_FILE)) {
    atomicWriteJson(PROFILES_FILE, { profiles: [], selectedProfileId: null })
  }
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    atomicWriteJson(ACCOUNTS_FILE, { accounts: [], selectedAccountId: null })
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    atomicWriteJson(SETTINGS_FILE, {
      ramGb: 10,
      javaPath: null,
      closeOnLaunch: false,
      showSnapshots: false,
      theme: 'dark',
      discordRPC: true,
    })
  }
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#120707',
    show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Window state change notifications
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized-state', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-state', false))
  mainWindow.on('enter-full-screen', () => mainWindow?.webContents.send('window:maximized-state', true))
  mainWindow.on('leave-full-screen', () => mainWindow?.webContents.send('window:maximized-state', false))

  const distHtml = path.join(__dirname, '..', 'dist', 'index.html')

  // Tự động fallback sang dist/index.html nếu localhost:5173 không phản hồi
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, validatedURL) => {
    console.warn(`Lỗi nạp URL [${code}]: ${desc} (${validatedURL})`)
    if (fs.existsSync(distHtml) && !validatedURL.includes('index.html')) {
      console.log('Tự động nạp file build từ dist/index.html...')
      mainWindow.loadFile(distHtml)
    }
  })

  // Phím tắt F11 (Fullscreen) và F12 (DevTools)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
      event.preventDefault()
    }
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(distHtml)) {
        mainWindow.loadFile(distHtml)
      }
    })
  } else {
    mainWindow.loadFile(distHtml)
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function registerIpc() {
  // ── Settings ──────────────────────────────────────────
  ipcMain.handle('settings:get', () => readJson(SETTINGS_FILE, {}))
  ipcMain.handle('settings:set', (_e, patch) => {
    const cur = readJson(SETTINGS_FILE, {})
    const next = { ...cur, ...patch }
    atomicWriteJson(SETTINGS_FILE, next)
    
    // Connect/Disconnect Discord RPC dynamically
    if (patch.discordRPC !== undefined) {
      if (patch.discordRPC) {
        rpc.connect().catch(() => {})
      } else {
        rpc.disconnect()
      }
    }
    
    return next
  })

  // ── Discord RPC ──────────────────────────────────────
  ipcMain.handle('discord:setActivity', (_e, payload) => {
    const settings = readJson(SETTINGS_FILE, {})
    if (!settings.discordRPC) return
    
    const gameLauncher = require('./launcher/gameLauncher.cjs')
    const currentLauncherState = gameLauncher.getState ? gameLauncher.getState() : null
    if (currentLauncherState && (currentLauncherState.phase === 'running' || currentLauncherState.phase === 'launching')) {
      return
    }

    if (typeof payload === 'string') {
      rpc.PRESETS.browsing(payload)
    } else if (payload && typeof payload === 'object') {
      rpc.setActivity(payload)
    }
  })

  // ── Paths (returned to UI for display) ────────────────
  ipcMain.handle('app:getPaths', () => ({
    dataDir: DATA_DIR,
    instancesDir: INSTANCES_DIR,
    runtimesDir: RUNTIMES_DIR,
    assetsDir: ASSETS_DIR,
    librariesDir: LIBRARIES_DIR,
  }))

  // ── System Stats ─────────────────────────────────────
  ipcMain.handle('system:getStats', () => {
    const os = require('os')
    const totalMemBytes = os.totalmem()
    const freeMemBytes = os.freemem()
    const cpus = os.cpus() || []
    return {
      totalMemGb: Math.round((totalMemBytes / (1024 * 1024 * 1024)) * 10) / 10,
      freeMemGb: Math.round((freeMemBytes / (1024 * 1024 * 1024)) * 10) / 10,
      cpuModel: cpus[0]?.model || 'Processor',
      cpuCores: cpus.length,
      platform: os.platform(),
      arch: os.arch(),
    }
  })

  // ── Profiles ──────────────────────────────────────────
  const profileManager = require('./profileManager.cjs')
  profileManager.register({
    ipcMain,
    files: { PROFILES_FILE, ACCOUNTS_FILE, INSTANCES_DIR, SETTINGS_FILE },
    readJson,
    atomicWriteJson,
  })

  // ── Servers ───────────────────────────────────────────
  const serverManager = require('./serverManager.cjs')
  serverManager.register({
    ipcMain,
    files: { DATA_DIR },
  })

  // ── Profile Mods ──────────────────────────────────────
  const profileModsManager = require('./profileModsManager.cjs')
  profileModsManager.register({
    ipcMain,
    files: { PROFILES_FILE, INSTANCES_DIR },
    readJson,
  })

  // ── Accounts (Microsoft) ─────────────────────────────
  const accountManager = require('./accountManager.cjs')
  accountManager.register({
    ipcMain,
    files: { ACCOUNTS_FILE },
    readJson,
    atomicWriteJson,
  })

  // ── Microsoft auth ───────────────────────────────────
  const msAuth = require('./msAuth.cjs')
  msAuth.register({ ipcMain, getMainWindow: () => mainWindow, files: { ACCOUNTS_FILE }, readJson, atomicWriteJson })

  // ── Java auto-install ────────────────────────────────
  const javaManager = require('./launcher/java/javaManager.cjs')
  javaManager.register({
    ipcMain,
    paths: { RUNTIMES_DIR },
    getMainWindow: () => mainWindow,
  })

  // ── Vanilla launcher (version manifest + game runner) ─
  const gameLauncher = require('./launcher/gameLauncher.cjs')
  gameLauncher.register({
    ipcMain,
    paths: { DATA_DIR, ASSETS_DIR, LIBRARIES_DIR, INSTANCES_DIR, RUNTIMES_DIR },
    getMainWindow: () => mainWindow,
  })

  // ── Installer hub (multi-loader) ───────────────────
  const installerHub = require('./launcher/installerHub.cjs')
  installerHub.register({
    ipcMain,
    paths: { DATA_DIR, ASSETS_DIR, LIBRARIES_DIR, INSTANCES_DIR, RUNTIMES_DIR },
    readJson,
    atomicWriteJson,
    getMainWindow: () => mainWindow,
  })

  // ── Mod search (Modrinth, CurseForge) ──
  const modSearchManager = require('./launcher/modSearchManager.cjs')
  modSearchManager.register({ ipcMain })

  // ── Mod install ───────────────────────────────────────
  ipcMain.handle('mod:install', async (_e, opts) => {
    const { platform, modId, versionId, profileId, projectType } = opts

    // Get profile
    const profileData = readJson(PROFILES_FILE, { profiles: [] })
    const profile = profileData.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }

    const instancePath = profile.path || path.join(INSTANCES_DIR, profileId)

    try {
      let result
      if (platform === 'modrinth') {
        const modrinth = require('./launcher/modrinth/modrinthSearch.cjs')
        result = await modrinth.installVersion({
          versionId,
          projectType: projectType || 'mod',
          instancePath,
          onProgress: (p) => mainWindow?.webContents.send('install:progress', p)
        })
      } else if (platform === 'curseforge') {
        const curseforge = require('./launcher/curseforge/curseForgeSearch.cjs')
        result = await curseforge.installVersion({
          versionId,
          projectId: modId,
          projectType: projectType || 'mod',
          instancePath,
          onProgress: (p) => mainWindow?.webContents.send('install:progress', p)
        })
      }

      return result || { error: 'Unknown error' }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('modpack:downloadAndImport', async (e, { downloadUrl, filename, source, profileMeta }) => {
    if (!mainWindow) return { error: 'No main window' }

    const os = require('os')
    const path = require('path')
    const fs = require('fs')
    const https = require('https')
    const http = require('http')

    const controller = new AbortController()
    const { signal } = controller

    function sendProgress(data) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('import:progress', data)
      }
    }

    const tmpPath = path.join(os.tmpdir(), `xf-modpack-${Date.now()}-${filename}`)
    sendProgress({ phase: 'download', log: `Đang tải ${filename}...`, percent: 2 })

    try {
      await new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new Error('Cancelled'))
        signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })

        let settled = false
        function done(err) {
          if (settled) return
          settled = true
          if (err) reject(err); else resolve()
        }

        const MAX_REDIRECTS = 10
        function doGet(url, redirectCount) {
          if (signal.aborted) return done(new Error('Cancelled'))
          if (redirectCount > MAX_REDIRECTS) return done(new Error('Too many redirects'))
          const client = url.startsWith('https') ? https : http
          const req = client.get(url, { headers: { 'User-Agent': 'XForgeLauncher/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              res.resume()
              return doGet(res.headers.location, redirectCount + 1)
            }
            if (res.statusCode !== 200) {
              res.resume()
              return done(new Error(`HTTP ${res.statusCode}: ${url}`))
            }
            const tmpFile = fs.createWriteStream(tmpPath)
            const total = parseInt(res.headers['content-length'] || '0', 10)
            let received = 0

            signal.addEventListener('abort', () => {
              res.destroy()
              tmpFile.destroy()
              try { fs.unlinkSync(tmpPath) } catch {}
              done(new Error('Cancelled'))
            }, { once: true })

            res.on('data', chunk => {
              received += chunk.length
              if (total > 0) {
                const pct = 2 + Math.round((received / total) * 18)
                sendProgress({ phase: 'download', log: `Đang tải ${filename}: ${pct}%`, percent: pct })
              }
            })
            res.pipe(tmpFile)
            tmpFile.on('finish', () => done())
            tmpFile.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} done(err) })
            res.on('error',     err => { try { fs.unlinkSync(tmpPath) } catch {} done(err) })
          })
          req.on('error', err => done(err))
        }
        doGet(downloadUrl, 0)
      })
    } catch (err) {
      if (err.message === 'Cancelled') {
        try { fs.unlinkSync(tmpPath) } catch {}
        sendProgress({ phase: 'cancelled', log: 'Đã hủy tải xuống.', percent: 0 })
        return { cancelled: true }
      }
      sendProgress({ phase: 'error', log: `Lỗi tải file: ${err.message}`, percent: 0 })
      return { error: err.message }
    }

    sendProgress({ phase: 'read', log: 'Đọc metadata modpack...', percent: 20 })

    let meta = {}
    try {
      const zlib = require('zlib')
      const buf = fs.readFileSync(tmpPath)

      function readZipEntry(name) {
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
          if (fileName === name) {
            const lfnLen  = buf.readUInt16LE(localOffset + 26)
            const lexLen  = buf.readUInt16LE(localOffset + 28)
            const dataOff = localOffset + 30 + lfnLen + lexLen
            const comp    = buf.slice(dataOff, dataOff + compSize)
            if (compMethod === 0) return comp
            if (compMethod === 8) return zlib.inflateRawSync(comp)
            return null
          }
          pos += 46 + fnLen + extraLen + commentLen
        }
        return null
      }

      const baseName = path.basename(filename).replace(/\.(zip|mrpack)$/i, '')
      let name = profileMeta?.name || baseName
      let gameVersion = profileMeta?.gameVersion || ''
      let loader = profileMeta?.loader || 'forge'
      let loaderVersion = profileMeta?.loaderVersion || ''

      const manifestData = readZipEntry('manifest.json')
      if (manifestData) {
        const manifest = JSON.parse(manifestData.toString('utf8'))
        name        = manifest.name || name
        gameVersion = manifest.minecraft?.version || gameVersion
        const loaderRaw = (manifest.minecraft?.modLoaders || [])[0]?.id || ''
        if (loaderRaw.startsWith('neoforge-'))    { loader = 'neoforge'; loaderVersion = loaderRaw.replace('neoforge-', '') }
        else if (loaderRaw.startsWith('forge-'))  { loader = 'forge';    loaderVersion = loaderRaw.replace('forge-', '') }
        else if (loaderRaw.startsWith('fabric-')) { loader = 'fabric';   loaderVersion = loaderRaw.replace('fabric-', '') }
      }
      const mrData = readZipEntry('modrinth.index.json')
      if (mrData) {
        const mr = JSON.parse(mrData.toString('utf8'))
        name        = mr.name || name
        gameVersion = mr.dependencies?.minecraft || gameVersion
        if (mr.dependencies?.['fabric-loader'])    { loader = 'fabric';   loaderVersion = mr.dependencies['fabric-loader'] }
        else if (mr.dependencies?.['neoforge'])    { loader = 'neoforge'; loaderVersion = mr.dependencies['neoforge'] }
        else if (mr.dependencies?.['forge'])       { loader = 'forge';    loaderVersion = mr.dependencies['forge'] }
        else if (mr.dependencies?.['quilt-loader']){ loader = 'quilt';    loaderVersion = mr.dependencies['quilt-loader'] }
      }
      meta = { name, gameVersion, loader, loaderVersion }
    } catch (err) {
      meta = {
        name:          profileMeta?.name || path.basename(filename, path.extname(filename)),
        gameVersion:   profileMeta?.gameVersion || '',
        loader:        profileMeta?.loader || 'forge',
        loaderVersion: profileMeta?.loaderVersion || '',
      }
    }

    sendProgress({ phase: 'create', log: 'Tạo profile...', percent: 22 })

    const profileId = require('crypto').randomUUID()
    const now = new Date().toISOString()
    const instancePath = path.join(INSTANCES_DIR, profileId)
    try { fs.mkdirSync(instancePath, { recursive: true }) } catch {}

    const profile = {
      id:            profileId,
      name:          meta.name || 'Modpack',
      loader:        meta.loader,
      gameVersion:   meta.gameVersion,
      loaderVersion: meta.loaderVersion,
      instancePath,
      isCustomPath:  false,
      createdAt:     now,
      lastPlayed:    null,
      installedAt:   null,
      sizeBytes:     0,
      ramGb:         4,
      jvmArgs:       '',
      releaseChannel: 'release',
      javaPath:      '',
      importSource:  source,
      importIconUrl: profileMeta?.iconUrl || null,
      importBgUrl:   profileMeta?.iconUrl || null,
    }

    try {
      const data = readJson(PROFILES_FILE, { profiles: [], selectedProfileId: null })
      data.profiles.push(profile)
      if (!data.selectedProfileId) data.selectedProfileId = profileId
      atomicWriteJson(PROFILES_FILE, data)
    } catch (err) {
      try { fs.unlinkSync(tmpPath) } catch {}
      sendProgress({ phase: 'error', log: `Lỗi tạo profile: ${err.message}`, percent: 0 })
      return { error: err.message }
    }

    sendProgress({ phase: 'start', log: 'Bắt đầu import modpack...', percent: 25 })

    try {
      let result
      if (source === 'modrinth') {
        const { importModrinthPack } = require('./launcher/modrinth/modrinthImporter.cjs')
        result = await importModrinthPack(tmpPath, instancePath, sendProgress)
      } else if (source === 'curseforge') {
        const { importCurseForgePack } = require('./launcher/curseforge/curseforgeImporter.cjs')
        result = await importCurseForgePack(tmpPath, instancePath, sendProgress)
      } else {
        result = { name: meta.name, gameVersion: meta.gameVersion, loader: meta.loader, loaderVersion: meta.loaderVersion }
      }

      try {
        const latestData = readJson(PROFILES_FILE, { profiles: [] })
        const idx = latestData.profiles.findIndex(p => p.id === profileId)
        if (idx >= 0) {
          if (result.gameVersion)   latestData.profiles[idx].gameVersion   = result.gameVersion
          if (result.loader)        latestData.profiles[idx].loader        = result.loader
          if (result.loaderVersion) latestData.profiles[idx].loaderVersion = result.loaderVersion
          if (result.name)          latestData.profiles[idx].name          = result.name
          if (result.iconUrl) {
            latestData.profiles[idx].importIconUrl = result.iconUrl
            latestData.profiles[idx].importBgUrl   = result.iconUrl
          }
          atomicWriteJson(PROFILES_FILE, latestData)
        }
      } catch {}

      sendProgress({ phase: 'create', log: 'Đang tải tài nguyên Minecraft & libraries...', percent: 88 })
      try {
        const installerHub = require('./launcher/installerHub.cjs')
        const pData = readJson(PROFILES_FILE, { profiles: [] })
        const profile = pData.profiles.find(p => p.id === profileId)
        if (profile) {
          await installerHub.prepareInstall(profile, { DATA_DIR, INSTANCES_DIR, ASSETS_DIR, LIBRARIES_DIR, RUNTIMES_DIR }, () => mainWindow)
          const latestData = readJson(PROFILES_FILE, { profiles: [] })
          const idx = latestData.profiles.findIndex(p => p.id === profileId)
          if (idx >= 0) {
            latestData.profiles[idx].installedAt = new Date().toISOString()
            atomicWriteJson(PROFILES_FILE, latestData)
          }
        }
      } catch (ex) {
        sendProgress({ phase: 'error', log: `Lỗi tải tài nguyên Minecraft: ${ex.message}`, percent: 0 })
        return { error: ex.message }
      }
    } catch (err) {
      sendProgress({ phase: 'error', log: `Lỗi giải nén/tải mod: ${err.message}`, percent: 0 })
      return { error: err.message }
    } finally {
      try { fs.unlinkSync(tmpPath) } catch {}
    }

    sendProgress({ phase: 'done', log: 'Cài đặt Modpack thành công!', percent: 100 })
    return { ok: true, profileId }
  })

  // ── Window controls ──────────────────────────────────
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false)
      return false
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:fullscreen', () => {
    if (!mainWindow) return false
    const fs = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(fs)
    return fs
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => !!(mainWindow?.isMaximized() || mainWindow?.isFullScreen()))
  ipcMain.on('window:maximized-state', (e, val) => {
    mainWindow?.webContents.send('window:maximized-state', val)
  })

  // ── Misc ─────────────────────────────────────────────
  ipcMain.handle('shell:openFolder', async (_e, p) => {
    if (typeof p !== 'string' || !p) return { error: 'Invalid path' }
    const err = await shell.openPath(p)
    return err ? { error: err } : { ok: true }
  })
  ipcMain.handle('shell:openExternal', async (_e, url) => {
    if (typeof url !== 'string') return { error: 'Invalid url' }
    await shell.openExternal(url)
    return { ok: true }
  })
}

app.whenReady().then(() => {
  ensureAllDirs()
  registerIpc()
  createWindow()

  // Connect to Discord RPC on startup if enabled
  const settings = readJson(SETTINGS_FILE, {})
  if (settings.discordRPC !== false) {
    rpc.connect().catch(() => {})
    rpc.PRESETS.menu()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
