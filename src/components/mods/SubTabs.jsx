import React from 'react'
import {
  PuzzlePiece,
  Package,
  Sparkle,
  PaintBrush,
  Database,
} from '@phosphor-icons/react'

const SUB_TABS = [
  { id: 'mod',          label: 'Mods',            Icon: PuzzlePiece },
  { id: 'modpack',      label: 'Modpacks',         Icon: Package     },
  { id: 'shader',       label: 'Shaders',          Icon: Sparkle     },
  { id: 'resourcepack', label: 'Gói tài nguyên',   Icon: PaintBrush  },
  { id: 'datapack',     label: 'Gói dữ liệu',       Icon: Database    },
]

export function ModrinthSubTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {SUB_TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
            active === id
              ? 'bg-accent/15 text-accent border border-accent/25'
              : 'text-fgdim hover:text-fg hover:bg-bg2 border border-transparent',
          ].join(' ')}
        >
          <Icon size={14} weight="duotone" />
          {label}
        </button>
      ))}
    </div>
  )
}

export function CurseForgeSubTabs({ active, onChange }) {
  // CurseForge only supports mods, modpacks, textures
  const tabs = [
    { id: 'mod', label: 'Mods', Icon: PuzzlePiece },
    { id: 'modpack', label: 'Modpacks', Icon: Package },
    { id: 'shader', label: 'Shaders', Icon: Sparkle },
  ]
  
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
            active === id
              ? 'bg-accent/15 text-accent border border-accent/25'
              : 'text-fgdim hover:text-fg hover:bg-bg2 border border-transparent',
          ].join(' ')}
        >
          <Icon size={14} weight="duotone" />
          {label}
        </button>
      ))}
    </div>
  )
}

export { SUB_TABS }
