'use strict'

/**
 * Split a multi-line JVM arguments string into individual argv elements.
 *
 * Rules:
 *  - Lines starting with `#` (after trim) are comments and ignored.
 *  - Blank lines are ignored.
 *  - Quoted strings preserve inner spaces: `-Dfoo="a b"` is one element.
 *  - Otherwise tokens are split on whitespace.
 *  - Backslash escapes work inside double quotes.
 */
function parseJvmArgsString(text) {
  if (!text || typeof text !== 'string') return []
  const out = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    let buf = ''
    let quote = null
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quote) {
        if (ch === '\\' && i + 1 < line.length) { buf += line[++i]; continue }
        if (ch === quote) { quote = null; continue }
        buf += ch
      } else {
        if (ch === '"' || ch === "'") { quote = ch; continue }
        if (/\s/.test(ch)) {
          if (buf.length) { out.push(buf); buf = '' }
          continue
        }
        buf += ch
      }
    }
    if (buf.length) out.push(buf)
  }
  return out
}

module.exports = { parseJvmArgsString }

/**
 * Game launcher: builds the JVM args for vanilla, Forge, Fabric, OptiFine.
 *
 * Design:
 *   - Vanilla:  classpath = [client.jar, ...ALL libs] → mainClass = net.minecraft.client.main.Main
 *   - Forge:    classpath = [client.jar, ...libs] → mainClass = BootstrapLauncher
 *   - Fabric:    classpath = [loader.jar, ...[vanilla libs ∪ loader libs]] → mainClass = KnotClient
 *   - OptiFine: vanilla-style + OptiFine.jar in mods/.
 *
 * Windows ENAMETOOLONG: when classpath > ~18 KB, args are written to a
 * Java 9+ @argument-file so the OS cmdline stays under the ~32 KB limit.
 */

const fs   = require('fs')
const path = require('path')
const os   = require('os')
const { spawn } = require('child_process')

const vanillaInstaller = require('./vanilla/vanillaInstaller.cjs')
const forgeInstaller   = require('./forge/forgeInstaller.cjs')
const fabricInstaller  = require('./fabric/fabricInstaller.cjs')
const javaManager      = require('./java/javaManager.cjs')
const rpc              = require('../discordRPC.cjs')

let activeProc = null
let _perfCoresCache = null
let currentPhase = 'idle'   // tracked so the renderer can resync on reload
let currentRunningProfileId = null

// ── Authlib-Injector & Local Skin Server ──
const { createServer } = require('./localYggdrasilServer.cjs')
const activeAuthlibServers = new Map()

function stopAuthlibServer(gameKey) {
  const entry = activeAuthlibServers.get(gameKey)
  if (entry) {
    try { entry.server.close() } catch {}
    activeAuthlibServers.delete(gameKey)
  }
}

async function ensureAuthlibInjector(authlibJarPath) {
  if (fs.existsSync(authlibJarPath)) {
    const stat = fs.statSync(authlibJarPath)
    if (stat.size > 10000) return authlibJarPath
    fs.unlinkSync(authlibJarPath)
  }
  const url = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.7/authlib-injector-1.2.7.jar'
  const { createWriteStream } = require('fs')
  const { get } = require('https')
  const MAX_REDIRECTS = 5
  return new Promise((resolve, reject) => {
    const tmp = authlibJarPath + '.download'
    function download(currentUrl, redirectCount) {
      if (redirectCount > MAX_REDIRECTS) { reject(new Error('Too many redirects')); return }
      const file = createWriteStream(tmp)
      const cleanup = () => { try { file.close() } catch {} }
      get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400) {
          cleanup()
          const location = res.headers.location
          if (!location) { reject(new Error('Redirect with no Location')); return }
          download(location, redirectCount + 1)
          return
        }
        if (res.statusCode !== 200) { cleanup(); reject(new Error(`HTTP ${res.statusCode}`)); return }
        res.pipe(file)
        file.on('finish', () => {
          file.close(() => {
            const stat = fs.statSync(tmp)
            if (stat.size < 10000) { reject(new Error('Downloaded file too small')); return }
            fs.renameSync(tmp, authlibJarPath)
            resolve(authlibJarPath)
          })
        })
      }).on('error', (err) => { cleanup(); reject(err) })
    }
    download(url, 0)
  })
}

function startAuthlibServer(uuid, username, skinDir, capeDir, useCustomSkin) {
  const server = createServer({ skinDir, capeDir, isSkinEnabled: (u) => useCustomSkin !== false })
  return new Promise((resolve, reject) => {
    server.server.listen(0, '127.0.0.1', () => {
      const port = server.server.address().port
      server.registered.set(uuid, { username })
      resolve({ port, server: server.server })
    })
    server.server.on('error', reject)
  })
}

/* Detect the count of performance (P-) cores on the current CPU.
 *
 * Modern hybrid CPUs (Intel 12th gen+, Apple M-series, AMD Zen 5) have
 * both fast P-cores and slow E-cores. Java's scheduler doesn't know
 * about them, so the OS keeps moving the game's render thread onto an
 * E-core, which causes the micro-stutter users feel as lag.
 *
 * Strategy: macOS / Apple Silicon: all cores are P-cores. Linux reads
 * the topology sysfs (siblings list under cpu[0-9]+/topology) and
 * treats a CPU alone in its group as a P-core. Windows tries wmic
 * (deprecated) then falls back to PowerShell Get-CimInstance.
 *
 * Returns an array of unique CPU indices. Empty array means the
 * detection was inconclusive and we should not pin. */
function detectPerformanceCores() {
  if (_perfCoresCache !== null) return _perfCoresCache
  const result = []
  try {
    if (process.platform === 'darwin') {
      // Apple Silicon = all performance. Intel Macs are pre-hybrid or 2
      // core clusters — same total budget either way.
      result.push(...os.cpus().map((_, i) => i))
    } else if (process.platform === 'linux') {
      // Read topology: each core has siblings — CPUs that share a physical
      // core. A P-core lives alone; an E-core is grouped.
      const baseDir = '/sys/devices/system/cpu'
      if (fs.existsSync(baseDir)) {
        const ids = fs.readdirSync(baseDir).filter((d) => /^cpu\d+$/.test(d))
        const groups = new Map() // siblings → [ids]
        for (const id of ids) {
          try {
            const sib = fs.readFileSync(path.join(baseDir, id, 'topology', 'thread_siblings_list'), 'utf8').trim()
            // "0-3" or "0,4" or "0"
            const tokens = sib.includes('-')
              ? expandRange(sib)
              : sib.split(',').filter(Boolean)
            const key = [...tokens].sort((a, b) => +a - +b).join(',')
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(id)
          } catch { /* not present for some cpus */ }
        }
        // P-core groups have exactly one CPU
        for (const [, ids] of groups) {
          if (ids.length === 1) {
            const m = ids[0].match(/^cpu(\d+)$/)
            if (m) result.push(+m[1])
          }
        }
      }
    } else if (process.platform === 'win32') {
      // Best-effort: physical cores (NumberOfCores). wmic is deprecated on
      // newer Windows but still present; fall back to PowerShell CIM.
      const wmicOut = spawnSyncSafe('wmic', ['cpu', 'get', 'NumberOfCores,NumberOfLogicalProcessors', '/format:list'])
      const psOut    = wmicOut ? '' : spawnSyncSafe('powershell', [
        '-NoProfile', '-NonInteractive',
        '-Command', "(Get-CimInstance Win32_Processor | Select-Object NumberOfCores,NumberOfLogicalProcessors | Format-List | Out-String).Trim()",
      ])
      const raw = wmicOut || psOut
      if (raw) {
        let phys = 0, log = 0
        for (const line of raw.split(/\r?\n/)) {
          const m = line.match(/^\s*(NumberOfCores|NumberOfLogicalProcessors)\s*:\s*(\d+)/)
          if (m) {
            const v = parseInt(m[2], 10)
            if (m[1] === 'NumberOfCores') phys = v
            else if (m[1] === 'NumberOfLogicalProcessors') log = v
          }
        }
        if (phys && log && log > phys * 1.5) {
          // Hybrid: assume 2× hyperthreading on P-cores and 1× on E-cores.
          // Solve: P + E = phys, P*2 + E*1 = log  → P = log - phys
          const pCores = Math.max(1, log - phys)
          result.push(...range(0, pCores - 1))
        } else if (phys) {
          result.push(...range(0, phys - 1))
        }
      }
    }
  } catch { /* leave result empty */ }

  // Validate: must be at least 1 and not exceed reported cpus.
  if (result.length === 0) {
    _perfCoresCache = []
    return _perfCoresCache
  }
  const max = os.cpus().length
  _perfCoresCache = result.filter((i) => i >= 0 && i < max)
  return _perfCoresCache
}

function range(from, to) {
  const out = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

function expandRange(str) {
  // "0-3" → ["0","1","2","3"]; "0,4" → ["0","4"]; "5" → ["5"]
  return str.includes('-')
    ? range(+str.split('-')[0], +str.split('-')[1]).map(String)
    : str.split(',').filter(Boolean)
}

function spawnSyncSafe(cmd, args) {
  try {
    const out = require('child_process').spawnSync(cmd, args, { encoding: 'utf8', timeout: 1500 })
    return out.stdout || ''
  } catch { return '' }
}

/**
 * Read the major version of a Java executable (e.g. "17.0.9" → 17).
 * Uses `java -version` which writes to stderr; parses the version line.
 * Returns 0 if it can't determine.
 */
function detectJavaMajor(javaPath) {
  return new Promise((resolve) => {
    try {
      const p = spawn(javaPath || 'java', ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] })
      let buf = ''
      p.stderr.on('data', (d) => { buf += d.toString() })
      p.on('error', () => resolve(0))
      p.on('close', () => {
        const m = buf.match(/(?:java|openjdk) version "?(\d+)\.?/)
        resolve(m ? parseInt(m[1], 10) : 0)
      })
    } catch { resolve(0) }
  })
}

function killActive() {
  if (activeProc && !activeProc.killed) {
    try { activeProc.kill('SIGTERM') } catch {}
    setTimeout(() => {
      if (activeProc && !activeProc.killed) try { activeProc.kill('SIGKILL') } catch {}
    }, 2000)
  }
}

function classifyLog(line) {
  const l = line.toLowerCase()
  if (/^\[\d{2}:\d{2}:\d{2}\] \[.*(error|severe)\]/i.test(line)) return 'ERROR'
  if (/^\[\d{2}:\d{2}:\d{2}\] \[.*warn(ing)?\]/i.test(line))     return 'WARN'
  if (l.includes('error') || l.includes('exception')) return 'ERROR'
  if (l.includes('warn')) return 'WARN'
  return 'INFO'
}

function walkJars(dir, out) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkJars(full, out)
    else if (entry.isFile() && entry.name.endsWith('.jar')) out.push(full)
  }
}

function libRelPath(lib) {
  // 1. Explicit Maven coordinates path (standard Minecraft / Fabric / Quilt)
  const dlPath = lib?.downloads?.artifact?.path
  if (dlPath) return dlPath

  // 2. Fabric / Quilt style: "group:artifact:version" (may have classifier)
  const name = lib?.name || ''
  if (name) {
    const atIdx = name.indexOf('@')
    const ext = atIdx >= 0 ? name.slice(atIdx + 1) : 'jar'
    const base = atIdx >= 0 ? name.slice(0, atIdx) : name
    const parts = base.split(':')
    if (parts.length >= 3) {
      const [g, a, v] = parts
      const groupPath = g.replace(/\./g, '/')
      return `${groupPath}/${a}/${v}/${a}-${v}.${ext}`
    }
  }

  return null
}

function resolveLib(lib, LIBRARIES_DIR) {
  const rel = libRelPath(lib)
  if (!rel) return null
  const p = path.join(LIBRARIES_DIR, rel)
  return fs.existsSync(p) && fs.statSync(p).size > 0 ? p : null
}

function classpathFromLibraries(versionJson, LIBRARIES_DIR) {
  const parts = []
  const seen = new Set()
  for (const lib of versionJson?.libraries || []) {
    const p = resolveLib(lib, LIBRARIES_DIR)
    if (p && !seen.has(p)) { parts.push(p); seen.add(p) }
  }
  return parts
}

function substitutePlaceholders(s, vars) {
  if (typeof s !== 'string') return s
  return s.replace(/\$\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

function substituteGameArgs(args, vars) {
  if (!Array.isArray(args)) return []
  const out = []
  for (const arg of args) {
    if (typeof arg === 'string') {
      out.push(substitutePlaceholders(arg, vars))
    } else if (arg && typeof arg === 'object' && Array.isArray(arg.rules)) {
      const allowed = arg.rules.every((rule) => {
        if (rule.action === 'allow') {
          if (rule.os && rule.os.name) {
            const osName = vars._os || 'linux'
            return rule.os.name === osName
          }
          if (rule.features) {
            return Object.entries(rule.features).every(([k, v]) => vars._features?.[k] === v)
          }
          return true
        }
        return false
      })
      if (!allowed) continue
      const value = arg.value
      const values = Array.isArray(value) ? value : [value]
      for (const v of values) {
        if (typeof v === 'string') out.push(substitutePlaceholders(v, vars))
      }
    }
  }
  return out
}

function getOS() {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'osx'
  return 'linux'
}

function ensureQuotedWindowsPath(p) {
  if (process.platform !== 'win32') return p
  return /\s/.test(p) ? `"${p}"` : p
}

/**
 * Build JVM + mainClass + game args.
 *
 * When `spec.classpath` > 18 KB (e.g. Fabric/Quilt with 100+ libs),
 * Java 9+ @argument-files bypass the ~32 KB Windows cmdline limit.
 *
 * @returns {string[]}  Spawn args array (either normal args, or ['@filepath'] for long classpath)
 */
function buildLaunchArgs(spec, profile, settings) {
  const ram = profile.ramGb || settings.ramGb || 4
  const ramMb  = Math.max(512, Math.floor(ram * 1024))
  const xmsMb  = Math.max(512, Math.min(Math.floor(ramMb / 2), 2048))
  const javaMajor = spec.javaMajor || 17

  // Parse profile-level JVM arguments. Each line becomes a separate argv
  // element. Empty lines and lines starting with `#` are treated as comments.
  const customJvmArgs = parseJvmArgsString(profile.jvmArgs)

  const nativesDir = spec.versionJson?.nativesDirectory || path.join(profile.instancePath, 'natives')
  const perfCores  = detectPerformanceCores()
  const coreJvmArgs = perfCores.length > 0
    ? [`-XX:ActiveProcessorCount=${perfCores.length}`]
    : []

  const baseArgs = [
    // Memory — use MB so the OS can give back a precise slice.
    `-Xmx${ramMb}m`,
    `-Xms${xmsMb}m`,

    // GC — Aikar's flags are the de-facto standard for modern Minecraft.
    // G1 is a hard requirement in modern MC anyway, but the tuning flags
    // cut pause times from ~50ms to ~5–10ms on a typical rig.
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1HeapRegionSize=8M',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1',
    ...(javaMajor >= 9 ? [
      '-XX:G1NewSizePercent=40',
      '-XX:G1MaxNewSizePercent=50',
    ] : []),
    ...(javaMajor >= 16 ? [
      '--add-opens=java.base/java.lang=ALL-UNNAMED',
      '--add-opens=java.base/java.lang.invoke=ALL-UNNAMED',
      '--add-opens=java.base/java.lang.reflect=ALL-UNNAMED',
      '--add-opens=java.base/java.io=ALL-UNNAMED',
      '--add-opens=java.base/java.net=ALL-UNNAMED',
      '--add-opens=java.base/java.nio=ALL-UNNAMED',
      '--add-opens=java.base/java.util=ALL-UNNAMED',
      '--add-opens=java.base/java.util.jar=ALL-UNNAMED',
      '--add-opens=java.base/sun.nio.ch=ALL-UNNAMED',
      '--add-opens=java.base/java.text=ALL-UNNAMED',
      '--add-opens=java.desktop/java.awt.font=ALL-UNNAMED',
      '--add-exports=java.base/sun.security.util=ALL-UNNAMED',
      '--add-exports=java.base/jdk.internal.misc=ALL-UNNAMED',
      '--add-opens=java.base/jdk.internal.loader=ALL-UNNAMED',
    ] : []),

    // Pin to physical (P-core) CPUs on hybrid CPUs — halves frame times
    // when the game thread gets moved off an E-core by the scheduler.
    ...coreJvmArgs,

    // LWJGL tuning — every flag is "free" perf, no behavioural change.
    `-Dorg.lwjgl.library.path=${nativesDir}`,
    `-Dorg.lwjgl.librarypath=${nativesDir}`,
    '-Dorg.lwjgl.util.NoChecks=true',
    '-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=false',
    '-Dorg.lwjgl.opengl.Display.enableHighDPI=true',
    '-Dorg.lwjgl.system.allocator=system',

    // Disable JUL logging: console handler does an allocation per log line
    // and shows up as a non-trivial chunk of GC pressure.
    '-Djava.util.logging.config.file=',

    // Standard sane defaults
    '-Dfile.encoding=UTF-8',
    '-Dstdout.encoding=UTF-8',
    '-Dstderr.encoding=UTF-8',
    '-Djava.awt.headless=false',
    '-Djava.library.path=' + nativesDir,
    '-Dminecraft.launcher.brand=AcousticForge',
    '-Dminecraft.launcher.version=1.0.0',

    ...customJvmArgs,
    ...spec.javaArgs,
  ]

  // Use @argument-file when classpath is long (>14 KB) so the OS cmdline stays short.
  // On Windows the cmdline limit is ~32 KB; classpath + base args can exceed that.
  if (spec.classpath && spec.classpath.length > 14000) {
    // Write all args to a Java @argument-file so the OS cmdline stays short.
    // File content: each LINE = one argv element.
    const argFile = path.join(profile.instancePath, '.acousticforge_args')
    const allArgs = [...baseArgs]
    // Keep classpath and main class on the line before game args.
    // Do NOT insert '--' — jopt-simple in ForgeBootstrap.main() sees every
    // line as an argv element and treats '--' as an invalid option name.
    allArgs.push('-cp', spec.classpath, spec.mainClass, ...spec.gameArgs)
    fs.writeFileSync(argFile, allArgs.join('\n'), 'utf-8')
    return [`@${argFile}`]
  }

  // Short classpath path: use normal command line.
  return [...baseArgs, '-cp', spec.classpath, spec.mainClass, ...spec.gameArgs]
}

// ── resolveLaunchSpec ────────────────────────────────────────────────────────

async function resolveLaunchSpec(profile, paths, account, mcToken) {
  const { LIBRARIES_DIR, INSTANCES_DIR } = paths
  const workDir = path.join(INSTANCES_DIR, '__runtime', profile.id)

  const instLibDir = path.join(profile.instancePath, 'libraries')
  const effectiveLibDir = fs.existsSync(instLibDir) ? instLibDir : LIBRARIES_DIR

  const vanillaMeta = await vanillaInstaller.getVersionMeta(profile.gameVersion, paths.DATA_DIR)
  const assetIndexId = vanillaMeta.assetIndex?.id
  const versionName = vanillaMeta.id

  // Game-Java mapping for MC ≥ 1.13. Newer MC JSONs ship javaVersion.majorVersion;
  // we fall back to the documented table so old manifests still get tuned flags.
  const JAVA_FOR_MC = {
    '1.21': 21, '1.20': 17, '1.19': 17, '1.18': 17, '1.17': 16,
    '1.16':  8, '1.15':  8, '1.14':  8, '1.13':  8, '1.12':  8,
  }
  const mcMajor = (profile.gameVersion.match(/^(\d+)\.(\d+)/) || []).slice(1, 3).join('.')
  const specJavaMajor =
    Number(vanillaMeta?.javaVersion?.majorVersion) ||
    JAVA_FOR_MC[mcMajor] ||
    17

  const vars = {
    _os: getOS(),
    _features: { is_demo_user: false, has_custom_resolution: false },
    auth_player_name: account.username,
    auth_uuid: account.uuid,
    auth_access_token: mcToken || '0',
    auth_xuid: '0',
    user_type: mcToken && mcToken !== '0' ? 'msa' : 'legacy',
    version_name: versionName,
    version_type: vanillaMeta.type || 'release',
    clientid: '',
    game_directory: profile.instancePath,
    assets_root: paths.ASSETS_DIR,
    assets_index_name: assetIndexId,
    natives_directory: path.join(profile.instancePath, 'natives'),
    library_directory: effectiveLibDir.replace(/\\/g, '/'),
    library_path: effectiveLibDir.replace(/\\/g, '/'),
    classpath_separator: path.delimiter,
    launcher_name: 'AcousticForge',
    launcher_version: '1.0.0',
    resolution_width: '1280',
    resolution_height: '720',
  }

  const isBootstrapMainClass = (mc) => typeof mc === 'string' && (
    mc.includes('bootstraplauncher') ||
    mc.includes('KnotClient') ||
    mc.includes('KnotServer')
  )

  // ── VANILLA ───────────────────────────────────────────────────────────────
  if (profile.loader === 'vanilla') {
    // Game-version-aware jar name (matches vanillaInstaller.prepare).
    const jarName = `${profile.id}-${profile.gameVersion}-client.jar`
    const legacyJar = path.join(workDir, `${profile.id}-client.jar`)
    const clientJar = fs.existsSync(path.join(workDir, jarName))
      ? path.join(workDir, jarName)
      : legacyJar
    if (!fs.existsSync(clientJar)) {
      throw new Error('Chưa chuẩn bị vanilla. Bấm "Cài đặt" trước.')
    }
    const libs = classpathFromLibraries(vanillaMeta, LIBRARIES_DIR)
    const classpath = [clientJar, ...libs].join(path.delimiter)
    vars.classpath = classpath
    const gameArgs = Array.isArray(vanillaMeta.arguments?.game)
      ? substituteGameArgs(vanillaMeta.arguments.game, vars)
      : (vanillaMeta.minecraftArguments || '').split(' ').filter(Boolean).map((a) => substitutePlaceholders(a, vars))
    return {
      mainClass: vanillaMeta.mainClass || 'net.minecraft.client.main.Main',
      classpath,
      gameArgs,
      javaArgs: [],
      assetsDir: paths.ASSETS_DIR,
      assetIndex: assetIndexId,
      jarPath: clientJar,
      versionJson: vanillaMeta,
      javaMajor: specJavaMajor,
    }
  }

  // ── FORGE / NEOFORGE ──────────────────────────────────────────────────────
  if (profile.loader === 'forge' || profile.loader === 'neoforge') {
    if (!profile.loaderVersion) throw new Error(`${profile.loader === 'neoforge' ? 'NeoForge' : 'Forge'} profile thiếu loaderVersion`)
    
    let forgeDir = ''
    if (profile.loader === 'neoforge') {
      const versionsDir = path.join(profile.instancePath, 'versions')
      if (fs.existsSync(versionsDir)) {
        const folders = fs.readdirSync(versionsDir)
        forgeDir = folders.find(f => f.toLowerCase().includes('neoforge')) || ''
      }
      if (!forgeDir) {
        forgeDir = `neoforge-${profile.loaderVersion}`
      }
    } else {
      forgeDir = forgeInstaller.forgeVersionDirName(profile.gameVersion, profile.loaderVersion)
    }

    const versionJsonPath = path.join(profile.instancePath, 'versions', forgeDir, `${forgeDir}.json`)
    if (!fs.existsSync(versionJsonPath)) {
      throw new Error(`Chưa cài ${profile.loader === 'neoforge' ? 'NeoForge' : 'Forge'} cho profile này. Bấm "Cài đặt" trước.`)
    }
    const forgeJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))

    const inheritsFrom = forgeJson.inheritsFrom || profile.gameVersion
    const vanillaMetaPath = path.join(profile.instancePath, 'versions', inheritsFrom, `${inheritsFrom}.json`)
    let effectiveVanilla = vanillaMeta
    if (fs.existsSync(vanillaMetaPath)) {
      try { effectiveVanilla = JSON.parse(fs.readFileSync(vanillaMetaPath, 'utf-8')) } catch {}
    }

    const allLibs = []
    const seen = new Set()
    for (const lib of (effectiveVanilla.libraries || [])) {
      const key = lib.name || lib.downloads?.artifact?.path
      if (!key || seen.has(key)) continue
      seen.add(key); allLibs.push(lib)
    }
    for (const lib of (forgeJson.libraries || [])) {
      const key = lib.name || lib.downloads?.artifact?.path
      if (!key) continue
      seen.add(key); allLibs.push(lib)
    }

    const vanillaClientJar = path.join(profile.instancePath, 'versions', inheritsFrom, `${inheritsFrom}.jar`)
    const clientJar = fs.existsSync(vanillaClientJar)
      ? vanillaClientJar
      : vanillaInstaller.locateClientJar(profile, paths)
    if (!clientJar) {
      throw new Error('Không tìm thấy vanilla client.jar (cần cho Forge).')
    }

    const libPaths = []
    const libSeen = new Set()
    for (const lib of allLibs) {
      const p = resolveLib(lib, effectiveLibDir) || resolveLib(lib, LIBRARIES_DIR)
      if (p && !libSeen.has(p)) { libPaths.push(p); libSeen.add(p) }
    }
    const classpath = [clientJar, ...libPaths].join(path.delimiter)
    vars.classpath = classpath
    vars.version_name = forgeJson.id || forgeDir

    // ── Resolve Forge JVM / game args ─────────────────────────────────────
    // VoxelX approach: --accessToken/--version go in GAME args (after main class).
    // ForgeBootstrap parses ALL args via jopt-simple, including game args.
    // needsVanillaCP = true: filter vanilla JAR from classpath; Forge adds it via --cp.
    const needsVanillaCP = true
    const sep = path.delimiter

    const forgeJvmArgs = []
    const rawForgeJvm = forgeJson.arguments?.jvm || []
    for (const j of rawForgeJvm) {
      if (typeof j === 'string') {
        forgeJvmArgs.push(substitutePlaceholders(j, vars))
      } else if (j && typeof j === 'object' && Array.isArray(j.rules)) {
        const allowed = j.rules.every((rule) => {
          if (rule.action !== 'allow') return false
          const osName = vars._os
          if (rule.os && rule.os.name) return rule.os.name === osName
          return true
        })
        if (!allowed) continue
        const values = Array.isArray(j.value) ? j.value : [j.value]
        for (const v of values) {
          if (typeof v === 'string') forgeJvmArgs.push(substitutePlaceholders(v, vars))
        }
      }
    }

    // Build classpath: filter out vanilla JAR if needed
    let forgeClasspath = classpath
    if (needsVanillaCP) {
      const normalized = (clientJar.replace(/\\/g, '/') + path.delimiter + libPaths.join(path.delimiter))
        .split(path.delimiter)
        .map((p) => p.replace(/\\/g, '/').toLowerCase())
      const vanillaIdx = normalized.findIndex(
        (p) => p.endsWith(`/${profile.gameVersion}.jar`) || p.endsWith(`/${profile.gameVersion}-client.jar`),
      )
      if (vanillaIdx >= 0) {
        const allPaths = [clientJar, ...libPaths]
        allPaths.splice(vanillaIdx, 1)
        forgeClasspath = allPaths.join(sep)
      }
    }

    // Game args: forge arguments.game + substituted vanilla game args.
    // This is where --accessToken, --version go for ForgeBootstrap.
    const forgeSpecificArgs = Array.isArray(forgeJson.arguments?.game)
      ? substituteGameArgs(forgeJson.arguments.game, vars).filter((a) => a && !a.startsWith('--classpath'))
      : []

    const vanillaGameArgs = Array.isArray(effectiveVanilla.arguments?.game)
      ? substituteGameArgs(effectiveVanilla.arguments.game, vars)
      : (effectiveVanilla.minecraftArguments || '').split(' ').filter(Boolean).map((a) => substitutePlaceholders(a, vars))

    const gameArgKeys = new Set()
    for (const a of forgeSpecificArgs) {
      if (a.startsWith('--')) gameArgKeys.add(a.split('=')[0])
    }
    const dedupedVanilla = vanillaGameArgs.filter((a) => {
      if (!a.startsWith('--')) return true
      return !gameArgKeys.has(a.split('=')[0])
    })
    const forgeGameArgs = [...forgeSpecificArgs, ...dedupedVanilla]

    return {
      mainClass: forgeJson.mainClass || 'net.minecraftforge.bootstrap.ForgeBootstrap',
      classpath: forgeClasspath,
      gameArgs: forgeGameArgs,
      javaArgs: forgeJvmArgs,
      assetsDir: paths.ASSETS_DIR,
      assetIndex: forgeJson.assetIndex?.id || assetIndexId,
      jarPath: clientJar,
      versionJson: forgeJson,
      javaMajor: specJavaMajor,
    }
  }

  // ── FABRIC ────────────────────────────────────────────────────────────────
  if (profile.loader === 'fabric') {
    if (!profile.loaderVersion) throw new Error(`${profile.loader} profile thiếu loaderVersion`)
    const loaderDir = fabricInstaller.fabricVersionDirName(profile.gameVersion, profile.loaderVersion)
    const versionJsonPath = path.join(profile.instancePath, 'versions', loaderDir, `${profile.gameVersion}.json`)
    if (!fs.existsSync(versionJsonPath)) {
      throw new Error(`Chưa cài ${profile.loader} cho profile này. Bấm "Cài đặt" trước.`)
    }
    const loaderJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))

    const clientJar = path.join(profile.instancePath, 'versions', profile.gameVersion, `${profile.gameVersion}.jar`)
    const fallbackClient = vanillaInstaller.locateClientJar(profile, paths)
    const realClientJar = fs.existsSync(clientJar) ? clientJar : fallbackClient
    if (!realClientJar) {
      throw new Error('Không tìm thấy vanilla client.jar (cần cho Fabric/Quilt).')
    }

    const libPaths = classpathFromLibraries(loaderJson, LIBRARIES_DIR)
    const loaderJar = fabricInstaller.loaderJarPath(profile.loaderVersion, LIBRARIES_DIR)
    const allCp = loaderJar
      ? [loaderJar, realClientJar, ...libPaths]
      : [realClientJar, ...libPaths]
    const classpath = allCp.join(path.delimiter)

    // Fabric/Quilt KnotClient needs -cp on the CLI (not a bootstrap).
    const javaArgs = ['-cp', classpath]
    vars.classpath = classpath
    vars.version_name = loaderJson.id || profile.gameVersion

    const rawGameArgs = loaderJson.arguments?.game?.length
      ? loaderJson.arguments.game
      : vanillaMeta.arguments?.game
    const gameArgs = Array.isArray(rawGameArgs)
      ? substituteGameArgs(rawGameArgs, vars)
      : (vanillaMeta.minecraftArguments || '').split(' ').filter(Boolean).map((a) => substitutePlaceholders(a, vars))

    return {
      mainClass: loaderJson.mainClass,
      classpath,
      gameArgs,
      javaArgs,
      assetsDir: paths.ASSETS_DIR,
      assetIndex: loaderJson.assetIndex?.id || assetIndexId,
      jarPath: realClientJar,
      versionJson: loaderJson,
      javaMajor: specJavaMajor,
    }
  }

  // ── OPTIFINE ─────────────────────────────────────────────────────────────
  if (profile.loader === 'optifine') {
    // OptiFine HD-U H9+ ships as a Forge mod only; running it as a
    // standalone vanilla loader fails with LinkageError. Tell the user
    // to recreate this profile as Forge + OptiFine instead.
    throw new Error(
      'OptiFine H9+ chỉ chạy qua Forge. Hãy xóa profile OptiFine này và ' +
      'tạo lại bằng loader Forge, sau đó bỏ OptiFine.jar vào thư mục mods/.',
    )
  }

  throw new Error(`Loader "${profile.loader}" chưa được hỗ trợ launch.`)
}

// ── startSpawn ─────────────────────────────────────────────────────────────

/**
 * Persist the `lastPlayed` timestamp on the profile so the UI can render
 * "Chơi lần cuối …". Called from the spawned process's `exit` handler.
 * Updates the profiles.json file directly to avoid bouncing through
 * profileManager's IPC and risking a race with concurrent edits.
 */
function markLastPlayed(profile, profilesFile, BrowserWindow) {
  try {
    if (!fs.existsSync(profilesFile)) return
    const data = JSON.parse(fs.readFileSync(profilesFile, 'utf-8'))
    const p = data.profiles?.find((x) => x.id === profile.id)
    if (!p) return
    p.lastPlayed = new Date().toISOString()
    fs.writeFileSync(profilesFile, JSON.stringify(data, null, 2), 'utf-8')
    const win = BrowserWindow?.getAllWindows?.()[0]
    if (win && !win.isDestroyed()) win.webContents.send('profiles:changed', { id: profile.id })
  } catch (e) {
    console.warn('[markLastPlayed] failed:', e?.message)
  }
}

async function startSpawn(profile, paths, { getMainWindow, account, mcToken, settings, options = {} }, profilesFile) {
  const win = getMainWindow()
  let gameStartedAt = null
  
  const sendLog = (line) => { if (win && !win.isDestroyed()) win.webContents.send('launch:log', line) }
  const sendState = (state) => {
    if (state?.phase) {
      currentPhase = state.phase
      if (state.phase === 'idle') {
        currentRunningProfileId = null
      } else {
        currentRunningProfileId = profile.id
      }

      // Update Discord RPC if enabled
      if (settings?.discordRPC !== false) {
        try {
          if (state.phase === 'launching') {
            rpc.PRESETS.launching(profile.gameVersion)
          } else if (state.phase === 'running') {
            if (!gameStartedAt) {
              gameStartedAt = Date.now()
            }
            rpc.PRESETS.playing(profile.gameVersion, profile.name, account?.username || 'Player', profile.loader, gameStartedAt)
          }
        } catch (err) {
          console.warn('[Discord RPC] failed to set activity:', err.message)
        }
      }
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send('launch:state', { ...state, profileId: currentRunningProfileId })
    }
  }

  // Vanilla, Forge: use the Java component matching the game version.
  // Fabric (0.19.3+) supports Java 21+ and 26.2 ships as Java 25, so Fabric
  // profiles on 26.2 work fine with the version-matched Java.
  const java = javaManager.resolveJavaForVersion(profile.gameVersion, paths.RUNTIMES_DIR, null)
  if (!java || !java.exe) {
    const need = javaManager.getJavaComponent(profile.gameVersion)
    sendLog({ level: 'ERROR', msg: `Chưa có Java cho ${profile.gameVersion} (cần ${need}). Vào Settings → Java để cài.` })
    sendState({ phase: 'idle' })
    return
  }
  sendLog({ level: 'INFO', msg: `Java runtime: ${java.exe} (${java.component}, major ${java.majorVersion})` })

  let spec
  try {
    spec = await resolveLaunchSpec(profile, paths, account, mcToken)
  } catch (ex) {
    const isMissingFiles = ex.message.includes('Chưa cài') || ex.message.includes('Không tìm thấy') || ex.message.includes('Chưa chuẩn bị')
    if (isMissingFiles) {
      sendLog({ level: 'WARN', msg: `Phát hiện thiếu tài nguyên game (${ex.message}). Bắt đầu tự động tải và cài đặt…` })
      sendState({ phase: 'preparing' })
      try {
        const installerHub = require('./installerHub.cjs')
        await installerHub.prepareInstall(profile, paths, getMainWindow)
        
        // Send done progress event to clear installation UI state on frontend
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          win.webContents.send('install:progress', {
            ts: Date.now(),
            phase: 'done',
            profileId: profile.id,
            loader: profile.loader
          })
        }

        sendLog({ level: 'INFO', msg: 'Tự động tải và cài đặt game thành công! Đang khởi chạy game…' })
        spec = await resolveLaunchSpec(profile, paths, account, mcToken)
      } catch (installErr) {
        sendLog({ level: 'ERROR', msg: `Tự động tải game thất bại: ${installErr.message}` })
        sendState({ phase: 'idle' })
        return
      }
    } else {
      sendLog({ level: 'ERROR', msg: `Không thể chuẩn bị launch spec: ${ex.message}` })
      sendState({ phase: 'idle' })
      return
    }
  }

  // ── Authlib-Injector for offline skin/cape ──
  const AUTHLIB_JAR = path.join(paths.DATA_DIR, 'authlib-injector.jar')
  const SKIN_DIR = path.join(paths.DATA_DIR, 'account_skins')
  const CAPE_DIR = path.join(paths.DATA_DIR, 'account_capes')
  let authlibServerPort = null
  const gameKey = `${profile.id}::${account.id}`

  if (account.type === 'offline' || account.type === 'discord') {
    const skinFile = path.join(SKIN_DIR, `${account.uuid}.png`)
    const capeFile = path.join(CAPE_DIR, `${account.uuid}.png`)

    let useCustomSkin = true
    try {
      const skinPrefsPath = path.join(paths.DATA_DIR, 'skin_prefs.json')
      if (fs.existsSync(skinPrefsPath)) {
        const prefs = JSON.parse(fs.readFileSync(skinPrefsPath, 'utf-8'))
        if (prefs[account.uuid] && prefs[account.uuid].useCustomSkin === false) {
          useCustomSkin = false
        }
      }
    } catch (e) {
      sendLog({ level: 'WARN', msg: `Lỗi đọc skin preferences: ${e.message}` })
    }

    const hasSkin = useCustomSkin && fs.existsSync(skinFile)
    const hasCape = fs.existsSync(capeFile)

    if (hasSkin || hasCape) {
      try {
        sendLog({ level: 'INFO', msg: 'Khởi động máy chủ skin cục bộ...' })
        const jar = await ensureAuthlibInjector(AUTHLIB_JAR)
        const authlibServer = await startAuthlibServer(account.uuid, account.username, SKIN_DIR, CAPE_DIR, useCustomSkin)
        authlibServerPort = authlibServer.port
        activeAuthlibServers.set(gameKey, authlibServer)
        spec.javaArgs.push(`-javaagent:${jar}=http://127.0.0.1:${authlibServerPort}`)
        sendLog({ level: 'INFO', msg: `Skin server hoạt động tại cổng ${authlibServerPort}` })
      } catch (aiErr) {
        sendLog({ level: 'WARN', msg: `Thiết lập skin cục bộ thất bại: ${aiErr.message}. Tiếp tục khởi chạy game.` })
      }
    }
  }

  // Direct server auto-join if requested
  if (options?.server?.address) {
    sendLog({ level: 'INFO', msg: `Tự động kết nối máy chủ: ${options.server.address}:${options.server.port || 25565}` })
    spec.gameArgs.push('--server', options.server.address)
    if (options.server.port) {
      spec.gameArgs.push('--port', String(options.server.port))
    }
  }

  // Custom game resolution
  if (profile.customResolution?.width && profile.customResolution?.height) {
    spec.gameArgs.push('--width', String(profile.customResolution.width))
    spec.gameArgs.push('--height', String(profile.customResolution.height))
  }
  if (profile.fullscreen) {
    spec.gameArgs.push('--fullscreen')
  }

  const args = buildLaunchArgs(spec, profile, settings)

  const cpSummary = spec.classpath
    ? `${spec.classpath.split(path.delimiter).length} entries, ${spec.classpath.length} chars`
    : 'none'
  sendLog({ level: 'INFO', msg: `Khởi chạy: ${path.basename(java.exe)} ${args.slice(0, 4).join(' ')}${args.length > 4 ? ' …' : ''}` })
  sendLog({ level: 'INFO', msg: `MainClass: ${spec.mainClass}` })
  sendLog({ level: 'INFO', msg: `Classpath (${cpSummary})` })
  sendState({ phase: 'launching' })

  try {
    activeProc = spawn(java.exe, args, {
      cwd: profile.instancePath,
      env: process.env,
      windowsHide: true,
    })

    // Tell the UI the game process is now alive. The renderer shows the
    // "running" state and starts its elapsed-time ticker. If the spawn
    // itself failed, `error` fires below and we flip back to idle.
    sendState({ phase: 'running' })

    activeProc.stdout.on('data', (d) => {
      const text = d.toString('utf-8')
      for (const ln of text.split(/\r?\n/)) {
        if (ln.trim()) sendLog({ level: classifyLog(ln), msg: ln, raw: ln })
      }
    })
    activeProc.stderr.on('data', (d) => {
      const text = d.toString('utf-8')
      for (const ln of text.split(/\r?\n/)) {
        if (ln.trim()) sendLog({ level: classifyLog(ln), msg: ln, raw: ln })
      }
    })
    activeProc.on('exit', (code, signal) => {
      sendLog({ level: code === 0 ? 'INFO' : 'WARN', msg: `Minecraft đã thoát (code=${code}, signal=${signal || 'none'}).` })
      markLastPlayed(profile, profilesFile, require('electron').BrowserWindow)
      sendState({ phase: 'idle' })
      activeProc = null
      stopAuthlibServer(gameKey)
    })
    activeProc.on('error', (err) => {
      sendLog({ level: 'ERROR', msg: `Không thể khởi chạy Java: ${err.message}` })
      sendState({ phase: 'idle' })
      activeProc = null
      stopAuthlibServer(gameKey)
    })
  } catch (ex) {
    sendLog({ level: 'ERROR', msg: `Lỗi: ${ex.message}` })
    sendState({ phase: 'idle' })
    stopAuthlibServer(gameKey)
  }
}

// ── IPC register ────────────────────────────────────────────────────────────

function register({ ipcMain, paths, getMainWindow }) {
  const { DATA_DIR } = paths
  const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json')
  const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
  const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')

  let launching = false

  ipcMain.handle('launch:start', async (_e, profileId, options = {}) => {
    if (launching) return { error: 'Đang chuẩn bị một lần khởi chạy khác' }
    launching = true
    try {
      if (!fs.existsSync(PROFILES_FILE)) return { error: 'profiles.json không tồn tại' }
      const profilesData = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'))
      const profile = profilesData.profiles?.find((p) => p.id === profileId)
      if (!profile) return { error: 'Profile không tồn tại' }

      const accountsData = fs.existsSync(ACCOUNTS_FILE)
        ? JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'))
        : { accounts: [], selectedAccountId: null }
      const account = accountsData.accounts?.find((a) => a.id === accountsData.selectedAccountId)
      if (!account) return { error: 'Chưa chọn tài khoản để chơi' }

      const settings = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) : {}

      let mcToken = account.mcAccessToken
      const accountType = account.type || 'microsoft'
      if (accountType === 'microsoft') {
        if (!mcToken || !account.mcTokenExpiry || Date.now() > account.mcTokenExpiry - 5 * 60 * 1000) {
          const win = getMainWindow()
          const sendLog = (line) => { if (win && !win.isDestroyed()) win.webContents.send('launch:log', line) }
          sendLog({ level: 'INFO', msg: 'Làm mới Minecraft access token…' })
          try {
            if (!account.msRefreshToken) throw new Error('Tài khoản không có refresh token — đăng nhập lại.')
            const { refreshMcToken } = require('../msAuth.cjs')
            const refreshed = await refreshMcToken(account.msRefreshToken)
            const aData = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'))
            const idx = aData.accounts.findIndex((a) => a.id === account.id)
            if (idx >= 0) {
              aData.accounts[idx] = { ...aData.accounts[idx], ...refreshed }
              fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(aData, null, 2))
            }
            mcToken = refreshed.mcAccessToken
            sendLog({ level: 'INFO', msg: 'Đã làm mới Minecraft token.' })
          } catch (ex) {
            return { error: `Refresh token thất bại: ${ex.message}` }
          }
        }
      } else {
        mcToken = mcToken || '0'
      }

      await startSpawn(profile, paths, { getMainWindow, account, mcToken, settings, options }, PROFILES_FILE)
      return { ok: true }
    } finally {
      launching = false
    }
  })

  ipcMain.handle('launch:kill', () => {
    killActive()
    return { ok: true }
  })

  ipcMain.handle('launch:getState', () => {
    return getState()
  })
}

const getState = () => ({ phase: currentPhase, profileId: currentRunningProfileId })

module.exports = { register, killActive, resolveLaunchSpec, getState }
