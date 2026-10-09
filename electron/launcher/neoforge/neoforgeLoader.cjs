/**
 * XForge — Minecraft Launcher
 * NeoForge Loader installer & resolver.
 */

'use strict'

const https  = require('https')
const http   = require('http')
const fs     = require('fs')
const path   = require('path')
const { spawnSync } = require('child_process')

const NEOFORGE_MAVEN = 'https://maven.neoforged.net/releases'

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client  = url.startsWith('https') ? https : http
    const dir     = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'

    const req = client.get(url, { headers: { 'User-Agent': 'XForge/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', () => {
        try { fs.renameSync(tmpPath, destPath) } catch {
          fs.copyFileSync(tmpPath, destPath)
          try { fs.unlinkSync(tmpPath) } catch {}
        }
        resolve()
      })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
      res.on('error',  err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
    })
    req.on('error', reject)
  })
}

function mavenToPath(coord) {
  if (!coord) return null
  const atIdx = coord.indexOf('@')
  const ext   = atIdx >= 0 ? coord.slice(atIdx + 1) : 'jar'
  const base  = atIdx >= 0 ? coord.slice(0, atIdx)  : coord
  const parts = base.split(':')
  if (parts.length < 3) return null
  const [group, artifact, version, classifier] = parts
  const groupPath = group.replace(/\./g, '/')
  const fileName  = classifier
    ? `${artifact}-${version}-${classifier}.${ext}`
    : `${artifact}-${version}.${ext}`
  return `${groupPath}/${artifact}/${version}/${fileName}`
}

function resolveJvmArgs(rawArgs, librariesDir, versionName) {
  if (!Array.isArray(rawArgs)) return []
  const sep = process.platform === 'win32' ? ';' : ':'

  const libDirFwd = librariesDir.replace(/\\/g, '/')
  const result = []
  for (const arg of rawArgs) {
    if (typeof arg === 'string') {
      result.push(
        arg
          .replace(/\$\{library_directory\}/g, libDirFwd)
          .replace(/\$\{classpath_separator\}/g, sep)
          .replace(/\$\{version_name\}/g, versionName)
      )
      continue
    }
    if (arg && typeof arg === 'object' && arg.value) {
      let allowed = true
      if (Array.isArray(arg.rules)) {
        allowed = arg.rules.every(rule => {
          if (rule.action !== 'allow') return false
          if (rule.os) {
            const osName = process.platform === 'win32' ? 'windows'
              : process.platform === 'darwin' ? 'osx' : 'linux'
            return rule.os.name === osName
          }
          return true
        })
      }
      if (!allowed) continue
      const values = Array.isArray(arg.value) ? arg.value : [arg.value]
      for (const v of values) {
        if (typeof v === 'string') result.push(
          v
            .replace(/\$\{library_directory\}/g, libDirFwd)
            .replace(/\$\{classpath_separator\}/g, sep)
            .replace(/\$\{version_name\}/g, versionName)
        )
      }
    }
  }
  return result
}

async function setupNeoForge(mcVersion, neoVersion, librariesDir, clientJar, javaPath, instanceRoot, onProgress) {
  const installerName = `neoforge-${neoVersion}-installer.jar`
  const installerDir  = path.join(librariesDir, 'net', 'neoforged', 'neoforge', neoVersion)
  const installerPath = path.join(installerDir, installerName)
  const installerUrl  = `${NEOFORGE_MAVEN}/net/neoforged/neoforge/${neoVersion}/${installerName}`

  if (!fs.existsSync(installerDir)) fs.mkdirSync(installerDir, { recursive: true })

  if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
    onProgress?.({ phase: 'neoforge_download', log: `Đang tải NeoForge ${neoVersion} installer...`, done: 0, total: 1 })
    try {
      await downloadFile(installerUrl, installerPath)
      if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
        throw new Error('File tải về bị trống')
      }
    } catch (e) {
      try { fs.unlinkSync(installerPath) } catch {}
      throw new Error(`Tải NeoForge installer thất bại: ${e.message}`)
    }
    onProgress?.({ phase: 'neoforge_download', log: 'Đã tải xong NeoForge installer.', done: 1, total: 1 })
  } else {
    onProgress?.({ phase: 'neoforge_download', log: 'NeoForge installer đã được lưu đệm.', done: 1, total: 1 })
  }

  const vanillaVersionDir = path.join(instanceRoot, 'versions', mcVersion)
  const vanillaJarDest    = path.join(vanillaVersionDir, `${mcVersion}.jar`)
  if (!fs.existsSync(vanillaJarDest) && clientJar && fs.existsSync(clientJar)) {
    if (!fs.existsSync(vanillaVersionDir)) fs.mkdirSync(vanillaVersionDir, { recursive: true })
    fs.copyFileSync(clientJar, vanillaJarDest)
    onProgress?.({ phase: 'neoforge_install', log: 'Đã sao chép vanilla client.jar cho installer.' })
  }

  const versionId       = `neoforge-${neoVersion}`
  const versionDir      = path.join(instanceRoot, 'versions', versionId)
  const versionJsonPath = path.join(versionDir, `${versionId}.json`)

  if (!fs.existsSync(versionJsonPath)) {
    // NeoForge installer requires a mock launcher_profiles.json file to exist in the target instance directory
    const launcherProfilesPath = path.join(instanceRoot, 'launcher_profiles.json')
    if (!fs.existsSync(launcherProfilesPath)) {
      if (!fs.existsSync(instanceRoot)) fs.mkdirSync(instanceRoot, { recursive: true })
      fs.writeFileSync(launcherProfilesPath, JSON.stringify({
        profiles: {},
        selectedProfile: null,
        clientToken: 'XForge',
        authenticationDatabase: {},
        launcherVersion: { name: '2.0.0', format: 21 },
      }, null, 2))
    }

    onProgress?.({ phase: 'neoforge_install', log: 'Đang chạy trình cài đặt NeoForge (quá trình này có thể mất 1-2 phút)...', done: 0, total: 1 })

    const result = spawnSync(
      javaPath,
      [
        '-Djava.awt.headless=true',
        '-jar', installerPath,
        '--installClient', instanceRoot,
      ],
      {
        cwd:       instanceRoot,
        stdio:     ['ignore', 'pipe', 'pipe'],
        timeout:   600_000,
        maxBuffer: 64 * 1024 * 1024,
      }
    )

    const allOutput = ((result.stdout?.toString() || '') + '\n' + (result.stderr?.toString() || ''))
      .split('\n').filter(Boolean)
    for (const line of allOutput) {
      onProgress?.({ phase: 'neoforge_install', log: `[Installer] ${line}` })
    }

    if (result.error) throw new Error(`NeoForge installer thất bại: ${result.error.message}`)
    if (result.status !== 0 && !fs.existsSync(versionJsonPath)) {
      const errDetail = (result.stderr?.toString() || result.stdout?.toString() || '').slice(-500)
      throw new Error(`NeoForge installer thoát với mã code ${result.status}.\nChi tiết:\n${errDetail}`)
    }

    onProgress?.({ phase: 'neoforge_install', log: 'Cài đặt NeoForge hoàn tất.', done: 1, total: 1 })
  } else {
    onProgress?.({ phase: 'neoforge_install', log: 'NeoForge đã được cài đặt từ trước, bỏ qua trình cài đặt.', done: 1, total: 1 })
  }

  if (!fs.existsSync(versionJsonPath)) {
    throw new Error(`Không tìm thấy file NeoForge version JSON sau khi cài đặt: ${versionJsonPath}`)
  }

  const neoProfile = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))
  const mainClass = neoProfile.mainClass
  if (!mainClass) throw new Error('NeoForge version JSON bị thiếu mainClass')

  const instLibDir     = path.join(instanceRoot, 'libraries')
  const extraLibraries = []

  for (const lib of (neoProfile.libraries || [])) {
    const relPath = lib.downloads?.artifact?.path || mavenToPath(lib.name)
    if (!relPath) continue

    const instPath   = path.join(instLibDir, relPath)
    const sharedPath = path.join(librariesDir, relPath)

    if (fs.existsSync(instPath) && fs.statSync(instPath).size > 0) {
      extraLibraries.push(instPath)
    } else if (fs.existsSync(sharedPath) && fs.statSync(sharedPath).size > 0) {
      extraLibraries.push(sharedPath)
    }
  }

  const effectiveLibDir = fs.existsSync(instLibDir) ? instLibDir : librariesDir
  const versionName = neoProfile.id || `neoforge-${neoVersion}`
  const jvmArgs = resolveJvmArgs(neoProfile.arguments?.jvm || [], effectiveLibDir, versionName)

  const gameArgs = Array.isArray(neoProfile.arguments?.game)
    ? neoProfile.arguments.game.filter(a => typeof a === 'string')
    : []

  onProgress?.({ phase: 'neoforge_ready', log: `NeoForge ${neoVersion} sẵn sàng. MainClass: ${mainClass}`, done: 1, total: 1 })

  return {
    mainClass,
    extraLibraries,
    jvmArgs,
    gameArgs,
    shimJar:              null,
    customClientJar:      null,
    needsVanillaClasspath: true,
  }
}

module.exports = { setupNeoForge }
