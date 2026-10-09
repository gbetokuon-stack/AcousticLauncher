'use strict'

const DiscordRPC = require('discord-rpc')

const CLIENT_ID = '1532141524635226343'

let client = null
let connected = false
let retryTimer = null
let intentionalDisconnect = false

const DEFAULT_ACTIVITY = {
  details: 'AcousticForge Client',
  state: 'Đang ở menu chính',
  largeImageKey: 'voxelx_logo',
  largeImageText: 'AcousticForge — Minecraft Client',
  instance: false,
}

let currentActivity = { ...DEFAULT_ACTIVITY }

async function connect() {
  intentionalDisconnect = false
  if (CLIENT_ID === 'YOUR_DISCORD_CLIENT_ID') {
    console.log('[Discord RPC] CLIENT_ID not configured — skipping')
    return
  }

  try {
    DiscordRPC.register(CLIENT_ID)
    client = new DiscordRPC.Client({ transport: 'ipc' })

    client.on('ready', () => {
      connected = true
      console.log('[Discord RPC] Connected as', client.user?.username)
      setActivity(currentActivity)
    })

    client.on('disconnected', () => {
      connected = false
      console.log('[Discord RPC] Disconnected')
      if (!intentionalDisconnect) scheduleRetry()
    })

    await client.login({ clientId: CLIENT_ID })
  } catch (err) {
    console.warn('[Discord RPC] Connect failed:', err.message)
    connected = false
    scheduleRetry()
  }
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    connect()
  }, 15000)
}

function setActivity(activity = {}) {
  const isPlaying = !!activity.isPlaying

  currentActivity = {
    ...DEFAULT_ACTIVITY,
    ...activity,
  }

  delete currentActivity.isPlaying

  if (isPlaying) {
    currentActivity.startTimestamp = activity.startTimestamp || Date.now()
  } else {
    delete currentActivity.startTimestamp
  }

  if (!connected || !client) return

  client.setActivity(currentActivity).catch(err => {
    console.warn('[Discord RPC] setActivity failed:', err.message)
  })
}

function disconnect() {
  intentionalDisconnect = true
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  if (client) {
    try { client.destroy() } catch { }
    client = null
    connected = false
  }
}

const PRESETS = {
  menu: () => setActivity({
    details: 'AcousticForge Client',
    state: 'Đang ở Trang chủ',
  }),
  browsing: (page) => {
    const pageNames = {
      home: 'Trang chủ',
      play: 'Khởi chạy game',
      profiles: 'Quản lý bản cài',
      mods: 'Quản lý Mods',
      accounts: 'Tài khoản & Skin',
      settings: 'Cấu hình hệ thống',
    }
    const name = pageNames[page] || page
    setActivity({
      details: 'AcousticForge Client',
      state: `Đang ở tab: ${name}`,
    })
  },
  launching: (version) => setActivity({
    details: `Đang khởi chạy Minecraft ${version}`,
    state: 'Chuẩn bị vào game...',
    isPlaying: true,
  }),
  playing: (version, profileName, username, loader, startTimestamp) => setActivity({
    details: `Đang chơi Minecraft ${version}`,
    state: `${profileName} · ${username}`,
    largeImageKey: 'voxelx_logo',
    largeImageText: profileName || 'AcousticForge Client',
    smallImageKey: loader || 'vanilla',
    smallImageText: loader ? (loader.charAt(0).toUpperCase() + loader.slice(1)) : 'Vanilla',
    isPlaying: true,
    startTimestamp: startTimestamp || Date.now(),
  }),
}

module.exports = { connect, disconnect, setActivity, PRESETS }
