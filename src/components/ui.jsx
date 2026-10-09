import React from 'react'

/* ────────────────────── Primitive components ────────────────────── */

/** PageHeader — eyebrow + title + optional subtitle/right-slot. */
export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="px-8 pt-6 pb-4 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <span className="text-[9.5px] uppercase tracking-widest text-accent font-bold mb-1.5 block leading-none">{eyebrow}</span>
        )}
        {title && (
          <h1 className="text-lg font-black text-fg leading-none tracking-tight">{title}</h1>
        )}
        {subtitle && (
          <p className="text-[11px] text-fgfaint mt-1.5 leading-normal max-w-2xl truncate">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}

/** Card — flat surface with hairline border. */
export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={`rounded-xl bg-bg1/40 border border-line shadow-xl shadow-black/10 backdrop-blur-md ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Button — variant: primary | ghost | danger | subtle */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const sizes = {
    xs: 'text-[10px] px-2.5 h-6 gap-1.5 rounded-md font-semibold',
    sm: 'text-xs px-3 h-7.5 gap-1.5 rounded-lg font-bold',
    md: 'text-sm px-4 h-9 gap-2 rounded-xl font-bold',
    lg: 'text-sm px-5.5 h-11 gap-2.5 rounded-xl font-bold',
  }
  const variants = {
    primary:        'bg-accent hover:bg-accentstrong text-[#0d070b] shadow-[0_4px_12px_rgba(244,114,182,0.15)] hover:shadow-[0_6px_16px_rgba(244,114,182,0.3)] transition-all active:scale-[0.98]',
    ghost:          'bg-white/5 hover:bg-white/10 text-fg ring-1 ring-white/8 hover:ring-white/15 active:scale-[0.98] transition-all',
    subtle:         'bg-white/3 hover:bg-white/7 text-fgdim hover:text-fg border border-line active:scale-[0.98] transition-all',
    danger:         'bg-error hover:bg-rose-600 text-white shadow-[0_4px_12px_rgba(244,63,94,0.15)] active:scale-[0.98] transition-all',
    'danger-soft':  'bg-errorsoft/40 hover:bg-errorsoft/65 text-rose-300 border border-error/20 active:scale-[0.98] transition-all',
    info:           'bg-info hover:bg-purple-600 text-white active:scale-[0.98] transition-all',
    'info-soft':    'bg-infosoft hover:bg-infosoft/18 text-purple-300 border border-info/20 active:scale-[0.98] transition-all',
    success:        'bg-success hover:bg-emerald-600 text-white active:scale-[0.98] transition-all',
    'success-soft': 'bg-successsoft hover:bg-successsoft/15 text-success-300 border border-success/20 active:scale-[0.98] transition-all',
  }
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center transition-all duration-150 border border-transparent select-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed leading-normal',
        sizes[size],
        variants[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      )}
      <span className="translate-y-[1px] flex items-center justify-center gap-[inherit]">{children}</span>
    </button>
  )
}

/** Badge — small inline chip */
export function Badge({ tone = 'neutral', mono = false, children }) {
  const tones = {
    neutral:  'bg-bg3 border border-line text-fgdim',
    accent:   'bg-accentsoft border border-accent/20 text-accent',
    warn:     'bg-warnsoft border border-warn/25 text-warn',
    error:    'bg-errorsoft border border-error/20 text-error',
    info:     'bg-infosoft border border-info/20 text-info',
    success:  'bg-successsoft border border-success/20 text-success',
  }
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2.5 h-[18px] rounded-md text-[9px] select-none leading-normal border',
      mono ? 'font-mono' : 'uppercase tracking-wider font-extrabold',
      tones[tone],
    ].join(' ')}>
      <span className="translate-y-[1px] flex items-center gap-1">{children}</span>
    </span>
  )
}

/** ProgressBar — flat determinate bar. */
export function ProgressBar({ value = 0, indeterminate = false, tone = 'accent', className = '' }) {
  const tones = {
    accent: 'bg-accent shadow-[0_0_8px_rgba(244,114,182,0.5)]',
    info:   'bg-info',
    warn:   'bg-warn',
    error:  'bg-error',
  }
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={`relative h-1.5 rounded-full bg-bg0 border border-line overflow-hidden ${className}`}>
      {indeterminate ? (
        <div className="absolute inset-y-0 left-0 w-1/3 progress-indet rounded-full" />
      ) : (
        <div
          className={`h-full transition-[width] duration-200 ease-out rounded-full ${tones[tone]}`}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  )
}

/** Stat — used in cards. Tiny label + value. */
export function Stat({ icon, label, value }) {
  return (
    <div className="bg-bg0/40 border border-line rounded-xl px-3.5 py-2.5 min-w-0">
      <div className="text-[9.5px] text-fgfaint uppercase tracking-widest flex items-center gap-1.5 font-bold leading-none">
        {icon}
        <span className="translate-y-[0.5px]">{label}</span>
      </div>
      <div className="text-xs text-fg font-bold mt-1.5 truncate" title={value}>{value}</div>
    </div>
  )
}

/** Modal — centered card with backdrop */
export function Modal({ children, title, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          'w-full rounded-2xl bg-bg1/90 border border-linestrong shadow-2xl flex flex-col max-h-[90vh] backdrop-blur-xl',
          wide ? 'max-w-2xl' : 'max-w-md',
        ].join(' ')}
      >
        <div className="px-6 py-4.5 border-b border-line flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-black tracking-tight text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="text-fgfaint hover:text-fg transition p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-center"
            aria-label="Đóng"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  )
}

/** Field — form label + control + hint */
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && (
        <div className="text-xs text-fgdim mb-2 font-bold select-none leading-none"><span className="translate-y-[1px] inline-block">{label}</span></div>
      )}
      {children}
      {hint && <p className="text-[10px] text-fgfaint mt-2 font-semibold leading-normal">{hint}</p>}
    </label>
  )
}

/** TextInput / Select — share surface styling */
export const inputCls = [
  'w-full px-3.5 py-2.5 bg-bg0/60 border border-line rounded-xl text-sm text-fg placeholder:text-fgfaint transition-all duration-150',
  'focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/5',
].join(' ')

export function TextInput({ className = '', ...rest }) {
  return <input className={`${inputCls} ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }) {
  return (
    <div className="relative">
      <select className={`${inputCls} pr-9 font-mono appearance-none ${className}`} {...rest}>
        {children}
      </select>
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fgfaint pointer-events-none"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

/** EmptyState — illustration + title + desc + CTA */
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-bg1/25 p-12 text-center backdrop-blur-sm">
      {icon && (
        <div className="w-14 h-14 mx-auto rounded-xl bg-bg2 border border-line flex items-center justify-center mb-4 text-fgdim">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-fg mb-1.5 leading-none">{title}</h3>
      {desc && <p className="text-xs text-fgdim mb-5 max-w-sm mx-auto leading-normal">{desc}</p>}
      {action}
    </div>
  )
}