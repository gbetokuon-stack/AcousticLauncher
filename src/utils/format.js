const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const PATHS_KEY = 'xforge.paths'

export const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B'
  let i = 0
  let n = bytes
  while (n >= 1024 && i < SIZE_UNITS.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : n >= 10 ? 1 : 2)} ${SIZE_UNITS[i]}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', { hour12: false })
  } catch { return iso }
}

export function formatRelative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ngày trước`
  return formatDate(iso)
}

export async function getPathsCached() {
  if (!isElectron) return null
  try {
    const cached = sessionStorage.getItem(PATHS_KEY)
    if (cached) return JSON.parse(cached)
    const fresh = await window.electronAPI.getPaths()
    sessionStorage.setItem(PATHS_KEY, JSON.stringify(fresh))
    return fresh
  } catch { return null }
}
