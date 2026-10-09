import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from './ui.jsx'
import { X, Upload, CheckCircle } from '@phosphor-icons/react'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const SKIN_TYPES = [
  { id: 'wide', label: 'Cánh rộng (Classic / Wide)' },
  { id: 'slim', label: 'Cánh thon (Alex / Slim)' },
]

export default function SkinCustomizeModal({ account, onClose, onApply }) {
  const [selectedFile, setSelectedFile]   = useState(null)
  const [previewUrl, setPreviewUrl]       = useState(null)
  const [skinType, setSkinType]           = useState('wide')
  const [isDragging, setIsDragging]       = useState(false)
  const [applying, setApplying]           = useState(false)
  const [done, setDone]                   = useState(false)
  const fileInputRef                      = useRef(null)
  const dragCounter                       = useRef(0)

  useEffect(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setDone(false)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function processFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(url)
  }

  const onDragEnter = useCallback(e => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) setIsDragging(true)
  }, [])
  const onDragOver = useCallback(e => { e.preventDefault(); e.stopPropagation() }, [])
  const onDragLeave = useCallback(e => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])
  const onDrop = useCallback(e => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current = 0; setIsDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }, [])

  function handleBrowse() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    processFile(e.target.files[0])
    e.target.value = ''
  }

  async function handleApply() {
    const url = previewUrl
    if (!url) return
    setApplying(true)
    try {
      let finalUrl = url
      if (selectedFile) {
        finalUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(selectedFile)
        })
      }

      // Save local preferences
      const newPrefs = {
        uuid:          account?.uuid,
        skinUrl:       finalUrl,
        capeUrl:       null,
        elytraUrl:     null,
        useCustomSkin: true,
      }

      if (isElectron) {
        await window.electronAPI.saveSkinPrefs(newPrefs)
        // Save local file
        if (finalUrl && finalUrl.startsWith('data:')) {
          try {
            await window.electronAPI.saveSkinLocalFile({
              uuid: account?.uuid,
              dataUrl: finalUrl,
              type: 'skin',
            })
          } catch (e) {
            console.error('Lỗi khi lưu file local:', e)
          }
        }
      } else {
        localStorage.setItem(`vxc_skin_prefs_${account?.uuid}`, JSON.stringify(newPrefs))
      }

      onApply?.({ type: 'skin', url: finalUrl, skinType: skinType })
      setDone(true)
      setTimeout(() => onClose(), 800)
    } catch (err) {
      console.error(err)
    } finally {
      setApplying(false)
    }
  }

  const canApply = !!previewUrl && !applying && !done

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-bg1 border border-line shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
          <div>
            <h3 className="text-fg font-bold text-base">Tùy chỉnh diện mạo</h3>
            <p className="text-fgfaint text-xs mt-0.5">{account?.username}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-fgdim hover:bg-bg2 hover:text-fg transition-colors">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <div>
            <label className="text-[11px] text-fgfaint font-semibold uppercase tracking-wider mb-2 block">
              Kiểu mẫu Skin (Skin Type)
            </label>
            <div className="flex gap-2">
              {SKIN_TYPES.map(st => (
                <button key={st.id} onClick={() => setSkinType(st.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    skinType === st.id
                      ? 'bg-accentsoft/20 border-accent/40 text-accent'
                      : 'bg-bg2 border-line text-fgdim hover:text-fg hover:bg-bg3'
                  }`}>
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-fgfaint font-semibold uppercase tracking-wider mb-2 block">
              Tải tệp ảnh PNG lên
            </label>
            <div
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={handleBrowse}
              className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer transition-all duration-200"
              style={{
                background: isDragging ? 'rgba(251,146,60,0.06)' : 'rgba(255,255,255,0.01)',
                border: `1px dashed ${isDragging ? 'var(--color-accent, #fb923c)' : 'var(--color-line, rgba(255,255,255,0.08))'}`,
              }}
            >
              {previewUrl && selectedFile ? (
                <img src={previewUrl} alt="preview"
                  className="w-12 h-12 rounded-lg object-contain flex-shrink-0"
                  style={{ imageRendering: 'pixelated', background: 'rgba(255,255,255,0.05)' }} />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-bg2 border border-line flex items-center justify-center flex-shrink-0 text-fgdim">
                  <Upload size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-fg">
                  {isDragging ? 'Thả tệp ảnh vào đây...' : selectedFile ? selectedFile.name : 'Kéo thả hoặc nhấn để chọn tệp'}
                </p>
                <p className="text-[10px] text-fgfaint mt-0.5">Hỗ trợ định dạng hình ảnh PNG chuẩn</p>
              </div>
              {selectedFile && (
                <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null) }}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-fgdim hover:text-fg hover:bg-bg3 transition-all flex-shrink-0">
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-line bg-bg0 flex-shrink-0">
          <Button variant="subtle" size="lg" className="flex-1" onClick={onClose} disabled={applying}>
            Huỷ
          </Button>
          <Button
            variant={done ? 'subtle' : 'primary'}
            size="lg"
            className="flex-1 flex items-center justify-center gap-1.5"
            onClick={handleApply}
            disabled={!canApply}
            loading={applying}
          >
            {done ? (
              <>
                <CheckCircle size={16} weight="fill" className="text-success" />
                Đã áp dụng
              </>
            ) : 'Áp dụng'}
          </Button>
        </div>
      </div>
    </div>
  )
}
