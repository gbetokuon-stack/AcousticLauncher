const modrinth = require('./modrinth/modrinthSearch.cjs')
const curseforge = require('./curseforge/curseForgeSearch.cjs')

function register({ ipcMain }) {
  // ── Modrinth ──────────────────────────────────────────
  ipcMain.handle('modrinth:search', async (_e, opts) => {
    return await modrinth.searchProjects(opts)
  })
  ipcMain.handle('modrinth:project', (_e, projectId) => modrinth.getProject(projectId))
  ipcMain.handle('modrinth:versions', (_e, projectId, filters) => modrinth.getProjectVersions(projectId, filters))
  ipcMain.handle('modrinth:gameVersions', () => modrinth.getGameVersions())
  ipcMain.handle('modrinth:categories', () => modrinth.getCategories())

  // ── CurseForge ────────────────────────────────────────
  ipcMain.handle('curseforge:search', async (_e, opts) => {
    return await curseforge.searchProjects(opts)
  })
  ipcMain.handle('curseforge:project', (_e, modId) => curseforge.getProject(modId))
  ipcMain.handle('curseforge:versions', (_e, modId, filters) => curseforge.getProjectVersions(modId, filters))
  ipcMain.handle('curseforge:categories', (_e, projectType) => curseforge.getCategories(projectType))
}

module.exports = { register }
