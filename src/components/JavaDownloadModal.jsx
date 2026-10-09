import React, { useEffect, useState } from 'react'
import { Coffee, CircleNotch, CheckCircle, DownloadSimple, Warning } from '@phosphor-icons/react'
import { Button, ProgressBar } from './ui.jsx'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export default function JavaDownloadModal({ isOpen, onClose, onSuccess, mode = 'all', gameVersion = null, component = null }) {
  const [distros, setDistros] = useState([])
  const [installed, setInstalled] = useState([])
  const [step, setStep] = useState('idle') // idle, fetching, confirm, downloading, success, error
  const [currentDownloadIndex, setCurrentDownloadIndex] = useState(0)
  const [downloadList, setDownloadList] = useState([])
  const [progress, setProgress] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen) return
    
    // Reset state
    setStep('fetching')
    setErrorMsg('')
    setProgress(null)
    setCurrentDownloadIndex(0)
    
    const init = async () => {
      try {
        const [dRes, iRes] = await Promise.all([
          window.electronAPI.javaFetchDistros(),
          window.electronAPI.javaGetInstalled()
        ])
        
        const allDistros = dRes?.distros || []
        const inst = iRes?.installed || []
        setDistros(allDistros)
        setInstalled(inst)
        
        let toInstall = []
        if (mode === 'all') {
          // Download all missing distros
          toInstall = allDistros.filter(d => !inst.some(i => i.component === d.component))
          // If none are missing but we are forced to install (e.g. from app load), we don't show the modal
          if (toInstall.length === 0 && inst.length === 0) {
            // No runtimes installed at all, install all
            toInstall = allDistros
          }
        } else if (mode === 'single') {
          if (gameVersion) {
            // Find required component
            const reqRes = await window.electronAPI.javaGetForVersion(gameVersion)
            const want = reqRes?.want?.component
            const foundDistro = allDistros.find(d => d.component === want)
            if (foundDistro) {
              toInstall = [foundDistro]
            }
          } else if (component) {
            const foundDistro = allDistros.find(d => d.component === component)
            if (foundDistro) {
              toInstall = [foundDistro]
            }
          }
        }
        
        setDownloadList(toInstall)
        
        if (toInstall.length === 0) {
          setStep('idle')
          onSuccess?.()
          onClose()
        } else {
          setStep('confirm')
        }
      } catch (err) {
        console.error('Failed to init Java distros:', err)
        setErrorMsg('Không thể tải danh sách Java từ server Mojang: ' + err.message)
        setStep('error')
      }
    }
    
    init()
  }, [isOpen, mode, gameVersion])

  useEffect(() => {
    if (step !== 'downloading' || downloadList.length === 0) return
    if (currentDownloadIndex >= downloadList.length) {
      setStep('success')
      onSuccess?.()
      return
    }
    
    let active = true
    const currentPkg = downloadList[currentDownloadIndex]
    
    // Listen for progress
    const off = window.electronAPI.onJavaInstallProgress((p) => {
      if (active && p?.component === currentPkg.component) {
        setProgress(p)
      }
    })
    
    const runInstall = async () => {
      const res = await window.electronAPI.javaInstall(currentPkg)
      if (!active) return
      
      if (res?.error) {
        setErrorMsg(`Lỗi khi cài đặt ${currentPkg.component}: ${res.error}`)
        setStep('error')
      } else {
        // Move to next distro
        setCurrentDownloadIndex(prev => prev + 1)
        setProgress(null)
      }
    }
    
    runInstall()
    
    return () => {
      active = false
      try { off && off() } catch {}
    }
  }, [step, currentDownloadIndex, downloadList])

  if (!isOpen) return null

  const currentPkg = downloadList[currentDownloadIndex]
  const percent = Math.min(100, Math.max(0, Math.round(progress?.percent ?? 0)))
  const showIndet = progress && (progress.stage === 'fetching-manifest' || progress.stage === 'starting') && percent === 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-bg1 border border-line rounded-2xl w-full max-w-md p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        
        {/* Glow background effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-accentsoft/20 border border-accent/20 flex items-center justify-center text-accent mb-4 relative z-10">
          {step === 'fetching' || step === 'downloading' ? (
            <CircleNotch size={32} className="animate-spin" />
          ) : step === 'success' ? (
            <CheckCircle size={32} className="text-emerald-400" />
          ) : step === 'error' ? (
            <Warning size={32} className="text-red-400" />
          ) : (
            <Coffee size={32} />
          )}
        </div>

        {/* Header Title */}
        <h3 className="text-lg font-extrabold text-fg mb-2 relative z-10">
          {step === 'fetching' && 'Đang kiểm tra Java Runtime...'}
          {step === 'confirm' && 'Yêu cầu Java Runtime'}
          {step === 'downloading' && `Đang tải Java (${currentDownloadIndex + 1}/${downloadList.length})`}
          {step === 'success' && 'Cài đặt thành công!'}
          {step === 'error' && 'Đã xảy ra lỗi'}
        </h3>

        {/* Content Description */}
        <div className="text-xs text-fgfaint mb-6 leading-relaxed relative z-10 max-w-[340px]">
          {step === 'fetching' && 'Đang quét hệ thống và lấy thông tin phiên bản từ máy chủ Mojang...'}
          
          {step === 'confirm' && (
            <>
              Để khởi chạy game mượt mà và tương thích với mọi phiên bản Minecraft, bạn cần tải về Java Runtime.
              <div className="mt-4 p-3 rounded-xl bg-bg2/50 border border-line/60 text-left space-y-1.5 font-mono text-[10.5px]">
                <div className="font-bold text-accent mb-1 uppercase tracking-wider text-[9px]">Danh sách tải xuống ({downloadList.length}):</div>
                {downloadList.map(d => (
                  <div key={d.component} className="flex items-center justify-between text-fgdim">
                    <span>• {d.component}</span>
                    <span className="text-accent font-semibold">Java {d.majorVersion}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'downloading' && currentPkg && (
            <div className="w-full text-left space-y-3">
              <div className="flex items-baseline justify-between text-[11px] font-mono text-fgdim">
                <span className="font-bold text-accent">{currentPkg.component} (Java {currentPkg.majorVersion})</span>
                {!showIndet && <span className="text-accent font-semibold">{percent}%</span>}
              </div>
              
              <ProgressBar value={percent} indeterminate={showIndet} />
              
              <div className="text-[10px] font-mono text-fgfaint truncate mt-1">
                {progress?.stage === 'starting' && 'Đang chuẩn bị khởi tạo...'}
                {progress?.stage === 'fetching-manifest' && 'Đang phân tích cấu trúc gói cài đặt...'}
                {progress?.stage === 'downloading' && (progress.file ? `Tải file: ${progress.file}` : `Đang tải: ${progress.done}/${progress.total} file`)}
              </div>
            </div>
          )}

          {step === 'success' && 'Tất cả phiên bản Java Runtime cần thiết đã được cài đặt và cấu hình hoàn tất. Bây giờ bạn có thể trải nghiệm Minecraft.'}
          
          {step === 'error' && <p className="text-red-400 font-mono text-left bg-red-950/20 border border-red-500/25 p-3 rounded-xl break-words">{errorMsg}</p>}
        </div>

        {/* Footer Actions */}
        <div className="w-full flex items-center justify-center gap-3 relative z-10">
          {step === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-bg2 hover:bg-bg3 border border-line text-xs font-semibold cursor-pointer text-fgdim hover:text-fg transition-colors"
              >
                Hủy bỏ
              </button>
              <Button
                variant="primary"
                onClick={() => setStep('downloading')}
                className="flex-1 py-2"
              >
                <DownloadSimple size={14} weight="bold" />
                Tải xuống
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button
              variant="primary"
              onClick={onClose}
              className="w-full py-2"
            >
              Bắt đầu chơi
            </Button>
          )}

          {step === 'error' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-bg2 hover:bg-bg3 border border-line text-xs font-semibold cursor-pointer text-fgdim hover:text-fg transition-colors"
              >
                Đóng
              </button>
              <Button
                variant="primary"
                onClick={() => setStep('fetching')}
                className="flex-1 py-2"
              >
                Thử lại
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
