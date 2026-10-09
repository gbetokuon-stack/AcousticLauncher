'use strict'

/**
 * Java runtime manager — installs Mojang-shipped Java runtimes (jre-legacy / gamma / delta).
 *
 * Mojang does NOT ship a single downloadable zip. Instead:
 *   1. all.json → per-component manifest URL (a JSON file)
 *   2. manifest.json → flat list of { type, path, downloads.raw.url } entries
 *   3. Each raw file is downloaded individually into the correct sub-path
 *
 * This matches how VoxelXLauncher's javaManager.cjs does it (ensureJava function).
 */

const fs     = require('fs')
const path   = require('path')
const https  = require('https')
const http   = require('http')

const JRE_MANIFEST_URL = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

/* ─────────────────────────── version helpers ─────────────────────────── */

function getJavaComponent(gameVersion) {
  if (typeof gameVersion !== 'string') return 'java-runtime-delta'
  
  // 1. Check Mojang snapshot format (e.g. 24w40a, 23w12a)
  const snapMatch = gameVersion.match(/^(\d+)w\d+[a-z]$/)
  if (snapMatch) {
    const year = parseInt(snapMatch[1], 10)
    if (year >= 25) return 'java-runtime-epsilon' // Java 25 (25w02a+)
    if (year >= 24) return 'java-runtime-delta'   // Java 21 (24w14a+)
    if (year >= 21) return 'java-runtime-gamma'   // Java 17 (21w19a+)
    return 'jre-legacy'
  }

  // 2. Check standard release format (e.g. 1.20.4, 1.16.5)
  const parts = gameVersion.split('.')
  const major = parseInt(parts[0] || '0', 10)
  const minor = parseInt(parts[1] || '0', 10)

  // Handle future year-based major versions (e.g. 25.x, 26.x)
  if (major >= 25) return 'java-runtime-epsilon'

  if (major === 1) {
    if (minor <= 16) return 'jre-legacy'         // Java 8 (<= 1.16.5)
    if (minor <= 20) return 'java-runtime-gamma'  // Java 17 (1.17 - 1.20.4)
    return 'java-runtime-delta'                  // Java 21 (1.20.5 / 1.21+)
  }

  return 'java-runtime-delta'
}

function javaMajorFor(component) {
  if (component === 'jre-legacy')          return 8
  if (component === 'java-runtime-gamma') return 17
  if (component === 'java-runtime-delta') return 21
  if (component === 'java-runtime-epsilon') return 25
  return 21
}

function mojangPlatform() {
  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : 'x86'
  if (process.platform === 'win32') {
    return arch === 'arm64' ? 'windows-arm64' : `windows-${arch}`
  }
  if (process.platform === 'darwin') {
    return arch === 'arm64' ? 'mac-os-arm64' : 'mac-os'
  }
  if (arch === 'x86') return 'linux-i386'
  return `linux-${arch}`
}

function javaExePath(javaHome) {
  if (!javaHome) return null
  if (process.platform === 'win32') return path.join(javaHome, 'bin', 'javaw.exe')
  return path.join(javaHome, 'bin', 'java')
}

function safeExists(p) { try { return !!p && fs.existsSync(p) } catch { return false } }

/* ─────────────────────────── http helpers ─────────────────────────── */

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    if (typeof url !== 'string' || !url) return reject(new Error('Invalid URL'))
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { headers: { 'User-Agent': 'XForge/0.1' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return httpsGetJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON from ${url}`)) }
      })
    })
    req.on('error', reject)
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    if (typeof url !== 'string' || !url) return reject(new Error('Invalid URL'))
    const client = url.startsWith('https') ? https : http
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const cleanup = () => { try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch {} }

    const doReq = (u) => {
      const req = client.get(u, { headers: { 'User-Agent': 'XForge/0.1' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doReq(res.headers.location)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${u}`))

        const total = parseInt(res.headers['content-length'] || '0', 10)
        let downloaded = 0
        const out = fs.createWriteStream(destPath)
        res.on('data', (chunk) => {
          downloaded += chunk.length
          try { onProgress?.({ downloaded, total }) } catch {}
        })
        res.pipe(out)
        out.on('finish', () => resolve(destPath))
        out.on('error', (err) => { cleanup(); reject(err) })
        res.on('error', (err) => { cleanup(); reject(err) })
      })
      req.on('error', (err) => { cleanup(); reject(err) })
    }
    doReq(url)
  })
}

/* ─────────────────────────── distro listing ─────────────────────────── */

/**
 * Probe Mojang's all.json and return metadata for the 3 components.
 * No per-file URLs are resolved here — they live inside each manifest.
 */
async function fetchAllDistros() {
  const manifest = await httpsGetJson(JRE_MANIFEST_URL)
  const platform = mojangPlatform()
  const components = ['jre-legacy', 'java-runtime-gamma', 'java-runtime-delta', 'java-runtime-epsilon']
  const distros = []
  for (const component of components) {
    const entries = manifest?.[platform]?.[component]
    if (!Array.isArray(entries) || entries.length === 0) continue
    const first = entries[0]
    distros.push({
      component,
      majorVersion: javaMajorFor(component),
      version:      first?.version?.name || 'unknown',
      manifestUrl:  first?.manifest?.url || null,
      released:     first?.version?.released || null,
    })
  }
  return distros
}

/* ─────────────────────────── install ─────────────────────────── */

/**
 * Install a Mojang runtime by downloading every file listed in the component manifest.
 * Installs into <runtimesDir>/<component>-<major>-<version>/.
 *
 * @param {object} pkg - { component, majorVersion, version, manifestUrl }
 * @param {string} runtimesDir
 * @param {(p:object)=>void} [onProgress]
 * @returns {Promise<string>} absolute path to javaw.exe / java
 */
async function installDistro(pkg, runtimesDir, onProgress) {
  if (!pkg || typeof pkg !== 'object') throw new Error('Invalid package')
  if (typeof pkg.manifestUrl !== 'string' || !pkg.manifestUrl) {
    throw new Error('Package missing manifestUrl')
  }

  const versionName = (pkg.version || 'unknown').replace(/[\\/:*?"<>|]/g, '_')
  const component   = pkg.component
  const major       = pkg.majorVersion || javaMajorFor(component)
  const targetDir   = path.join(runtimesDir, `${component}-${major}-${versionName}`)
  const marker      = path.join(targetDir, '.installed')
  const exe         = javaExePath(targetDir)

  if (fs.existsSync(marker) && safeExists(exe)) {
    onProgress?.({ stage: 'done', component, cached: true, done: 1, total: 1 })
    return exe
  }

  // Wipe any half-installed dir
  if (fs.existsSync(targetDir)) {
    try { fs.rmSync(targetDir, { recursive: true, force: true }) } catch {}
  }
  fs.mkdirSync(targetDir, { recursive: true })

  onProgress?.({ stage: 'fetching-manifest', component, major })
  const manifest = await httpsGetJson(pkg.manifestUrl)
  const fileEntries = Object.entries(manifest?.files || {})
  if (fileEntries.length === 0) throw new Error('Empty manifest — bad URL or network issue')

  // Pre-create all directories
  for (const [filePath, fileData] of fileEntries) {
    if (fileData?.type === 'directory') {
      fs.mkdirSync(path.join(targetDir, filePath), { recursive: true })
    }
  }

  let done = 0
  const total = fileEntries.length
  let totalBytes = 0
  let downloadedBytes = 0

  for (const [filePath, fileData] of fileEntries) {
    if (!fileData || fileData.type !== 'file') {
      done++
      onProgress?.({ stage: 'downloading', component, major, done, total, file: filePath, percent: Math.round(done / total * 100) })
      continue
    }
    const raw = fileData.downloads?.raw
    if (!raw?.url) {
      done++
      onProgress?.({ stage: 'downloading', component, major, done, total, file: filePath, percent: Math.round(done / total * 100) })
      continue
    }

    const destPath = path.join(targetDir, filePath)
    const destDir  = path.dirname(destPath)

    // Zip-slip guard
    const rel = path.relative(targetDir, destPath)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Refusing to write outside target: ${filePath}`)
    }
    fs.mkdirSync(destDir, { recursive: true })

    // Skip if size matches (quick resume)
    if (safeExists(destPath)) {
      try {
        const stat = fs.statSync(destPath)
        if (raw.size && stat.size === raw.size) {
          downloadedBytes += stat.size
          done++
          onProgress?.({ stage: 'downloading', component, major, done, total, file: filePath, percent: Math.round(done / total * 100), downloaded: downloadedBytes, totalBytes })
          continue
        }
      } catch {}
    }

    const expectedBytes = raw.size || 0
    totalBytes += expectedBytes

    await downloadFile(raw.url, destPath, (p) => {
      onProgress?.({
        stage: 'downloading',
        component, major, done, total,
        file: filePath,
        percent: Math.round((done + (p.total > 0 ? p.downloaded / p.total : 0)) / total * 100),
        downloaded: downloadedBytes + p.downloaded,
        totalBytes: totalBytes + (expectedBytes - p.total) + p.total, // approx
      })
    })

    if (process.platform !== 'win32' && fileData.executable) {
      try { fs.chmodSync(destPath, 0o755) } catch {}
    }

    downloadedBytes += expectedBytes || 0
    done++
    onProgress?.({ stage: 'downloading', component, major, done, total, file: filePath, percent: Math.round(done / total * 100) })
  }

  if (!safeExists(exe)) {
    throw new Error(`Java executable not found after install at ${exe} — corrupt package`)
  }
  fs.writeFileSync(marker, new Date().toISOString())
  onProgress?.({ stage: 'done', component, major, done: total, total })
  return exe
}

/* ─────────────────────────── listing & resolution ─────────────────────────── */

function listInstalled(runtimesDir) {
  if (!fs.existsSync(runtimesDir)) return []
  const out = []
  for (const d of fs.readdirSync(runtimesDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    const full = path.join(runtimesDir, d.name)
    if (!fs.existsSync(path.join(full, '.installed'))) continue
    const exe = javaExePath(full)
    if (!safeExists(exe)) continue
    const m = d.name.match(/^(jre-legacy|java-runtime-gamma|java-runtime-delta|java-runtime-epsilon)-(\d+)-(.+)$/)
    out.push({
      component:    m ? m[1] : d.name,
      majorVersion: m ? parseInt(m[2], 10) : null,
      version:      m ? m[3] : '',
      home:         full,
      exe,
    })
  }
  return out
}

function findInstalledDir(runtimesDir, component, majorVersion) {
  return listInstalled(runtimesDir).find((d) => d.component === component && d.majorVersion === majorVersion) || null
}

function deleteDistro(homePath) {
  try {
    if (!homePath || !fs.existsSync(homePath)) return false
    fs.rmSync(homePath, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

function resolveJavaForVersion(gameVersion, runtimesDir, preferredComponent) {
  const wantComponent = preferredComponent || getJavaComponent(gameVersion)
  const wantMajor     = javaMajorFor(wantComponent)
  const installed     = listInstalled(runtimesDir)
  return installed.find((j) => j.component === wantComponent)
      || installed.find((j) => j.majorVersion === wantMajor)
      || null
}

/* ─────────────────────────── ipc registration ─────────────────────────── */

function register({ ipcMain, paths, getMainWindow }) {
  const { RUNTIMES_DIR } = paths

  ipcMain.handle('java:fetchDistros', async () => {
    try {
      const distros = await fetchAllDistros()
      return { ok: true, distros }
    } catch (ex) {
      return { ok: false, error: ex.message || String(ex), distros: [] }
    }
  })

  ipcMain.handle('java:getInstalled', () => ({ ok: true, installed: listInstalled(RUNTIMES_DIR) }))

  ipcMain.handle('java:install', async (_e, pkg) => {
    if (!pkg || typeof pkg !== 'object') return { error: 'Invalid package' }
    try {
      const win = getMainWindow()
      const exe = await installDistro(pkg, RUNTIMES_DIR, (p) => {
        if (win && !win.isDestroyed()) win.webContents.send('java:installProgress', p)
      })
      return { ok: true, exe }
    } catch (ex) {
      return { error: ex.message || String(ex) }
    }
  })

  ipcMain.handle('java:delete', (_e, component, majorVersion) => {
    if (typeof component !== 'string' || typeof majorVersion !== 'number') {
      return { ok: false, error: 'Invalid args' }
    }
    const found = findInstalledDir(RUNTIMES_DIR, component, majorVersion)
    if (!found) return { ok: false, error: 'Not installed' }
    return { ok: deleteDistro(found.home) }
  })

  ipcMain.handle('java:listAvailable', () => ({ ok: true, installed: listInstalled(RUNTIMES_DIR) }))

  ipcMain.handle('java:getForVersion', (_e, gameVersion, preferredComponent) => {
    if (typeof gameVersion !== 'string') return { ok: false, error: 'Invalid version' }
    const want   = { component: preferredComponent || getJavaComponent(gameVersion), major: javaMajorFor(preferredComponent || getJavaComponent(gameVersion)) }
    const found  = resolveJavaForVersion(gameVersion, RUNTIMES_DIR, preferredComponent)
    return { ok: true, want, found, recommended: !found }
  })
}

module.exports = {
  register,
  getJavaComponent,
  javaMajorFor,
  javaExePath,
  fetchAllDistros,
  installDistro,
  listInstalled,
  resolveJavaForVersion,
}