'use strict'

const http = require('http')
const fs   = require('fs')
const path = require('path')

/**
 * Minimal local Yggdrasil server for serving custom skins & capes
 * to offline-mode Minecraft clients via Authlib-Injector.
 *
 * Authlib-Injector replaces the Mojang session server URL. The client
 * queries `https://sessionserver.mojang.com/session/minecraft/profile/{uuid}`,
 * which gets redirected to `http://127.0.0.1:PORT/session/minecraft/profile/{uuid}`.
 *
 * Endpoints:
 *   GET /                                                 — server metadata
 *   GET /minecraft/profile                                 — player profile
 *   GET /session/minecraft/profile/{uuid}                  — signed profile (Minecraft client)
 *   GET /textures/{uuid}?type=skin|cape                    — raw PNG bytes
 */

function createServer({ skinDir, capeDir, isSkinEnabled }) {
  const server = http.createServer()
  const registered = new Map() // uuid -> { username, skinBytes, capeBytes }

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')

    // ── Metadata ──
    if (pathname === '/' || pathname === '') {
      return respondJson(res, 200, {
        meta: {
          serverName: 'AcousticForge Skin Server',
          implementationName: 'AcousticForge',
          implementationVersion: '1.0.0',
          'feature.non_email_login': true,
          'feature.minecraft_user_api_service': true,
          'feature.yggdrasil_server_blacklist': false,
        },
        skinDomains: ['localhost', '127.0.0.1', '::1'],
        signaturePublickey: null,
      })
    }

    // ── Player profile (authlib-injector uses this) ──
    if (pathname === '/minecraft/profile') {
      let uuid = url.searchParams.get('uuid') || url.searchParams.get('id')
      if (!uuid) {
        const keys = Array.from(registered.keys())
        uuid = keys[0]
      }
      if (!uuid) return respondNoContent(res)
      try {
        const profile = buildProfile(uuid)
        if (!profile) return respondNoContent(res)
        return respondJson(res, 200, profile)
      } catch (err) {
        console.error('[YggdrasilServer] Error in /minecraft/profile:', err)
        return respondJson(res, 500, { error: err.message })
      }
    }

    // ── Session server profile (Minecraft client queries this) ──
    const sessionMatch = pathname.match(/^\/(?:sessionserver\/)?session\/minecraft\/profile\/([0-9a-fA-F-]+)$/)
    if (sessionMatch) {
      const uuid = sessionMatch[1]
      if (!uuid) return respondNoContent(res)
      try {
        const profile = buildProfile(uuid)
        if (!profile) return respondNoContent(res)
        return respondJson(res, 200, profile)
      } catch (err) {
        console.error('[YggdrasilServer] Error in session profile:', err)
        return respondJson(res, 500, { error: err.message })
      }
    }

    // ── Serve texture PNGs ──
    const texMatch = pathname.match(/^\/textures\/([0-9a-fA-F-]+)$/)
    if (texMatch) {
      const uuid = texMatch[1]
      const type = url.searchParams.get('type') || 'skin'
      const filePath = type === 'cape'
        ? path.join(capeDir, `${uuid}.png`)
        : path.join(skinDir, `${uuid}.png`)
      if (!fs.existsSync(filePath)) return respondJson(res, 404, { error: 'Texture not found' })
      const data = fs.readFileSync(filePath)
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': data.length,
        'Cache-Control': 'no-cache',
      })
      return res.end(data)
    }

    // ── Auth endpoints (stubs — authlib-injector may probe these) ──
    if (pathname === '/auth/validate' || pathname === '/auth/invalidate' || pathname === '/auth/signout') {
      return respondNoContent(res)
    }
    if (pathname.startsWith('/auth/')) {
      // Return minimal valid auth response for any other auth path
      return respondJson(res, 200, {
        user: { id: '0', properties: [] },
        clientToken: 'acousticforge',
        availableProfiles: [],
        selectedProfile: null,
      })
    }

    respondJson(res, 404, { error: 'Not found' })
  })

  let cachedPort = null
  function getPort() {
    if (cachedPort) return cachedPort
    try { cachedPort = server.address().port } catch {}
    return cachedPort || 0
  }

  function buildProfile(uuid) {
    const rawUuid = uuid.replace(/-/g, '')
    const dashUuid = rawUuid.length === 32
      ? `${rawUuid.slice(0,8)}-${rawUuid.slice(8,12)}-${rawUuid.slice(12,16)}-${rawUuid.slice(16,20)}-${rawUuid.slice(20)}`
      : uuid

    const skinFile = path.join(skinDir, `${dashUuid}.png`)
    const capeFile = path.join(capeDir, `${dashUuid}.png`)
    const hasSkin = (!isSkinEnabled || isSkinEnabled(dashUuid)) && fs.existsSync(skinFile)
    const hasCape = fs.existsSync(capeFile)

    if (!hasSkin && !hasCape) {
      console.error('[YggdrasilServer] No skin/cape for', dashUuid, 'files checked:', skinFile, capeFile)
      return null
    }

    const textures = {}
    const port = getPort()
    if (hasSkin) {
      textures.SKIN = { url: `http://127.0.0.1:${port}/textures/${dashUuid}?type=skin` }
    }
    if (hasCape) {
      textures.CAPE = { url: `http://127.0.0.1:${port}/textures/${dashUuid}?type=cape` }
    }

    const texturesPayload = {
      timestamp: Date.now(),
      profileId: rawUuid,
      profileName: registered.get(dashUuid)?.username || 'Player',
      textures,
    }

    const encoded = Buffer.from(JSON.stringify(texturesPayload)).toString('base64')
    const properties = [{ name: 'textures', value: encoded }]

    return {
      id: rawUuid,
      name: registered.get(dashUuid)?.username || 'Player',
      properties,
    }
  }

  function respondJson(res, status, data) {
    const body = JSON.stringify(data)
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  function respondNoContent(res) {
    res.writeHead(204).end()
  }

  return { server, registered }
}

module.exports = { createServer }
