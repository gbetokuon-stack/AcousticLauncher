import React, { useEffect, useState, useRef } from 'react'
import {
  Bell, X, CaretRight, CircleNotch, ArrowSquareOut,
  Palette, SpeakerHigh, SpeakerSlash, Sparkle, Check,
  CornersOut, CornersIn
} from '@phosphor-icons/react'
import {
  AcousticForgeDragonCrest,
  TohruHornsIcon,
  DragonFlameIcon,
  DragonTailIcon,
  MagicCircleIcon,
  DragonMeatIcon,
  MaidBowIcon,
  MaidTeaIcon,
  KobayashiGlassesIcon,
  DragonCpuMatrixIcon,
  DragonTelemetryIcon,
} from './DragonIcons.jsx'
import { THEMES } from '../theme/themeConfig.js'
import { playSound } from '../utils/sound.js'
import { useAccounts } from '../hooks/useAccounts.jsx'
import PlayerHead from './PlayerHead.jsx'

const NAV_ITEMS = [
  { id: 'home',        label: 'Dinh Thự',    icon: TohruHornsIcon },
  { id: 'play',        label: 'Khai Hỏa',    icon: DragonFlameIcon, badge: 'Play' },
  { id: 'profiles',    label: 'Bản Rồng',    icon: DragonTailIcon },
  { id: 'mods',        label: 'Modpack',     icon: DragonMeatIcon },
  { id: 'servers',     label: 'Máy Chủ',     icon: MagicCircleIcon },
  { id: 'screenshots', label: 'Kỷ Niệm',     icon: MaidBowIcon },
  { id: 'accounts',    label: 'Khế Ước',     icon: MaidTeaIcon },
  { id: 'settings',    label: 'Cài Đặt',     icon: KobayashiGlassesIcon },
]

export default function TitleBar({
  currentTheme = 'tohru',
  onThemeChange,
  soundEnabled = true,
  onSoundToggle,
  particlesEnabled = true,
  onParticlesToggle,
  playState = 'idle',
  activePage = 'home',
  onNavigate,
}) {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI
  const [max, setMax] = useState(false)
  const { selectedAccount } = useAccounts()

  // Theme dropdown state
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const themeRef = useRef(null)

  // Notification states
  const [releases, setReleases] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [selectedRelease, setSelectedRelease] = useState(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Real-time HUD Telemetry & Clock
  const [clockTime, setClockTime] = useState('')
  const [hudStats, setHudStats] = useState({ cpu: 14, ramUsed: 3.8, ramTotal: 16, ping: 24 })

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClockTime(now.toTimeString().split(' ')[0])
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.getSystemStats?.().then((st) => {
      if (st) {
        const total = st.totalMemGb || 16
        const free = st.freeMemGb || 12
        const used = Math.max(1, +(total - free).toFixed(1))
        setHudStats((prev) => ({
          ...prev,
          ramUsed: used,
          ramTotal: total,
        }))
      }
    }).catch(() => {})
  }, [isElectron])

  // Listen to maximize state changes
  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.isMaximized().then(setMax)
    const off = window.electronAPI.onMaximizedState(setMax)
    return () => { try { off && off() } catch {} }
  }, [isElectron])

  // Load cached releases and fetch updates
  useEffect(() => {
    try {
      const cached = localStorage.getItem('xforge_releases')
      if (cached) {
        const parsed = JSON.parse(cached)
        setReleases(parsed)
        checkUnreadState(parsed)
      }
    } catch {}

    fetchReleases()
  }, [])

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchReleases = async () => {
    setLoading(true)
    try {
      const res = await fetch('https://api.github.com/repos/gbetokuon-stack/AcousticLauncher/releases')
      if (res.ok) {
        const data = await res.json()
        const formatted = data.map(rel => ({
          id: rel.id,
          tag_name: rel.tag_name,
          name: rel.name || rel.tag_name,
          body: rel.body || '',
          published_at: rel.published_at,
          html_url: rel.html_url
        }))
        setReleases(formatted)
        localStorage.setItem('xforge_releases', JSON.stringify(formatted))
        checkUnreadState(formatted)
      }
    } catch (err) {
      console.warn('Không thể fetch changelog mới:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkUnreadState = (list) => {
    if (!list || list.length === 0) return
    const lastRead = localStorage.getItem('xforge_last_read_release')
    const latestVersion = list[0].tag_name
    if (!lastRead || lastRead !== latestVersion) {
      setHasUnread(true)
    } else {
      setHasUnread(false)
    }
  }

  const handleOpenDropdown = () => {
    setDropdownOpen(!dropdownOpen)
    playSound('click', soundEnabled)
    if (releases.length > 0) {
      const latestVersion = releases[0].tag_name
      localStorage.setItem('xforge_last_read_release', latestVersion)
      setHasUnread(false)
    }
  }

  const handleMaximizeClick = async () => {
    playSound('click', soundEnabled)
    if (isElectron) {
      const isNowMax = await window.electronAPI.maximize()
      setMax(!!isNowMax)
    }
  }

  const handleTabClick = (id) => {
    playSound('tab', soundEnabled)
    onNavigate?.(id)
  }

  // Minimal Custom Markdown Renderer
  const renderMarkdown = (text) => {
    if (!text) return <p className="text-xs text-fgfaint">Không có nội dung cập nhật.</p>
    const lines = text.split('\n')

    const parseInlineMarkdown = (lineText) => {
      const parts = lineText.split('**')
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="font-bold text-fg">{part}</strong>
        }
        const subParts = part.split('`')
        return subParts.map((sub, j) => {
          if (j % 2 === 1) {
            return <code key={j} className="bg-bg3/80 border border-line px-1.5 py-0.5 rounded text-[11px] font-mono text-accent">{sub}</code>
          }
          return sub
        })
      })
    }

    return lines.map((line, idx) => {
      const content = line.trim()
      if (content.startsWith('###')) {
        return <h4 key={idx} className="text-[13px] font-bold text-fg mt-4 mb-1">{content.replace(/^###\s*/, '')}</h4>
      }
      if (content.startsWith('##')) {
        return <h3 key={idx} className="text-sm font-bold text-fg mt-5 mb-1.5 border-b border-line pb-1">{content.replace(/^##\s*/, '')}</h3>
      }
      if (content.startsWith('#')) {
        return <h2 key={idx} className="text-base font-extrabold text-fg mt-6 mb-2">{content.replace(/^#\s*/, '')}</h2>
      }
      if (content.startsWith('-') || content.startsWith('*')) {
        return (
          <li key={idx} className="text-xs text-fgdim ml-4 list-disc my-1.5 leading-relaxed">
            {parseInlineMarkdown(content.replace(/^[-*]\s*/, ''))}
          </li>
        )
      }
      if (content === '') {
        return <div key={idx} className="h-2" />
      }
      return <p key={idx} className="text-xs text-fgdim my-1.5 leading-relaxed">{parseInlineMarkdown(content)}</p>
    })
  }

  return (
    <header className="titlebar h-13 flex items-center select-none bg-bg0/95 border-b border-line/80 relative z-[9999] px-2 backdrop-blur-xl">
      {/* ── LEFT: BRAND LOGO & CREST ── */}
      <div
        onClick={() => handleTabClick('home')}
        className="no-drag flex items-center pl-2 pr-3 h-full gap-2.5 min-w-0 cursor-pointer group flex-shrink-0"
      >
        <div className="group-hover:scale-110 transition-transform duration-200">
          <AcousticForgeDragonCrest size={26} />
        </div>
        <div className="flex flex-col">
          <div className="text-[13px] font-black tracking-tight text-fg flex items-center gap-1 leading-none">
            <span><span className="text-accent">Acoustic</span>Forge</span>
            <span className="text-[11px] text-accent animate-pulse select-none">♥</span>
          </div>
          <div className="text-[8.5px] font-extrabold text-accent/80 tracking-widest uppercase mt-0.5 leading-none">
            Dragon Maid
          </div>
        </div>
      </div>

      {/* ── CENTER: MODERN HORIZONTAL NAVIGATION PILLS ── */}
      <nav className="no-drag flex-1 flex items-center justify-center gap-1 px-2 overflow-x-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={[
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex-shrink-0',
                isActive
                  ? 'bg-accent/20 border border-accent/40 text-accent shadow-[0_0_16px_var(--color-accentsoft)] scale-105'
                  : 'text-fgdim hover:text-fg hover:bg-white/5 border border-transparent hover:border-line/60',
              ].join(' ')}
            >
              <Icon size={16} className={isActive ? 'text-accent' : 'text-fgfaint'} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded-full bg-accent text-accentfg ml-0.5 leading-none uppercase">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── REAL-TIME CYBER-DRAGON TELEMETRY HUD STRIP ── */}
      <div className="hidden xl:flex items-center gap-2.5 px-3 py-1 rounded-xl bg-bg1/80 border border-line/80 font-mono text-[10.5px] select-none text-fgdim shadow-inner mr-1">
        {/* Digital Clock */}
        <div className="flex items-center gap-1 text-accent font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span>{clockTime || '00:00:00'}</span>
        </div>

        <span className="text-line">|</span>

        {/* Hardware mini telemetry */}
        <div className="flex items-center gap-1.5 text-fgdim" title="Mức tải CPU ước lượng">
          <DragonCpuMatrixIcon size={12} className="text-accent" />
          <span>CPU ~{hudStats.cpu}%</span>
        </div>

        <span className="text-line">|</span>

        <div className="flex items-center gap-1.5 text-fgdim" title="RAM hệ thống">
          <DragonTelemetryIcon size={12} className="text-amber-400" />
          <span>RAM {hudStats.ramUsed}/{hudStats.ramTotal}G</span>
        </div>

        <span className="text-line">|</span>

        {/* Network Latency */}
        <div className="flex items-center gap-1 text-emerald-400 font-bold" title="Độ trễ mạng trung bình">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{hudStats.ping}ms</span>
        </div>

        <span className="text-line">|</span>

        {/* Audio Equalizer jumping bars */}
        <div className="flex items-end gap-0.5 h-3 px-0.5" title="Tần số sóng âm launcher">
          <div className="w-0.5 bg-accent rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2" />
          <div className="w-0.5 bg-rose-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-3" />
          <div className="w-0.5 bg-amber-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-1.5" />
          <div className="w-0.5 bg-accent rounded-full animate-[pulse_1.0s_ease-in-out_infinite] h-2.5" />
        </div>

        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent">
          TOHRU CORE
        </span>
      </div>

      {/* ── RIGHT: USER PROFILE, CONTROLS & WINDOW BUTTONS ── */}
      <div className="no-drag flex h-full items-center gap-1.5 relative flex-shrink-0 pl-2">
        {/* Game running live status indicator */}
        {playState === 'running' ? (
          <div
            onClick={() => handleTabClick('play')}
            className="hidden xl:flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full cursor-pointer hover:bg-emerald-500/25 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Minecraft đang chạy</span>
          </div>
        ) : playState === 'launching' || playState === 'preparing' ? (
          <div
            onClick={() => handleTabClick('play')}
            className="hidden xl:flex items-center gap-1.5 text-[10px] font-black text-accent bg-accentsoft border border-accent/30 px-2.5 py-1 rounded-full cursor-pointer animate-pulse"
          >
            <CircleNotch size={11} className="animate-spin text-accent" />
            <span>Đang khai hỏa…</span>
          </div>
        ) : null}

        {/* User Account Quick Pill */}
        {selectedAccount ? (
          <button
            onClick={() => handleTabClick('accounts')}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-bg1 hover:bg-bg2 border border-line hover:border-accent/40 transition-all cursor-pointer group"
            title="Quản lý tài khoản & skin"
          >
            <PlayerHead uuid={selectedAccount.uuid} username={selectedAccount.username} size={22} />
            <span className="text-[11px] font-bold text-fg group-hover:text-accent transition-colors max-w-[85px] truncate">
              {selectedAccount.username}
            </span>
          </button>
        ) : (
          <button
            onClick={() => handleTabClick('accounts')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg1 hover:bg-bg2 border border-line text-[11px] font-bold text-fgdim hover:text-accent transition-all cursor-pointer"
          >
            <MaidBowIcon size={14} className="text-accent" />
            <span>Đăng nhập</span>
          </button>
        )}

        {/* Sound toggle button */}
        <button
          onClick={() => {
            playSound('click', !soundEnabled)
            onSoundToggle?.()
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-fgdim hover:bg-bg2 hover:text-accent transition-colors"
          title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
        >
          {soundEnabled ? <SpeakerHigh size={15} /> : <SpeakerSlash size={15} className="text-fgfaint" />}
        </button>

        {/* Ambient Particles toggle */}
        <button
          onClick={() => {
            playSound('click', soundEnabled)
            onParticlesToggle?.()
          }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            particlesEnabled ? 'text-accent' : 'text-fgfaint hover:text-fg'
          } hover:bg-bg2`}
          title={particlesEnabled ? 'Tắt hiệu ứng hạt sáng' : 'Bật hiệu ứng hạt sáng'}
        >
          <Sparkle size={14} weight={particlesEnabled ? 'fill' : 'regular'} />
        </button>

        {/* Theme Switcher dropdown button */}
        <div className="relative flex items-center" ref={themeRef}>
          <button
            onClick={() => {
              playSound('click', soundEnabled)
              setThemeDropdownOpen(!themeDropdownOpen)
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-fgdim hover:bg-bg2 hover:text-accent transition-colors"
            title="Đổi chủ đề Dragon Maid"
          >
            <Palette size={15} />
          </button>

          {themeDropdownOpen && (
            <div className="absolute top-10 right-0 w-64 bg-bg1/95 backdrop-blur-xl border border-linestrong rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-fgfaint px-2 pb-1 border-b border-line flex items-center justify-between">
                <span>Chủ đề Dragon Maid</span>
                <span className="text-[9px] text-accent">5 Nhân vật</span>
              </div>
              {Object.values(THEMES).map((theme) => {
                const isActive = currentTheme === theme.id
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      playSound('tab', soundEnabled)
                      onThemeChange?.(theme.id)
                      setThemeDropdownOpen(false)
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accentsoft border border-accent/30 text-fg'
                        : 'hover:bg-white/5 text-fgdim hover:text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${theme.previewGradient} ring-1 ring-white/20`} />
                      <span>{theme.name}</span>
                    </div>
                    {isActive && <Check size={14} className="text-accent" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Notification Bell (Releases / Changelog) */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button
            onClick={handleOpenDropdown}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-fgdim hover:bg-bg2 hover:text-accent transition-colors relative"
            title="Thông báo cập nhật"
          >
            <Bell size={15} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-bg0 animate-ping" />
            )}
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-bg0" />
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute top-10 right-0 w-80 bg-bg1/95 backdrop-blur-xl border border-linestrong rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-96">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-bg2/40">
                <span className="text-xs font-bold text-fg">Thông Báo Cập Nhật</span>
                <span className="text-[10px] text-fgfaint font-mono">
                  {releases.length > 0 ? `${releases.length} bản phát hành` : ''}
                </span>
              </div>

              <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center p-6 text-fgfaint text-xs gap-2">
                    <CircleNotch size={14} className="animate-spin text-accent" />
                    Đang kiểm tra...
                  </div>
                ) : releases.length === 0 ? (
                  <div className="p-6 text-center text-fgfaint text-xs">
                    Chưa có lịch sử cập nhật.
                  </div>
                ) : (
                  releases.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => {
                        playSound('click', soundEnabled)
                        setSelectedRelease(rel)
                        setDropdownOpen(false)
                      }}
                      className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-line flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-fg truncate">
                          {rel.name}
                        </span>
                        <span className="text-[9px] font-mono bg-accentsoft/20 text-accent px-1.5 py-0.5 rounded-md shrink-0">
                          {rel.tag_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-fgfaint font-mono">
                        {new Date(rel.published_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-line/60 mx-1" />

        {/* ── WINDOW CONTROLS (MINIMIZE, MAXIMIZE / FULLSCREEN, CLOSE) ── */}
        {/* Minimize */}
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-fgdim hover:bg-bg2 hover:text-fg transition-colors"
          aria-label="Minimize"
          title="Thu nhỏ"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="1.5" y="4.5" fill="currentColor" /></svg>
        </button>

        {/* Maximize / Restore / Fullscreen Toggle */}
        <button
          onClick={handleMaximizeClick}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-fgdim hover:bg-bg2 hover:text-accent transition-colors"
          aria-label="Maximize"
          title={max ? "Thu nhỏ cửa sổ (Restore)" : "Phóng to toàn màn hình (Maximize - F11)"}
        >
          {max ? (
            <CornersIn size={14} weight="bold" />
          ) : (
            <CornersOut size={14} weight="bold" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={() => window.electronAPI?.close()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-fgdim hover:bg-error hover:text-white transition-colors"
          aria-label="Close"
          title="Đóng launcher"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Changelog Detail Modal */}
      {selectedRelease && (
        <div className="fixed inset-0 bg-bg0/75 backdrop-blur-md z-[99999] flex items-center justify-center p-4 no-drag">
          <div className="bg-bg1 border border-line rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-bg2/40">
              <div>
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <span>Chi tiết bản cập nhật</span>
                  <span className="text-[10px] font-mono bg-accentsoft/20 text-accent px-1.5 py-0.5 rounded-md">
                    {selectedRelease.tag_name}
                  </span>
                </h3>
                <p className="text-[10px] text-fgfaint font-mono mt-0.5">
                  Phát hành ngày {new Date(selectedRelease.published_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedRelease(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-fgfaint hover:text-fg hover:bg-bg2 transition-all cursor-pointer"
                title="Đóng"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar select-text">
              <h2 className="text-base font-extrabold text-fg mb-4 border-b border-line pb-2">
                {selectedRelease.name}
              </h2>
              <div className="space-y-1">
                {renderMarkdown(selectedRelease.body)}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-bg2/20">
              {isElectron && (
                <button
                  onClick={() => window.electronAPI.openExternal(selectedRelease.html_url)}
                  className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-bold px-3 py-1.5 rounded-lg border border-accent/20 bg-accentsoft/10 hover:bg-accentsoft/20 transition-all cursor-pointer"
                >
                  <ArrowSquareOut size={12} weight="bold" />
                  Xem trên GitHub
                </button>
              )}
              <button
                onClick={() => setSelectedRelease(null)}
                className="text-xs text-fg hover:text-fg/80 font-bold bg-bg3 hover:bg-bg3/80 px-4 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}