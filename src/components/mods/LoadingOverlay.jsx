import React from 'react'
import { CircleNotch } from '@phosphor-icons/react'

export default function LoadingOverlay({ visible }) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg1/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <CircleNotch size={32} className="text-accent animate-spin" />
        <span className="text-sm text-fgdim">Đang tải…</span>
      </div>
    </div>
  )
}

export function LoadingShimmer() {
  return (
    <div className="animate-pulse">
      <div className="h-20 bg-bg2 rounded-lg mb-2" />
      <div className="h-20 bg-bg2 rounded-lg mb-2" />
      <div className="h-20 bg-bg2 rounded-lg mb-2" />
      <div className="h-20 bg-bg2 rounded-lg" />
    </div>
  )
}
