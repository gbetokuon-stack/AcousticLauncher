import React, { useEffect, useState } from 'react'
import { useToast } from '../hooks/useToast.jsx'
import {
  Gear, Coffee, FolderOpen, Info, Cpu, Trash, DownloadSimple,
  CircleNotch, CheckCircle, Wrench, Palette, SpeakerHigh, SpeakerSlash,
  Sparkle, Check,
} from '@phosphor-icons/react'
import {
  TohruHornsIcon,
  DragonFlameIcon,
  MaidBowIcon,
  KobayashiGlassesIcon,
} from './DragonIcons.jsx'
import { PageHeader, Card, Button, Badge, ProgressBar, Stat, Select } from './ui.jsx'
import { THEMES } from '../theme/themeConfig.js'
import { playSound } from '../utils/sound.js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export default function SettingsPage({
  onSettingsChanged,
  onOpenJavaModal,
  currentTheme = 'rose',
  onThemeChange,
  soundEnabled = true,
  onSoundToggle,
  particlesEnabled = true,
  onParticlesToggle,
}) {
  const toast = useToast()
  const [settings, setSettings] = useState(null)
  const [distros, setDistros] = useState([])
  const [installed, setInstalled] = useState([])
  const [paths, setPaths] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    if (!isElectron) return
    const [s, d, i, p] = await Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.javaFetchDistros(),
      window.electronAPI.javaGetInstalled(),
      window.electronAPI.getPaths(),
    ])
    setSettings(s)
    setDistros(d?.distros || [])
    setInstalled(i?.installed || [])
    setPaths(p)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  const update = async (patch) => {
    const next = await window.electronAPI.setSettings(patch)
    setSettings(next)
    onSettingsChanged?.()
  }

  const removeJava = async (j) => {
    const r = await window.electronAPI.javaDelete(j.component, j.majorVersion)
    toast.push({ type: 'success', message: r?.ok ? 'Đã xoá runtime.' : 'Không xoá được.' })
    reload()
  }

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-fgdim gap-3">
        <CircleNotch size={20} className="animate-spin" />
        Đang tải…
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        eyebrow="👓 THIẾT LẬP KOBAYASHI"
        title="Cài Đặt Hệ Thống & Ma Thuật"
        subtitle="Tinh chỉnh giao diện Rồng Hầu Gái, cấu hình JRE runtime và quản lý dữ liệu cho Kobayashi-sama."
      />

      <div className="px-8 pt-6 pb-5 space-y-4">
        {/* Appearance & Themes */}
        <Section
          icon={<TohruHornsIcon size={19} className="text-accent" />}
          title="Giao Diện Rồng Hầu Gái & Hiệu Ứng"
          desc="Tùy biến theme nhân vật, âm thanh phản hồi xúc giác và bụi sáng ma thuật ambient."
        >
          {/* Theme selector */}
          <div className="py-1">
            <div className="text-sm text-fg font-medium mb-1">Chủ Đề Nhân Vật (Dragon Maid Themes)</div>
            <div className="text-xs text-fgfaint mb-3">Đổi phong cách màu sắc và linh hồn rồng theo nhân vật bạn yêu thích:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {['tohru', 'kanna', 'elma', 'lucoa', 'kobayashi'].map((id) => {
                const t = THEMES[id]
                if (!t) return null
                const isActive = currentTheme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      playSound('click', soundEnabled)
                      onThemeChange?.(t.id)
                    }}
                    className={[
                      'flex flex-col p-3 rounded-xl border text-left transition-all duration-150 group cursor-pointer relative overflow-hidden',
                      isActive
                        ? 'bg-accentsoft border-accent shadow-[0_0_15px_var(--color-accentsoft)] ring-1 ring-accent'
                        : 'bg-bg0/60 border-line hover:border-linestrong hover:bg-white/4'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${t.previewGradient} flex-shrink-0 shadow ring-1 ring-white/20 flex items-center justify-center`}
                      >
                        {isActive && <Check size={12} weight="bold" className="text-white drop-shadow" />}
                      </div>
                      <div className="text-xs font-black text-fg truncate group-hover:text-accent transition-colors">
                        {t.name}
                      </div>
                    </div>
                    {t.desc && (
                      <div className="text-[10px] text-fgfaint line-clamp-2 leading-relaxed">
                        {t.desc}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-[1px] bg-line/60 my-4" />

          {/* Sound Effects */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm text-fg font-medium flex items-center gap-2">
                <SpeakerHigh size={15} className="text-accent" />
                Âm thanh giao diện (UI Audio FX)
              </div>
              <div className="text-xs text-fgfaint mt-0.5">Phát âm thanh tổng hợp phản hồi khi bấm nút, chuyển tab và khởi chạy Minecraft.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={() => onSoundToggle?.()}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-white/5 rounded-full peer peer-focus:ring-1 peer-focus:ring-accent/30 dark:bg-bg0 border border-line peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-fgdim peer-checked:after:bg-[#0d070b] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
            </label>
          </div>

          <div className="h-[1px] bg-line/60 my-4" />

          {/* Ambient Particles */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm text-fg font-medium flex items-center gap-2">
                <Sparkle size={15} className="text-accent" />
                Hiệu ứng bụi sáng lơ lửng (Ambient Particles)
              </div>
              <div className="text-xs text-fgfaint mt-0.5">Hiệu ứng hạt ánh sáng nhẹ nhàng trôi nổi trên nền launcher, tự đổi màu theo theme.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={particlesEnabled}
                onChange={() => onParticlesToggle?.()}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-white/5 rounded-full peer peer-focus:ring-1 peer-focus:ring-accent/30 dark:bg-bg0 border border-line peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-fgdim peer-checked:after:bg-[#0d070b] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
            </label>
          </div>
        </Section>

        {/* General */}
        <Section
          icon={<Gear size={18} />}
          title="Chung"
          desc="Tinh chỉnh mặc định cho mọi profile mới."
        >
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm text-fg font-medium">RAM mặc định</div>
              <div className="text-xs text-fgfaint mt-0.5">Áp dụng cho profile mới. Có thể chỉnh riêng trong từng profile.</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="16"
                value={settings.ramGb}
                onChange={(e) => update({ ramGb: parseInt(e.target.value, 10) })}
                className="w-40 accent-accent"
              />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg0 ring-1 ring-line">
                <Cpu size={13} className="text-accent" />
                <span className="text-sm text-fg font-mono tabular-nums w-14">{settings.ramGb} GB</span>
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-line/60 my-4" />

          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm text-fg font-medium">Discord Rich Presence</div>
              <div className="text-xs text-fgfaint mt-0.5">Hiển thị trạng thái hoạt động của bạn trên Discord (đang chơi game, đang xem các tab).</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.discordRPC !== false}
                onChange={(e) => update({ discordRPC: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-white/5 rounded-full peer peer-focus:ring-1 peer-focus:ring-accent/30 dark:bg-bg0 border border-line peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-fgdim peer-checked:after:bg-[#0d070b] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
            </label>
          </div>

          <div className="h-[1px] bg-line/60 my-4" />

          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm text-fg font-medium">Video hình nền Launcher</div>
              <div className="text-xs text-fgfaint mt-0.5">Chọn video hoạt cảnh Minecraft chạy dưới nền ứng dụng.</div>
            </div>
            <Select
              value={settings.videoBg || 'sunset-shader.1920x1080.mp4'}
              onChange={(e) => update({ videoBg: e.target.value })}
              className="w-64 text-xs font-semibold bg-bg0 text-fg"
            >
              <option value="none">Không dùng video (Tông Rose-Dark)</option>
              <option value="random">Tự động chuyển (Random)</option>
              <option value="sunset-shader.1920x1080.mp4">Sunset Shader (Mặc định)</option>
              <option value="cherry-blossom.1920x1080.mp4">Cherry Blossom</option>
              <option value="minecraft-sunset-farm.3840x2160.mp4">Minecraft Sunset Farm</option>
              <option value="sakura-forest-minecraft.1920x1080.mp4">Sakura Forest</option>
            </Select>
          </div>
        </Section>

        {/* Java */}
        <Section
          icon={<Coffee size={18} />}
          title="Java Runtime"
          desc="Tự động chọn Java theo phiên bản Minecraft: 8 cho ≤1.16, 17 cho 1.17–1.20, 21 cho 1.21+."
        >
          <RecommendationHint />
          
          {distros.length > 0 && (
            <div className="mb-4 flex items-center justify-between gap-4 p-4 rounded-xl bg-bg2/30 border border-line">
              <div>
                <div className="text-xs font-bold text-fg uppercase tracking-wider text-accent">Cài đặt tự động toàn bộ JRE</div>
                <div className="text-xs text-fgfaint mt-1.5">Tải xuống và cấu hình cùng lúc cả 4 phiên bản Java Runtime (Java 8, 17, 21, 25) để chơi mọi phiên bản game.</div>
              </div>
              <Button
                variant={installed.length < distros.length ? 'primary' : 'subtle'}
                size="sm"
                onClick={() => onOpenJavaModal?.('all', null, reload)}
                className="shrink-0 font-semibold"
              >
                <DownloadSimple size={13} weight="bold" />
                {installed.length < distros.length ? 'Cài đặt tất cả' : 'Tải lại toàn bộ'}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {distros.length === 0 && (
              <div className="text-sm text-fgdim flex items-center gap-2">
                <CircleNotch size={14} className="animate-spin" />
                Đang tải danh sách runtime…
              </div>
            )}
            {distros.map((d) => {
              const isInstalled = installed.some((i) => i.component === d.component)
              return (
                <div
                  key={d.component}
                  className={[
                    'rounded-lg overflow-hidden transition-colors ring-1',
                    isInstalled ? 'bg-accentsoft/30 ring-accent/30' : 'bg-bg0 ring-line',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-fg text-sm">{d.component}</span>
                        <Badge mono tone="neutral">Java {d.majorVersion}</Badge>
                        {isInstalled && (
                          <Badge tone="accent"><CheckCircle size={9} weight="fill" /> Installed</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-fgfaint mt-1 font-mono truncate">{d.version}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {isInstalled ? (
                        <Button
                          variant="danger-soft"
                          size="sm"
                          onClick={() => {
                            const i = installed.find((x) => x.component === d.component)
                            if (i) removeJava(i)
                          }}
                        >
                          <Trash size={11} />
                          Gỡ
                        </Button>
                      ) : (
                        <span className="text-xs text-fgfaint font-semibold pr-2">Chưa cài đặt</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {installed.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-bg0 ring-1 ring-line">
              <div className="text-xs font-bold text-fg mb-3 flex items-center gap-1.5 uppercase tracking-wider text-accent">
                <CheckCircle size={14} weight="fill" className="text-accent" />
                Đã cài đặt ({installed.length})
              </div>
              
              <div className="divide-y divide-line/40 border border-line/60 rounded-xl overflow-hidden bg-bg1/10">
                {installed.map((j) => (
                  <div 
                    key={j.component} 
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/2 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-accentsoft border border-accent/15 flex items-center justify-center text-accent shrink-0">
                        <Coffee size={16} weight="fill" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-fg font-sans leading-none">{j.component}</span>
                          <Badge mono tone="neutral">Java {j.majorVersion}</Badge>
                        </div>
                        <div className="text-[10.5px] text-fgfaint font-mono mt-1.5 truncate select-all" title={j.exe}>
                          {j.exe}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => {
                        navigator.clipboard.writeText(j.exe)
                        toast.push({ type: 'success', message: 'Đã copy đường dẫn Java!' })
                      }}
                      className="shrink-0 font-mono text-[9px] hover:border-accent/30 hover:text-accent"
                    >
                      Copy Path
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Data locations */}
        {paths && (
          <Section
            icon={<FolderOpen size={18} />}
            title="Thư mục dữ liệu"
            desc="Tất cả dữ liệu của AcousticForge được lưu trong %APPDATA%/AcousticForge."
          >
            <PathsDisplay paths={paths} />
          </Section>
        )}

        <Section icon={<Info size={18} />} title="Về AcousticForge" desc="Thông tin phiên bản.">
          <div className="text-sm text-fgdim leading-relaxed space-y-1">
            <p><span className="text-fg font-semibold">AcousticForge</span> — Minecraft Client & Profile Manager, phiên bản 0.1.5.</p>
            <p className="text-xs text-fgfaint">
              Minecraft là thương hiệu của Mojang Studios / Microsoft. Dự án này không liên kết với Mojang.
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ icon, title, desc, children }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-bg2 ring-1 ring-line flex items-center justify-center flex-shrink-0 text-fgdim">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-fg">{title}</h2>
          {desc && <p className="text-xs text-fgfaint mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

function RecommendationHint() {
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  const m = hash.match(/javaFor=([^&]+)/)
  const mc = m ? decodeURIComponent(m[1]) : null
  if (!mc) return null
  const major = parseInt(mc.split('.')[0] || '0', 10)
  const minor = parseInt(mc.split('.')[1] || '0', 10)
  let rec
  if (major >= 25)         rec = { component: 'java-runtime-epsilon', major: 25 }
  else if (minor <= 16)    rec = { component: 'jre-legacy',          major: 8 }
  else if (minor <= 20)    rec = { component: 'java-runtime-gamma',  major: 17 }
  else                     rec = { component: 'java-runtime-delta',  major: 21 }
  return (
    <div className="mb-3 px-3 py-2 rounded-lg bg-accentsoft ring-1 ring-accent/30 text-xs text-accentfg">
      Profile Minecraft <span className="font-mono font-semibold">{mc}</span> cần{' '}
      <span className="font-semibold">{rec.component}</span> (Java {rec.major}). Cài runtime tương ứng bên dưới.
    </div>
  )
}

function PathsDisplay({ paths }) {
  const rows = [
    { key: 'Dữ liệu',  v: paths.dataDir,      icon: <FolderOpen size={12} /> },
    { key: 'Profiles',  v: paths.instancesDir, icon: <FolderOpen size={12} /> },
    { key: 'Runtimes',  v: paths.runtimesDir,  icon: <FolderOpen size={12} /> },
    { key: 'Assets',    v: paths.assetsDir,    icon: <FolderOpen size={12} /> },
  ]
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg0 ring-1 ring-line">
          <div className="flex items-center gap-2 text-xs text-fgdim w-28 flex-shrink-0">
            {r.icon}
            {r.key}
          </div>
          <div className="text-xs text-fg font-mono truncate flex-1" title={r.v}>{r.v}</div>
          <Button variant="subtle" size="sm" onClick={() => window.electronAPI.openFolder(r.v)}>
            <FolderOpen size={11} />
            Mở
          </Button>
        </div>
      ))}
    </div>
  )
}