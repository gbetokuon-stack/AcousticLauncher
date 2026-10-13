'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
let electron = null
try {
  electron = require('electron')
} catch {}
const app = electron?.app
const shell = electron?.shell
const dialog = electron?.dialog

let activeSession = null

function getDownloadsDir() {
  try {
    return app.getPath('downloads')
  } catch {
    return path.join(os.homedir(), 'Downloads')
  }
}

/**
 * Normalizes a filename to compare against downloaded files,
 * stripping browser duplicate markers like " (1).jar", " (2).jar", etc.
 */
function cleanDownloadedFileName(filename) {
  return filename
    .toLowerCase()
    .replace(/\s*\(\d+\)\.jar$/i, '.jar')
    .replace(/\.disabled$/, '')
    .trim()
}

/**
 * Starts watching the Downloads folder for expected mod files
 */
function startWatchingSession({ mainWindow, instancePath, expectedFiles }) {
  stopWatchingSession()

  const downloadsDir = getDownloadsDir()
  const modsDir = path.join(instancePath, 'mods')
  if (!fs.existsSync(modsDir)) {
    try { fs.mkdirSync(modsDir, { recursive: true }) } catch {}
  }

  // Create deep copy of expectedFiles tracking pending status
  const pendingFiles = expectedFiles.map(f => ({
    ...f,
    cleanedTarget: cleanDownloadedFileName(f.fileName),
    status: 'pending'
  }))

  const prevSizes = new Map()

  const intervalId = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopWatchingSession()
      return
    }

    try {
      if (!fs.existsSync(downloadsDir)) return
      const filesInDownloads = fs.readdirSync(downloadsDir)

      for (const dlFile of filesInDownloads) {
        // Skip browser temp files
        if (
          dlFile.endsWith('.crdownload') ||
          dlFile.endsWith('.tmp') ||
          dlFile.endsWith('.part') ||
          dlFile.endsWith('.opdownload')
        ) {
          continue
        }

        if (!dlFile.endsWith('.jar')) continue

        const cleanedDl = cleanDownloadedFileName(dlFile)

        // Find match in pending files
        const match = pendingFiles.find(p => p.status === 'pending' && p.cleanedTarget === cleanedDl)
        if (match) {
          const srcPath = path.join(downloadsDir, dlFile)
          try {
            const stat = fs.statSync(srcPath)
            if (stat.size <= 0) continue

            // Ensure file is done writing (size is stable)
            const prev = prevSizes.get(srcPath)
            if (prev === undefined || prev !== stat.size) {
              prevSizes.set(srcPath, stat.size)
              continue
            }

            // File is stable and complete! Copy to instance mods dir
            const destPath = path.join(modsDir, match.fileName)
            try {
              fs.copyFileSync(srcPath, destPath)
            } catch (err) {
              console.error('[BrowserDownload] Copy error:', err.message)
              continue
            }

            match.status = 'completed'
            prevSizes.delete(srcPath)

            console.log(`[BrowserDownload] Auto-detected and imported: ${dlFile} -> ${match.fileName}`)

            mainWindow.webContents.send('browserDownload:fileDetected', {
              id: match.id,
              fileName: match.fileName,
              success: true
            })

            // Check if all are done
            const allDone = pendingFiles.every(p => p.status === 'completed')
            if (allDone) {
              mainWindow.webContents.send('browserDownload:allCompleted', { success: true })
              stopWatchingSession()
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('[BrowserDownload] Polling error:', err.message)
    }
  }, 800)

  activeSession = {
    intervalId,
    instancePath,
    pendingFiles
  }

  return { ok: true, downloadsDir }
}

function stopWatchingSession() {
  if (activeSession) {
    if (activeSession.intervalId) clearInterval(activeSession.intervalId)
    activeSession = null
  }
}

async function pickManualFile(mainWindow, { instancePath, expectedFileName, id }) {
  if (!mainWindow) return { error: 'No main window' }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Chọn file tải về: ${expectedFileName}`,
    properties: ['openFile'],
    filters: [{ name: 'Minecraft Mod (.jar)', extensions: ['jar'] }]
  })

  if (result.canceled || !result.filePaths.length) {
    return { cancelled: true }
  }

  const selectedPath = result.filePaths[0]
  const modsDir = path.join(instancePath, 'mods')
  if (!fs.existsSync(modsDir)) {
    try { fs.mkdirSync(modsDir, { recursive: true }) } catch {}
  }

  const destPath = path.join(modsDir, expectedFileName)
  try {
    fs.copyFileSync(selectedPath, destPath)

    if (activeSession) {
      const match = activeSession.pendingFiles.find(p => p.id === id || p.fileName === expectedFileName)
      if (match) match.status = 'completed'
      const allDone = activeSession.pendingFiles.every(p => p.status === 'completed')
      if (allDone) {
        mainWindow.webContents.send('browserDownload:allCompleted', { success: true })
        stopWatchingSession()
      }
    }

    mainWindow.webContents.send('browserDownload:fileDetected', {
      id,
      fileName: expectedFileName,
      success: true
    })

    return { ok: true, path: destPath }
  } catch (err) {
    return { error: err.message }
  }
}

async function handleDroppedFile(mainWindow, { instancePath, filePath, expectedFileName, id }) {
  if (!filePath || !fs.existsSync(filePath)) return { error: 'File not found' }

  const modsDir = path.join(instancePath, 'mods')
  if (!fs.existsSync(modsDir)) {
    try { fs.mkdirSync(modsDir, { recursive: true }) } catch {}
  }

  const destPath = path.join(modsDir, expectedFileName)
  try {
    fs.copyFileSync(filePath, destPath)

    if (activeSession) {
      const match = activeSession.pendingFiles.find(p => p.id === id || p.fileName === expectedFileName)
      if (match) match.status = 'completed'
      const allDone = activeSession.pendingFiles.every(p => p.status === 'completed')
      if (allDone) {
        mainWindow.webContents.send('browserDownload:allCompleted', { success: true })
        stopWatchingSession()
      }
    }

    if (mainWindow) {
      mainWindow.webContents.send('browserDownload:fileDetected', {
        id,
        fileName: expectedFileName,
        success: true
      })
    }

    return { ok: true, path: destPath }
  } catch (err) {
    return { error: err.message }
  }
}

function openDownloadsFolder() {
  const dir = getDownloadsDir()
  shell.openPath(dir)
  return { ok: true, path: dir }
}

module.exports = {
  getDownloadsDir,
  startWatchingSession,
  stopWatchingSession,
  pickManualFile,
  handleDroppedFile,
  openDownloadsFolder
}
