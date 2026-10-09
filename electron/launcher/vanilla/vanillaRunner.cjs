'use strict'

/**
 * Vanilla launcher entry (legacy compat).
 * The actual launch logic moved to electron/launcher/gameLauncher.cjs.
 * This file kept as a thin re-export so other modules that import
 * { prepare, listVersions } from vanillaRunner still work.
 */

const vanilla = require('./vanillaInstaller.cjs')

module.exports = {
  prepare:    vanilla.prepare,
  listVersions: vanilla.listVersions,
  getVersionMeta: vanilla.getVersionMeta,
  getManifest:    vanilla.getManifest,
}