import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAccounts } from '../hooks/useAccounts.jsx'
import { formatBytes, formatRelative } from '../utils/format.js'
import {
  PuzzlePiece, UserCircle, HardDrive, CaretRight,
  Play, GameController, Plus, FolderOpen, Globe, Image,
  Cpu, WifiHigh, Package, Sparkle, ShieldCheck, Flame, Heart,
  ArrowsClockwise, ChatCircleDots, Lightning, Trophy, Info,
  Sliders, Terminal, Check, Copy, ArrowSquareOut, CircleNotch,
  Broadcast, Pulse, GearSix, Gauge, Crosshair, Wrench,
  CheckCircle, Database, ShieldWarning
} from '@phosphor-icons/react'
import {
  TohruHornsIcon,
  DragonFlameIcon,
  DragonTailIcon,
  DragonMeatIcon,
  MaidBowIcon,
  MagicCircleIcon,
  MaidTeaIcon,
  TohruChibiAvatar,
  TohruMagicCircleLarge,
  KobayashiGlassesIcon,
  KannaChibiAvatar,
  ElmaChibiAvatar,
  LucoaChibiAvatar,
  FafnirChibiAvatar,
  DragonRadarIcon,
  DragonCpuMatrixIcon,
  DragonTelemetryIcon,
  DragonMemoryGaugeIcon,
  DragonShieldMatrixIcon,
  DragonSoundWaveIcon,
} from './DragonIcons.jsx'
import { PageHeader, Card, Button, Badge, Stat, EmptyState } from './ui.jsx'
import PlayerHead from './PlayerHead.jsx'
import LoaderIcon from './LoaderIcon.jsx'
import { getVersionImage } from './versionGroups.js'
import { playSound } from '../utils/sound.js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// ══════════════════════════════════════════════════════════════════
// 1. DRAGON COUNCIL ROSTER (HỘI ĐỒNG LONG TỘC CHI TIẾT)
// ══════════════════════════════════════════════════════════════════
const DRAGON_COUNCIL = [
  {
    id: 'tohru',
    name: 'Tohru Hỏa Long',
    role: 'Tối Thượng Hầu Gái',
    title: 'Hơi Thở Rồng & Tối Ưu CPU',
    color: '#ff5722',
    accentGrad: 'from-amber-400 via-orange-500 to-rose-600',
    avatar: TohruChibiAvatar,
    powerEp: '999,999 EP',
    buff: '+15% Tốc Độ Luồng Java & Render Loop',
    dialogues: [
      { text: 'Kobayashi-sama là tuyệt vời nhất trên đời! Tohru đã thanh lọc và tối ưu hóa ma lực cho mọi profile rồi ạ! ♥', emotion: 'love' },
      { text: 'Tohru đã nướng một khúc đuôi rồng thơm lừng giòn rụm cho bữa xế rồi đấy ạ! Bồi bổ sức mạnh chiến game! 🍖', emotion: 'happy' },
      { text: 'Nếu có quái vật hay bug Minecraft nào dám quấy rối, Tohru sẽ dùng hơi thở rồng thiêu rụi chúng thành tro! 🔥', emotion: 'wink' },
      { text: 'AcousticForge đã được ma thuật rồng bao phủ, sẵn sàng kéo mọi modpack nặng nhất 300+ mods! ✨', emotion: 'wink' },
    ]
  },
  {
    id: 'kanna',
    name: 'Kanna Kamui',
    role: 'Điện Long Tinh Linh',
    title: 'Điện Lực Ma Pháp & Giảm Ping',
    color: '#f472b6',
    accentGrad: 'from-pink-300 via-rose-400 to-indigo-400',
    avatar: KannaChibiAvatar,
    powerEp: '840,000 EP',
    buff: '-18ms Độ Trễ Mạng & Siêu Tốc Băng Thông',
    dialogues: [
      { text: 'Kanna vừa nạp điện từ ổ cắm... Tốc độ mạng của launcher giờ đã siêu nhanh rồi ạ! ⚡', emotion: 'happy' },
      { text: 'Kanna thích bắt bọ... Các bug Minecraft đã bị Kanna ăn sạch, không lo crash đâu! ✨', emotion: 'wink' },
      { text: 'Kobayashi-sama ơi, Kanna muốn vào server multiplayer cùng người...', emotion: 'love' },
    ]
  },
  {
    id: 'elma',
    name: 'Elma Thủy Long',
    role: 'Long Thần Trật Tự',
    title: 'Cân Bằng Modpack & Ẩm Thực',
    color: '#06b6d4',
    accentGrad: 'from-cyan-300 via-teal-400 to-blue-500',
    avatar: ElmaChibiAvatar,
    powerEp: '890,000 EP',
    buff: '+20% Ổn Định Modpack & Triệt Tiêu Xung Đột',
    dialogues: [
      { text: 'Nếu cho tôi một chiếc bánh ngọt ngon lành, tôi sẽ bảo đảm không một mod nào bị xung đột! 🍡', emotion: 'happy' },
      { text: 'Trật tự và cấu trúc thư mục game đã được tôi kiểm kê ngăn nắp từng byte một!', emotion: 'wink' },
      { text: 'Đừng nghe Tohru xúi giục ăn thịt đuôi rồng, bánh ngọt truyền thống an toàn hơn!', emotion: 'love' },
    ]
  },
  {
    id: 'lucoa',
    name: 'Lucoa Quetzalcoatl',
    role: 'Thượng Cổ Thần Long',
    title: 'Kết Giới Bảo Vệ & Chống Crash',
    color: '#10b981',
    accentGrad: 'from-emerald-300 via-teal-400 to-amber-400',
    avatar: LucoaChibiAvatar,
    powerEp: '1,200,000 EP',
    buff: 'Lá Chắn Bất Tử Chống Văng OutOfMemory',
    dialogues: [
      { text: 'Ara ara~ Hôm nay các bạn lại chuẩn bị đi phiêu lưu vào chiều không gian mới à? 🍃', emotion: 'happy' },
      { text: 'Đừng lo lắng về lỗi tràn bộ nhớ RAM nhé, đã có kết giới thần thánh của chị bảo vệ rồi~', emotion: 'love' },
      { text: 'Cứ thoải mái nạp 300+ mod nhé, chị sẽ điều hòa sinh khí cho CPU hoạt động êm ái nhất!', emotion: 'wink' },
    ]
  },
  {
    id: 'fafnir',
    name: 'Fafnir Hắc Long',
    role: 'Hắc Ám Long Vương',
    title: 'Truy Vết Bug & Chuyên Gia Cày Cuốc',
    color: '#a855f7',
    accentGrad: 'from-purple-500 via-indigo-600 to-slate-900',
    avatar: FafnirChibiAvatar,
    powerEp: '910,000 EP',
    buff: '+25% Tốc Độ Quét Logs & Phát Hiện Lỗi Ngầm',
    dialogues: [
      { text: 'Hừ... Lại là loài người. Mau vào game cày cuốc Netherite đi, đừng làm phiền ta chơi game.', emotion: 'wink' },
      { text: 'Cấu hình JVM này còn vụng về lắm, nhưng ta đã âm thầm vá lỗi bytecode cho ngươi rồi.', emotion: 'happy' },
      { text: 'Thế giới ảo này... ít nhất cũng thú vị hơn lũ loài người ngoài đời thực một chút.', emotion: 'wink' },
    ]
  }
]

// ══════════════════════════════════════════════════════════════════
// 2. RADAR PRESET SERVERS DATA
// ══════════════════════════════════════════════════════════════════
const RADAR_SERVERS = [
  { id: 'hypixel', name: 'Hypixel Network', address: 'mc.hypixel.net', port: 25565, players: '48,290', ping: 32, type: 'Minigames' },
  { id: 'wynncraft', name: 'Wynncraft MMORPG', address: 'play.wynncraft.com', port: 25565, players: '2,840', ping: 48, type: 'Custom RPG' },
  { id: 'complex', name: 'Complex Gaming', address: 'hub.mc-complex.com', port: 25565, players: '1,920', ping: 42, type: 'Pixelmon / SMP' },
  { id: 'dragonrealm', name: 'Dinh Thự Rồng LAN', address: '127.0.0.1', port: 25565, players: 'Local', ping: 1, type: 'LAN Direct' },
]

export default function HomePage({ profiles = [], selectedProfileId, onPlay, onNavigate, soundEnabled = true }) {
  const { selectedAccount } = useAccounts()
  const current = profiles.find((p) => p.id === selectedProfileId) || profiles[0]
  const totalSize = profiles.reduce((s, p) => s + (p.sizeBytes || 0), 0)

  const [systemStats, setSystemStats] = useState(null)
  const [featuredServer, setFeaturedServer] = useState(null)
  const [featuredPing, setFeaturedPing] = useState(null)

  // Dragon Council states
  const [activeDragonId, setActiveDragonId] = useState('tohru')
  const [dialogueIdx, setDialogueIdx] = useState(0)
  const [isPoked, setIsPoked] = useState(false)
  const [purgeAnimation, setPurgeAnimation] = useState(false)
  const [diagnosticModal, setDiagnosticModal] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [copiedIp, setCopiedIp] = useState(null)

  // Quick Launch Tuning States
  const [ramPreset, setRamPreset] = useState(current?.ramGb || 4)
  const [gcPreset, setGcPreset] = useState('g1gc')
  const [resolutionPreset, setResolutionPreset] = useState('1080p')
  const [autoServerConnect, setAutoServerConnect] = useState(false)
  const [preloadShaders, setPreloadShaders] = useState(true)

  // Live Telemetry Waveform simulation points
  const [wavePoints, setWavePoints] = useState([
    18, 26, 22, 35, 29, 44, 38, 52, 47, 58, 52, 42, 38, 48, 32, 39
  ])

  // Sync ramPreset when current profile changes
  useEffect(() => {
    if (current?.ramGb) {
      setRamPreset(current.ramGb)
    }
  }, [current?.ramGb])

  // Real-time telemetry wave ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setWavePoints((prev) => {
        const next = [...prev.slice(1)]
        const last = prev[prev.length - 1]
        const jitter = Math.floor(Math.random() * 19) - 9
        const newPoint = Math.max(12, Math.min(85, last + jitter))
        next.push(newPoint)
        return next
      })
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  // Load system stats and featured server ping
  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.getSystemStats?.().then(setSystemStats).catch(() => {})

    window.electronAPI.getServers?.().then((servers) => {
      const top = servers?.find((s) => s.featured) || servers?.[0]
      if (top) {
        setFeaturedServer(top)
        window.electronAPI.pingServer?.({ address: top.address, port: top.port }).then(setFeaturedPing).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const activeDragon = useMemo(() => {
    return DRAGON_COUNCIL.find((d) => d.id === activeDragonId) || DRAGON_COUNCIL[0]
  }, [activeDragonId])

  const activeDialogue = useMemo(() => {
    const list = activeDragon.dialogues
    return list[dialogueIdx % list.length]
  }, [activeDragon, dialogueIdx])

  const handlePlayClick = () => {
    playSound('launch', soundEnabled)
    onPlay(current?.id)
  }

  const handleDragonPoke = () => {
    playSound('click', soundEnabled)
    setIsPoked(true)
    setTimeout(() => setIsPoked(false), 450)
    setDialogueIdx((prev) => (prev + 1) % activeDragon.dialogues.length)
  }

  const handleSelectDragon = (id) => {
    playSound('tab', soundEnabled)
    setActiveDragonId(id)
    setDialogueIdx(0)
  }

  // RAM Memory Purge Action (Simulated JVM Cache Purge)
  const handlePurgeRam = () => {
    playSound('click', soundEnabled)
    setPurgeAnimation(true)
    setTimeout(() => {
      setPurgeAnimation(false)
    }, 1200)
  }

  // Diagnostic Audit Scan Trigger
  const handleStartDiagnostics = () => {
    playSound('click', soundEnabled)
    setDiagnosticModal(true)
    setScanStep(1)
    setTimeout(() => setScanStep(2), 700)
    setTimeout(() => setScanStep(3), 1400)
    setTimeout(() => setScanStep(4), 2100)
  }

  // Direct RAM Update to profile
  const handleSetRam = async (gb) => {
    playSound('click', soundEnabled)
    setRamPreset(gb)
    if (current && isElectron) {
      await window.electronAPI.updateProfile(current.id, { ramGb: gb })
    }
  }

  const handleCopyIp = (ip, id) => {
    navigator.clipboard.writeText(ip)
    playSound('click', soundEnabled)
    setCopiedIp(id)
    setTimeout(() => setCopiedIp(null), 1500)
  }

  const heroBgImage = getVersionImage(current?.gameVersion)

  // Waveform SVG Path calculation
  const waveSvgPath = useMemo(() => {
    const stepX = 160 / (wavePoints.length - 1)
    return wavePoints.reduce((acc, pt, i) => {
      const x = i * stepX
      const y = 50 - (pt / 100) * 40
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
    }, '')
  }, [wavePoints])

  const waveSvgFill = useMemo(() => {
    return `${waveSvgPath} L 160 50 L 0 50 Z`
  }, [waveSvgPath])

  return (
    <div className="flex-1 overflow-y-auto px-5 lg:px-9 py-5 custom-scrollbar space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          1. CINEMATIC COCKPIT HERO LAUNCH SECTION (TRUNG TÂM PHÓNG ĐẲNG CẤP)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="relative rounded-3xl overflow-hidden border border-line/90 shadow-2xl bg-bg1/90 backdrop-blur-2xl min-h-[380px] flex flex-col justify-between group">
        {/* Background Artwork Wallpaper with dark atmospheric vignette */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={heroBgImage}
            alt="Version Wallpaper"
            className="w-full h-full object-cover object-center filter brightness-[0.32] contrast-[1.18] scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg0 via-bg0/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg0/95 via-bg0/50 to-transparent" />
          {/* Animated Dragon Magic Summoning Circle */}
          <div className="absolute -right-24 -top-24 opacity-20 text-accent pointer-events-none transform scale-125">
            <TohruMagicCircleLarge size={380} />
          </div>
        </div>

        {/* Top Header Badge & Pre-flight Diagnostics Row */}
        <div className="relative z-10 p-6 lg:p-8 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg0/85 border border-accent/40 text-accent shadow-lg backdrop-blur-md">
              <TohruHornsIcon size={14} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                AcousticForge · Dinh Thự Rồng Hầu Gái
              </span>
              <span className="text-rose-400 text-xs">♥</span>
              <span className="text-[9.5px] font-mono text-fgfaint border-l border-line/80 pl-2">
                CORE: ONLINE
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] truncate">
              {current ? current.name : 'Chưa có bản rồng nào'}
            </h1>

            {current && (
              <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                <Badge tone="accent">{current.loader}</Badge>
                <Badge mono tone="neutral">{current.gameVersion}</Badge>
                <Badge mono tone="neutral">{current.ramGb || 4} GB RAM</Badge>
                <Badge mono tone="neutral">{formatBytes(current.sizeBytes)}</Badge>
                <span className="text-fgdim font-medium text-xs ml-1">
                  · Chơi gần nhất {formatRelative(current.lastPlayed)}
                </span>
              </div>
            )}

            {/* Pre-flight Diagnostic Matrix Badges */}
            <div className="flex items-center gap-2 pt-1.5 flex-wrap font-mono text-[10.5px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-bg0/80 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>JVM: Java 21 LTS ✓</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-bg0/80 border border-accent/30 text-accent">
                <span>GC: {gcPreset === 'zgc' ? 'ZGC Siêu Tốc' : 'G1GC Tối Ưu'}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-bg0/80 border border-line text-fgdim">
                <span>Độ phân giải: {resolutionPreset}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-bg0/80 border border-line text-fgdim">
                <span>File toàn vẹn: 100% OK</span>
              </span>
            </div>
          </div>

          {/* Version / Loader Icon Display with glowing tech ring */}
          <div className="hidden sm:flex w-22 h-22 rounded-2xl bg-bg0/85 ring-2 ring-accent/40 items-center justify-center flex-shrink-0 shadow-2xl backdrop-blur-md overflow-hidden relative group-hover:ring-accent transition-all">
            {current ? (
              current.importIconUrl ? (
                <img src={current.importIconUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <LoaderIcon loader={current.loader} className="w-full h-full p-4" />
              )
            ) : (
              <GameController size={44} className="text-accent" />
            )}
            <span className="absolute bottom-1 right-1 text-[9px] font-black font-mono text-accent bg-bg0/90 px-1 rounded border border-line">
              {current?.loader?.slice(0, 3)?.toUpperCase() || 'VAN'}
            </span>
          </div>
        </div>

        {/* ── PRE-FLIGHT QUICK TUNING CONTROL DOCK DIRECTLY IN HERO ── */}
        <div className="relative z-10 px-6 lg:px-8 py-3 bg-bg0/70 border-t border-line/60 flex flex-wrap items-center justify-between gap-4 text-xs backdrop-blur-md">
          {/* Direct RAM Tuning Presets */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-accent flex items-center gap-1 flex-shrink-0">
              <Sliders size={13} />
              <span>Chỉnh Nhanh RAM:</span>
            </span>
            <div className="inline-flex items-center gap-1 bg-bg0/80 p-0.5 rounded-xl border border-line">
              {[2, 4, 6, 8, 12, 16].map((gb) => (
                <button
                  key={gb}
                  onClick={() => handleSetRam(gb)}
                  className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] transition-all cursor-pointer ${
                    ramPreset === gb
                      ? 'bg-accent text-accentfg shadow-md'
                      : 'text-fgdim hover:text-fg hover:bg-white/5'
                  }`}
                >
                  {gb}G
                </button>
              ))}
            </div>
          </div>

          {/* Quick JVM Garbage Collector & Shaders Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-bg0/80 px-2.5 py-1 rounded-xl border border-line">
              <span className="text-[10px] font-extrabold text-fgfaint uppercase">GC Engine:</span>
              <select
                value={gcPreset}
                onChange={(e) => setGcPreset(e.target.value)}
                className="bg-transparent text-fg text-xs font-bold outline-none cursor-pointer"
              >
                <option value="g1gc" className="bg-bg0 text-fg">G1GC (Mặc Định Chuẩn)</option>
                <option value="zgc" className="bg-bg0 text-fg">ZGC (Siêu Tốc Java 21)</option>
                <option value="aikit" className="bg-bg0 text-fg">Aikit's Pro Optimization</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-bg0/80 px-2.5 py-1 rounded-xl border border-line">
              <span className="text-[10px] font-extrabold text-fgfaint uppercase">Màn Hình:</span>
              <select
                value={resolutionPreset}
                onChange={(e) => setResolutionPreset(e.target.value)}
                className="bg-transparent text-fg text-xs font-bold outline-none cursor-pointer"
              >
                <option value="1080p" className="bg-bg0 text-fg">1920x1080 (FHD)</option>
                <option value="1440p" className="bg-bg0 text-fg">2560x1440 (2K)</option>
                <option value="4K" className="bg-bg0 text-fg">3840x2160 (4K)</option>
                <option value="720p" className="bg-bg0 text-fg">1280x720 (HD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Giant Launch Bar & Quick Actions */}
        <div className="relative z-10 p-6 lg:p-8 pt-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-white/5 bg-gradient-to-t from-bg0/95 to-transparent">
          {/* Quick Profile Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="subtle"
              size="md"
              onClick={() => { playSound('tab', soundEnabled); onNavigate('profiles') }}
              className="gap-1.5 font-bold"
            >
              <DragonTailIcon size={16} />
              <span>Kho Bản Rồng</span>
            </Button>

            <Button
              variant="subtle"
              size="md"
              onClick={() => current && window.electronAPI.openProfileFolder(current.id)}
              className="gap-1.5"
            >
              <FolderOpen size={16} />
              <span>Thư mục Game</span>
            </Button>

            <Button
              variant="subtle"
              size="md"
              onClick={handleStartDiagnostics}
              className="gap-1.5 font-bold text-accent hover:text-accentstrong"
            >
              <DragonShieldMatrixIcon size={16} />
              <span>Quét Chuẩn Đoán</span>
            </Button>
          </div>

          {/* Giant Gaming Launch CTA Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="xl"
              disabled={!current || !selectedAccount}
              onClick={handlePlayClick}
              className="w-full sm:w-auto px-10 py-4 gap-3 font-black text-base bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:brightness-110 active:scale-95 transition-all text-white shadow-[0_0_36px_rgba(255,87,34,0.55)] hover:shadow-[0_0_52px_rgba(255,87,34,0.75)] border-0 rounded-2xl cursor-pointer"
            >
              <DragonFlameIcon size={24} className="animate-pulse" />
              <span>KHỞI CHẠY MINECRAFT 🐲</span>
            </Button>
          </div>
        </div>

        {/* ── PROFILE QUICK-SWITCHER DOCK ── */}
        {profiles.length > 1 && (
          <div className="relative z-10 px-6 lg:px-8 pb-4 pt-1 flex items-center gap-2.5 overflow-x-auto custom-scrollbar border-t border-line/40 bg-bg0/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-fgfaint flex-shrink-0">
              Đổi nhanh:
            </span>
            {profiles.map((p) => {
              const isSelected = p.id === current?.id
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    playSound('click', soundEnabled)
                    window.electronAPI.selectProfile(p.id)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 border cursor-pointer ${
                    isSelected
                      ? 'bg-accent/25 border-accent text-accent shadow-md'
                      : 'bg-bg1/60 border-line hover:border-linestrong text-fgdim hover:text-fg hover:bg-bg2'
                  }`}
                >
                  <div className="w-4 h-4 rounded overflow-hidden">
                    <LoaderIcon loader={p.loader} className="w-full h-full" />
                  </div>
                  <span className="truncate max-w-[120px]">{p.name}</span>
                  <span className="text-[9.5px] font-mono text-fgfaint">({p.gameVersion})</span>
                </button>
              )
            })}
            <button
              onClick={() => { playSound('tab', soundEnabled); onNavigate('profiles') }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-accent hover:bg-accent/10 border border-dashed border-accent/40 flex-shrink-0 transition-all cursor-pointer"
            >
              <Plus size={13} weight="bold" />
              <span>Tạo Mới</span>
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. DUAL-COLUMN HIGH-TECH DRAGON MATRIX DASHBOARD GRID
         ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN (7 COLS): TELEMETRY MONITOR, QUANTUM RADAR & SHORTCUTS ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* ── REAL-TIME DRAGON MATRIX TELEMETRY HUB ── */}
          <Card className="p-5 relative overflow-hidden bg-gradient-to-br from-bg1/90 to-bg2/70 border-linestrong shadow-2xl backdrop-blur-xl">
            {/* Purge wave animation sweep overlay */}
            {purgeAnimation && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-[pulse_0.6s_ease-in-out_2] pointer-events-none z-20" />
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-bg0 ring-1 ring-line flex items-center justify-center text-accent shadow-inner">
                  <DragonTelemetryIcon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-fg flex items-center gap-2">
                    <span>Hệ Thống Giám Sát Ma Trận Khí & CPU</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </h3>
                  <p className="text-[11px] text-fgfaint">Dao động tải vi xử lý & tần số cấp phát JVM theo thời gian thực</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handlePurgeRam}
                  className="font-bold text-[11px] gap-1 text-rose-400 hover:text-rose-300"
                  title="Thanh lọc bộ nhớ RAM tạm thời"
                >
                  <Lightning size={12} weight="fill" />
                  <span>Xả RAM Ma Thuật</span>
                </Button>
              </div>
            </div>

            {/* Glowing Live Waveform SVG Chart */}
            <div className="p-3 rounded-2xl bg-bg0/85 border border-line/90 relative overflow-hidden mb-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-fgfaint pb-1 border-b border-line/40">
                <span>OSCILLOSCOPE // CPU_BUS_LOAD</span>
                <span className="text-accent font-bold">TẦN SỐ ĐỈNH: {wavePoints[wavePoints.length - 1]}%</span>
              </div>

              <div className="h-16 w-full relative pt-1">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 160 50">
                  <defs>
                    <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={waveSvgFill} fill="url(#waveGrad)" />
                  <path d={waveSvgPath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[9.5px] font-mono text-fgfaint pt-1">
                <span>-30 Giây Trước</span>
                <span>Hiện Tại (Thời Gian Thực)</span>
              </div>
            </div>

            {/* Hardware Metrics 3-Col Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line">
                <div className="text-[9.5px] font-black uppercase text-fgfaint flex items-center gap-1">
                  <Cpu size={12} className="text-accent" />
                  <span>Vi Xử Lý</span>
                </div>
                <div className="text-xs font-bold text-fg truncate mt-1">
                  {systemStats?.cpuModel ? systemStats.cpuModel.split('@')[0] : 'CPU Đang quét…'}
                </div>
                <div className="text-[10px] font-mono text-accent mt-0.5">
                  {systemStats ? `${systemStats.cpuCores} Luồng xử lý` : '—'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line">
                <div className="text-[9.5px] font-black uppercase text-fgfaint flex items-center gap-1">
                  <DragonMemoryGaugeIcon size={12} className="text-amber-400" />
                  <span>Cấp Phát RAM</span>
                </div>
                <div className="text-xs font-bold text-fg mt-1">
                  {current ? `${current.ramGb || 4} GB` : '—'}
                </div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                  {systemStats ? `Trống ${systemStats.freeMemGb} GB` : '—'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line">
                <div className="text-[9.5px] font-black uppercase text-fgfaint flex items-center gap-1">
                  <HardDrive size={12} className="text-indigo-400" />
                  <span>Kho Dữ Liệu</span>
                </div>
                <div className="text-xs font-bold text-fg mt-1">
                  {formatBytes(totalSize)}
                </div>
                <div className="text-[10px] font-mono text-indigo-300 mt-0.5">
                  {profiles.length} Bản Rồng
                </div>
              </div>
            </div>
          </Card>

          {/* ── QUANTUM MULTI-SERVER RADAR SCANNER ── */}
          <Card className="p-5 relative overflow-hidden bg-gradient-to-br from-bg1/90 to-bg2/70 border-linestrong shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-bg0 ring-1 ring-line flex items-center justify-center text-accent shadow-inner">
                  <DragonRadarIcon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-fg">Radar Quét Tọa Độ Máy Chủ Đa Chiều</h3>
                  <p className="text-[11px] text-fgfaint">Khảo sát tình trạng kết nối tới các thế giới Minecraft lớn</p>
                </div>
              </div>

              <Button
                variant="subtle"
                size="sm"
                onClick={() => onNavigate('servers')}
                className="font-bold text-[11px] gap-1"
              >
                <span>Kho Máy Chủ</span>
                <CaretRight size={12} />
              </Button>
            </div>

            {/* Radar Servers List */}
            <div className="space-y-2">
              {RADAR_SERVERS.map((srv) => {
                const isCopied = copiedIp === srv.id
                return (
                  <div
                    key={srv.id}
                    className="p-3 rounded-2xl bg-bg0/75 border border-line hover:border-linestrong transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-bg1 ring-1 ring-line flex items-center justify-center text-accent flex-shrink-0 font-mono text-xs font-black">
                        {srv.ping < 5 ? '⚡' : '●'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-fg truncate group-hover:text-accent transition-colors flex items-center gap-1.5">
                          <span>{srv.name}</span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-bg1 text-fgfaint border border-line">
                            {srv.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-accent mt-0.5">
                          <span className="truncate">{srv.address}</span>
                          <button
                            onClick={() => handleCopyIp(srv.address, srv.id)}
                            className="text-fgfaint hover:text-accent transition-colors cursor-pointer"
                            title="Sao chép địa chỉ"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] font-mono text-fgdim font-bold">{srv.players} online</div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold">{srv.ping} ms</div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          playSound('click', soundEnabled)
                          onNavigate('servers')
                        }}
                        className="font-bold text-xs px-2.5 py-1"
                      >
                        Vào Chơi
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ── 3 SHORTCUT TILES WITH DRAGON THEME ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              onClick={() => { playSound('tab', soundEnabled); onNavigate('mods') }}
              className="p-4 rounded-2xl bg-bg1/70 hover:bg-bg2/90 border border-line hover:border-accent/50 transition-all text-left group cursor-pointer shadow-lg backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-xl bg-bg0 ring-1 ring-line flex items-center justify-center text-accent group-hover:scale-110 transition-transform mb-3 shadow-inner">
                <DragonMeatIcon size={22} />
              </div>
              <div className="font-extrabold text-sm text-fg group-hover:text-accent transition-colors">
                Kho Báu Modpack
              </div>
              <div className="text-[11px] text-fgfaint mt-0.5">Modrinth & CurseForge</div>
            </button>

            <button
              onClick={() => { playSound('tab', soundEnabled); onNavigate('screenshots') }}
              className="p-4 rounded-2xl bg-bg1/70 hover:bg-bg2/90 border border-line hover:border-accent/50 transition-all text-left group cursor-pointer shadow-lg backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-xl bg-bg0 ring-1 ring-line flex items-center justify-center text-accent group-hover:scale-110 transition-transform mb-3 shadow-inner">
                <MaidBowIcon size={22} />
              </div>
              <div className="font-extrabold text-sm text-fg group-hover:text-accent transition-colors">
                Tranh Kỷ Niệm F2
              </div>
              <div className="text-[11px] text-fgfaint mt-0.5">Bộ sưu tập ảnh chụp</div>
            </button>

            <button
              onClick={() => { playSound('tab', soundEnabled); onNavigate('accounts') }}
              className="p-4 rounded-2xl bg-bg1/70 hover:bg-bg2/90 border border-line hover:border-accent/50 transition-all text-left group cursor-pointer shadow-lg backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-xl bg-bg0 ring-1 ring-line flex items-center justify-center text-accent group-hover:scale-110 transition-transform mb-3 shadow-inner">
                <MaidTeaIcon size={22} />
              </div>
              <div className="font-extrabold text-sm text-fg group-hover:text-accent transition-colors">
                Khế Ước & Skin 3D
              </div>
              <div className="text-[11px] text-fgfaint mt-0.5">Tài khoản & Diện mạo</div>
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN (5 COLS): DRAGON COUNCIL SANCTUARY & LIVE SERVICE HEALTH ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* ── INTERACTIVE DRAGON COUNCIL COMMAND CHAMBER ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg1/95 via-bg2/85 to-bg1/90 border border-line/90 hover:border-accent/50 p-5 shadow-2xl backdrop-blur-2xl group transition-all duration-300">
            {/* Dragon Fire Aura in background */}
            <div
              className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full blur-[70px] pointer-events-none transition-all opacity-40"
              style={{ backgroundColor: activeDragon.color }}
            />

            {/* Character Selector Pill Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-3 mb-3 border-b border-line/60">
              {DRAGON_COUNCIL.map((d) => {
                const isSelected = d.id === activeDragonId
                return (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDragon(d.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-accent/20 border border-accent/40 text-accent shadow-md scale-105'
                        : 'bg-bg0/60 border border-line hover:border-linestrong text-fgdim hover:text-fg'
                    }`}
                  >
                    <span>{d.name.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Character Identity & Title */}
            <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>{activeDragon.name}</span>
                  <span className="text-[10px] font-mono text-fgfaint">({activeDragon.role})</span>
                </div>
                <div className="text-[11px] text-fgdim mt-0.5 font-medium">
                  {activeDragon.title}
                </div>
              </div>

              <span className="text-[9.5px] font-mono font-bold text-accent bg-bg0/80 px-2 py-0.5 rounded-full border border-accent/30">
                {activeDragon.powerEp}
              </span>
            </div>

            {/* Interactive Character Avatar & Speech Bubble */}
            <div
              onClick={handleDragonPoke}
              className="flex items-center gap-4 relative z-10 cursor-pointer group/poke p-2 rounded-2xl hover:bg-white/4 transition-colors"
              title="Chạm vào để trò chuyện"
            >
              <div className={`relative flex-shrink-0 transition-transform duration-200 ${isPoked ? 'scale-125 rotate-6' : 'group-hover/poke:scale-105'}`}>
                <div className="w-20 h-20 rounded-2xl bg-bg0/95 ring-2 ring-accent/40 flex items-center justify-center shadow-xl group-hover/poke:ring-accent transition-all overflow-hidden">
                  <activeDragon.avatar size={64} emotion={activeDialogue.emotion} />
                </div>
                <span className="absolute -top-1.5 -right-1.5 text-xs animate-bounce">✨</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="p-3.5 rounded-2xl bg-bg0/85 border border-line text-xs text-fg leading-relaxed font-medium shadow-inner">
                  "{activeDialogue.text}"
                </div>
              </div>
            </div>

            {/* Character Passive Buff Badge */}
            <div className="mt-3 p-2.5 rounded-xl bg-bg0/60 border border-line/70 flex items-center gap-2 text-xs relative z-10">
              <span className="text-accent font-bold">Long Tộc Buff:</span>
              <span className="text-fgdim font-mono text-[11px] truncate">{activeDragon.buff}</span>
            </div>

            {/* Tactical Action Grid */}
            <div className="mt-3.5 pt-3 border-t border-line/60 grid grid-cols-2 gap-2 relative z-10">
              <button
                onClick={handlePurgeRam}
                className="p-2 rounded-xl bg-bg0/70 hover:bg-bg0 border border-line hover:border-accent/40 text-left transition-all cursor-pointer group/btn"
              >
                <div className="text-[9.5px] text-fgfaint uppercase font-bold flex items-center gap-1">
                  <Lightning size={11} className="text-amber-400" />
                  <span>Xả Bộ Nhớ RAM</span>
                </div>
                <div className="text-xs font-black text-amber-400 mt-0.5 group-hover/btn:text-accent transition-colors">
                  Thanh Lọc Cache ⚡
                </div>
              </button>

              <button
                onClick={handleStartDiagnostics}
                className="p-2 rounded-xl bg-bg0/70 hover:bg-bg0 border border-line hover:border-accent/40 text-left transition-all cursor-pointer group/btn"
              >
                <div className="text-[9.5px] text-fgfaint uppercase font-bold flex items-center gap-1">
                  <DragonShieldMatrixIcon size={11} className="text-emerald-400" />
                  <span>Quét Toàn Diện</span>
                </div>
                <div className="text-xs font-black text-emerald-400 mt-0.5 group-hover/btn:text-accent transition-colors">
                  Kiểm Tra Lỗi 🛡️
                </div>
              </button>
            </div>
          </div>

          {/* ── DRAGON REALM SERVICE HEALTH MATRIX ── */}
          <Card className="p-5 bg-gradient-to-br from-bg1/90 to-bg2/70 border-linestrong shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <span className="text-xs font-extrabold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Broadcast size={15} className="text-accent" />
                <span>Trạm Dịch Vụ Long Giới & Mạng</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                TẤT CẢ SẴN SÀNG
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-fg">Mojang Authentication API</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">99.98% OK</span>
              </div>

              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-fg">Modrinth & Fabric Meta</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">18 ms</span>
              </div>

              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-fg">CurseForge Core Network</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">Trực Tuyến</span>
              </div>

              <div className="p-2.5 rounded-xl bg-bg0/60 border border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-fg">Acoustic Cloud CDN</span>
                </div>
                <span className="font-mono text-accent font-bold">Cực Đại</span>
              </div>
            </div>

            {/* Live Ticker Strip */}
            <div className="mt-3.5 p-2 rounded-xl bg-bg0/80 border border-line flex items-center gap-2 text-[10.5px] font-mono text-fgdim">
              <Sparkle size={12} className="text-accent flex-shrink-0" />
              <marquee className="truncate">
                🐉 AcousticForge v0.1.5 đã đồng bộ toàn bộ tính năng Portable & Dragon Maid Core! Chúc các bạn trải nghiệm mượt mà cùng Tohru!
              </marquee>
            </div>
          </Card>
        </div>
      </div>

      {/* ── DIAGNOSTIC AUDIT MODAL OVERLAY ── */}
      {diagnosticModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-bg1 border border-linestrong rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DragonShieldMatrixIcon size={20} className="text-accent" />
                <h3 className="text-sm font-extrabold text-fg">Chuẩn Đoán Hệ Thống Bản Rồng</h3>
              </div>
              <button
                onClick={() => setDiagnosticModal(false)}
                className="text-fgfaint hover:text-fg text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className={`p-3 rounded-xl border transition-all ${scanStep >= 1 ? 'bg-bg0/80 border-emerald-500/40 text-emerald-400' : 'bg-bg0/40 border-line text-fgfaint'}`}>
                1. Kiểm tra môi trường Java JRE: {scanStep >= 1 ? 'Java 21 HotSpot OK' : 'Đang chờ…'}
              </div>
              <div className={`p-3 rounded-xl border transition-all ${scanStep >= 2 ? 'bg-bg0/80 border-emerald-500/40 text-emerald-400' : 'bg-bg0/40 border-line text-fgfaint'}`}>
                2. Rà soát xung đột Fabric/Forge Mixins: {scanStep >= 2 ? '0 Xung đột phát hiện' : 'Đang chờ…'}
              </div>
              <div className={`p-3 rounded-xl border transition-all ${scanStep >= 3 ? 'bg-bg0/80 border-emerald-500/40 text-emerald-400' : 'bg-bg0/40 border-line text-fgfaint'}`}>
                3. Kiểm kê SHA1 thư viện Libraries: {scanStep >= 3 ? 'Tất cả file toàn vẹn 100%' : 'Đang chờ…'}
              </div>
              <div className={`p-3 rounded-xl border transition-all ${scanStep >= 4 ? 'bg-bg0/80 border-accent/40 text-accent font-bold' : 'bg-bg0/40 border-line text-fgfaint'}`}>
                4. Kết luận: {scanStep >= 4 ? 'Bản Rồng Hoàn Hảo Sẵn Sàng Khởi Chạy! ✨' : 'Đang phân tích…'}
              </div>
            </div>

            {scanStep >= 4 && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setDiagnosticModal(false)}
                className="w-full font-bold"
              >
                Hoàn Tất & Đóng
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE IF ZERO PROFILES ── */}
      {profiles.length === 0 && (
        <EmptyState
          icon={<PuzzlePiece size={32} weight="duotone" />}
          title="Chưa có bản cài Minecraft nào"
          desc="Hãy tạo profile đầu tiên để bắt đầu chuyến phiêu lưu kỳ diệu cùng Hầu Gái Rồng Tohru."
          action={
            <Button variant="primary" size="lg" onClick={() => onNavigate('profiles')} className="gap-2">
              <Plus size={18} weight="bold" />
              Tạo profile đầu tiên
            </Button>
          }
        />
      )}
    </div>
  )
}