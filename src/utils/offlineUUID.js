function md5(input) {
  const msgLen = input.length
  const bitLen = msgLen * 8

  const padLen = ((msgLen % 64) < 56 ? 56 : 120) - (msgLen % 64)
  const padded = new Uint8Array(msgLen + padLen + 8)
  padded.set(input)
  padded[msgLen] = 0x80

  const dv = new DataView(padded.buffer)
  dv.setUint32(msgLen + padLen,     bitLen >>> 0,        true)
  dv.setUint32(msgLen + padLen + 4, Math.floor(bitLen / 2**32), true)

  const T = new Uint32Array(64)
  for (let i = 0; i < 64; i++) T[i] = (Math.abs(Math.sin(i + 1)) * 2**32) >>> 0

  const S = [
    7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
    5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
    4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
    6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21,
  ]

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476

  for (let i = 0; i < padded.length; i += 64) {
    const M = new Uint32Array(16)
    for (let j = 0; j < 16; j++) {
      M[j] = dv.getUint32(i + j * 4, true)
    }

    let A = a0, B = b0, C = c0, D = d0

    for (let j = 0; j < 64; j++) {
      let F, g
      if (j < 16) {
        F = (B & C) | (~B & D); g = j
      } else if (j < 32) {
        F = (D & B) | (~D & C); g = (5 * j + 1) % 16
      } else if (j < 48) {
        F = B ^ C ^ D;           g = (3 * j + 5) % 16
      } else {
        F = C ^ (B | ~D);        g = (7 * j) % 16
      }
      F = (F + A + T[j] + M[g]) >>> 0
      A = D; D = C; C = B
      B = (B + ((F << S[j]) | (F >>> (32 - S[j])))) >>> 0
    }

    a0 = (a0 + A) >>> 0
    b0 = (b0 + B) >>> 0
    c0 = (c0 + C) >>> 0
    d0 = (d0 + D) >>> 0
  }

  const out = new Uint8Array(16)
  const odv = new DataView(out.buffer)
  odv.setUint32(0,  a0, true)
  odv.setUint32(4,  b0, true)
  odv.setUint32(8,  c0, true)
  odv.setUint32(12, d0, true)
  return out
}

function utf8Encode(str) {
  return new TextEncoder().encode(str)
}

export function offlineUUID(username) {
  const input = utf8Encode(`OfflinePlayer:${username}`)
  const hash  = md5(input)

  hash[6] = (hash[6] & 0x0f) | 0x30
  hash[8] = (hash[8] & 0x3f) | 0x80

  const hex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}
