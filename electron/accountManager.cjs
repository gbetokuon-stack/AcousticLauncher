'use strict'

const fs = require('fs')
const path = require('path')

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
}

function readAccounts(file) {
  try {
    if (!fs.existsSync(file)) return { accounts: [], selectedAccountId: null }
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    if (!Array.isArray(data.accounts)) data.accounts = []
    return data
  } catch {
    return { accounts: [], selectedAccountId: null }
  }
}

function writeAccounts(file, data) {
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, file)
}

function sanitize(acc) {
  if (!acc) return null
  // Strip secrets before sending to renderer
  const { msAccessToken, msRefreshToken, mcAccessToken, mcTokenExpiry, ...safe } = acc
  return safe
}

function register({ ipcMain, files }) {
  const { ACCOUNTS_FILE } = files

  ipcMain.handle('accounts:get', () => {
    const data = readAccounts(ACCOUNTS_FILE)
    return {
      accounts: data.accounts.map(sanitize).filter(Boolean),
      selectedId: data.selectedAccountId,
      selectedAccountId: data.selectedAccountId,
    }
  })

  ipcMain.handle('accounts:add', (_e, account) => {
    if (!account || typeof account !== 'object') return { error: 'Dữ liệu không hợp lệ' }
    const data = readAccounts(ACCOUNTS_FILE)
    const exists = data.accounts.find((a) => {
      if (account.type === 'discord' && a.type === 'discord') {
        return a.discordId === account.discordId || a.username === account.username
      }
      return a.username === account.username && a.type === account.type
    })
    if (exists) return { error: 'Tài khoản đã tồn tại' }

    data.accounts.push(account)
    if (!data.selectedAccountId) data.selectedAccountId = account.id
    writeAccounts(ACCOUNTS_FILE, data)
    
    return {
      ok: true,
      data: {
        accounts: data.accounts.map(sanitize).filter(Boolean),
        selectedId: data.selectedAccountId,
        selectedAccountId: data.selectedAccountId,
      }
    }
  })

  ipcMain.handle('accounts:update', (_e, { id, patch }) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    if (!patch || typeof patch !== 'object') return { error: 'Dữ liệu không hợp lệ' }
    const data = readAccounts(ACCOUNTS_FILE)
    const idx = data.accounts.findIndex((a) => a.id === id)
    if (idx === -1) return { error: 'Tài khoản không tồn tại' }

    const ALLOWED_PATCH_KEYS = [
      'discordId', 'discordUsername', 'discordGlobalName',
      'discordDiscriminator', 'discordAvatarUrl', 'linkedAt'
    ]
    for (const key of ALLOWED_PATCH_KEYS) {
      if (key in patch) data.accounts[idx][key] = patch[key]
    }
    writeAccounts(ACCOUNTS_FILE, data)

    return {
      ok: true,
      data: {
        accounts: data.accounts.map(sanitize).filter(Boolean),
        selectedId: data.selectedAccountId,
        selectedAccountId: data.selectedAccountId,
      }
    }
  })

  ipcMain.handle('accounts:remove', (_e, id) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readAccounts(ACCOUNTS_FILE)
    const before = data.accounts.length
    data.accounts = data.accounts.filter((a) => a.id !== id)
    if (data.accounts.length === before) return { error: 'Tài khoản không tồn tại' }
    if (data.selectedAccountId === id) {
      data.selectedAccountId = data.accounts[0]?.id ?? null
    }
    writeAccounts(ACCOUNTS_FILE, data)

    return {
      ok: true,
      data: {
        accounts: data.accounts.map(sanitize).filter(Boolean),
        selectedId: data.selectedAccountId,
        selectedAccountId: data.selectedAccountId,
      }
    }
  })

  ipcMain.handle('accounts:select', (_e, id) => {
    if (!isUuid(id)) return { error: 'ID không hợp lệ' }
    const data = readAccounts(ACCOUNTS_FILE)
    if (!data.accounts.find((a) => a.id === id)) return { error: 'Tài khoản không tồn tại' }
    data.selectedAccountId = id
    writeAccounts(ACCOUNTS_FILE, data)

    return {
      ok: true,
      data: {
        accounts: data.accounts.map(sanitize).filter(Boolean),
        selectedId: data.selectedAccountId,
        selectedAccountId: data.selectedAccountId,
      }
    }
  })

  // ── Skins IPC Handlers ────────────────────────────────────────────────────
  ipcMain.handle('skin:savePrefs', (_e, { uuid, skinUrl, capeUrl, elytraUrl, skinPreview, useCustomSkin }) => {
    if (!uuid || typeof uuid !== 'string') return { error: 'Invalid UUID' }
    try {
      const DATA_DIR = path.dirname(ACCOUNTS_FILE)
      const skinPrefsPath = path.join(DATA_DIR, 'skin_prefs.json')
      let prefs = {}
      if (fs.existsSync(skinPrefsPath)) {
        try { prefs = JSON.parse(fs.readFileSync(skinPrefsPath, 'utf-8')) } catch {}
      }
      const current = prefs[uuid] || {}
      prefs[uuid] = {
        skinUrl:     skinUrl !== undefined ? skinUrl : (current.skinUrl || null),
        capeUrl:     capeUrl !== undefined ? capeUrl : (current.capeUrl || null),
        elytraUrl:   elytraUrl !== undefined ? elytraUrl : (current.elytraUrl || null),
        skinPreview: skinPreview || current.skinPreview || null,
        useCustomSkin: useCustomSkin !== undefined ? useCustomSkin : (current.useCustomSkin !== undefined ? current.useCustomSkin : true),
        updatedAt:   new Date().toISOString(),
      }
      const tmp = skinPrefsPath + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(prefs, null, 2), { mode: 0o600 })
      fs.renameSync(tmp, skinPrefsPath)
      return { ok: true }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('skin:getPrefs', (_e, { uuid }) => {
    if (!uuid) return null
    try {
      const DATA_DIR = path.dirname(ACCOUNTS_FILE)
      const skinPrefsPath = path.join(DATA_DIR, 'skin_prefs.json')
      if (!fs.existsSync(skinPrefsPath)) return null
      const prefs = JSON.parse(fs.readFileSync(skinPrefsPath, 'utf-8'))
      return prefs[uuid] || null
    } catch {
      return null
    }
  })

  ipcMain.handle('skin:saveSkinLocalFile', (_e, { uuid, dataUrl, type }) => {
    if (!uuid || !dataUrl || !type) return { error: 'Missing params' }
    try {
      const DATA_DIR = path.dirname(ACCOUNTS_FILE)
      const SKIN_DIR = path.join(DATA_DIR, 'account_skins')
      const CAPE_DIR = path.join(DATA_DIR, 'account_capes')

      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buf = Buffer.from(base64, 'base64')
      const dir = type === 'cape' ? CAPE_DIR : SKIN_DIR
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const filePath = path.join(dir, `${uuid}.png`)
      const tmp = filePath + '.tmp'
      fs.writeFileSync(tmp, buf)
      fs.renameSync(tmp, filePath)
      return { ok: true }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('skin:getLocalStatus', (_e, { uuid }) => {
    if (!uuid) return null
    try {
      const DATA_DIR = path.dirname(ACCOUNTS_FILE)
      const SKIN_DIR = path.join(DATA_DIR, 'account_skins')
      const CAPE_DIR = path.join(DATA_DIR, 'account_capes')
      const skinFile = path.join(SKIN_DIR, `${uuid}.png`)
      const capeFile = path.join(CAPE_DIR, `${uuid}.png`)
      return {
        hasSkin: fs.existsSync(skinFile),
        hasCape: fs.existsSync(capeFile),
      }
    } catch { return null }
  })

  ipcMain.handle('skin:deleteLocalFile', (_e, { uuid, type }) => {
    if (!uuid || !type) return { error: 'Missing params' }
    try {
      const DATA_DIR = path.dirname(ACCOUNTS_FILE)
      const SKIN_DIR = path.join(DATA_DIR, 'account_skins')
      const CAPE_DIR = path.join(DATA_DIR, 'account_capes')
      const dir = type === 'cape' ? CAPE_DIR : SKIN_DIR
      const filePath = path.join(dir, `${uuid}.png`)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      return { ok: true }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('skin:uploadToWeb', async () => {
    return { error: 'Web API không khả dụng' }
  })
}

module.exports = { register }
