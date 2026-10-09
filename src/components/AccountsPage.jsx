import React, { useState, useEffect, useRef } from 'react'
import { useAccounts } from '../hooks/useAccounts.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { formatRelative } from '../utils/format.js'
import {
  UserCircle, ShieldCheck, Clock, IdentificationCard,
  CheckCircle, Warning, Info, CircleNotch, Gear, Copy, Eye, EyeSlash, Trash, Plus
} from '@phosphor-icons/react'
import { MaidTeaIcon, MaidBowIcon, TohruMagicCircleLarge, TohruHornsIcon, DragonFlameIcon } from './DragonIcons.jsx'
import { PageHeader, Card, Button, Badge } from './ui.jsx'
import PlayerHead from './PlayerHead.jsx'
import PlayerModel3D from './PlayerModel3D.jsx'
import AddAccountModal from './AddAccountModal.jsx'
import SkinCustomizeModal from './SkinCustomizeModal.jsx'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// Canvas helper to extract and crop head/face from raw 64x64 skin texture
function SkinHeadPreview({ skinUrl, size = 48 }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!skinUrl) return
    setError(false)
    const img = new Image()
    if (skinUrl && !skinUrl.startsWith('data:') && !skinUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size)
      
      // Minecraft skin head coordinates:
      // Base head: 8, 8 (width 8, height 8)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size)
      
      // Helm overlay (accessory): 40, 8 (width 8, height 8)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size)
    }
    img.onerror = () => {
      setError(true)
    }
    img.src = skinUrl
  }, [skinUrl, size])

  if (error) {
    return (
      <div 
        className="rounded-lg bg-white/5 border border-line flex items-center justify-center text-fgdim font-bold text-xs"
        style={{ width: size, height: size }}
      >
        Skin
      </div>
    )
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      className="rounded-lg bg-white/5 border border-line" 
      style={{ width: size, height: size, imageRendering: 'pixelated' }} 
    />
  )
}

export default function AccountsPage() {
  const {
    accounts,
    selectedAccount,
    loading,
    addAccount,
    updateAccount,
    removeAccount,
    selectAccount
  } = useAccounts()

  const toast = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSkinModal, setShowSkinModal] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  
  const [slim, setSlim] = useState(false)
  const [showUuid, setShowUuid] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [skinPrefs, setSkinPrefs] = useState(null)

  const selected = selectedAccount || accounts[0] || null

  // Load custom skin prefs when selected account changes
  useEffect(() => {
    if (!selected?.uuid) {
      setSkinPrefs(null)
      return
    }
    const load = async () => {
      try {
        const prefs = isElectron
          ? await window.electronAPI.getSkinPrefs({ uuid: selected.uuid })
          : JSON.parse(localStorage.getItem(`vxc_skin_prefs_${selected.uuid}`) || 'null')

        setSkinPrefs(prefs || null)
      } catch {
        setSkinPrefs(null)
      }
    }
    load()
  }, [selected?.uuid])

  const appliedSkinUrl = skinPrefs?.useCustomSkin !== false ? (skinPrefs?.skinUrl || null) : null

  const onRemove = async (id) => {
    const r = await removeAccount(id)
    if (r?.error) {
      toast.push({ type: 'error', title: 'Xoá thất bại', message: r.error })
    } else {
      toast.push({ type: 'success', message: 'Đã xoá tài khoản.' })
    }
    setConfirmRemove(null)
  }

  const handleCopyUuid = () => {
    if (!selected?.uuid) return
    navigator.clipboard.writeText(selected.uuid).then(() => {
      setCopied(true)
      toast.push({ type: 'success', message: 'Đã sao chép UUID vào bộ nhớ tạm.' })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSelectSkinFromGrid = async (item) => {
    if (item.isDefault || item.isRemove) {
      const newPrefs = {
        uuid: selected?.uuid,
        skinUrl: item.isRemove ? null : (skinPrefs?.skinUrl || null),
        capeUrl: item.isRemove ? null : (skinPrefs?.capeUrl || null),
        elytraUrl: item.isRemove ? null : (skinPrefs?.elytraUrl || null),
        useCustomSkin: false,
      }
      try {
        if (isElectron) {
          await window.electronAPI.saveSkinPrefs(newPrefs)
          if (item.isRemove) {
            await window.electronAPI.deleteLocalFile({ uuid: selected?.uuid, type: 'skin' })
          }
        } else {
          localStorage.setItem(`vxc_skin_prefs_${selected?.uuid}`, JSON.stringify(newPrefs))
        }
      } catch (err) {
        console.error(err)
      }
      setSkinPrefs(item.isRemove ? null : newPrefs)
      setSlim(false)
      toast.push({ type: 'success', message: item.isRemove ? 'Đã gỡ bỏ skin tùy chỉnh.' : 'Đã khôi phục skin mặc định thành công.' })
    } else {
      if (!item.active) {
        const newPrefs = {
          uuid: selected?.uuid,
          skinUrl: skinPrefs?.skinUrl || null,
          capeUrl: skinPrefs?.capeUrl || null,
          elytraUrl: skinPrefs?.elytraUrl || null,
          useCustomSkin: true,
        }
        try {
          if (isElectron) {
            await window.electronAPI.saveSkinPrefs(newPrefs)
          } else {
            localStorage.setItem(`vxc_skin_prefs_${selected?.uuid}`, JSON.stringify(newPrefs))
          }
        } catch (err) {
          console.error(err)
        }
        setSkinPrefs(newPrefs)
        toast.push({ type: 'success', message: 'Đã kích hoạt skin tùy chỉnh.' })
      } else {
        toast.push({ type: 'info', message: 'Skin tùy chỉnh hiện đang được dùng.' })
      }
    }
  }

  return (
    <div className="flex w-full min-h-0 flex-1 overflow-hidden">
      {/* Cột trái: Quản lý tài khoản và Skin */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-line bg-transparent">
        {/* Header */}
        <PageHeader
          eyebrow="🎀 KHẾ ƯỚC CHỦ NHÂN"
          title="Khế Ước Hầu Gái & Tài Khoản"
          subtitle="Đăng nhập tài khoản Microsoft hoặc tài khoản Offline để đồng hành cùng Tohru."
        >
          <Button variant="primary" onClick={() => setShowAddModal(true)} className="gap-2 font-bold">
            <MaidBowIcon size={16} />
            Lập Khế Ước Mới
          </Button>
        </PageHeader>

        {/* Danh sách tài khoản */}
        <div className="flex-1 overflow-y-auto px-8 pt-6 pb-4 space-y-3" style={{ maxHeight: '45%' }}>
          {loading ? (
            <div className="text-sm text-fgdim flex items-center gap-2 py-4">
              <CircleNotch size={14} className="animate-spin" />
              Đang tải danh sách...
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-6 text-center text-xs text-fgfaint">
              Chưa có tài khoản nào được kết nối. Bấm "Thêm tài khoản" ở trên để bắt đầu.
            </div>
          ) : (
            <div className="space-y-2.5">
              {accounts.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  isSelected={a.id === selected?.id}
                  onSelect={() => selectAccount(a.id)}
                  onRemove={() => setConfirmRemove(a)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ngăn cách */}
        <div className="h-px bg-line mx-8 flex-shrink-0" />

        {/* Tab điều chỉnh skin */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 pt-0 pb-5">
          {selected ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between border-b border-line flex-shrink-0 pt-5 pb-5">
                <h3 className="text-xs font-bold text-fg uppercase tracking-wider translate-y-[1px]">Skin Nhân vật</h3>

                <Button 
                  variant="subtle" 
                  size="sm" 
                  onClick={() => setShowSkinModal(true)} 
                  className="bg-transparent border-transparent ring-0 hover:bg-white/5 text-fgdim hover:text-fg text-xs gap-1.5 py-1 px-2.5 h-7 inline-flex items-center justify-center leading-none"
                >
                  <Gear size={13} weight="bold" />
                  Tùy chỉnh
                </Button>
              </div>

              {/* Grid hiển thị tài nguyên */}
              <div className="flex-1 overflow-y-auto pt-4 pb-2">
                {(() => {
                  const defaultBodyPreviewUrl = selected?.username ? `https://crafthead.net/body/${selected.username}` : null
                  const items = []

                  if (defaultBodyPreviewUrl) {
                    items.push({
                      url: defaultBodyPreviewUrl,
                      label: 'Skin mặc định',
                      active: !skinPrefs?.skinUrl || skinPrefs.useCustomSkin === false,
                      isDefault: true,
                    })
                  }
                  if (skinPrefs?.skinUrl) {
                    items.push({
                      url: skinPrefs.skinUrl,
                      label: 'Skin tùy chỉnh',
                      active: skinPrefs.useCustomSkin !== false,
                      isDefault: false,
                      isCustomSkin: true,
                    })
                  }

                  if (items.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <p className="text-xs text-fgfaint">
                          Không có skin nào.
                        </p>
                        <button
                          onClick={() => setShowSkinModal(true)}
                          className="text-xs text-accent hover:underline font-semibold"
                        >
                          Tải lên ngay
                        </button>
                      </div>
                    )
                  }

                  return (
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            handleSelectSkinFromGrid(item)
                          }}
                          className={`flex flex-col items-center justify-center p-3.5 rounded-xl transition-all cursor-pointer group relative border min-h-[125px] ${
                            item.active
                              ? 'bg-accentsoft/20 border-accent/30'
                              : 'bg-bg0/40 border-line hover:border-linestrong'
                          }`}
                        >
                          {item.active && (
                            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-accent" />
                          )}
                          
                          {item.isDefault ? (
                            <img
                              src={item.url}
                              alt=""
                              className="w-12 h-12 rounded-lg object-contain"
                              style={{ imageRendering: 'pixelated', background: 'rgba(255,255,255,0.02)' }}
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <SkinHeadPreview skinUrl={item.url} size={48} />
                          )}
                          
                          <span className="text-[10px] font-semibold text-fgdim mt-2 truncate w-full text-center">
                            {item.label}
                          </span>
                          
                          {item.isCustomSkin ? (
                            <div className="mt-1.5 flex items-center justify-between w-full px-1.5">
                              {item.active ? (
                                <span className="text-[9px] text-accent font-bold">Đang dùng</span>
                              ) : (
                                <span className="text-[9px] text-fgfaint opacity-0 group-hover:opacity-100 transition-opacity">Nhấp để dùng</span>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await handleSelectSkinFromGrid({ isRemove: true })
                                }}
                                className="p-1 rounded hover:bg-errorsoft text-fgfaint hover:text-error transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title="Xóa skin tùy chỉnh"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          ) : (
                            item.active ? (
                              <span className="text-[9px] text-accent mt-0.5 font-bold">Đang dùng</span>
                            ) : (
                              <span className="text-[9px] text-fgfaint mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Nhấp để dùng
                              </span>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-fgfaint">
              Chọn một tài khoản để tùy chỉnh skin.
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Khung hiển thị mô hình 3D */}
      <div
        className="flex-shrink-0 flex flex-col relative overflow-hidden bg-bg0/25 backdrop-blur-sm"
        style={{ width: 260, borderLeft: '1px solid var(--color-line)' }}
      >
        {/* Background Canvas Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-[#0d070b]/35 to-bg0/20 pointer-events-none">
          {/* Grid lines overlay */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `
                linear-gradient(rgba(244,114,182,0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(244,114,182,0.12) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          />
          {/* Ambient glow */}
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/6 rounded-full blur-3xl pointer-events-none" />
          {/* Dragon Magic Summoning Circle Pedestal under 3D model */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 opacity-25 text-accent pointer-events-none transform scale-y-[0.38] scale-x-110">
            <TohruMagicCircleLarge size={220} />
          </div>
        </div>

        {selected ? (
          <>
            {/* 3D Canvas Box */}
            <div className="relative z-10 w-full flex-1 min-h-0">
              <PlayerModel3D
                uuid={selected.uuid}
                username={selected.username}
                slim={slim}
                customSkinUrl={appliedSkinUrl}
              />
            </div>

            {/* Profile Detail Overlay */}
            <div className="relative z-10 text-center px-5 py-4 border-t border-line bg-bg1/90 backdrop-blur-md">
              <p className="text-sm font-bold text-fg truncate">{selected.username}</p>

              {/* UUID row */}
              <div className="flex items-center justify-center gap-1.5 mt-1.5 text-fgfaint font-mono text-[10px]">
                <span className="truncate max-w-[130px]">
                  {showUuid ? selected.uuid : `${selected.uuid.slice(0, 8)}···`}
                </span>
                <button
                  onClick={() => setShowUuid(!showUuid)}
                  className="text-fgfaint hover:text-fg transition-colors flex-shrink-0"
                  title={showUuid ? 'Ẩn UUID' : 'Hiện UUID'}
                >
                  {showUuid ? <EyeSlash size={11} /> : <Eye size={11} />}
                </button>
                <button
                  onClick={handleCopyUuid}
                  className="text-fgfaint hover:text-fg transition-colors flex-shrink-0"
                  title="Sao chép UUID"
                >
                  <Copy size={11} className={copied ? 'text-accent' : ''} />
                </button>
              </div>

              {/* Badges and slim/wide toggle */}
              <div className="mt-3.5 flex items-center justify-center gap-2 flex-wrap">
                <Badge tone={(selected.type || 'microsoft') === 'microsoft' ? 'info' : 'neutral'}>
                  {selected.type || 'microsoft'}
                </Badge>

                <button
                  onClick={() => setSlim(!slim)}
                  className="inline-flex items-center justify-center text-[10px] px-2.5 h-6 rounded-full border border-line bg-bg0 text-fgdim hover:text-fg hover:border-linestrong transition-all font-semibold leading-none"
                >
                  <span className="translate-y-[1px]">Mẫu: {slim ? 'Alex (Slim)' : 'Steve (Wide)'}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 text-center px-6">
            <div className="w-16 h-28 rounded-xl bg-bg1 border border-line flex items-center justify-center text-fgfaint">
              <UserCircle size={28} weight="duotone" />
            </div>
            <p className="text-xs text-fgfaint">Chọn một tài khoản để xem mô hình 3D</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onAdd={addAccount}
          existingAccounts={accounts}
        />
      )}

      {showSkinModal && (
        <SkinCustomizeModal
          account={selected}
          onClose={() => setShowSkinModal(false)}
          onApply={({ type, url, skinType }) => {
            if (type === 'skin') {
              setSkinPrefs(prev => ({
                ...prev,
                uuid: selected?.uuid,
                skinUrl: url,
                useCustomSkin: true
              }))
              if (skinType) setSlim(skinType === 'slim')
            } else if (type === 'cape') {
              // Not used
            } else if (type === 'elytra') {
              // Not used
            }
            toast.push({
              type: 'success',
              title: 'Đã áp dụng diện mạo mới',
              message: `Đã thay đổi ${type === 'skin' ? 'Skin' : type === 'cape' ? 'Cape' : 'Elytra'} cho tài khoản.`
            })
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Xoá tài khoản?"
          message={`Tài khoản "${confirmRemove.username}" sẽ bị xoá khỏi hệ thống. Bạn có thể đăng nhập lại bất kỳ lúc nào.`}
          confirmText="Xoá"
          danger
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => onRemove(confirmRemove.id)}
        />
      )}
    </div>
  )
}

function AccountRow({ account, isSelected, onSelect, onRemove }) {
  return (
    <Card 
      className={[
        'p-3.5 flex items-center justify-between gap-4 transition-all cursor-pointer relative group',
        isSelected ? 'border-accent/30 bg-accentsoft/20' : 'hover:border-linestrong bg-bg0/40',
      ].join(' ')} 
      onClick={onSelect}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <PlayerHead uuid={account.uuid} username={account.username} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="font-bold text-fg truncate text-sm leading-none">{account.username}</div>
            {isSelected && (
              <Badge tone="accent">Đang dùng</Badge>
            )}
            <Badge tone={(account.type || 'microsoft') === 'microsoft' ? 'info' : 'neutral'}>
              {account.type || 'microsoft'}
            </Badge>
          </div>
          <div className="text-[10px] text-fgfaint font-mono mt-1 flex items-center gap-1">
            <IdentificationCard size={11} />
            {account.uuid.slice(0, 18)}...
          </div>
          <div className="text-[10px] text-fgfaint mt-0.5 flex items-center gap-1">
            <Clock size={11} />
            Thêm {formatRelative(account.createdAt || account.addedAt)}
          </div>
        </div>
      </div>

      {/* Hover-only Delete Button or Selection CheckCircle */}
      <div className="flex items-center justify-center w-8 h-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {isSelected ? (
          <CheckCircle size={18} weight="fill" className="text-accent group-hover:hidden transition-all duration-150" />
        ) : null}
        
        <button
          onClick={onRemove}
          className="w-7 h-7 items-center justify-center rounded-lg text-fgfaint hover:text-error hover:bg-errorsoft/35 transition-all duration-150 hidden group-hover:flex"
          title="Xoá tài khoản"
        >
          <Trash size={15} weight="bold" />
        </button>
      </div>
    </Card>
  )
}

function ConfirmModal({ title, message, confirmText, danger, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-xl bg-bg1 border border-line shadow-2xl p-5">
        <div className="flex items-start gap-3 mb-2">
          <div className={[
            'w-10 h-10 rounded-lg ring-1 flex items-center justify-center flex-shrink-0',
            danger ? 'bg-errorsoft ring-error/40' : 'bg-accentsoft ring-accent/40',
          ].join(' ')}>
            {danger ? <Warning size={20} className="text-error" /> : <Info size={20} className="text-accent" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-fg mb-1">{title}</h2>
            <p className="text-sm text-fgdim">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="subtle" size="sm" onClick={onCancel}>Huỷ</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}