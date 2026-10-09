import React, { useState, useEffect, useCallback } from 'react'
import {
  Image, FolderOpen, Trash, Copy, Check, Eye, CaretLeft, CaretRight,
  ArrowsOut, X, DownloadSimple, CircleNotch, CalendarBlank, HardDrive
} from '@phosphor-icons/react'
import { MaidBowIcon, TohruHornsIcon } from './DragonIcons.jsx'
import { PageHeader, Card, Button, Badge, Modal, EmptyState, Select } from './ui.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { formatBytes, formatRelative } from '../utils/format.js'
import { playSound } from '../utils/sound.js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export default function ScreenshotsPage({ profiles, selectedProfileId, onSelectProfile, soundEnabled = true }) {
  const toast = useToast()
  const [profileId, setProfileId] = useState(selectedProfileId || profiles[0]?.id)
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [copiedName, setCopiedName] = useState(null)

  useEffect(() => {
    if (selectedProfileId) setProfileId(selectedProfileId)
  }, [selectedProfileId])

  const loadScreenshots = useCallback(async (id) => {
    if (!isElectron || !id) return
    setLoading(true)
    try {
      const list = await window.electronAPI.listScreenshots(id)
      setScreenshots(list || [])
    } catch {
      setScreenshots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (profileId) {
      loadScreenshots(profileId)
    }
  }, [profileId, loadScreenshots])

  const currentProfile = profiles.find((p) => p.id === profileId) || profiles[0]

  const handleOpenFolder = () => {
    if (!profileId || !isElectron) return
    window.electronAPI.openProfileSubfolder(profileId, 'screenshots')
    playSound('click', soundEnabled)
  }

  const handleDelete = async (filename) => {
    if (!profileId || !isElectron) return
    const res = await window.electronAPI.deleteScreenshot(profileId, filename)
    if (res?.error) {
      toast.push({ type: 'error', message: res.error })
      return
    }
    toast.push({ type: 'success', message: 'Đã xóa ảnh chụp màn hình.' })
    if (lightboxIndex !== null) setLightboxIndex(null)
    loadScreenshots(profileId)
  }

  const handleCopyImage = async (screenshot) => {
    playSound('click', soundEnabled)
    try {
      // Fetch data url to blob
      const res = await fetch(screenshot.dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
      setCopiedName(screenshot.name)
      toast.push({ type: 'success', message: 'Đã sao chép ảnh vào Clipboard!' })
      setTimeout(() => setCopiedName(null), 1500)
    } catch {
      // Fallback: copy filepath
      navigator.clipboard.writeText(screenshot.path)
      toast.push({ type: 'info', message: 'Đã sao chép đường dẫn file ảnh.' })
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <PageHeader
        eyebrow="🎀 CUỘN TRANH KỶ NIỆM"
        title="Ảnh Chụp Màn Hình F2 (Screenshots)"
        subtitle="Lưu giữ những khoảnh khắc phiêu lưu kỳ diệu trong Minecraft dâng tặng Kobayashi-sama."
      >
        <div className="flex items-center gap-2">
          {profiles.length > 0 && (
            <Select
              value={profileId || ''}
              onChange={(e) => {
                setProfileId(e.target.value)
                onSelectProfile?.(e.target.value)
                playSound('tab', soundEnabled)
              }}
              className="text-xs bg-bg0 text-fg font-medium max-w-[200px]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenFolder}
            className="gap-1.5"
            disabled={!profileId}
          >
            <FolderOpen size={14} />
            Mở thư mục ảnh
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2 custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-fgdim gap-3">
            <CircleNotch size={24} className="animate-spin text-accent" />
            Đang quét thư viện ảnh…
          </div>
        ) : screenshots.length === 0 ? (
          <EmptyState
            icon={<Image size={32} weight="duotone" />}
            title="Chưa có ảnh chụp nào"
            desc="Nhấn phím F2 bất kỳ lúc nào trong game Minecraft để chụp lại khoảnh khắc. Ảnh sẽ tự động xuất hiện ở đây."
            action={
              <Button variant="subtle" size="md" onClick={handleOpenFolder}>
                <FolderOpen size={16} />
                Mở thư mục screenshots
              </Button>
            }
          />
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-fgfaint">
              <span>Đang hiển thị {screenshots.length} ảnh trong {currentProfile?.name}</span>
              <span>Bấm vào ảnh để xem toàn màn hình</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((s, index) => (
                <div
                  key={s.name}
                  className="group relative rounded-xl overflow-hidden bg-bg1 border border-line hover:border-accent/40 transition-all duration-200 flex flex-col shadow-lg"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-video overflow-hidden bg-bg0 cursor-pointer"
                    onClick={() => {
                      setLightboxIndex(index)
                      playSound('click', soundEnabled)
                    }}
                  >
                    <img
                      src={s.dataUrl}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Hover Actions Bar */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="p-2 rounded-lg bg-bg0/80 text-fg hover:text-accent transition-colors shadow">
                        <ArrowsOut size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-3 bg-bg1/90 flex flex-col justify-between flex-1">
                    <div className="text-xs font-semibold text-fg truncate" title={s.name}>
                      {s.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-fgfaint">
                      <span>{formatRelative(new Date(s.mtimeMs).toISOString())}</span>
                      <span>{formatBytes(s.sizeBytes)}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-line/50 flex items-center justify-between">
                      <button
                        onClick={() => handleCopyImage(s)}
                        className="text-[11px] text-fgdim hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sao chép ảnh"
                      >
                        {copiedName === s.name ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedName === s.name ? 'Đã copy' : 'Sao chép'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(s.name)}
                        className="text-[11px] text-fgfaint hover:text-rose-400 transition-colors p-1 rounded"
                        title="Xóa ảnh này"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && screenshots[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Header */}
          <div
            className="h-14 px-6 flex items-center justify-between border-b border-white/10 bg-black/40 text-fg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-bold text-sm truncate">
                {screenshots[lightboxIndex].name}
              </span>
              <Badge tone="neutral">
                {lightboxIndex + 1} / {screenshots.length}
              </Badge>
              <span className="text-xs text-fgfaint hidden sm:inline">
                {formatBytes(screenshots[lightboxIndex].sizeBytes)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyImage(screenshots[lightboxIndex])}
                className="gap-1.5"
              >
                <Copy size={14} />
                Sao chép
              </Button>
              <Button
                variant="danger-soft"
                size="sm"
                onClick={() => handleDelete(screenshots[lightboxIndex].name)}
              >
                <Trash size={14} />
              </Button>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-fgdim hover:text-fg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Image View */}
          <div
            className="flex-1 flex items-center justify-center p-6 relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={screenshots[lightboxIndex].dataUrl}
              alt=""
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />

            {/* Prev / Next controls */}
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl"
              >
                <CaretLeft size={20} weight="bold" />
              </button>
            )}
            {lightboxIndex < screenshots.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl"
              >
                <CaretRight size={20} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
