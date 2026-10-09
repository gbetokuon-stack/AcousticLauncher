import React, { useState, useCallback, useEffect, useRef } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { ModrinthSubTabs } from '../SubTabs.jsx'
import { ModFilters } from '../ModFilters.jsx'
import { ModGrid } from '../ModGrid.jsx'
import { ModDetail } from '../ModDetail.jsx'
import ViewToggle from '../ViewToggle.jsx'
import LoadingOverlay from '../LoadingOverlay.jsx'
import { useModrinthSearch, useModrinthGameVersions } from './useModrinth.js'

const DEFAULT_FILTERS = {
  query: '',
  contentType: 'mod',
  sortBy: 'relevance',
  gameVersions: [],
  loaders: [],
  categories: [],
}

export default function ModrinthTab({ selectedProfileId, pageContext, onDetailStateChange }) {
  const [filters, setFilters] = useState(() => {
    if (pageContext?.loader || pageContext?.gameVersion) {
      return {
        ...DEFAULT_FILTERS,
        loaders: pageContext.loader ? [pageContext.loader] : [],
        gameVersions: pageContext.gameVersion ? [pageContext.gameVersion] : [],
      }
    }
    return DEFAULT_FILTERS
  })
  const [view, setView] = useState('grid')
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [tabLoading, setTabLoading] = useState(false)
  const tabLoadingTimer = useRef(null)

  useEffect(() => {
    onDetailStateChange?.(!!selectedProject)
    return () => onDetailStateChange?.(false)
  }, [selectedProject, onDetailStateChange])

  useEffect(() => {
    if (pageContext) {
      setFilters(prev => ({
        ...prev,
        loaders: pageContext.loader ? [pageContext.loader] : [],
        gameVersions: pageContext.gameVersion ? [pageContext.gameVersion] : [],
      }))
    } else {
      setFilters(DEFAULT_FILTERS)
    }
    setSelectedProject(null)
  }, [pageContext])

  const { results, total, loading, error, loadMore, hasMore } = useModrinthSearch(filters)
  const gameVersions = useModrinthGameVersions()

  useEffect(() => {
    if (!loading && tabLoading) {
      tabLoadingTimer.current = setTimeout(() => setTabLoading(false), 120)
    }
    return () => clearTimeout(tabLoadingTimer.current)
  }, [loading, tabLoading])

  function updateFilters(patch) {
    setFilters(prev => ({ ...prev, ...patch }))
    setSelectedProject(null)
  }

  function handleSubTab(type) {
    setTabLoading(true)
    setSelectedProject(null)
    setSearchInput('')
    setFilters(prev => ({ ...prev, contentType: type, query: '' }))
  }

  function handleSearch(e) {
    e.preventDefault()
    updateFilters({ query: searchInput })
  }

  function handleSelectProject(mod) {
    setSelectedProject({ id: mod.id, type: filters.contentType })
  }

  if (selectedProject) {
    return (
      <ModDetail
        projectId={selectedProject.id}
        projectType={selectedProject.type}
        platform="modrinth"
        onBack={() => setSelectedProject(null)}
        selectedProfileId={selectedProfileId}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      <div className="flex-shrink-0 px-8 py-2 flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <ModrinthSubTabs active={filters.contentType} onChange={handleSubTab} />

          <form onSubmit={handleSearch} className="flex items-center gap-2 min-w-[280px] max-w-md w-full md:w-auto">
            <div className="flex-1 relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fgfaint pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={`Tìm kiếm ${filters.contentType} trên Modrinth...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg2/40 hover:bg-bg2/60 focus:bg-bg2/80 rounded-lg ring-1 ring-line text-fg placeholder:text-fgfaint focus:outline-none focus:ring-accent/40 transition-all"
              />
            </div>
            <ViewToggle view={view} onChange={setView} />
          </form>
        </div>

        {loading && (
          <div className="w-full h-0.5 bg-line/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, #fb923c 40%, #f97316 60%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-bar 1.4s linear infinite',
                width: '100%',
              }}
            />
          </div>
        )}

        <style>{`
          @keyframes shimmer-bar {
            0%   { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `}</style>
      </div>

      <div className="flex flex-1 overflow-hidden min-w-0 px-8 py-4 gap-6">
        <ModFilters
          filters={filters}
          onChange={updateFilters}
          platform="modrinth"
          gameVersions={gameVersions}
          availableLoaders={['fabric', 'forge', 'neoforge', 'quilt']}
          lockFilters={!!pageContext}
          total={total}
        />

        <div className="flex-1 overflow-hidden p-0.5 relative">
          <LoadingOverlay visible={tabLoading} />
          <div className="h-full overflow-y-auto">
            {error && (
              <div className="text-center text-red-400 py-8">
                Lỗi: {error}
              </div>
            )}
            <ModGrid
              mods={results}
              view={view}
              onSelect={handleSelectProject}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
