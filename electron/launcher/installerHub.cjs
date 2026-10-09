'use strict'

/**
 * Installer Hub — orchestrates full profile install.
 *
 * IPC exposed:
 *   installer:listLoaderVersions(loader, mcVersion)
 *   installer:listOptifineVersions(mcVersion)
 *   installer:prepareProfile(profileId)        (alias for prepareInstall)
 *   installer:prepareInstall(profileId)
 *
 * Behavior:
 *   1. Load profile from profiles.json.
 *   2. Always fetch vanilla metadata (assets/libraries/jars).
 *   3. Dispatch loader-specific installer:
 *      - vanilla  : vanillaInstaller.prepare (re-export)
 *      - forge    : forgeInstaller.prepare   (writes versions/{forgeDir}/*.json + libs)
 *      - fabric   : fabricInstaller.prepare  (writes versions/fabric-loader-<mc>-<ver>/<mc>.json)
 *      - optifine : optifineInstaller.prepare (drops jar into instance/mods/)
 *   4. Mark profile.installedAt = now via updateProfile.
 */

const fs   = require('fs')
const path = require('path')

const vanillaInstaller   = require('./vanilla/vanillaInstaller.cjs')
const forgeInstaller     = require('./forge/forgeInstaller.cjs')
const fabricInstaller    = require('./fabric/fabricInstaller.cjs')
const optifineInstaller  = require('./optifine/optifineInstaller.cjs')
const fabricMeta         = require('./fabric/fabricMeta.cjs')
const forgeVersions      = require('./forge/forgeVersions.cjs')

const javaManager        = require('./java/javaManager.cjs')

function sendProgress(getMainWindow, evt) {
  const win = getMainWindow?.()
  if (win && !win.isDestroyed()) {
    try { win.webContents.send('install:progress', { ts: Date.now(), ...evt }) } catch {}
  }
}

async function listLoaderVersions(loader, mcVersion) {
  try {
    if (loader === 'forge')  return { ok: true, versions: await forgeVersions.listVersions(mcVersion) }
    if (loader === 'fabric') return { ok: true, versions: await fabricMeta.listLoaders(mcVersion) }
    return { ok: false, error: `Loader "${loader}" không hỗ trợ list` }
  } catch (ex) {
    return { ok: false, error: ex.message || String(ex), versions: [] }
  }
}

async function listOptifineVersions(mcVersion) {
  try {
    return { ok: true, versions: await optifineInstaller.listVersions(mcVersion) }
  } catch (ex) {
    return { ok: false, error: ex.message || String(ex), versions: [] }
  }
}

/**
 * Orchestrator: install everything for a profile.
 * @param {object} profile
 * @param {object} paths { DATA_DIR, INSTANCES_DIR, ASSETS_DIR, LIBRARIES_DIR, RUNTIMES_DIR }
 * @param {function} getMainWindow
 */
async function prepareInstall(profile, paths, getMainWindow) {
  if (!profile) throw new Error('Profile không tồn tại')
  const sendLog = (l) => sendProgress(getMainWindow, { phase: 'log', profileId: profile.id, ...l })
  sendProgress(getMainWindow, { phase: 'start', profileId: profile.id, loader: profile.loader })

  // ── 1. Vanilla metadata + libraries + assets + jar ──
  let vanillaMeta
  try {
    vanillaMeta = await vanillaInstaller.getVersionMeta(profile.gameVersion, paths.DATA_DIR)
  } catch (ex) {
    throw new Error(`Không tải được metadata cho MC ${profile.gameVersion}: ${ex.message}`)
  }

  const vanillaPrep = await vanillaInstaller.prepare(profile, vanillaMeta, paths, sendLog,
    (p) => sendProgress(getMainWindow, { phase: 'progress', profileId: profile.id, ...p }))

  // ── 2. Loader-specific steps ────────────────────────
  if (profile.loader === 'forge') {
    const forge = await forgeInstaller.prepare(profile, paths, sendLog,
      (p) => sendProgress(getMainWindow, { phase: 'progress', profileId: profile.id, ...p }))
    sendLog({ level: 'INFO', msg: `Forge version dir: ${forge.forgeDir}` })
  } else if (profile.loader === 'fabric') {
    await fabricInstaller.prepare(profile, vanillaMeta, paths, sendLog,
      (p) => sendProgress(getMainWindow, { phase: 'progress', profileId: profile.id, ...p }))
    // Place vanilla client.jar at versions/<mc>/<mc>.jar so Fabric launcher can patch Mojang mappings
    vanillaInstaller.placeClientJarForLoader(profile, paths, vanillaMeta)
  } else if (profile.loader === 'neoforge') {
    const neoforgeLoader = require('./neoforge/neoforgeLoader.cjs')
    const java = javaManager.resolveJavaForVersion(profile.gameVersion, paths.RUNTIMES_DIR, null)
    const javaPath = java ? java.exe : 'java'
    await neoforgeLoader.setupNeoForge(
      profile.gameVersion,
      profile.loaderVersion,
      paths.LIBRARIES_DIR,
      vanillaPrep?.clientJar || path.join(paths.INSTANCES_DIR, '__runtime', profile.id, `${profile.id}-${profile.gameVersion}-client.jar`),
      javaPath,
      profile.instancePath,
      (p) => sendProgress(getMainWindow, { phase: 'progress', profileId: profile.id, ...p })
    )
  } else if (profile.loader === 'optifine') {
    await optifineInstaller.prepare(profile, paths, sendLog,
      (p) => sendProgress(getMainWindow, { phase: 'progress', profileId: profile.id, ...p }))
  }

  return { ok: true, vanillaPrep }
}

function register({ ipcMain, paths, readJson, atomicWriteJson, getMainWindow }) {
  const { DATA_DIR } = paths
  const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')

  function loadProfile(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const data = readJson(PROFILES_FILE, { profiles: [] })
    return data.profiles?.find((p) => p.id === id) || null
  }

  function markInstalled(id) {
    const cur = readJson(PROFILES_FILE, { profiles: [] })
    const p = cur.profiles.find((x) => x.id === id)
    if (p) {
      p.installedAt = new Date().toISOString()
      atomicWriteJson(PROFILES_FILE, cur)
    }
  }

  ipcMain.handle('installer:listLoaderVersions', async (_e, loader, mcVersion) => {
    return listLoaderVersions(loader, mcVersion)
  })

  // Backward-compat: vanilla version list lives here now (moved out of vanillaRunner.cjs).
  ipcMain.handle('vanilla:listVersions', async () => {
    try {
      const versions = await vanillaInstaller.listVersions()
      return { ok: true, versions }
    } catch (ex) {
      return { ok: false, error: ex.message || String(ex), versions: [] }
    }
  })

  ipcMain.handle('installer:listOptifineVersions', async (_e, mcVersion) => {
    return listOptifineVersions(mcVersion)
  })

  ipcMain.handle('installer:prepareProfile', async (_e, id) => {
    return runPrepare(id)
  })

  ipcMain.handle('installer:prepareInstall', async (_e, id) => {
    return runPrepare(id)
  })

  async function runPrepare(id) {
    const profile = loadProfile(id)
    if (!profile) return { error: 'Profile không tồn tại' }
    try {
      await prepareInstall(profile, paths, getMainWindow)
      markInstalled(id)
      sendProgress(getMainWindow, { phase: 'done', profileId: id, loader: profile.loader })
      return { ok: true }
    } catch (ex) {
      sendProgress(getMainWindow, { phase: 'error', profileId: id, error: ex.message })
      return { error: ex.message || String(ex) }
    }
  }
}

module.exports = { register, prepareInstall, listLoaderVersions, listOptifineVersions }