'use strict'

const fs = require('fs')
const path = require('path')
const { pingMinecraftServer } = require('./launcher/minecraftServerPing.cjs')

const DEFAULT_SERVERS = [
  {
    id: 'hypixel',
    name: 'Hypixel Network',
    address: 'mc.hypixel.net',
    port: 25565,
    tag: 'Minigames / SkyBlock',
    featured: true,
  },
  {
    id: 'heromc',
    name: 'HeroMC (Việt Nam)',
    address: 'heromc.net',
    port: 25565,
    tag: 'Survival / Towny',
    featured: true,
  },
  {
    id: 'aowvn',
    name: 'AowVN Network',
    address: 'play.aowvn.net',
    port: 25565,
    tag: 'Việt Nam Community',
    featured: true,
  },
  {
    id: '2b2t',
    name: '2b2t Anarchy',
    address: '2b2t.org',
    port: 25565,
    tag: 'Anarchy / Hardcore',
    featured: false,
  },
  {
    id: 'complex',
    name: 'Complex Gaming',
    address: 'play.mc-complex.com',
    port: 25565,
    tag: 'Pixelmon / Survival',
    featured: false,
  },
]

function readServers(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_SERVERS, null, 2), 'utf-8')
      return DEFAULT_SERVERS
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return Array.isArray(data) ? data : DEFAULT_SERVERS
  } catch {
    return DEFAULT_SERVERS
  }
}

function writeServers(filePath, data) {
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

function register({ ipcMain, files }) {
  const { DATA_DIR } = files
  const SERVERS_FILE = path.join(DATA_DIR, 'servers.json')

  ipcMain.handle('servers:get', () => {
    return readServers(SERVERS_FILE)
  })

  ipcMain.handle('servers:add', (_e, server) => {
    if (!server || !server.address) return { error: 'Địa chỉ máy chủ không hợp lệ' }
    const list = readServers(SERVERS_FILE)
    const newServer = {
      id: server.id || 'srv_' + Date.now().toString(36),
      name: server.name || server.address,
      address: server.address.trim(),
      port: parseInt(server.port, 10) || 25565,
      tag: server.tag || 'Custom Server',
      featured: false,
    }
    list.push(newServer)
    writeServers(SERVERS_FILE, list)
    return { ok: true, server: newServer }
  })

  ipcMain.handle('servers:update', (_e, { id, patch }) => {
    const list = readServers(SERVERS_FILE)
    const idx = list.findIndex(s => s.id === id)
    if (idx < 0) return { error: 'Không tìm thấy máy chủ' }
    list[idx] = { ...list[idx], ...patch }
    writeServers(SERVERS_FILE, list)
    return { ok: true, server: list[idx] }
  })

  ipcMain.handle('servers:delete', (_e, id) => {
    let list = readServers(SERVERS_FILE)
    list = list.filter(s => s.id !== id)
    writeServers(SERVERS_FILE, list)
    return { ok: true }
  })

  ipcMain.handle('servers:ping', async (_e, { address, port = 25565, timeout = 4000 }) => {
    return await pingMinecraftServer(address, port, timeout)
  })

  ipcMain.handle('servers:pingAll', async (_e, servers) => {
    const targetList = Array.isArray(servers) ? servers : readServers(SERVERS_FILE)
    const pingPromises = targetList.map(async (s) => {
      const res = await pingMinecraftServer(s.address, s.port || 25565, 3500)
      return { id: s.id, ...res }
    })
    return await Promise.all(pingPromises)
  })

  ipcMain.handle('servers:resetDefaults', () => {
    writeServers(SERVERS_FILE, DEFAULT_SERVERS)
    return DEFAULT_SERVERS
  })
}

module.exports = { register }
