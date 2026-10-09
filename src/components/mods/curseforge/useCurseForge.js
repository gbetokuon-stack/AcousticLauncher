import { useState, useEffect, useRef, useCallback } from 'react'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function useCurseForgeSearch(filters) {
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const offsetRef = useRef(0)
  const loadingRef = useRef(false)
  const filtersRef = useRef(filters)
  const abortRef = useRef(null)

  filtersRef.current = filters

  const fetchPage = useCallback(async (offset, append = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const f = filtersRef.current

      const result = await window.electronAPI.curseforgeSearch({
        query: f.query || '',
        projectType: f.contentType || 'mods',
        gameVersions: f.gameVersions || [],
        loaders: f.loaders || [],
        sortBy: f.sortBy || 'relevance',
        offset,
        limit: 20,
      })

      if (controller.signal.aborted) return

      if (result?.error) {
        setError(result.error)
        return
      }

      const hits = result?.hits || result?.data || []
      const newTotal = result?.total_hits || hits.length || 0

      const normalized = hits.map((hit) => ({
        id: hit.project_id || hit.id,
        title: hit.title,
        icon: hit.icon_url || null,
        author: hit.author || 'Unknown',
        description: hit.description || '',
        downloads: hit.downloads,
        follows: hit.follows,
        date: hit.date_modified || hit.date_created,
        loaders: hit.loaders || [],
        versions: hit.game_versions || [],
        gallery: hit.gallery || [],
        platform: 'curseforge',
      }))

      if (append) {
        const existingIds = new Set(results.map((r) => r.id))
        const filtered = normalized.filter((r) => !existingIds.has(r.id))
        setResults((prev) => [...prev, ...filtered])
      } else {
        setResults(normalized)
      }

      setTotal(newTotal)
      setHasMore(offset + hits.length < newTotal)
      offsetRef.current = offset + hits.length
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message)
      }
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [results])

  useEffect(() => {
    offsetRef.current = 0
    fetchPage(0, false)
  }, [
    filters.query,
    filters.contentType,
    filters.sortBy,
    JSON.stringify(filters.gameVersions),
    JSON.stringify(filters.loaders),
  ])

  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) {
      fetchPage(offsetRef.current, true)
    }
  }, [fetchPage, hasMore])

  return { results, total, loading, error, hasMore, loadMore }
}

export function useCurseForgeProject(projectId, activeLoaders = [], activeGameVersions = []) {
  const [project, setProject] = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    Promise.all([
      window.electronAPI.curseforgeProject(projectId),
      window.electronAPI.curseforgeVersions(projectId, {
        loaders: activeLoaders,
        gameVersions: activeGameVersions,
      }),
    ])
      .then(([proj, vers]) => {
        if (proj?.error) {
          setError(proj.error)
          return
        }

        setProject({
          ...proj,
          id: proj.project_id || proj.id?.toString(),
          platform: 'curseforge',
          icon: proj.icon_url || null,
          description: proj.body || proj.description || proj.summary,
          gallery: proj.gallery || [],
        })

        const versionData = Array.isArray(vers) ? vers : []
        setVersions(
          versionData.map((v) => ({
            id: v.id?.toString() || v.version_number,
            name: v.name || v.version_number,
            version: v.version_number,
            loaders: v.loaders || [],
            gameVersion: v.game_versions?.[0] || '',
            releaseType: v.version_type,
            recommended: v.featured,
            latest: false,
            date: v.date_published,
            files: v.files || [],
          }))
        )
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId])

  return { project, versions, loading, error }
}
