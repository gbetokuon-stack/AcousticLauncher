import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Globe,
  FolderOpen,
  CheckCircle,
  CircleNotch,
  DownloadSimple,
  ArrowSquareOut,
  Warning,
  FileArrowUp,
  Sparkle
} from '@phosphor-icons/react'
import { useToast } from '../../hooks/useToast.jsx'

export default function ManualDownloadModal({
  isOpen,
  onClose,
  profileId,
  items = [],
  onSuccess
}) {
  const toast = useToast()
  const [completedIds, setCompletedIds] = useState(new Set())
  const [isDragOver, setIsDragOver] = useState(false)
  const [openingAll, setOpeningAll] = useState(false)
  const isMounted = useRef(true)

  // Filter valid items
  const downloadItems = items.filter(Boolean)

  useEffect(() => {
    isMounted.current = true
    if (!isOpen || !profileId || downloadItems.length === 0) return

    // Initialize watcher in Electron
    if (window.electronAPI?.startBrowserDownloadWatcher) {
      window.electronAPI.startBrowserDownloadWatcher({
        profileId,
        expectedFiles: downloadItems.map(item => ({
          id: item.id || item.versionId || item.fileName,
          fileName: item.fileName,
          name: item.name
        }))
      })
    }

    // Subscribe to detected files
    const unsubDetected = window.electronAPI?.onBrowserDownloadDetected?.((data) => {
      if (!isMounted.current) return
      setCompletedIds(prev => {
        const next = new Set(prev)
        next.add(data.id)
        // Also match by filename in case id was different
        const match = downloadItems.find(it => it.fileName === data.fileName)
        if (match) next.add(match.id || match.versionId || match.fileName)
        return next
      })
      toast.push({
        type: 'success',
        message: `Đã tự động nhận diện và nạp file: ${data.fileName}`
      })
    })

    const unsubAll = window.electronAPI?.onBrowserDownloadAllCompleted?.(() => {
      if (!isMounted.current) return
      toast.push({
        type: 'success',
        message: 'Hoàn tất! Tất cả mod đã được nạp vào game thành công!'
      })
      if (onSuccess) onSuccess()
    })

    return () => {
      isMounted.current = false
      if (unsubDetected) unsubDetected()
      if (unsubAll) unsubAll()
      if (window.electronAPI?.stopBrowserDownloadWatcher) {
        window.electronAPI.stopBrowserDownloadWatcher()
      }
    }
  }, [isOpen, profileId, items])

  if (!isOpen) return null

  const totalCount = downloadItems.length
  const completedCount = downloadItems.filter(item => {
    const key = item.id || item.versionId || item.fileName
    return completedIds.has(key)
  }).length
  const isAllDone = totalCount > 0 && completedCount === totalCount

  const handleOpenUrl = (url) => {
    if (!url) return
    if (window.electronAPI?.openBrowserDownloadUrl) {
      window.electronAPI.openBrowserDownloadUrl(url)
    } else if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    }
  }

  const handleOpenAll = () => {
    setOpeningAll(true)
    const pendingItems = downloadItems.filter(item => {
      const key = item.id || item.versionId || item.fileName
      return !completedIds.has(key)
    })

    pendingItems.forEach((item, index) => {
      setTimeout(() => {
        if (item.browserUrl) handleOpenUrl(item.browserUrl)
        if (index === pendingItems.length - 1) setOpeningAll(false)
      }, index * 1200)
    })

    toast.push({
      type: 'info',
      message: `Đang mở ${pendingItems.length} liên kết trong trình duyệt...`
    })
  }

  const handleOpenDownloadsFolder = () => {
    if (window.electronAPI?.openDownloadsFolder) {
      window.electronAPI.openDownloadsFolder()
    }
  }

  const handlePickFile = async (item) => {
    const key = item.id || item.versionId || item.fileName
    try {
      const res = await window.electronAPI.pickBrowserDownloadFile({
        profileId,
        expectedFileName: item.fileName,
        id: key
      })
      if (res?.ok) {
        setCompletedIds(prev => new Set(prev).add(key))
      } else if (res?.error) {
        toast.push({ type: 'error', message: res.error })
      }
    } catch (err) {
      toast.push({ type: 'error', message: err.message })
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return

    for (const f of files) {
      if (!f.name.endsWith('.jar')) continue
      // Find matching pending item
      const cleanName = f.name.toLowerCase().replace(/\s*\(\d+\)\.jar$/i, '.jar')
      const matched = downloadItems.find(it => {
        const key = it.id || it.versionId || it.fileName
        return !completedIds.has(key) && it.fileName.toLowerCase() === cleanName
      })

      if (matched) {
        const key = matched.id || matched.versionId || matched.fileName
        try {
          const res = await window.electronAPI.dropBrowserDownloadFile({
            profileId,
            filePath: f.path,
            expectedFileName: matched.fileName,
            id: key
          })
          if (res?.ok) {
            setCompletedIds(prev => new Set(prev).add(key))
            toast.push({ type: 'success', message: `Đã nạp file: ${matched.fileName}` })
          }
        } catch {}
      } else {
        toast.push({
          type: 'warn',
          message: `File ${f.name} không khớp với tên mod đang chờ!`
        })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full max-w-2xl bg-bg0/95 border ${
          isDragOver ? 'border-accent ring-2 ring-accent/30' : 'border-line/70'
        } rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-all`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-line/60 flex items-start justify-between gap-4 bg-bg1/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <Globe size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-fg">
                  Tải mod bổ sung từ CurseForge
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  CurseForge Protection
                </span>
              </div>
              <p className="text-xs text-fgfaint mt-0.5">
                CurseForge hạn chế tải tự động một số mod từ tác giả. Chỉ cần tải về thư mục Downloads, launcher sẽ tự nhận diện!
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

        {/* Global Toolbar */}
        <div className="px-6 py-3 bg-bg1/20 border-b border-line/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAll}
              disabled={openingAll || isAllDone}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {openingAll ? <CircleNotch size={14} className="animate-spin" /> : <Globe size={14} />}
              Mở tất cả trong trình duyệt
            </button>
            <button
              onClick={handleOpenDownloadsFolder}
              className="px-3 py-1.5 rounded-lg bg-bg2/60 hover:bg-bg2 text-fg font-medium text-xs flex items-center gap-2 border border-line/50 transition-all cursor-pointer"
            >
              <FolderOpen size={14} />
              Mở thư mục Downloads
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Đang tự động theo dõi Downloads
            </span>
          </div>
        </div>

        {/* List of files */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
          {downloadItems.map((item, idx) => {
            const key = item.id || item.versionId || item.fileName
            const isDone = completedIds.has(key)

            return (
              <div
                key={key || idx}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-fg'
                    : 'bg-bg1/40 hover:bg-bg1/70 border-line/50 text-fg'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-bg2 text-fgfaint'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle size={20} weight="fill" />
                    ) : (
                      <DownloadSimple size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-fg truncate">
                        {item.name || item.fileName}
                      </span>
                      {item.platform && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg2 text-fgfaint uppercase font-bold">
                          {item.platform}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-fgfaint truncate font-mono mt-0.5">
                      {item.fileName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isDone ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle size={14} weight="fill" />
                      Đã tải xong
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenUrl(item.browserUrl)}
                        className="px-2.5 py-1 rounded-lg bg-accent/20 hover:bg-accent text-accent hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Mở trang tải về trong trình duyệt"
                      >
                        <Globe size={13} />
                        Mở tải về
                      </button>
                      <button
                        onClick={() => handlePickFile(item)}
                        className="px-2.5 py-1 rounded-lg bg-bg2 hover:bg-bg3 text-fg text-xs font-medium border border-line/50 transition-colors cursor-pointer"
                        title="Chọn file thủ công từ máy"
                      >
                        Chọn file
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Drag & drop banner */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center text-xs transition-colors ${
              isDragOver
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-line/60 bg-bg1/20 text-fgfaint'
            }`}
          >
            <FileArrowUp size={20} className="mx-auto mb-1 opacity-70" />
            Kéo thả file <code>.jar</code> vào đây nếu bạn đã tải thủ công
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line/60 bg-bg1/40 flex items-center justify-between gap-4">
          <div className="text-xs text-fgdim">
            Đã hoàn thành <strong className="text-fg">{completedCount}</strong> / {totalCount} mod
          </div>

          <div className="flex items-center gap-2">
            {isAllDone ? (
              <button
                onClick={() => {
                  if (onSuccess) onSuccess()
                  onClose()
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Sparkle size={15} weight="fill" />
                Hoàn tất & Đóng
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-bg2 hover:bg-bg3 text-fg text-xs font-medium border border-line/50 transition-all cursor-pointer"
              >
                Đóng (có thể tiếp tục sau)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
