'use strict'

const fs   = require('fs')
const path = require('path')
const yauzl = require('yauzl')

function safeJoin(base, target) {
  const resolved = path.resolve(base, target)
  const rel = path.relative(path.resolve(base), resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null
  return resolved
}

function extractZip(zipPath, destDir, onEntry) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err)
      let count = 0
      zip.on('entry', (entry) => {
        const fileName = entry.fileName.replace(/\\/g, '/')
        if (/\/$/.test(fileName)) {
          const dir = safeJoin(destDir, fileName)
          if (!dir) { zip.readEntry(); return }
          fs.mkdirSync(dir, { recursive: true })
          zip.readEntry()
          return
        }
        const dest = safeJoin(destDir, fileName)
        if (!dest) {
          zip.close()
          return reject(new Error(`Refusing to write outside target: ${fileName}`))
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        zip.openReadStream(entry, (err2, readStream) => {
          if (err2) return reject(err2)
          const out = fs.createWriteStream(dest)
          readStream.pipe(out)
          out.on('finish', () => {
            count++
            try { onEntry?.({ count, fileName }) } catch {}
            zip.readEntry()
          })
          out.on('error', reject)
          readStream.on('error', reject)
        })
      })
      zip.on('end', () => resolve(count))
      zip.on('error', reject)
      zip.readEntry()
    })
  })
}

function readJsonFromZip(zipPath, entryName) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err)
      zip.on('entry', (entry) => {
        if (entry.fileName === entryName) {
          zip.openReadStream(entry, (err2, rs) => {
            if (err2) return reject(err2)
            let buf = ''
            rs.setEncoding('utf-8')
            rs.on('data', (c) => { buf += c })
            rs.on('end', () => {
              try { resolve(JSON.parse(buf)) } catch (e) { reject(e) }
            })
            rs.on('error', reject)
          })
        } else {
          zip.readEntry()
        }
      })
      zip.on('end', () => reject(new Error(`Not found in zip: ${entryName}`)))
      zip.on('error', reject)
      zip.readEntry()
    })
  })
}

function listZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err)
      const names = []
      zip.on('entry', (entry) => {
        names.push(entry.fileName)
        zip.readEntry()
      })
      zip.on('end', () => resolve(names))
      zip.on('error', reject)
      zip.readEntry()
    })
  })
}

module.exports = { extractZip, readJsonFromZip, listZip, safeJoin }