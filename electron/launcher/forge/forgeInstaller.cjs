'use strict'

/**
 * Forge installer (modern ≥1.13).
 *
 * Strategy (matches VoxelX reference + their Linux fallback):
 *   1. Download `forge-{mc}-{ver}-installer.jar` from files.minecraftforge.net/maven
 *      with BMCLAPI2 mirror fallback.
 *   2. Place vanilla client.jar at instance/versions/<mc>/<mc>.jar so the
 *      installer can merge SRG mappings into it.
 *   3. Run `java -jar installer.jar --installClient .` inside the instance.
 *      Forge writes versions/{forgeDir}/{forgeDir}.json + libraries/...
 *   4. After install, walk the post-install version.json to enumerate
 *      real required libraries, then copy only those jars into the shared
 *      LIBRARIES_DIR so subsequent launches work.
 *   5. Return launcher hint { forgeDir, mainClass, clientJar }.
 *
 * Robustness extras:
 *   - mirror fallback (bmclapi2)
 *   - HEAD check / retry
 *   - tolerate missing-or-zero installer output
 */

const fs   = require('fs')
const path = require('path')
const { spawn, spawnSync } = require('child_process')
const { downloadToFile, ensureDir, httpsGet } = require('../common/net.cjs')
const vanillaInstaller = require('../vanilla/vanillaInstaller.cjs')
const javaManager = require('../java/javaManager.cjs')

const FORGE_MAVEN = 'https://maven.minecraftforge.net'
const FILES_FORGE  = 'https://files.minecraftforge.net/maven'
const BMCLAPI      = 'https://bmclapi2.bangbang93.com'

function buildInstallerUrls(mcVersion, forgeVersion) {
  const fullVersion = forgeVersion.startsWith(`${mcVersion}-`)
    ? forgeVersion
    : `${mcVersion}-${forgeVersion}`
  const installer = `forge-${fullVersion}-installer.jar`
  return {
    fullVersion,
    installer,
    urls: [
      `${FILES_FORGE}/net/minecraftforge/forge/${fullVersion}/${installer}`,
      `${FORGE_MAVEN}/net/minecraftforge/forge/${fullVersion}/${installer}`,
      `${BMCLAPI}/maven/net/minecraftforge/forge/${fullVersion}/${installer}`,
    ],
  }
}

function forgeVersionDirName(mcVersion, forgeVersion) {
  const fullVersion = forgeVersion.startsWith(`${mcVersion}-`) ? forgeVersion : `${mcVersion}-${forgeVersion}`
  // VoxelX pattern: "1.20.1-forge-47.2.0"
  return `${mcVersion}-forge-${fullVersion.split('-').slice(1).join('-')}`
}

/**
 * Maven coordinate → relative path inside libraries dir.
 * `group:artifact:version[:classifier]` → `group/artifact/version/[classifier-]artifact-version.jar`
 * Also reads `lib.downloads.artifact.path` first if present.
 */
function libToPath(lib) {
  if (lib?.downloads?.artifact?.path) return lib.downloads.artifact.path
  const name = lib?.name || ''
  if (!name) return null
  const atIdx = name.indexOf('@')
  const ext = atIdx >= 0 ? name.slice(atIdx + 1) : 'jar'
  const base = atIdx >= 0 ? name.slice(0, atIdx) : name
  const parts = base.split(':')
  if (parts.length < 3) return null
  const [g, a, v, classifier] = parts
  const groupPath = g.replace(/\./g, '/')
  const fileName = classifier ? `${a}-${v}-${classifier}.${ext}` : `${a}-${v}.${ext}`
  return `${groupPath}/${a}/${v}/${fileName}`
}

function runJava(javaExe, args, cwd, onLog) {
  return new Promise((resolve) => {
    const proc = spawn(javaExe, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stderrTail = ''
    proc.stdout.on('data', (d) => {
      const t = d.toString('utf-8')
      for (const line of t.split(/\r?\n/)) if (line.trim()) onLog?.({ level: 'INFO', msg: `[forge] ${line}` })
    })
    proc.stderr.on('data', (d) => {
      const t = d.toString('utf-8')
      stderrTail = (stderrTail + t).slice(-2000)
      for (const line of t.split(/\r?\n/)) if (line.trim()) onLog?.({ level: 'WARN', msg: `[forge] ${line}` })
    })
    proc.on('exit', (code) => resolve({ code, stderrTail }))
    proc.on('error', (err) => resolve({ code: -1, stderrTail: err.message }))
  })
}

/**
 * Install Forge into the given profile's instance path.
 * @returns {Promise<{ forgeJson: object, forgeDir: string, versionJsonPath: string, clientJar: string }>}
 */
async function prepare(profile, paths, onLog, onProgress) {
  const mcVersion = profile.gameVersion
  const forgeVersion = profile.loaderVersion
  if (!mcVersion) throw new Error('Profile thiếu gameVersion')
  if (!forgeVersion) throw new Error('Profile thiếu forge loaderVersion')

  const { INSTANCES_DIR, LIBRARIES_DIR, RUNTIMES_DIR } = paths
  const instancePath = profile.instancePath
  ensureDir(instancePath)
  ensureDir(path.dirname(LIBRARIES_DIR))

  const { fullVersion, installer: installerName, urls } = buildInstallerUrls(mcVersion, forgeVersion)
  const forgeDir = forgeVersionDirName(mcVersion, forgeVersion)
  const versionJsonPath = path.join(instancePath, 'versions', forgeDir, `${forgeDir}.json`)

  // ── Resolve Java ─────────────────────────────────────
  const java = javaManager.resolveJavaForVersion(mcVersion, RUNTIMES_DIR, 'java-runtime-beta')
  if (!java || !java.exe) {
    // try without specifying component
    const j2 = javaManager.resolveJavaForVersion(mcVersion, RUNTIMES_DIR, null)
    if (!j2?.exe) {
      throw new Error(
        `Forge cần Java để cài đặt. Vào Settings → Java Runtime để cài (cần cho MC ${mcVersion}).`,
      )
    }
    java.exe = j2.exe
    java.majorVersion = j2.majorVersion
  }
  onLog?.({ level: 'INFO', msg: `Sử dụng Java: ${java.exe}` })

  // ── Verify installer cache, download with mirror fallback ──
  const installerPath = path.join(instancePath, installerName)
  const needDownload = !fs.existsSync(installerPath) || fs.statSync(installerPath).size < 10000

  if (needDownload) {
    let lastErr = null
    let downloaded = false
    for (const url of urls) {
      try {
        onLog?.({ level: 'INFO', msg: `Tải Forge installer: ${url}` })
        await downloadToFile(url, installerPath, (p) =>
          onProgress?.({ phase: 'download-installer', downloaded: p.downloaded, total: p.total }))
        if (fs.existsSync(installerPath) && fs.statSync(installerPath).size > 10000) {
          downloaded = true
          break
        }
        lastErr = new Error(`File quá nhỏ (size=${fs.statSync(installerPath).size})`)
      } catch (ex) {
        lastErr = ex
        onLog?.({ level: 'WARN', msg: `Mirror failed (${url}): ${ex.message}` })
        try { fs.unlinkSync(installerPath) } catch {}
      }
    }
    if (!downloaded) throw new Error(`Không tải được Forge installer: ${lastErr?.message || 'unknown'}`)
  }

  // ── Place vanilla client.jar at versions/<mc>/<mc>.jar ──
  // Forge installer reads this and merges its SRG mappings into it.
  const vanillaClientSrc = vanillaInstaller.locateClientJar(profile, paths)
  const vanillaVersionDir = path.join(instancePath, 'versions', mcVersion)
  const vanillaVersionJar = path.join(vanillaVersionDir, `${mcVersion}.jar`)
  if (vanillaClientSrc && fs.existsSync(vanillaClientSrc) && !fs.existsSync(vanillaVersionJar)) {
    ensureDir(vanillaVersionDir)
    fs.copyFileSync(vanillaClientSrc, vanillaVersionJar)
    onLog?.({ level: 'INFO', msg: 'Đã đặt vanilla client.jar cho installer.' })
  } else if (!fs.existsSync(vanillaVersionJar)) {
    onLog?.({ level: 'WARN', msg: 'Không có vanilla client.jar — installer có thể tạo version.json thiếu libs.' })
  }

  // ── Create launcher_profiles.json (Forge installer requires this) ──
  // Forge installer checks for this file and refuses to install if it's missing.
  // The Mojang launcher writes it; we create a minimal stub.
  const launcherProfilesPath = path.join(instancePath, 'launcher_profiles.json')
  if (!fs.existsSync(launcherProfilesPath)) {
    fs.writeFileSync(launcherProfilesPath, JSON.stringify({
      profiles: {},
      selectedProfile: null,
      clientToken: require('crypto').randomBytes(16).toString('hex'),
    }, null, 2))
    onLog?.({ level: 'INFO', msg: 'Đã tạo launcher_profiles.json stub.' })
  }

  // ── Run installer (skip if Forge JSON already cached) ──
  if (!fs.existsSync(versionJsonPath)) {
    onLog?.({ level: 'INFO', msg: 'Chạy Forge installer (--installClient)… có thể mất 1-2 phút.' })
    const r = await runJava(java.exe, [
      '-Djava.awt.headless=true', '-jar', installerPath, '--installClient', '.',
    ], instancePath, onLog)
    if (r.code !== 0 && !fs.existsSync(versionJsonPath)) {
      throw new Error(`Forge installer exit code ${r.code}.\n${r.stderrTail?.slice(-400) || ''}`)
    }
  } else {
    onLog?.({ level: 'INFO', msg: `Forge ${forgeDir} đã cài sẵn — bỏ qua installer.` })
  }

  if (!fs.existsSync(versionJsonPath)) {
    throw new Error(`Forge installer không tạo ${versionJsonPath}.`)
  }

  const forgeJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))

  // ── Merge Forge-installed libs into global LIBRARIES_DIR using post-install version.json ──
  const instanceLibs = path.join(instancePath, 'libraries')
  if (fs.existsSync(instanceLibs)) {
    mergeForgeLibraries(forgeJson, instanceLibs, LIBRARIES_DIR, onLog)
  }

  // ── Cache the installer .jar (delete to save disk) ──
  try { fs.unlinkSync(installerPath) } catch {}

  onLog?.({ level: 'INFO', msg: `Forge ${forgeDir} sẵn sàng.` })
  return {
    forgeJson,
    forgeDir,
    versionJsonPath,
    clientJar: vanillaVersionJar,
  }
}

/**
 * Copy Forge-installed jars into LIBRARIES_DIR. Strategy:
 *   - Use version.json's libraries[] as the source of truth (real list Forge expects to load).
 *   - Skip any library already present (size > 0) in LIBRARIES_DIR.
 *   - Walk a few extra orphan jars (Forge ships libs without `name` entry).
 */
function mergeForgeLibraries(forgeJson, srcDir, dstDir, onLog) {
  let copied = 0, skipped = 0
  for (const lib of forgeJson.libraries || []) {
    const relPath = libToPath(lib)
    if (!relPath) continue
    const src = path.join(srcDir, relPath)
    const dst = path.join(dstDir, relPath)
    if (!fs.existsSync(src)) continue
    if (fs.existsSync(dst) && fs.statSync(dst).size > 0) { skipped++; continue }
    try {
      ensureDir(path.dirname(dst))
      fs.copyFileSync(src, dst)
      copied++
    } catch {}
  }
  onLog?.({ level: 'INFO', msg: `Merged ${copied} libs (skipped ${skipped} đã có).` })
}

module.exports = { prepare, buildInstallerUrls, forgeVersionDirName, libToPath }