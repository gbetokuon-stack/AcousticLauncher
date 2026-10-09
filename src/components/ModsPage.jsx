import React, { useState } from 'react'
import { PageHeader } from './ui.jsx'
import ModrinthTab from './mods/modrinth/ModrinthTab.jsx'
import CurseForgeTab from './mods/curseforge/CurseForgeTab.jsx'

// Platform icons (simple SVG-based icons)
function ModrinthIcon({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor">
      <path d="M2 27L16 3l14 24H2z" />
      <path d="M10 22h12l-6-10-6 10z" fill="rgba(0,0,0,0.3)" />
    </svg>
  )
}

function CurseForgeIcon({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor">
      <rect x="4" y="4" width="10" height="10" rx="2" />
      <rect x="18" y="4" width="10" height="10" rx="2" />
      <rect x="4" y="18" width="10" height="10" rx="2" />
      <rect x="18" y="18" width="10" height="10" rx="2" />
    </svg>
  )
}

const PLATFORMS = [
  { id: 'modrinth', label: 'Modrinth', Icon: ModrinthIcon, color: 'text-emerald-400' },
  { id: 'curseforge', label: 'CurseForge', Icon: CurseForgeIcon, color: 'text-orange-400' },
]

export default function ModsPage({ profiles = [], selectedProfileId, pageContext, setPageContext }) {
  const [platform, setPlatform] = useState('modrinth')
  const [inDetail, setInDetail] = useState(false)

  const handlePlatformChange = (p) => {
    setPlatform(p)
    setInDetail(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {!inDetail && (
        <PageHeader
          eyebrow="🍖 KHO BÁU RỒNG & MODS"
          title="Kho Modpack & Ma Pháp Cổ Đại"
          subtitle="Tìm kiếm mod, resource packs và shaders ma thuật dâng tặng Kobayashi-sama."
        >
          {/* Platform tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg0 ring-1 ring-line">
            {PLATFORMS.map((p) => {
              const isActive = platform === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlatformChange(p.id)}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-accent text-bg-0'
                      : `${p.color} hover:bg-bg2`,
                  ].join(' ')}
                >
                  <p.Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              )
            })}
          </div>
        </PageHeader>
      )}

      {!inDetail && pageContext && (
        <div className="mx-8 mb-4 px-4 py-2.5 rounded-lg bg-accentsoft/20 border border-accent/25 flex items-center justify-between text-xs text-fgdim shrink-0">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Đang lọc mod tương thích với profile: <strong className="text-fg">{pageContext.profileName}</strong> (<span className="uppercase">{pageContext.loader}</span> - Minecraft {pageContext.gameVersion})
          </span>
          <button
            onClick={() => setPageContext(null)}
            className="text-accent hover:text-accentstrong font-semibold hover:underline cursor-pointer"
          >
            Xóa bộ lọc profile
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 min-w-0">
        {platform === 'modrinth' && (
          <ModrinthTab
            selectedProfileId={selectedProfileId}
            pageContext={pageContext}
            onDetailStateChange={setInDetail}
          />
        )}
        {platform === 'curseforge' && (
          <CurseForgeTab
            selectedProfileId={selectedProfileId}
            pageContext={pageContext}
            onDetailStateChange={setInDetail}
          />
        )}
      </div>
    </div>
  )
}
