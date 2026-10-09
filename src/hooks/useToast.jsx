import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

function useToastState() {
  const [items, setItems] = useState([])
  const counterRef = useRef(0)

  const push = useCallback((opts) => {
    const id = ++counterRef.current
    const item = { id, type: 'info', title: '', message: '', timeout: 3500, ...opts }
    setItems((prev) => [...prev, item])
    if (item.timeout > 0) {
      setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), item.timeout)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setItems((p) => p.filter((t) => t.id !== id))
  }, [])

  return { items, push, dismiss }
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const state = useToastState()
  return (
    <ToastContext.Provider value={{ push: state.push, dismiss: state.dismiss }}>
      {children}
      <ToastViewport items={state.items} dismiss={state.dismiss} />
    </ToastContext.Provider>
  )
}

const COLORS = {
  info:    { ring: 'ring-sky-500/30',     icon: 'text-sky-400',     bg: 'bg-sky-500/10' },
  success: { ring: 'ring-emerald-500/30', icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warn:    { ring: 'ring-amber-500/40',   icon: 'text-amber-400',   bg: 'bg-amber-500/10' },
  error:   { ring: 'ring-red-500/40',     icon: 'text-red-400',     bg: 'bg-red-500/10' },
}

function Icon({ kind, className = 'w-4 h-4' }) {
  if (kind === 'success') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (kind === 'warn') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.74-3l-7-12a2 2 0 00-3.48 0l-7 12a2 2 0 001.74 3z" />
      </svg>
    )
  }
  if (kind === 'error') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ToastViewport({ items, dismiss }) {
  return (
    <div className="fixed top-3 right-3 z-[1000] flex flex-col gap-2 max-w-[360px] pointer-events-none">
      {items.map((t) => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div
            key={t.id}
            className={`pointer-events-auto toast-in rounded-xl ring-1 ${c.ring} ${c.bg} backdrop-blur px-3 py-2.5 shadow-2xl bg-neutral-900/80`}
          >
            <div className="flex items-start gap-2.5">
              <Icon kind={t.type} className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-sm font-semibold text-white/90">{t.title}</div>}
                {t.message && <div className="text-xs text-white/70 mt-0.5 break-words">{t.message}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="no-drag text-white/40 hover:text-white/80 transition"
                title="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
