'use strict'

const https = require('https')
const http  = require('http')
const { URL } = require('url')
const fs    = require('fs')
const path  = require('path')
const crypto = require('crypto')

const UA = 'XForge/0.1'

function pickClient(url) {
  return url.startsWith('https') ? https : http
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

/**
 * Resolve a possibly-relative `Location` header against the previous URL.
 * Returns an absolute URL string.
 */
function resolveLocation(prevUrl, location) {
  if (!location) return prevUrl
  try {
    // Absolute URL already
    return new URL(location, prevUrl).toString()
  } catch {
    return location
  }
}

function httpsGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    if (typeof url !== 'string' || !url) return reject(new Error('Invalid URL'))
    const client = pickClient(url)
    const req = client.get(url, {
      headers: { 'User-Agent': UA, ...(opts.headers || {}) },
      ...(opts.reqOpts || {}),
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        const next = resolveLocation(url, res.headers.location)
        if (!next || next === url) {
          return reject(new Error(`Redirect loop or invalid Location for ${url}`))
        }
        return httpsGet(next, opts).then(resolve).catch(reject)
      }
      let data = ''
      res.setEncoding(opts.encoding || 'utf-8')
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        if (opts.raw) return resolve(data)
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON: ${url}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(opts.timeoutMs || 30000, () => req.destroy(new Error('Timeout')))
  })
}

function downloadToFile(url, dest, onProgress, opts = {}) {
  return new Promise(async (resolve, reject) => {
    if (typeof url !== 'string' || !url) return reject(new Error('Invalid URL'))

    // Skip download if file exists and hash matches
    if (fs.existsSync(dest) && opts.expectedHash) {
      const valid = await verifyHash(dest, opts.expectedHash, opts.hashAlgo)
      if (valid) return resolve(dest)
      // Hash mismatch — delete and re-download
      fs.unlinkSync(dest)
    } else if (fs.existsSync(dest) && !opts.expectedHash) {
      return resolve(dest)
    }

    ensureDir(path.dirname(dest))
    const cleanup = () => { try { if (fs.existsSync(dest)) fs.unlinkSync(dest) } catch {} }

    const doReq = (u) => {
      const client = pickClient(u)
      const req = client.get(u, { headers: { 'User-Agent': UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          const next = resolveLocation(u, res.headers.location)
          if (!next || next === u) {
            return reject(new Error(`Redirect loop or invalid Location for ${u}`))
          }
          return doReq(next)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${u}`))

        const total = parseInt(res.headers['content-length'] || '0', 10)
        let downloaded = 0
        const out = fs.createWriteStream(dest)
        res.on('data', (chunk) => {
          downloaded += chunk.length
          try { onProgress?.({ downloaded, total }) } catch {}
        })
        res.pipe(out)
        out.on('finish', () => resolve(dest))
        out.on('error', (err) => { cleanup(); reject(err) })
        res.on('error', (err) => { cleanup(); reject(err) })
      })
      req.on('error', (err) => { cleanup(); reject(err) })
      req.setTimeout(60000, () => req.destroy(new Error('Timeout')))
    }
    doReq(url)
  })
}

async function sha1OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1')
    const s = fs.createReadStream(filePath)
    s.on('data', (d) => hash.update(d))
    s.on('end', () => resolve(hash.digest('hex')))
    s.on('error', reject)
  })
}

async function verifyHash(filePath, expectedHash, algorithm = 'sha1') {
  if (!expectedHash) return true
  if (!fs.existsSync(filePath)) return false
  const hash = crypto.createHash(algorithm)
  const s = fs.createReadStream(filePath)
  return new Promise((resolve) => {
    s.on('data', (d) => hash.update(d))
    s.on('end', () => resolve(hash.digest('hex') === expectedHash.toLowerCase()))
    s.on('error', () => resolve(false))
  })
}

module.exports = { httpsGet, downloadToFile, sha1OfFile, verifyHash, ensureDir }