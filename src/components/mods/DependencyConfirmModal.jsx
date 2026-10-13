import React, { useState } from 'react'
import {
  X,
  PuzzlePiece,
  CheckCircle,
  DownloadSimple,
  Globe,
  Sparkle,
  WarningCircle,
  CaretDown,
  CaretUp
} from '@phosphor-icons/react'

export default function DependencyConfirmModal({
  isOpen,
  onClose,
  targetMod,
  missingDependencies = [],
  alreadySatisfied = [],
  onConfirmInstall
}) {
  const [selectedIds, setSelectedIds] = useState(() => {
    return new Set(missingDependencies.map(d => d.modId || d.slug))
  })
  const [showSatisfied, setShowSatisfied] = useState(false)

  if (!isOpen) return null

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleInstallAll = () => {
    const chosenMissing = missingDependencies.filter(d => selectedIds.has(d.modId || d.slug))
    onConfirmInstall({
      includeDependencies: true,
      selectedDependencies: chosenMissing
    })
  }

  const handleInstallTargetOnly = () => {
    onConfirmInstall({
      includeDependencies: false,
      selectedDependencies: []
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-bg0/95 border border-line/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line/60 flex items-start justify-between gap-4 bg-bg1/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <PuzzlePiece size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-fg">
                Tự động tìm mod còn thiếu (Dependencies)
              </h3>
              <p className="text-xs text-fgfaint mt-0.5">
                Mod <strong className="text-fg">{targetMod?.name}</strong> yêu cầu các mod phụ thuộc để có thể khởi động game.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fgfaint hover:text-fg hover:bg-bg2 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {/* Missing dependencies list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-fg uppercase tracking-wider">
                Các mod còn thiếu ({missingDependencies.length})
              </span>
              <span className="text-[11px] text-accent font-medium">Bắt buộc để chạy mod</span>
            </div>

            <div className="space-y-2">
              {missingDependencies.map((dep, idx) => {
                const key = dep.modId || dep.slug || idx
                const isSelected = selectedIds.has(key)

                return (
                  <div
                    key={key}
                    onClick={() => toggleSelect(key)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-accent/10 border-accent/40 text-fg'
                        : 'bg-bg1/40 border-line/40 text-fgfaint opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-line text-accent focus:ring-accent/40 w-4 h-4 cursor-pointer"
                      />
                      {dep.icon ? (
                        <img
                          src={dep.icon}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover shrink-0 bg-bg2"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-bg2 flex items-center justify-center text-fgfaint shrink-0">
                          <PuzzlePiece size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-fg truncate">
                          {dep.name || dep.slug}
                        </div>
                        <div className="text-[11px] text-fgfaint truncate font-mono">
                          {dep.fileName}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {dep.needsManualDownload ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                          <Globe size={11} />
                          Trình duyệt
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <DownloadSimple size={11} />
                          Tự động
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Already satisfied list (collapsible) */}
          {alreadySatisfied.length > 0 && (
            <div className="pt-2 border-t border-line/40">
              <button
                onClick={() => setShowSatisfied(!showSatisfied)}
                className="w-full flex items-center justify-between text-xs text-fgfaint hover:text-fg py-1 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-400" weight="fill" />
                  Đã có sẵn trong profile ({alreadySatisfied.length} mod)
                </span>
                {showSatisfied ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </button>

              {showSatisfied && (
                <div className="mt-2 space-y-1.5 pl-5 text-xs text-fgdim">
                  {alreadySatisfied.map((sat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{sat.name || sat.slug || sat.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line/60 bg-bg1/40 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-bg2 hover:bg-bg3 text-fg text-xs font-medium border border-line/50 transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallTargetOnly}
              className="px-3.5 py-1.5 rounded-xl bg-bg2 hover:bg-bg3 text-fgdim hover:text-fg text-xs font-medium border border-line/50 transition-colors cursor-pointer"
              title="Chỉ cài đặt mod này, bỏ qua các mod phụ thuộc"
            >
              Bỏ qua phụ thuộc
            </button>
            <button
              onClick={handleInstallAll}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accentstrong text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-accent/20 transition-all cursor-pointer"
            >
              <Sparkle size={14} weight="fill" />
              Cài đặt kèm phụ thuộc ({selectedIds.size + 1} mod)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
