import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAccounts } from '../hooks/useAccounts.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { formatBytes, formatRelative } from '../utils/format.js'
import {
  Play, Stop, Plus, Copy, Trash, CaretDown,
  Stack, GameController, CircleNotch, Check, MagnifyingGlass,
  DownloadSimple, WarningCircle, ShieldWarning, ArrowSquareOut,
  Sliders, Terminal, Info, Globe, Cpu, Clock, HardDrive,
  ArrowsClockwise, Broadcast, CheckCircle, Code,
  CornersOut, CornersIn
} from '@phosphor-icons/react'
import {
  TohruHornsIcon,
  DragonFlameIcon,
  MagicCircleIcon,
  TohruChibiAvatar,
  DragonCpuMatrixIcon,
  DragonTelemetryIcon,
  DragonMemoryGaugeIcon,
  DragonShieldMatrixIcon,
} from './DragonIcons.jsx'
import { PageHeader, Card, Button, Badge, ProgressBar } from './ui.jsx'
import LoaderIcon from './LoaderIcon.jsx'
import { playSound } from '../utils/sound.js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const LEVEL_STYLES = {
  INFO:  'text-fgdim',
  WARN:  'text-amber-300',
  ERROR: 'text-rose-400 font-semibold',
  DEBUG: 'text-indigo-300',
}

const LAUNCH_STAGES = [
  { id: 1, name: 'Khế Ước Token', desc: 'Xác thực Microsoft / Offline' },
  { id: 2, name: 'Môi Trường JVM', desc: 'Kiểm tra Java 21 Runtime' },
  { id: 3, name: 'Kiểm Kê Assets', desc: 'Xác thực SHA1 Libraries' },
  { id: 4, name: 'Nạp Mod Loader', desc: 'Fabric / Forge Injections' },
  { id: 5, name: 'Khởi Tạo GLFW', desc: 'Cửa sổ OpenGL Render' },
  { id: 6, name: 'Render Hoàn Tất', desc: 'Minecraft In-Game' },
]

export default function PlayPage({
  profiles,
  selectedProfileId,
  onNavigate,
  reload,
  onSelectProfile,
  logs,
  setLogs,
  state,
  setState,
  startedAtRef,
  onRequireJava,
  installState,
  doInstall,
  soundEnabled = true,
  launchOptions = null,
}) {
  const { selectedAccount } = useAccounts()
  const toast = useToast()
  const profile = profiles.find((p) => p.id === selectedProfileId) || profiles[0]

  const [filter, setFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [fullscreenTerminal, setFullscreenTerminal] = useState(false)
  const [showJvmInspector, setShowJvmInspector] = useState(false)
  const [copied, setCopied] = useState(false)
  const logBoxRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  // Elapsed ticker when running
  useEffect(() => {
    if (state !== 'running') {
      setElapsed(0)
      return
    }
    const t = setInterval(() => {
      if (startedAtRef?.current) setElapsed(Date.now() - startedAtRef.current)
    }, 500)
    return () => clearInterval(t)
  }, [state, startedAtRef])

  useEffect(() => {
    if (autoScroll && logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const play = useCallback(async (customOpts = null) => {
    if (!profile) {
      toast.push({ type: 'warn', title: 'Chưa có profile', message: 'Tạo profile trước khi chơi.' })
      return
    }
    if (!selectedAccount) {
      toast.push({ type: 'warn', title: 'Chưa đăng nhập', message: 'Vào mục Tài khoản để thêm tài khoản.' })
      onNavigate?.('accounts')
      return
    }

    if (!profile.installedAt) {
      toast.push({ type: 'info', message: 'Bắt đầu tự động tải và cài đặt game...' })
      const ok = await doInstall?.(profile.id)
      if (!ok) return
    }

    const checkJava = await window.electronAPI.javaGetForVersion(profile.gameVersion)
    if (!checkJava?.found) {
      onRequireJava?.()
      return
    }

    playSound('launch', soundEnabled)
    setLogs([])
    setState('preparing')

    const opts = customOpts || launchOptions || {}
    const r = await window.electronAPI.launchProfile(profile.id, opts)
    if (r?.error) {
      setState('idle')
      toast.push({ type: 'error', title: 'Không khởi chạy được', message: r.error, timeout: 6000 })
    }
  }, [profile, selectedAccount, onNavigate, toast, setLogs, setState, onRequireJava, doInstall, soundEnabled, launchOptions])

  const kill = useCallback(async () => {
    playSound('click', soundEnabled)
    await window.electronAPI.killGame()
    toast.push({ type: 'info', message: 'Đã gửi tín hiệu dừng Minecraft.' })
  }, [toast, soundEnabled])

  const copyLogs = useCallback(async () => {
    playSound('click', soundEnabled)
    const text = logs.map((l) => `[${l.level || 'INFO'}] ${l.raw ?? l.msg}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
      toast.push({ type: 'success', message: 'Đã sao chép log vào Clipboard!' })
    } catch {
      toast.push({ type: 'warn', message: 'Không thể sao chép tự động.' })
    }
  }, [logs, toast, soundEnabled])

  const exportLogsToFile = () => {
    playSound('click', soundEnabled)
    const text = logs.map((l) => `[${l.level || 'INFO'}] ${l.raw ?? l.msg}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `minecraft-log-${profile?.name || 'game'}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.push({ type: 'success', message: 'Đã xuất file log!' })
  }

  // Crash detection logic
  const crashAnalysis = useMemo(() => {
    if (logs.length === 0) return null
    const recent = logs.slice(-100)
    const allText = recent.map(l => (l.raw || l.msg || '').toLowerCase()).join(' ')

    if (allText.includes('outofmemoryerror') || allText.includes('java.lang.outofmemoryerror')) {
      return {
        type: 'memory',
        title: 'Tràn bộ nhớ RAM (OutOfMemoryError)',
        desc: 'Minecraft bị crash do không đủ RAM. Hãy vào Cài đặt hoặc sửa Profile để nâng RAM lên 4GB - 8GB.',
        action: 'settings',
      }
    }
    if (allText.includes('unsupportedclassversionerror') || allText.includes('has been compiled by a more recent version of the java runtime')) {
      return {
        type: 'java',
        title: 'Sai phiên bản Java (Java Version Incompatible)',
        desc: 'Phiên bản Java được chọn không khớp với yêu cầu của bản Minecraft này. Hãy kiểm tra tab Java Runtime trong Cài đặt.',
        action: 'settings',
      }
    }
    if (allText.includes('mixintransformer') || allText.includes('modloadingexception') || allText.includes('incompatible mods found')) {
      return {
        type: 'mod',
        title: 'Xung đột Mod (Mod Conflict Detected)',
        desc: 'Một số mod cài thêm không tương thích với phiên bản game hoặc xung đột lẫn nhau. Thử tắt các mod vừa cài gần đây.',
        action: 'mods',
      }
    }
    return null
  }, [logs])

  // Filter & Search
  const filtered = useMemo(() => {
    let list = filter === 'ALL' ? logs : logs.filter((l) => l.level === filter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(l => (l.raw || l.msg || '').toLowerCase().includes(q))
    }
    return list
  }, [logs, filter, searchQuery])

  const counts = useMemo(() => {
    return logs.reduce((acc, l) => {
      acc[l.level] = (acc[l.level] || 0) + 1
      return acc
    }, {})
  }, [logs])

  const isRunning = state === 'running'
  const isLaunching = state === 'launching' || state === 'preparing'

  // Stage progress index (1-6)
  const currentStageIndex = useMemo(() => {
    if (state === 'running') return 6
    if (state === 'launching') return 5
    if (state === 'preparing') return 3
    if (installState) return 2
    return 0
  }, [state, installState])

  return (
    <div className={`flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 ${fullscreenTerminal ? 'fixed inset-0 z-50 bg-bg0 p-4' : ''}`}>
      {!fullscreenTerminal && (
        <PageHeader
          eyebrow="🐉 BẢN DOANH TÁC CHIẾN"
          title="Khai Hỏa & Phòng Điều Khiển Log Rồng"
          subtitle="Khởi chạy Minecraft, theo dõi chu kỳ vòng đời tiến trình, telemetry và phân tích logs thông minh."
        >
          <ProfileSwitcher
            profiles={profiles}
            current={profile}
            onChange={async (id) => {
              playSound('tab', soundEnabled)
              await onSelectProfile?.(id)
              reload?.()
            }}
            onNavigateCreate={() => onNavigate?.('profiles')}
          />
        </PageHeader>
      )}

      {/* ── 1. PRE-FLIGHT MISSION LAUNCH ACTION & PROFILE CARD ── */}
      {!fullscreenTerminal && (
        <div className="px-6 lg:px-9 pt-4 pb-3 flex-shrink-0">
          <Card className="p-4.5 flex items-center gap-5 relative overflow-hidden bg-bg1/70 border-linestrong shadow-xl backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-bg0 ring-2 ring-accent/30 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
              {profile ? (
                profile.importIconUrl ? (
                  <img src={profile.importIconUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <LoaderIcon loader={profile.loader} className="w-full h-full p-2.5" />
                )
              ) : (
                <GameController size={28} weight="regular" className="text-accent" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-fg truncate text-base">{profile ? profile.name : 'Chưa có profile'}</span>
                {launchOptions?.server && (
                  <Badge tone="accent">
                    <Globe size={11} /> Kết nối: {launchOptions.server.address}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-fgfaint mt-1 flex items-center gap-2 flex-wrap">
                {profile && (
                  <>
                    <Badge tone="accent">{profile.loader}</Badge>
                    <span className="font-mono">{profile.gameVersion}</span>
                    <span className="text-fgfaint">·</span>
                    <span className="font-mono text-accent">{profile.ramGb || 4} GB RAM</span>
                    <span className="text-fgfaint">·</span>
                    <span className="flex items-center gap-1 font-mono"><Stack size={11} /> {formatBytes(profile.sizeBytes)}</span>
                    <span className="text-fgfaint">·</span>
                    <span>Chơi lần cuối {formatRelative(profile.lastPlayed)}</span>
                  </>
                )}
              </div>

              {isRunning && (
                <div className="mt-2.5 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                  <TohruChibiAvatar size={24} emotion="love" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>Minecraft đang chạy dưới sự bảo vệ của Tohru · Thời gian chơi: <strong className="font-mono text-emerald-200 font-bold">{formatElapsed(elapsed)}</strong> ✨</span>
                </div>
              )}

              {installState && state !== 'running' && (
                <div className="mt-2 text-xs text-fgdim flex flex-col gap-1 w-72">
                  <div className="flex items-center gap-1.5 truncate">
                    <CircleNotch size={12} className="animate-spin text-accent shrink-0" />
                    <span className="truncate">{installState.label || installState.phase}</span>
                  </div>
                  <ProgressBar value={installState.percent} />
                  {installState.total > 0 && (
                    <div className="text-[10px] text-fgfaint font-mono tabular-nums mt-0.5">
                      {installState.current.toLocaleString()} / {installState.total.toLocaleString()} file ({installState.percent}%)
                    </div>
                  )}
                </div>
              )}

              {!installState && isLaunching && (
                <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accentsoft/40 border border-accent/30 text-xs text-accent font-semibold animate-pulse">
                  <TohruChibiAvatar size={24} emotion="wink" />
                  <span>{state === 'preparing' ? 'Tohru đang nung chảy ma thuật & JRE runtime…' : 'Đang triệu hồi thế giới Minecraft… 🐲'}</span>
                </div>
              )}
            </div>

            {/* Right Launch CTA Button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {installState && state !== 'running' ? (
                <div className="flex items-center gap-2 text-sm text-fgdim px-4">
                  <CircleNotch size={16} className="animate-spin text-accent" />
                  Đang tải… {installState.percent > 0 ? `${installState.percent}%` : ''}
                </div>
              ) : state === 'idle' ? (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!profile || !selectedAccount}
                  onClick={() => play()}
                  className="gap-2.5 px-8 shadow-[0_0_24px_rgba(255,87,34,0.45)] hover:shadow-[0_0_32px_rgba(255,87,34,0.7)] font-black"
                >
                  <DragonFlameIcon size={19} />
                  <span>Khai Hỏa (Khởi Chạy)</span>
                </Button>
              ) : isLaunching ? (
                <div className="flex items-center gap-2 text-sm text-fgdim px-4">
                  <CircleNotch size={16} className="animate-spin text-accent" />
                  Đang mở game…
                </div>
              ) : isRunning ? (
                <Button variant="danger" size="lg" onClick={kill} className="gap-2 font-bold">
                  <Stop size={16} weight="fill" />
                  Dừng Minecraft
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      )}

      {/* ── 2. PRE-FLIGHT LAUNCH PIPELINE STEPPER (6 GIAI ĐOẠN KHỞI ĐỘNG) ── */}
      {!fullscreenTerminal && (
        <div className="px-6 lg:px-9 pb-3 flex-shrink-0">
          <div className="p-3 rounded-2xl bg-bg0/85 border border-line/80 backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-fgfaint pb-2 mb-2 border-b border-line/40">
              <span className="flex items-center gap-1.5 text-accent font-bold">
                <Broadcast size={13} />
                <span>Quy Trình Khởi Động Telemetry</span>
              </span>
              <span>TRẠNG THÁI: {state.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
              {LAUNCH_STAGES.map((stg) => {
                const isPassed = currentStageIndex >= stg.id
                const isCurrent = currentStageIndex === stg.id - 1 && isLaunching

                return (
                  <div
                    key={stg.id}
                    className={`p-2 rounded-xl border transition-all text-xs ${
                      isPassed
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-accent/20 border-accent text-accent animate-pulse'
                        : 'bg-bg1/40 border-line text-fgfaint'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] uppercase font-bold">
                      <span>0{stg.id}</span>
                      {isPassed ? <Check size={11} className="text-emerald-400" /> : isCurrent ? <CircleNotch size={11} className="animate-spin" /> : <span>○</span>}
                    </div>
                    <div className="font-extrabold text-[11px] truncate mt-0.5">{stg.name}</div>
                    <div className="text-[9.5px] truncate opacity-70 mt-0.5">{stg.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Crash Diagnostic Alert Banner if detected */}
      {crashAnalysis && !fullscreenTerminal && (
        <div className="px-6 lg:px-9 pb-3 flex-shrink-0">
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldWarning size={22} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-200">{crashAnalysis.title}</h4>
                <p className="text-[11px] text-amber-300/80 mt-0.5">{crashAnalysis.desc}</p>
              </div>
            </div>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => onNavigate?.(crashAnalysis.action)}
              className="shrink-0 gap-1 bg-amber-500/20 text-amber-200 border-amber-500/40"
            >
              Xem ngay
              <ArrowSquareOut size={12} />
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. ADVANCED LOGS CONSOLE CONTAINER ── */}
      <div className="flex-1 min-h-0 px-6 lg:px-9 pb-6 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden bg-bg0/90 border-linestrong shadow-2xl">
          {/* Log Controls Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-line px-3.5 py-2.5 bg-bg1/50 flex-shrink-0 gap-2">
            {/* Filter Pills with Counts */}
            <div className="flex items-center gap-1 flex-wrap">
              {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lv) => (
                <button
                  key={lv}
                  onClick={() => {
                    setFilter(lv)
                    playSound('click', soundEnabled)
                  }}
                  className={[
                    'text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                    filter === lv
                      ? 'bg-accent text-accentfg shadow'
                      : 'text-fgdim hover:bg-white/5 hover:text-fg',
                  ].join(' ')}
                >
                  {lv}{lv !== 'ALL' && counts[lv] ? ` (${counts[lv]})` : ''}
                </button>
              ))}

              {/* Quick Tag Filter Chips */}
              <div className="hidden 2xl:flex items-center gap-1 ml-2 border-l border-line pl-2">
                {['Render', 'Mixin', 'Network', 'Audio', 'FabricLoader'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag)
                      playSound('click', soundEnabled)
                    }}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg0 border border-line text-fgfaint hover:text-accent hover:border-accent/40 cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-fgfaint ml-2 hidden lg:inline tabular-nums font-mono">
                {logs.length} dòng ({filtered.length} kết quả)
              </span>
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search Log Input */}
              <div className="relative">
                <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fgfaint" />
                <input
                  type="text"
                  placeholder="Lọc từ khóa / regex…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 sm:w-44 pl-8 pr-2.5 py-1 text-xs rounded-lg bg-bg0 border border-line text-fg placeholder-fgfaint focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-fgdim cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-[11px]">Tự cuộn</span>
              </label>

              <Button
                variant="subtle"
                size="sm"
                onClick={() => setShowTimestamps(!showTimestamps)}
                title="Hiện/Ẩn dấu thời gian"
                className="gap-1 text-xs hidden sm:flex"
              >
                <Clock size={12} />
                <span>{showTimestamps ? 'Ẩn giờ' : 'Hiện giờ'}</span>
              </Button>

              <Button variant="subtle" size="sm" onClick={copyLogs} disabled={logs.length === 0} className="gap-1">
                {copied ? <><Check size={12} /> Đã copy</> : <><Copy size={12} /> Copy</>}
              </Button>

              <Button variant="subtle" size="sm" onClick={exportLogsToFile} disabled={logs.length === 0} title="Xuất log ra file">
                <DownloadSimple size={12} />
              </Button>

              <Button
                variant="subtle"
                size="sm"
                onClick={() => setFullscreenTerminal(!fullscreenTerminal)}
                title={fullscreenTerminal ? 'Thu nhỏ giao diện' : 'Toàn màn hình console'}
              >
                {fullscreenTerminal ? <CornersIn size={12} /> : <CornersOut size={12} />}
              </Button>

              <Button
                variant="danger-soft"
                size="sm"
                onClick={() => {
                  playSound('click', soundEnabled)
                  setLogs([])
                }}
                disabled={logs.length === 0}
                title="Xóa bộ đệm log"
              >
                <Trash size={12} />
              </Button>
            </div>
          </div>

          {/* Log Messages Stream */}
          <div
            ref={logBoxRef}
            className="flex-1 overflow-auto p-3.5 font-mono text-[12px] leading-5 custom-scrollbar select-text bg-bg0/95"
          >
            {filtered.length === 0 ? (
              <div className="text-fgfaint text-xs h-full flex flex-col items-center justify-center select-none gap-2">
                <Terminal size={32} className="opacity-40 text-accent" />
                <span className="font-mono text-xs">
                  {logs.length === 0
                    ? 'TERMINAL_IDLE // Bấm [Khai Hỏa] để bắt đầu stream dữ liệu Minecraft.'
                    : 'Không tìm thấy dòng log nào khớp với từ khóa tìm kiếm.'}
                </span>
              </div>
            ) : (
              filtered.map((l) => (
                <div key={l.id} className="flex items-start gap-2.5 px-1.5 py-0.5 hover:bg-white/4 rounded transition-colors group">
                  {showTimestamps && (
                    <span className="text-fgfaint text-[10.5px] flex-shrink-0 tabular-nums select-none">
                      {formatTs(l.ts)}
                    </span>
                  )}
                  <span className={[
                    'flex-shrink-0 w-12 text-right font-bold text-[10px] select-none',
                    LEVEL_STYLES[l.level] || 'text-fgdim',
                  ].join(' ')}>
                    [{l.level || 'INFO'}]
                  </span>
                  <span className={`break-all ${LEVEL_STYLES[l.level] || 'text-fg'}`}>
                    {renderHighlightedText(l.raw ?? l.msg, searchQuery)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function renderHighlightedText(text, query) {
  if (!query || !query.trim() || !text) return text
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatTs(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatElapsed(ms) {
  if (ms < 1000) return '0s'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}h ${m}m ${sec}s`
  if (m) return `${m}m ${sec}s`
  return `${sec}s`
}

function ProfileSwitcher({ profiles, current, onChange, onNavigateCreate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3.5 py-1.5 rounded-xl bg-bg2 hover:bg-bg3 ring-1 ring-line text-sm text-fg transition-all flex items-center gap-2 cursor-pointer shadow"
      >
        <span className="font-bold text-xs">{current ? current.name : 'Chọn profile'}</span>
        <CaretDown size={12} weight="bold" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-bg1/95 backdrop-blur-xl border border-linestrong shadow-2xl z-50 overflow-hidden">
          <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
            {profiles.length === 0 ? (
              <div className="p-4 text-xs text-fgdim">Chưa có profile nào.</div>
            ) : profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false) }}
                className={[
                  'w-full text-left px-3.5 py-2.5 flex items-center gap-3 transition-colors border-l-2 cursor-pointer',
                  p.id === current?.id ? 'bg-accentsoft border-accent' : 'hover:bg-white/5 border-transparent',
                ].join(' ')}
              >
                <div className="w-8 h-8 rounded-lg bg-bg0 ring-1 ring-line flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.importIconUrl ? (
                    <img src={p.importIconUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <LoaderIcon loader={p.loader} className="w-full h-full p-1.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-fg leading-snug">{p.name}</div>
                  <div className="text-[10px] text-fgfaint mt-0.5 font-medium leading-none">
                    <span className="uppercase text-accent font-bold">{p.loader}</span> • <span className="font-mono">{p.gameVersion}</span>
                  </div>
                </div>

                {p.id === current?.id && <Check size={14} className="text-accent flex-shrink-0" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => { onNavigateCreate(); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 border-t border-line bg-bg0/60 hover:bg-bg2 text-accent text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            Tạo profile mới
          </button>
        </div>
      )}
    </div>
  )
}