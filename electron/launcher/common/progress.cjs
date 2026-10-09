'use strict'

/**
 * Tracker helper: emits structured install progress to renderer via IPC.
 * Mirrors the pattern from javaManager.cjs (onProgress callback).
 *
 * Usage:
 *   const tracker = makeTracker(getMainWindow, { profileId, loader })
 *   tracker({ phase: 'fetching', payload: { url } })
 *   tracker({ phase: 'done', payload: { ... } })
 */

function makeTracker(getMainWindow, ctx = {}) {
  const send = (event) => {
    const win = getMainWindow?.()
    if (win && !win.isDestroyed()) {
      win.webContents.send('install:progress', { ...ctx, ...event, ts: Date.now() })
    }
  }
  return (event) => {
    try { send(event) } catch {}
  }
}

module.exports = { makeTracker }