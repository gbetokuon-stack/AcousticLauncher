import React, { useState, useEffect, useRef, useMemo } from 'react'
import { FunnelSimple, CaretDown } from '@phosphor-icons/react'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const LOADER_OPTIONS = [
  { value: 'fabric',   label: 'Fabric',   color: 'text-purple-400' },
  { value: 'forge',    label: 'Forge',    color: 'text-orange-400' },
  { value: 'neoforge', label: 'NeoForge', color: 'text-rose-400' },
  { value: 'quilt',    label: 'Quilt',    color: 'text-blue-400' },
  { value: 'vanilla',  label: 'Vanilla',  color: 'text-green-400' },
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Liên quan' },
  { value: 'downloads', label: 'Lượt tải' },
  { value: 'follows',   label: 'Lượt theo dõi' },
  { value: 'newest',    label: 'Mới nhất' },
  { value: 'updated',   label: 'Cập nhật' },
]

function CheckItem({ label, checked, onChange, color, disabled }) {
  return (
    <label 
      onClick={disabled ? undefined : onChange}
      className={[
        'flex items-center gap-2 py-1 px-1 rounded-lg transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group hover:bg-bg2'
      ].join(' ')}
    >
      <div className={[
        'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all',
        checked ? 'bg-accent' : 'bg-bg2 ring-1 ring-line',
        !disabled && !checked ? 'group-hover:ring-fgdim' : ''
      ].join(' ')}>
        {checked && (
          <svg className="w-3 h-3 text-bg-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        )}
      </div>
      <span className={[
        'text-xs transition-colors leading-none',
        checked ? (color || 'text-fg') : 'text-fgfaint',
        !disabled && !checked ? 'group-hover:text-fgdim' : ''
      ].join(' ')}>
        {label}
      </span>
    </label>
  )
}

function VersionGroupDropdown({ value, onChange, groups }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const label = value === 'all' ? 'Tất cả' : `${value}.x`

  useEffect(() => {
    function handler(e) {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target))
        setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={[
          'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all',
          value !== 'all'
            ? 'bg-accent/15 border border-accent/30 text-accent'
            : 'bg-bg2 border border-line text-fgdim hover:text-fg hover:bg-bg3',
        ].join(' ')}
      >
        {label}
        <CaretDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 rounded-xl overflow-hidden"
          style={{
            top: btnRef.current?.getBoundingClientRect().bottom + 4,
            left: btnRef.current?.getBoundingClientRect().left,
            minWidth: 160,
            maxHeight: 280,
            overflowY: 'auto',
            background: 'rgba(18,18,18,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={() => { onChange('all'); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all hover:bg-white/5"
              style={{
                background: value === 'all' ? 'rgba(251,146,60,0.1)' : 'transparent',
                color: value === 'all' ? '#fb923c' : 'rgba(255,255,255,0.65)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-bg3" />
              <span>Tất cả phiên bản</span>
              {value === 'all' && (
                <svg className="w-3 h-3 ml-auto text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </button>

            <div className="h-px bg-line mx-2 my-1" />

            {groups.map(group => (
              <button
                key={group.key}
                type="button"
                onClick={() => { onChange(group.key); setOpen(false) }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-all hover:bg-white/5"
                style={{
                  background: value === group.key ? 'rgba(251,146,60,0.1)' : 'transparent',
                  color: value === group.key ? '#fb923c' : 'rgba(255,255,255,0.65)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent/60" />
                  <span className="font-semibold">{group.key}.x</span>
                </div>
                <span className="text-fgfaint text-[10px]">{group.count}</span>
                {value === group.key && (
                  <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export function ModFilters({ filters, onChange, platform, gameVersions = [], availableLoaders = [], lockFilters = false, total = 0 }) {
  console.log('ModFilters debug:', { lockFilters, filters, availableLoaders })
  const [versionGroup, setVersionGroup] = useState('all')
  const [versionSearch, setVersionSearch] = useState('')
  const [showVersions, setShowVersions] = useState(true)

  // Load game versions
  useEffect(() => {
    if (!isElectron || !window.electronAPI.modrinthGameVersions) return
    window.electronAPI.modrinthGameVersions().catch(() => {})
  }, [])

  const versionGroups = useMemo(() => {
    const groupMap = new Map()
    gameVersions.forEach(item => {
      const v = item.version || item
      const t = item.version_type || item.type || 'release'

      if (t !== 'release' || v.includes('-rc') || v.includes('-pre')) return

      const match = v.match(/^(\d+\.\d+)/)
      if (!match) return
      const key = match[1]
      groupMap.set(key, (groupMap.get(key) || 0) + 1)
    })
    return Array.from(groupMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => {
        const [aMaj, aMin] = a.key.split('.').map(Number)
        const [bMaj, bMin] = b.key.split('.').map(Number)
        return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin
      })
  }, [gameVersions])

  function toggleLoader(loader) {
    if (lockFilters) return
    const cur = filters.loaders || []
    onChange({ loaders: cur.includes(loader) ? cur.filter(l => l !== loader) : [...cur, loader] })
  }

  function toggleVersion(v) {
    if (lockFilters) return
    const cur = filters.gameVersions || []
    onChange({ gameVersions: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] })
  }

  const filteredVersions = gameVersions.filter(item => {
    const vStr = item.version || item
    const type = item.version_type || item.type || 'release'

    if (type !== 'release' || vStr.includes('-rc') || vStr.includes('-pre')) return false

    if (versionSearch && !vStr.toLowerCase().includes(versionSearch.toLowerCase())) return false
    if (versionGroup === 'all') return true

    return vStr === versionGroup || vStr.startsWith(versionGroup + '.')
  })

  const selectedVersions = filters.gameVersions || []
  const selectedLoaders = filters.loaders || []

  return (
    <div className="w-56 flex-shrink-0 bg-bg0/30 backdrop-blur-md border border-line rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          <FunnelSimple size={14} />
          <span>Bộ lọc</span>
          {total > 0 && (
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-white/5 border border-white/5 text-fgfaint">
              {total.toLocaleString()}
            </span>
          )}
        </div>
        {!lockFilters && (selectedLoaders.length > 0 || selectedVersions.length > 0) && (
          <button
            onClick={() => onChange({ ...filters, loaders: [], gameVersions: [] })}
            className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
          >
            Xóa
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loaders & Sort */}
        <div className="flex border-b border-line">
          {/* Loaders */}
          <div className="flex-1 border-r border-line px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-fgfaint uppercase tracking-wider">Loaders</p>
              {selectedLoaders.length > 0 && !lockFilters && (
                <button onClick={() => onChange({ ...filters, loaders: [] })} className="text-[10px] text-red-400/60 hover:text-red-400">✕</button>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {LOADER_OPTIONS.filter(opt => !availableLoaders.length || availableLoaders.includes(opt.value)).map(opt => (
                <CheckItem key={opt.value} label={opt.label} color={opt.color}
                  checked={selectedLoaders.includes(opt.value)} onChange={() => toggleLoader(opt.value)}
                  disabled={lockFilters} />
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex-1 px-3 py-3">
            <p className="text-[10px] font-bold text-fgfaint uppercase tracking-wider mb-2">Sắp xếp</p>
            <div className="flex flex-col gap-0.5">
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => onChange({ ...filters, sortBy: opt.value })}
                  className={[
                    'text-left text-xs px-2 py-1 rounded-lg transition-all',
                    filters.sortBy === opt.value
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-fgdim hover:text-fg hover:bg-bg2',
                  ].join(' ')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Game Version */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setShowVersions(v => !v)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-fgfaint uppercase tracking-wider hover:text-fg transition-colors">
              Phiên bản game
              <CaretDown size={10} className={`transition-transform ${showVersions ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-1 ml-auto">
              {!lockFilters && <VersionGroupDropdown value={versionGroup} onChange={setVersionGroup} groups={versionGroups} />}
              {selectedVersions.length > 0 && !lockFilters && (
                <button onClick={() => onChange({ ...filters, gameVersions: [] })}
                  className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors px-1 py-0.5 rounded hover:bg-red-500/8">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  {selectedVersions.length}
                </button>
              )}
            </div>
          </div>

          {showVersions && (
            <>
              {!lockFilters && (
                <div className="relative mb-2">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-fgfaint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                  </svg>
                  <input
                    type="text"
                    value={versionSearch}
                    onChange={e => setVersionSearch(e.target.value)}
                    placeholder="Tìm phiên bản..."
                    className="w-full bg-bg2 border border-line rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-fgfaint focus:outline-none focus:border-accent/50"
                  />
                </div>
              )}

              <div className="flex flex-col gap-0.5 overflow-y-auto max-h-60 pb-2 pr-1 custom-scrollbar">
                {filteredVersions.length === 0 && (
                  <p className="text-fgfaint text-xs py-3 text-center">
                    {gameVersions.length === 0 ? 'Đang tải...' : 'Không có kết quả'}
                  </p>
                )}
                {filteredVersions.map(item => {
                  const vStr = item.version || item
                  return (
                    <CheckItem key={vStr} label={vStr}
                      checked={selectedVersions.includes(vStr)}
                      onChange={() => toggleVersion(vStr)}
                      disabled={lockFilters} />
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
