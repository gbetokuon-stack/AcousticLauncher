'use strict'

const net = require('net')

/**
 * Write a Minecraft VarInt to buffer.
 */
function writeVarInt(value) {
  const bytes = []
  let val = value
  while (true) {
    if ((val & 0xffffff80) === 0) {
      bytes.push(val)
      return Buffer.from(bytes)
    }
    bytes.push((val & 0x7f) | 0x80)
    val >>>= 7
  }
}

/**
 * Read a Minecraft VarInt from buffer offset.
 */
function readVarInt(buffer, offset = 0) {
  let val = 0
  let count = 0
  let cur = 0
  let readOffset = offset

  while (true) {
    if (readOffset >= buffer.length) {
      throw new Error('Buffer out of bounds reading VarInt')
    }
    cur = buffer[readOffset++]
    val |= (cur & 0x7f) << (count * 7)
    count++
    if (count > 5) throw new Error('VarInt is too big')
    if ((cur & 0x80) !== 0x80) break
  }

  return { value: val, bytesRead: readOffset - offset }
}

/**
 * Convert Minecraft MOTD (string or JSON component) into styled HTML/text.
 */
function formatMotd(description) {
  if (!description) return { plain: '', html: '' }

  let rawText = ''
  if (typeof description === 'string') {
    rawText = description
  } else if (typeof description === 'object') {
    function extract(obj) {
      let t = obj.text || ''
      if (Array.isArray(obj.extra)) {
        for (const part of obj.extra) {
          if (typeof part === 'string') t += part
          else if (part && typeof part === 'object') t += extract(part)
        }
      }
      return t
    }
    rawText = extract(description)
  }

  // Parse Minecraft color codes (§0 - §f, §k - §o, §r)
  const COLOR_MAP = {
    '0': '#000000', '1': '#0000aa', '2': '#00aa00', '3': '#00aaaa',
    '4': '#aa0000', '5': '#aa00aa', '6': '#ffaa00', '7': '#aaaaaa',
    '8': '#555555', '9': '#5555ff', 'a': '#55ff55', 'b': '#55ffff',
    'c': '#ff5555', 'd': '#ff55ff', 'e': '#ffff55', 'f': '#ffffff',
  }

  // Plain string without color codes
  const plain = rawText.replace(/§[0-9a-fk-or]/gi, '')

  // Build HTML
  let html = ''
  let currentColor = null
  let isBold = false
  let isItalic = false
  let isUnderline = false
  let isStrike = false

  const parts = rawText.split(/(§[0-9a-fk-or])/gi)
  for (const part of parts) {
    if (part.startsWith('§')) {
      const code = part.charAt(1).toLowerCase()
      if (COLOR_MAP[code]) {
        currentColor = COLOR_MAP[code]
        isBold = false; isItalic = false; isUnderline = false; isStrike = false
      } else if (code === 'l') {
        isBold = true
      } else if (code === 'o') {
        isItalic = true
      } else if (code === 'n') {
        isUnderline = true
      } else if (code === 'm') {
        isStrike = true
      } else if (code === 'r') {
        currentColor = null
        isBold = false; isItalic = false; isUnderline = false; isStrike = false
      }
    } else if (part.length > 0) {
      const styles = []
      if (currentColor) styles.push(`color:${currentColor}`)
      if (isBold) styles.push('font-weight:bold')
      if (isItalic) styles.push('font-style:italic')
      if (isUnderline && isStrike) styles.push('text-decoration:underline line-through')
      else if (isUnderline) styles.push('text-decoration:underline')
      else if (isStrike) styles.push('text-decoration:line-through')

      const escaped = part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br/>')

      if (styles.length > 0) {
        html += `<span style="${styles.join(';')}">${escaped}</span>`
      } else {
        html += escaped
      }
    }
  }

  return { plain, html }
}

/**
 * Ping a Minecraft server via TCP Server List Ping (SLP).
 *
 * @param {string} host Hostname or IP (e.g., 'mc.hypixel.net' or '127.0.0.1')
 * @param {number} port Port number (default 25565)
 * @param {number} timeout Timeout in ms (default 5000)
 * @returns {Promise<{online: boolean, ping: number, players: {online: number, max: number}, version: string, motd: {plain: string, html: string}, favicon: string|null}>}
 */
function pingMinecraftServer(host, port = 25565, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    let resolved = false

    function finish(data) {
      if (!resolved) {
        resolved = true
        try { socket.destroy() } catch {}
        resolve(data)
      }
    }

    const socket = new net.Socket()
    socket.setTimeout(timeout)

    socket.on('timeout', () => {
      finish({
        online: false,
        ping: -1,
        error: 'Hết thời gian chờ kết nối (Timeout)',
      })
    })

    socket.on('error', (err) => {
      finish({
        online: false,
        ping: -1,
        error: err.message || 'Không thể kết nối đến máy chủ',
      })
    })

    socket.connect(port, host, () => {
      const pingLatency = Date.now() - startTime

      // 1. Handshake Packet (ID: 0x00)
      // Protocol Version: 765 (1.20.4+ compatible handshake)
      const protocolVer = writeVarInt(765)
      const hostBuf = Buffer.from(host, 'utf8')
      const hostLen = writeVarInt(hostBuf.length)
      const portBuf = Buffer.alloc(2)
      portBuf.writeUInt16BE(port, 0)
      const nextState = writeVarInt(1) // 1 = Status

      const handshakePayload = Buffer.concat([
        Buffer.from([0x00]), // Packet ID 0x00
        protocolVer,
        hostLen,
        hostBuf,
        portBuf,
        nextState,
      ])
      const handshakePacket = Buffer.concat([
        writeVarInt(handshakePayload.length),
        handshakePayload,
      ])

      // 2. Status Request Packet (ID: 0x00)
      const requestPayload = Buffer.from([0x00])
      const requestPacket = Buffer.concat([
        writeVarInt(requestPayload.length),
        requestPayload,
      ])

      // Send both
      socket.write(Buffer.concat([handshakePacket, requestPacket]))
    })

    let incoming = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      incoming = Buffer.concat([incoming, chunk])

      try {
        if (incoming.length < 3) return // Need more data

        // Read total packet length
        const pktLen = readVarInt(incoming, 0)
        const totalExpected = pktLen.bytesRead + pktLen.value

        if (incoming.length < totalExpected) return // Incomplete buffer

        let offset = pktLen.bytesRead
        // Read packet ID
        const pktId = readVarInt(incoming, offset)
        offset += pktId.bytesRead

        if (pktId.value !== 0x00) {
          finish({ online: false, ping: -1, error: 'Packet ID không hợp lệ' })
          return
        }

        // Read string length
        const strLen = readVarInt(incoming, offset)
        offset += strLen.bytesRead

        const jsonStr = incoming.toString('utf8', offset, offset + strLen.value)
        const parsed = JSON.parse(jsonStr)

        const motd = formatMotd(parsed.description)
        const latency = Date.now() - startTime

        finish({
          online: true,
          ping: latency,
          host,
          port,
          version: parsed.version?.name || 'Unknown',
          protocol: parsed.version?.protocol || 0,
          players: {
            online: parsed.players?.online || 0,
            max: parsed.players?.max || 0,
            sample: parsed.players?.sample || [],
          },
          motd,
          favicon: parsed.favicon || null,
        })
      } catch (ex) {
        // May still be receiving chunks or parse error
        if (incoming.length >= 65536) {
          finish({ online: false, ping: -1, error: 'Phản hồi không hợp lệ: ' + ex.message })
        }
      }
    })
  })
}

module.exports = { pingMinecraftServer, formatMotd }
