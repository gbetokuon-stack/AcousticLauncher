'use strict'

const https = require('https')
const crypto = require('crypto')
const fs = require('fs')
const { BrowserWindow } = require('electron')

// Microsoft / Xbox Live / Minecraft identifiers.
// CLIENT_ID is the well-known public Xbox app ID used by 3rd-party launchers.
// Auth flow: MS OAuth2 (authorization code) → XBL → XSTS → Minecraft access token.
const MS_CLIENT_ID    = '00000000402b5328'
const MS_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf'
const MS_SCOPE        = 'XboxLive.signin offline_access'
const MS_AUTH_URL     = 'https://login.live.com/oauth20_authorize.srf'
const MS_TOKEN_URL    = 'https://login.live.com/oauth20_token.srf'

function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function httpsPost(url, body, contentType) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
    const ctype   = contentType || (typeof body === 'string'
      ? 'application/x-www-form-urlencoded'
      : 'application/json')

    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   'POST',
      headers: {
        'Content-Type':   ctype,
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent':     'XForge/0.1',
        'Accept':         'application/json',
      },
    }, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'XForge/0.1', ...headers },
    }, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    }).on('error', reject)
  })
}

function encodeForm(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

/**
 * Open a small modal BrowserWindow that loads the Microsoft login page,
 * waits for the redirect to REDIRECT_URI with `?code=…`, and resolves the code.
 */
function openAuthWindow(parent) {
  return new Promise((resolve, reject) => {
    const state = crypto.randomBytes(16).toString('hex')

    const authUrl =
      `${MS_AUTH_URL}?client_id=${MS_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(MS_SCOPE)}` +
      `&state=${state}` +
      `&prompt=select_account`

    const win = new BrowserWindow({
      width: 520,
      height: 700,
      parent: parent || undefined,
      modal: !!parent,
      title: 'Đăng nhập Microsoft — AcousticForge',
      frame: true,
      resizable: false,
      backgroundColor: '#1a1a1a',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        partition: 'persist:xforge-msauth',
      },
    })

    win.setMenuBarVisibility(false)
    let done = false

    function onUrl(url) {
      if (!url.startsWith(MS_REDIRECT_URI)) return
      try {
        const u = new URL(url)
        const code = u.searchParams.get('code')
        const retState = u.searchParams.get('state')
        const err = u.searchParams.get('error')
        if (err) {
          done = true
          win.close()
          return reject(new Error(u.searchParams.get('error_description') || err))
        }
        if (code && retState === state) {
          done = true
          win.close()
          return resolve(code)
        }
      } catch {}
    }

    win.webContents.on('will-redirect', (_e, url) => onUrl(url))
    win.webContents.on('will-navigate', (_e, url) => onUrl(url))
    win.webContents.on('did-navigate', (_e, url) => onUrl(url))
    win.on('closed', () => {
      if (!done) reject(new Error('Người dùng đã đóng cửa sổ đăng nhập.'))
    })

    win.loadURL(authUrl)
  })
}

async function exchangeCodeForTokens(code) {
  const res = await httpsPost(MS_TOKEN_URL, encodeForm({
    client_id: MS_CLIENT_ID,
    code,
    grant_type: 'authorization_code',
    redirect_uri: MS_REDIRECT_URI,
    scope: MS_SCOPE,
  }))
  if (!res.body.access_token) {
    throw new Error(res.body.error_description || res.body.error || `Token exchange failed (${res.status})`)
  }
  return res.body
}

async function refreshAccessToken(refreshToken) {
  const res = await httpsPost(MS_TOKEN_URL, encodeForm({
    client_id: MS_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: MS_SCOPE,
  }))
  if (!res.body.access_token) {
    throw new Error(res.body.error_description || 'Refresh token thất bại')
  }
  return res.body
}

async function xblAuthenticate(msAccessToken) {
  const res = await httpsPost('https://user.auth.xboxlive.com/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName:   'user.auth.xboxlive.com',
      RpsTicket:  `d=${msAccessToken}`,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType:    'JWT',
  }, 'application/json')
  if (res.status !== 200) throw new Error(`XBL auth failed: ${res.status}`)
  const xblToken = res.body.Token
  const userHash = res.body.DisplayClaims?.xui?.[0]?.uhs
  if (!xblToken || !userHash) throw new Error('XBL response missing token/uhs')
  return { xblToken, userHash }
}

async function xstsAuthorize(xblToken) {
  const res = await httpsPost('https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: {
      SandboxId:  'RETAIL',
      UserTokens: [xblToken],
    },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType:    'JWT',
  }, 'application/json')

  if (res.status === 401) {
    const xerr = res.body?.XErr
    if (xerr === 2148916233) throw new Error('Tài khoản Microsoft chưa có Xbox Live. Hãy tạo tại xbox.com trước.')
    if (xerr === 2148916235) throw new Error('Xbox Live không khả dụng ở quốc gia của bạn.')
    if (xerr === 2148916238) throw new Error('Tài khoản trẻ em cần phụ huynh xác nhận trước.')
    throw new Error(`XSTS lỗi: ${xerr}`)
  }
  if (res.status !== 200) throw new Error(`XSTS auth failed: ${res.status}`)
  const xstsToken = res.body.Token
  const userHash  = res.body.DisplayClaims?.xui?.[0]?.uhs
  if (!xstsToken || !userHash) throw new Error('XSTS response missing token/uhs')
  return { xstsToken, userHash }
}

async function mcLoginWithXbox(xstsToken, userHash) {
  const res = await httpsPost('https://api.minecraftservices.com/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
  }, 'application/json')
  if (res.status !== 200) throw new Error(`Minecraft auth failed: ${res.status}`)
  const mcToken = res.body.access_token
  if (!mcToken) throw new Error('Không nhận được Minecraft access token')
  return { mcToken, expiresIn: res.body.expires_in || 86400 }
}

async function mcGetProfile(mcToken) {
  const res = await httpsGet('https://api.minecraftservices.com/minecraft/profile', {
    Authorization: `Bearer ${mcToken}`,
  })
  if (res.status === 404 || res.body?.error === 'NOT_FOUND') {
    throw new Error('Tài khoản này chưa mua Minecraft Java Edition.')
  }
  if (res.status !== 200) throw new Error(`Profile fetch failed: ${res.status}`)
  if (!res.body.id || !res.body.name) throw new Error('Profile response không hợp lệ')

  const raw  = res.body.id
  const uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
  return { uuid, username: res.body.name, skinUrl: res.body.skins?.[0]?.url || null }
}

/**
 * Refresh Microsoft access token using stored refresh token, then run the full
 * XBL → XSTS → Minecraft pipeline and return the new fields to persist.
 * Does NOT touch account `id` / `addedAt` / `uuid` / `username` / `skinUrl`.
 */
async function refreshMcToken(msRefreshToken) {
  const ms = await refreshMicrosoftAccessToken(msRefreshToken)
  const { xblToken }            = await xblAuthenticate(ms.access_token)
  const { xstsToken, userHash } = await xstsAuthorize(xblToken)
  const { mcToken, expiresIn }  = await mcLoginWithXbox(xstsToken, userHash)
  return {
    msAccessToken: ms.access_token,
    msRefreshToken: ms.refresh_token || msRefreshToken,
    mcAccessToken: mcToken,
    mcTokenExpiry: Date.now() + expiresIn * 1000,
  }
}

async function refreshMicrosoftAccessToken(refreshToken) {
  const res = await httpsPost(MS_TOKEN_URL, encodeForm({
    client_id:     MS_CLIENT_ID,
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    scope:         MS_SCOPE,
  }))
  if (!res.body.access_token) {
    throw new Error(res.body.error_description || res.body.error || 'Refresh token thất bại')
  }
  return res.body   // { access_token, refresh_token?, expires_in, ... }
}

/**
 * Full pipeline: MS OAuth → XBL → XSTS → MC token + profile.
 * Used only for the initial login (where we have a fresh authorization code).
 */
async function msToMc(msAccessToken, msRefreshToken) {
  if (!msAccessToken) throw new Error('msAccessToken is required')
  const { xblToken }                    = await xblAuthenticate(msAccessToken)
  const { xstsToken, userHash }         = await xstsAuthorize(xblToken)
  const { mcToken, expiresIn }          = await mcLoginWithXbox(xstsToken, userHash)
  const mcProfile                       = await mcGetProfile(mcToken)
  return {
    id: genUUID(),
    uuid: mcProfile.uuid,
    username: mcProfile.username,
    skinUrl: mcProfile.skinUrl,
    msRefreshToken,
    mcAccessToken:  mcToken,
    mcTokenExpiry:  Date.now() + expiresIn * 1000,
    addedAt:        new Date().toISOString(),
  }
}

function readAccounts(file) {
  if (!fs.existsSync(file)) return { accounts: [], selectedAccountId: null }
  try {
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

function findAccountById(file, id) {
  const data = readAccounts(file)
  return { data, account: data.accounts.find((a) => a.id === id) }
}

function register({ ipcMain, getMainWindow, files }) {
  const { ACCOUNTS_FILE } = files

  /**
   * Start full Microsoft login in a modal window.
   * Returns the freshly added account (id, uuid, username, skinUrl).
   */
  ipcMain.handle('ms:login', async () => {
    try {
      const code       = await openAuthWindow(getMainWindow())
      const msTokens   = await exchangeCodeForTokens(code)
      const account    = await msToMc(msTokens.access_token, msTokens.refresh_token)

      const data = readAccounts(ACCOUNTS_FILE)
      // Replace if UUID already exists
      data.accounts = data.accounts.filter((a) => a.uuid !== account.uuid)
      data.accounts.unshift(account)
      if (!data.selectedAccountId) data.selectedAccountId = account.id
      writeAccounts(ACCOUNTS_FILE, data)

      const { msAccessToken, msRefreshToken, mcAccessToken, mcTokenExpiry, addedAt, ...safe } = account
      return { ok: true, account: safe }
    } catch (ex) {
      return { error: ex.message || String(ex) }
    }
  })

  /**
   * Manually refresh MC token using stored refresh token.
   */
  ipcMain.handle('ms:refresh', async (_e, id) => {
    try {
      const { data, account } = findAccountById(ACCOUNTS_FILE, id)
      if (!account) return { error: 'Tài khoản không tồn tại' }
      if (!account.msRefreshToken) return { error: 'Tài khoản không có refresh token — hãy đăng nhập lại.' }

      // If existing MC token still valid for > 5 min, keep it
      if (account.mcTokenExpiry && Date.now() < account.mcTokenExpiry - 5 * 60 * 1000 && account.mcAccessToken) {
        return { ok: true, mcTokenExpiry: account.mcTokenExpiry }
      }

      const updated = await refreshMcToken(account.msRefreshToken)
      const idx = data.accounts.findIndex((a) => a.id === id)
      // Preserve id / addedAt / uuid / username / skinUrl — only refresh token fields
      data.accounts[idx] = {
        ...data.accounts[idx],
        ...updated,
      }
      writeAccounts(ACCOUNTS_FILE, data)
      return { ok: true, mcTokenExpiry: data.accounts[idx].mcTokenExpiry }
    } catch (ex) {
      return { error: ex.message || String(ex) }
    }
  })
}

module.exports = { register, refreshMcToken }
