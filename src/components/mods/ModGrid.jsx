import React from 'react'
import { ModCard } from './ModCard.jsx'
import { Warning } from '@phosphor-icons/react'

export function ModGrid({ mods, view, onSelect, loading, hasMore, onLoadMore }) {
  if (loading && mods.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-bg2 rounded-t-xl" />
            <div className="p-2.5 bg-bg1 rounded-b-xl">
              <div className="h-4 bg-bg2 rounded mb-2" />
              <div className="h-3 bg-bg2 rounded w-2/3 mb-3" />
              <div className="h-3 bg-bg2 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (mods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Warning size={48} className="text-fgfaint mb-3" />
        <div className="text-fg font-semibold mb-1">Không tìm thấy kết quả</div>
        <div className="text-sm text-fgfaint">Thử thay đổi từ khóa hoặc bộ lọc</div>
      </div>
    )
  }

  return (
    <div>
      <div className={
        view === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
          : 'flex flex-col gap-1.5'
      }>
        {mods.map((mod) => (
          <ModCard
            key={`${mod.id}-${mod.title}`}
            mod={mod}
            view={view}
            onClick={() => onSelect(mod)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-bg2 hover:bg-bg3 text-sm text-fgdim hover:text-fg ring-1 ring-line transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tải…' : 'Tải thêm'}
          </button>
        </div>
      )}
    </div>
  )
}
