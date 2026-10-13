import React, { useState, useEffect } from 'react'
import {
  X,
  Lightning,
  CheckCircle,
  DownloadSimple,
  CircleNotch,
  Sparkle,
  Cpu,
  ShieldCheck,
  Globe
} from '@phosphor-icons/react'
import { useToast } from '../../hooks/useToast.jsx'

// Definitive Minecraft Performance Optimization Mods
const OPTIMIZER_MODS_DATABASE = [
  {
    id: 'fabric-api',
    name: 'Fabric API',
    description: 'Thư viện nền tảng bắt buộc để các mod tối ưu (Sodium, Lithium, ...) hoạt động.',
    loaders: ['fabric'],
    slugModrinth: 'fabric-api',
    cfModId: 306612,
    category: 'core',
    recommended: true
  },
  {
    id: 'sodium',
    name: 'Sodium',
    description: 'Thay thế engine render của Minecraft, tăng FPS gấp 2 - 5 lần cực kỳ mượt mà.',
    loaders: ['fabric', 'neoforge'],
    slugModrinth: 'sodium',
    cfModId: 394468,
    category: 'rendering',
    recommended: true
  },
  {
    id: 'indium',
    name: 'Indium',
    description: 'Triển khai Fabric Rendering API cho Sodium, tránh xung đột và giật lag với các mod block 3D.',
    loaders: ['fabric'],
    slugModrinth: 'indium',
    cfModId: 577422,
    category: 'rendering',
    recommended: true
  },
  {
    id: 'embeddium',
    name: 'Embeddium',
    description: 'Bản port của Sodium cho Forge/NeoForge, tăng vọt FPS và tương thích cao.',
    loaders: ['forge', 'neoforge'],
    slugModrinth: 'embeddium',
    cfModId: 908741,
    category: 'rendering',
    recommended: true
  },
  {
    id: 'lithium',
    name: 'Lithium',
    description: 'Tối ưu hóa CPU: AI quái vật, vật lý, chunk loading không làm thay đổi gameplay.',
    loaders: ['fabric', 'neoforge'],
    slugModrinth: 'lithium',
    cfModId: 360438,
    category: 'cpu',
    recommended: true
  },
  {
    id: 'ferritecore',
    name: 'FerriteCore',
    description: 'Giảm 30% - 50% lượng RAM sử dụng của Minecraft, tránh tràn RAM và giật lag.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'ferrite-core',
    cfModId: 429235,
    category: 'ram',
    recommended: true
  },
  {
    id: 'immediatelyfast',
    name: 'ImmediatelyFast',
    description: 'Tối ưu render GUI, menu, văn bản, thanh máu và HUD.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'immediatelyfast',
    cfModId: 686904,
    category: 'rendering',
    recommended: true
  },
  {
    id: 'modernfix',
    name: 'ModernFix',
    description: 'Tăng tốc khởi động game lên 2x, sửa memory leak và tối ưu nạp dữ liệu.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'modernfix',
    cfModId: 790626,
    category: 'engine',
    recommended: true
  },
  {
    id: 'entityculling',
    name: 'Entity Culling',
    description: 'Bỏ qua việc render quái vật/rương sau bức tường, tăng vọt FPS ở farm đông.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'entityculling',
    cfModId: 448233,
    category: 'rendering',
    recommended: true
  },
  {
    id: 'krypton',
    name: 'Krypton',
    description: 'Tối ưu hóa network stack, giảm nghẽn packet và giật lag khi tải chunk.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'krypton',
    cfModId: 531398,
    category: 'cpu',
    recommended: true
  },
  {
    id: 'badoptimizations',
    name: 'BadOptimizations',
    description: 'Loại bỏ các phép tính thừa (ánh sáng bầu trời, bảng điểm), tăng độ mượt mà tối đa.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'badoptimizations',
    cfModId: 970619,
    category: 'engine',
    recommended: true
  },
  {
    id: 'memoryleakfix',
    name: 'Memory Leak Fix',
    description: 'Sửa triệt để rò rỉ RAM bộ nhớ, ngăn chặn game càng chơi lâu càng bị giật hình.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'memoryleakfix',
    cfModId: 627566,
    category: 'ram',
    recommended: true
  },
  {
    id: 'culllessleaves',
    name: 'Cull Less Leaves',
    description: 'Cắt giảm render các mặt lá cây bị che khuất, tăng vọt FPS ở rừng cây rậm rạp.',
    loaders: ['fabric', 'forge', 'neoforge'],
    slugModrinth: 'cull-less-leaves',
    cfModId: 575210,
    category: 'rendering',
    recommended: true
  }
]

export default function OptimizerModal({
  isOpen,
  onClose,
  profile,
  installedMods = [],
  onInstalled
}) {
  const toast = useToast()
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState('')

  const loaderLower = (profile?.loader || 'fabric').toLowerCase()
  const gameVersion = profile?.gameVersion || '1.20.1'

  // Filter mods compatible with this profile's loader
  const compatibleMods = OPTIMIZER_MODS_DATABASE.filter(m => {
    if (loaderLower === 'fabric') return m.loaders.includes('fabric')
    if (loaderLower === 'forge') return m.loaders.includes('forge')
    if (loaderLower === 'neoforge') return m.loaders.includes('neoforge')
    return false
  })

  // Check which are already installed
  const installedNormalized = new Set(
    installedMods.map(m => (m.name || m.id || m.filename || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  )

  const isModInstalled = (mod) => {
    const idClean = mod.id.toLowerCase().replace(/[^a-z0-9]/g, '')
    const nameClean = mod.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const inst of installedNormalized) {
      if (inst.includes(idClean) || inst.includes(nameClean)) return true
    }
    return false
  }

  // Pre-select not-yet-installed recommended mods
  useEffect(() => {
    if (!isOpen) return
    const initial = new Set()
    for (const m of compatibleMods) {
      if (!isModInstalled(m) && m.recommended) {
        initial.add(m.id)
      }
    }
    setSelectedIds(initial)
  }, [isOpen, profile])

  if (!isOpen) return null

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleInstallSelected = async () => {
    if (selectedIds.size === 0) return
    setInstalling(true)

    const modsToInstall = compatibleMods.filter(m => selectedIds.has(m.id) && !isModInstalled(m))
    let successCount = 0

    try {
      for (let i = 0; i < modsToInstall.length; i++) {
        const mod = modsToInstall[i]
        setInstallProgress(`[${i + 1}/${modsToInstall.length}] Đang tìm & tải ${mod.name}...`)

        try {
          // Look up on Modrinth first
          const vers = await window.electronAPI.modrinthVersions(mod.slugModrinth, {
            gameVersions: [gameVersion],
            loaders: [loaderLower]
          })

          if (vers && vers.length > 0) {
            const bestVer = vers.find(v => v.version_type === 'release') || vers[0]
            await window.electronAPI.installMod({
              platform: 'modrinth',
              modId: mod.slugModrinth,
              versionId: bestVer.id,
              profileId: profile.id,
              projectType: 'mod'
            })
            successCount++
          } else {
            // Fallback to CurseForge
            const cfFiles = await window.electronAPI.curseforgeVersions(mod.cfModId, {
              gameVersions: [gameVersion],
              loaders: [loaderLower]
            })
            if (cfFiles && cfFiles.length > 0) {
              const bestFile = cfFiles.find(f => f.version_type === 'release') || cfFiles[0]
              await window.electronAPI.installMod({
                platform: 'curseforge',
                modId: mod.cfModId,
                versionId: bestFile.id,
                profileId: profile.id,
                projectType: 'mod'
              })
              successCount++
            }
          }
        } catch (err) {
          console.error(`Error installing ${mod.name}:`, err)
        }
      }

      if (successCount > 0) {
        // Automatically check and resolve any missing secondary dependencies (e.g. cloth-config)
        if (window.electronAPI?.checkMissingMods) {
          try {
            setInstallProgress('Đang tự động kiểm tra thư viện phụ thuộc còn thiếu...')
            const missing = await window.electronAPI.checkMissingMods(profile.id)
            if (missing?.missing && missing.missing.length > 0) {
              const missingPayload = missing.missing.map(m => ({
                platform: m.platform,
                modId: m.modId,
                versionId: m.versionId,
                projectType: 'mod'
              }))
              await window.electronAPI.installBatchMods(profile.id, missingPayload)
            }
          } catch (depErr) {
            console.warn('Dependency check warning:', depErr)
          }
        }

        // Auto-tune game options
        if (window.electronAPI?.optimizeGameOptions) {
          try {
            await window.electronAPI.optimizeGameOptions(profile.id)
          } catch {}
        }

        toast.push({
          type: 'success',
          message: `Đã cài đặt thành công ${successCount} mod tối ưu hóa và cấu hình game siêu mượt!`
        })
        if (onInstalled) onInstalled()
        onClose()
      } else {
        toast.push({
          type: 'warn',
          message: 'Không tìm thấy phiên bản mod tối ưu phù hợp với phiên bản Minecraft này.'
        })
      }
    } catch (err) {
      toast.push({ type: 'error', message: err.message })
    } finally {
      setInstalling(false)
      setInstallProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-bg0/95 border border-line/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line/60 flex items-start justify-between gap-4 bg-bg1/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 shadow-lg shadow-accent/10">
              <Lightning size={22} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-fg">
                  Gói Tối Ưu Mượt Nhất (Optimizer Mods)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent uppercase">
                  {loaderLower} {gameVersion}
                </span>
              </div>
              <p className="text-xs text-fgfaint mt-0.5">
                Cài đặt các mod tối ưu render engine, giảm RAM và tăng vọt FPS từ 2x - 5x.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={installing}
            className="p-1.5 rounded-lg text-fgfaint hover:text-fg hover:bg-bg2 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
          {compatibleMods.map((mod) => {
            const installed = isModInstalled(mod)
            const selected = selectedIds.has(mod.id)

            return (
              <div
                key={mod.id}
                onClick={() => { if (!installed && !installing) toggleSelect(mod.id) }}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  installed
                    ? 'bg-emerald-500/10 border-emerald-500/30 opacity-80 cursor-default'
                    : selected
                    ? 'bg-accent/10 border-accent/50 cursor-pointer shadow-sm'
                    : 'bg-bg1/40 border-line/50 hover:bg-bg1/70 cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="pt-0.5">
                    {installed ? (
                      <CheckCircle size={18} weight="fill" className="text-emerald-400" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={installing}
                        onChange={() => {}}
                        className="rounded border-line text-accent focus:ring-accent/40 w-4 h-4 cursor-pointer mt-0.5"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fg">{mod.name}</span>
                      {installed && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                          Đã cài đặt
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-fgfaint leading-relaxed mt-0.5">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line/60 bg-bg1/40 flex items-center justify-between gap-4">
          <div className="text-xs text-fgfaint">
            {installing ? (
              <span className="flex items-center gap-2 text-accent font-medium">
                <CircleNotch size={14} className="animate-spin" />
                {installProgress}
              </span>
            ) : (
              <span>Đã chọn <b>{selectedIds.size}</b> mod tối ưu</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={installing}
              className="px-4 py-2 rounded-xl bg-bg2 hover:bg-bg3 text-fg text-xs font-medium border border-line/50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleInstallSelected}
              disabled={installing || selectedIds.size === 0}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accentstrong disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-accent/20 transition-all cursor-pointer"
            >
              {installing ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Đang cài đặt...
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" />
                  Cài đặt ngay ({selectedIds.size})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
