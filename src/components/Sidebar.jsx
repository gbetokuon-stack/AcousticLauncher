import React from 'react'
import {
  TohruHornsIcon,
  DragonFlameIcon,
  DragonTailIcon,
  MagicCircleIcon,
  DragonMeatIcon,
  MaidBowIcon,
  MaidTeaIcon,
  KobayashiGlassesIcon,
} from './DragonIcons.jsx'

import { useAccounts } from '../hooks/useAccounts.jsx'
import PlayerHead from './PlayerHead.jsx'
import { playSound } from '../utils/sound.js'

const NAV = [
  { id: 'home',        label: 'Dinh Thự',    desc: 'Phụng sự Kobayashi-sama', Icon: TohruHornsIcon, badge: 'Nhà' },
  { id: 'play',        label: 'Khai Hỏa',    desc: 'Khai mở ma thuật rồng',   Icon: DragonFlameIcon, badge: 'Chơi' },
  { id: 'profiles',    label: 'Profiles',    desc: 'Kho lưu trữ bản rồng',    Icon: DragonTailIcon },
  { id: 'servers',     label: 'Máy Chủ',     desc: 'Cổng dịch chuyển thứ nguyên', Icon: MagicCircleIcon },
  { id: 'mods',        label: 'Modpack',     desc: 'Kho báu & Thịt đuôi rồng', Icon: DragonMeatIcon },
  { id: 'screenshots', label: 'Ảnh Kỷ Niệm', desc: 'Cuộn tranh kỷ niệm F2',    Icon: MaidBowIcon },
  { id: 'accounts',    label: 'Khế Ước',     desc: 'Tài khoản & Skin 3D',     Icon: MaidTeaIcon },
  { id: 'settings',    label: 'Cài Đặt',     desc: 'Kính cận & Tinh chỉnh JRE', Icon: KobayashiGlassesIcon },
]

export default function Sidebar({ active, onChange, soundEnabled = true }) {
  const { selectedAccount } = useAccounts()

  const handleNavClick = (id) => {
    playSound('tab', soundEnabled)
    onChange(id)
  }

  return (
    <aside className="w-64 flex-shrink-0 p-4 pr-2 flex flex-col h-full z-20 select-none">
      <div className="flex-1 bg-bg1/60 border border-line rounded-2xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Profile / Account Header with Maid Badge */}
        <button
          onClick={() => handleNavClick('accounts')}
          className="h-16 px-4.5 flex items-center gap-3 border-b border-line hover:bg-white/4 transition-all duration-150 text-left w-full group cursor-pointer"
        >
          {selectedAccount ? (
            <>
              <div className="relative flex-shrink-0 ring-2 ring-accent/40 rounded-lg overflow-hidden group-hover:ring-accent transition-all shadow-md">
                <PlayerHead uuid={selectedAccount.uuid} username={selectedAccount.username} size={34} />
                <span className="absolute -bottom-1 -right-1 text-[10px]" title="Maid Dragon">🎀</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-fg truncate group-hover:text-accent transition-colors leading-none flex items-center gap-1.5">
                  <span>{selectedAccount.username}</span>
                  <span className="text-[10px] text-accent">♥</span>
                </div>
                <div className="text-[9px] uppercase tracking-wider text-accent font-extrabold mt-1.5 leading-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Hầu gái sẵn sàng
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-bg2 border border-line flex items-center justify-center text-accent group-hover:border-accent/40 transition-all shrink-0">
                <MaidBowIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-fgdim group-hover:text-accent transition-colors leading-none">
                  Chưa lập khế ước
                </div>
                <div className="text-[9px] uppercase tracking-wider text-fgfaint font-bold mt-1.5 leading-none">
                  Bấm để đăng nhập
                </div>
              </div>
            </>
          )}
        </button>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {NAV.map((it) => {
            const isActive = active === it.id
            return (
              <button
                key={it.id}
                onClick={() => handleNavClick(it.id)}
                className={[
                  'group w-full flex items-center gap-3 pl-3 pr-3 h-11.5 rounded-xl transition-all text-left relative overflow-hidden cursor-pointer',
                  isActive
                    ? 'bg-accentsoft border border-accent/35 text-fg font-bold shadow-[0_4px_16px_var(--color-accentsoft)] ring-1 ring-accent/20'
                    : 'border border-transparent text-fgdim hover:bg-white/4 hover:text-fg hover:border-line/60',
                ].join(' ')}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-[60%] rounded-r bg-accent shadow-[0_0_12px_var(--color-accent)]" />
                )}
                
                <div className={[
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0',
                  isActive ? 'text-accent scale-110 drop-shadow-[0_0_8px_var(--color-accent)]' : 'text-fgdim group-hover:text-accent group-hover:scale-105'
                ].join(' ')}>
                  <it.Icon size={19} />
                </div>

                <div className="flex-1 min-w-0 leading-normal">
                  <div className="text-xs font-bold leading-tight flex items-center justify-between">
                    <span className="truncate">{it.label}</span>
                    {it.badge && (
                      <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-accent/20 text-accent ring-1 ring-accent/30">
                        {it.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[9.5px] text-fgfaint truncate mt-0.5 leading-normal">{it.desc}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Footer info: Kobayashi Tohru Easter Egg */}
        <div className="p-3.5 border-t border-line bg-bg0/30">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">🐉</span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black text-accent truncate flex items-center gap-1">
                <span>AcousticForge Dragon Maid</span>
                <span className="text-[8px] px-1 rounded bg-accent/15">v0.1.5</span>
              </div>
              <div className="text-[8.5px] text-fgfaint truncate mt-0.5 font-medium">
                Phụng sự Kobayashi-sama với 100% tình yêu! ♥
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}