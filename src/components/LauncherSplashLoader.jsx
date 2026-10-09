import React, { useState, useEffect } from 'react'
import {
  TohruChibiAvatar,
  TohruMagicCircleLarge,
  TohruHornsIcon,
  DragonFlameIcon,
  DragonMeatIcon,
  MaidBowIcon,
} from './DragonIcons.jsx'

const MAID_QUOTES = [
  'Tohru đang nướng phần đuôi rồng thơm lừng cho ngài Kobayashi... 🍖',
  'Đang kích hoạt kết giới ma thuật AcousticForge... ✨',
  'Kiểm tra khế ước tài khoản và bảo vật Minecraft... 🐉',
  'Kanna-chan đang cắm đuôi vào ổ điện nạp năng lượng... ⚡',
  'Lucoa và Elma đã chuẩn bị sẵn bánh ngọt và trà nóng... 🍵',
  'Dọn dẹp dinh thự sạch bóng, sẵn sàng khởi hành phiêu lưu! ♥',
]

export default function LauncherSplashLoader({ progress = null, label = null }) {
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [simProgress, setSimProgress] = useState(15)
  const [emotion, setEmotion] = useState('happy')

  // Cycle cute maid quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % MAID_QUOTES.length)
      setEmotion((prev) => (prev === 'happy' ? 'wink' : prev === 'wink' ? 'love' : 'happy'))
    }, 2400)
    return () => clearInterval(timer)
  }, [])

  // Smooth simulated progress increment if actual progress isn't provided
  useEffect(() => {
    if (progress !== null) {
      setSimProgress(progress)
      return
    }
    const timer = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 95) return prev
        const inc = Math.random() * 12 + 4
        return Math.min(prev + inc, 95)
      })
    }, 350)
    return () => clearInterval(timer)
  }, [progress])

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 select-none relative overflow-hidden z-20">
      {/* Background Magic Glow & Pulse */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-accent/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-orange-500/10 blur-[90px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex flex-col items-center text-center max-w-md w-full">
        {/* Magic Summoning Circle with Tohru Chibi in Center */}
        <div className="relative w-48 h-48 flex items-center justify-center mb-6">
          {/* Rotating Magic Circle */}
          <div className="text-accent/60 drop-shadow-[0_0_16px_var(--color-accentsoft)]">
            <TohruMagicCircleLarge size={190} />
          </div>

          {/* Glowing Aura Ring */}
          <div className="absolute inset-4 rounded-full border border-accent/30 animate-ping opacity-25 pointer-events-none" />

          {/* Central Tohru Chibi Character */}
          <div className="absolute z-10 filter drop-shadow-[0_8px_24px_rgba(255,87,34,0.4)] transform hover:scale-110 transition-transform duration-300">
            <TohruChibiAvatar size={84} emotion={emotion} />
          </div>

          {/* Orbiting Sparkles */}
          <div className="absolute top-2 right-4 text-amber-300 animate-bounce text-sm">✨</div>
          <div className="absolute bottom-4 left-3 text-rose-400 animate-pulse text-xs">♥</div>
        </div>

        {/* Brand Titles */}
        <div className="mb-2 flex items-center justify-center gap-2">
          <TohruHornsIcon size={20} className="text-accent" />
          <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-1.5 drop-shadow-md">
            <span>Acoustic</span>
            <span className="text-accent">Forge</span>
          </h1>
          <DragonFlameIcon size={20} className="text-accent" />
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
          <span className="opacity-60">小林さんちのメイドラゴン</span>
          <span>·</span>
          <span>Dinh Thự Rồng Hầu Gái</span>
        </div>

        {/* Dynamic Quote Bubble */}
        <div className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-bg1/80 border border-line backdrop-blur-md text-xs text-fgdim mb-5 shadow-lg flex items-center justify-center gap-2 max-w-sm transition-all duration-300">
          <span className="text-accent text-sm flex-shrink-0 animate-pulse">🐲</span>
          <span className="italic leading-snug">{label || MAID_QUOTES[quoteIdx]}</span>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 w-full bg-bg0/90 rounded-full border border-line/80 overflow-hidden relative shadow-inner p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 transition-all duration-300 relative shadow-[0_0_12px_rgba(249,115,22,0.8)]"
              style={{ width: `${Math.round(simProgress)}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-fgfaint px-1 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              Đang chuẩn bị dữ liệu…
            </span>
            <span className="font-mono text-accent">{Math.round(simProgress)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
