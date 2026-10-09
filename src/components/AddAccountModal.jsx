import React, { useState } from 'react'
import PlayerHead from './PlayerHead.jsx'
import { offlineUUID } from '../utils/offlineUUID.js'
import { Button, Card } from './ui.jsx'
import { UserCircle, ShieldCheck, CheckCircle, X } from '@phosphor-icons/react'

export default function AddAccountModal({ onClose, onAdd, onLinkDiscord, existingAccounts = [] }) {
  const [activeTab, setActiveTab] = useState('offline') // 'offline' | 'microsoft'
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Validation
  const validateUsername = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return 'Tên người chơi không được để trống'
    if (trimmed.length < 3 || trimmed.length > 16) return 'Tên người chơi phải từ 3 đến 16 ký tự'
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Tên chỉ được chứa chữ cái, số và dấu gạch dưới'
    return null
  }

  const handleAddOffline = async (e) => {
    e.preventDefault()
    const err = validateUsername(username)
    if (err) {
      setError(err)
      return
    }

    const uuid = offlineUUID(username.trim())
    const exists = existingAccounts.find(
      (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.type === 'offline'
    )
    if (exists) {
      setError('Tài khoản offline này đã tồn tại')
      return
    }

    setLoading(true)
    const newAccount = {
      id: uuid,
      uuid: uuid,
      username: username.trim(),
      type: 'offline',
      createdAt: new Date().toISOString(),
    }

    const result = await onAdd(newAccount)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  const handleAddMicrosoft = async () => {
    setLoading(true)
    setError(null)
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI
    if (!isElectron) {
      setError('Lỗi: Môi trường không hỗ trợ đăng nhập Microsoft')
      setLoading(false)
      return
    }

    const r = await window.electronAPI.loginMicrosoft()
    setLoading(false)
    if (r?.error) {
      setError(r.error)
    } else if (r?.ok) {
      // Trigger a sync by calling onAdd with a flag indicating MS account is already registered
      await onAdd({ _msAlreadySaved: true })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-bg1 border border-line shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h3 className="text-fg font-bold text-base">Thêm tài khoản Minecraft</h3>
            <p className="text-fgfaint text-xs mt-0.5">Chọn phương thức kết nối tài khoản của bạn</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-fgdim hover:bg-bg2 hover:text-fg transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line bg-bg0 px-4">
          <button
            onClick={() => { setActiveTab('offline'); setError(null) }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'offline'
                ? 'border-accent text-accent'
                : 'border-transparent text-fgdim hover:text-fg'
            }`}
          >
            <UserCircle size={16} weight="bold" />
            Ngoại tuyến (Offline)
          </button>
          <button
            onClick={() => { setActiveTab('microsoft'); setError(null) }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'microsoft'
                ? 'border-accent text-accent'
                : 'border-transparent text-fgdim hover:text-fg'
            }`}
          >
            <ShieldCheck size={16} weight="bold" />
            Microsoft
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-errorsoft border border-error/25 text-error text-xs">
              {error}
            </div>
          )}

          {activeTab === 'offline' ? (
            <form onSubmit={handleAddOffline} className="space-y-4">
              <div>
                <label className="text-[11px] text-fgfaint font-semibold uppercase tracking-wider mb-1.5 block">
                  Tên người chơi (Username)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError(null)
                  }}
                  placeholder="Nhập tên nhân vật Minecraft..."
                  maxLength={16}
                  className="w-full bg-bg2 border border-line rounded-xl px-4 py-2.5 text-sm text-fg placeholder:text-fgfaint focus:outline-none focus:border-accent"
                  disabled={loading}
                />
              </div>

              {/* Preview Head */}
              {username.trim().length >= 3 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg0 border border-line">
                  <PlayerHead
                    uuid={offlineUUID(username.trim())}
                    username={username.trim()}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-fg truncate">{username.trim()}</p>
                    <p className="text-[10px] text-fgfaint truncate font-mono">
                      UUID: {offlineUUID(username.trim()).slice(0, 18)}...
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="subtle" size="sm" onClick={onClose} disabled={loading}>
                  Huỷ
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={loading} disabled={loading}>
                  Thêm tài khoản
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-accentsoft/20 flex items-center justify-center text-accent">
                  <ShieldCheck size={32} weight="duotone" />
                </div>
                <div>
                  <h4 className="font-bold text-fg text-sm">Đăng nhập tài khoản Microsoft</h4>
                  <p className="text-xs text-fgfaint max-w-xs mt-1 mx-auto">
                    Kết nối tài khoản Microsoft đã mua bản quyền game Minecraft Java Edition. Đăng nhập qua cửa sổ bảo mật chính thức.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="subtle" size="sm" onClick={onClose} disabled={loading}>
                  Huỷ
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleAddMicrosoft} loading={loading} disabled={loading}>
                  Đăng nhập với Microsoft
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
