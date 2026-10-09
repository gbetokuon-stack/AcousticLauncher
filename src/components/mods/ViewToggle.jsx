import React from 'react'
import { List, SquaresFour } from '@phosphor-icons/react'

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="flex rounded-lg bg-bg2 ring-1 ring-line overflow-hidden">
      <button
        onClick={() => onChange('grid')}
        className={[
          'flex items-center justify-center w-8 h-8 transition-colors',
          view === 'grid' ? 'bg-accent text-bg-0' : 'text-fgdim hover:text-fg',
        ].join(' ')}
        title="Grid view"
      >
        <SquaresFour size={16} weight={view === 'grid' ? 'fill' : 'regular'} />
      </button>
      <button
        onClick={() => onChange('list')}
        className={[
          'flex items-center justify-center w-8 h-8 transition-colors',
          view === 'list' ? 'bg-accent text-bg-0' : 'text-fgdim hover:text-fg',
        ].join(' ')}
        title="List view"
      >
        <List size={16} weight={view === 'list' ? 'fill' : 'regular'} />
      </button>
    </div>
  )
}
