import React, { useState } from 'react'
import { PuzzlePiece } from '@phosphor-icons/react'
import vanillaPng from '../assets/loader/vanilla.png'
import fabricPng  from '../assets/loader/fabric.png'
import forgePng   from '../assets/loader/forge.png'

/** Map loader id → bundled icon. Unknown loaders fall back to vanilla. */
const LOADER_IMG = {
  vanilla: vanillaPng,
  fabric:  fabricPng,
  forge:   forgePng,
}

/**
 * LoaderIcon — small square image used in cards & headers to represent
 * the profile's mod loader. Sized via `className` (e.g. "w-12 h-12").
 *
 * Falls back to a PuzzlePiece glyph if the bundled PNG is missing or
 * corrupt. We track the broken state in React (rather than relying on a
 * CSS attribute selector that breaks once `display:none` is set via JS),
 * so the glyph shows up reliably even when an asset fails to load.
 */
export default function LoaderIcon({ loader = 'vanilla', className = '', imgClassName = '', alt }) {
  const [errored, setErrored] = useState(false)
  const src = LOADER_IMG[loader] || LOADER_IMG.vanilla

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {!errored && (
        <img
          src={src}
          alt={alt || `${loader} icon`}
          draggable={false}
          onError={() => setErrored(true)}
          className={`w-full h-full object-contain select-none pointer-events-none [image-rendering:pixelated] ${imgClassName}`}
        />
      )}
      {errored && (
        <PuzzlePiece
          size="60%"
          weight="regular"
          className="text-fgdim"
        />
      )}
    </div>
  )
}