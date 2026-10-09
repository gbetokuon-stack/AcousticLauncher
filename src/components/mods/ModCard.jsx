import React from 'react'
import { DownloadSimple, Heart, Package } from '@phosphor-icons/react'
import { formatDownloads } from './shared.jsx'

// ─── Mod Card (Grid View) ──────────────────────────────────────────────────────

export function ModCard({ mod, view, onClick, platform }) {
  const {
    title,
    icon,
    author,
    description,
    downloads,
    follows,
    loaders = [],
    versions,
    installCount,
  } = mod

  if (view === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg1 hover:bg-bg2 ring-1 ring-line transition-all text-left group"
      >
        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-bg2 ring-1 ring-line">
          {icon ? (
            <img src={icon} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={18} className="text-fgfaint" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-fg truncate group-hover:text-accent transition-colors">
              {title}
            </span>
            {loaders.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bg3 text-fgfaint shrink-0">
                {loaders.length}
              </span>
            )}
          </div>
          <div className="text-[11px] text-fgfaint truncate">{description}</div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-fgfaint shrink-0">
          {downloads !== undefined && (
            <span className="flex items-center gap-1">
              <DownloadSimple size={12} />
              {formatDownloads(downloads)}
            </span>
          )}
          {follows !== undefined && (
            <span className="flex items-center gap-1">
              <Heart size={12} />
              {formatDownloads(follows)}
            </span>
          )}
          {installCount !== undefined && (
            <span className="flex items-center gap-1">
              <Package size={12} />
              {installCount}
            </span>
          )}
        </div>
      </button>
    )
  }

  // Grid view
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl bg-bg1 ring-1 ring-line overflow-hidden hover:ring-accent/40 transition-all group text-left"
    >
      {/* Icon */}
      <div className="relative h-24 bg-bg2 flex items-center justify-center overflow-hidden">
        {icon ? (
          <img src={icon} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package size={32} className="text-fgfaint" />
        )}
        {/* Loader badges */}
        {loaders.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1 flex-wrap">
            {loaders.slice(0, 3).map((loader) => (
              <span
                key={loader}
                className="text-[8px] font-bold px-1 py-0.5 rounded bg-bg0/80 backdrop-blur text-white"
              >
                {loader}
              </span>
            ))}
            {loaders.length > 3 && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-bg0/80 backdrop-blur text-white">
                +{loaders.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-2.5">
        <div className="text-[13px] font-semibold text-fg leading-tight mb-0.5 group-hover:text-accent transition-colors line-clamp-1">
          {title}
        </div>
        <div className="text-[10px] text-fgfaint mb-2 line-clamp-2 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-between text-[10px] text-fgfaint">
          <span className="truncate">{author}</span>
          <div className="flex items-center gap-2 shrink-0">
            {downloads !== undefined && (
              <span className="flex items-center gap-0.5">
                <DownloadSimple size={10} />
                {formatDownloads(downloads)}
              </span>
            )}
            {follows !== undefined && (
              <span className="flex items-center gap-0.5">
                <Heart size={10} />
                {formatDownloads(follows)}
              </span>
            )}
            {installCount !== undefined && (
              <span className="flex items-center gap-0.5">
                <Package size={10} />
                {installCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
