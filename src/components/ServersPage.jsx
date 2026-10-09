import React, { useState, useEffect, useCallback } from 'react'
import {
  Globe, Play, ArrowsClockwise, Plus, Trash, PencilSimple,
  Copy, Check, ShieldCheck, Users, WifiHigh, WifiMedium, WifiLow,
  WarningCircle, CircleNotch, GameController, Sparkle
} from '@phosphor-icons/react'
import { MagicCircleIcon, DragonWingsIcon, DragonFlameIcon } from './DragonIcons.jsx'
import { PageHeader, Card, Button, Badge, Modal, Field, TextInput } from './ui.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { playSound } from '../utils/sound.js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export default function ServersPage({ profiles, selectedProfileId, onPlayServer, soundEnabled = true }) {
  const toast = useToast()
  const [servers, setServers] = useState([])
  const [pingData, setPingData] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingServer, setEditingServer] = useState(null)
  const [deletingServerId, setDeletingServerId] = useState(null)

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0]

  const loadServers = useCallback(async () => {
    if (!isElectron) return
    try {
      const list = await window.electronAPI.getServers()
      setServers(list || [])
      return list || []
    } catch {
      return []
    }
  }, [])

  const pingAll = useCallback(async (list) => {
    if (!isElectron) return
    const target = list || servers
    if (target.length === 0) return

    setRefreshing(true)
    playSound('tab', soundEnabled)

    try {
      const results = await window.electronAPI.pingAllServers(target)
      const map = {}
      for (const res of results) {
        if (res.id) map[res.id] = res
      }
      setPingData((prev) => ({ ...prev, ...map }))
    } catch (err) {
      console.warn('Lỗi ping servers:', err)
    } finally {
      setRefreshing(false)
    }
  }, [servers, soundEnabled])

  useEffect(() => {
    loadServers().then((list) => {
      if (list && list.length > 0) {
        pingAll(list)
      }
    })
  }, [loadServers])

  const copyIp = (server) => {
    const full = server.port && server.port !== 25565 ? `${server.address}:${server.port}` : server.address
    navigator.clipboard.writeText(full).then(() => {
      setCopiedId(server.id)
      playSound('click', soundEnabled)
      toast.push({ type: 'success', message: `Đã sao chép IP: ${full}` })
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  const handleDelete = async (id) => {
    if (!isElectron) return
    await window.electronAPI.deleteServer(id)
    toast.push({ type: 'success', message: 'Đã xóa máy chủ.' })
    setDeletingServerId(null)
    loadServers()
  }

  const handleSaveAdd = async (data) => {
    if (!isElectron) return
    const res = await window.electronAPI.addServer(data)
    if (res?.error) {
      toast.push({ type: 'error', message: res.error })
      return
    }
    toast.push({ type: 'success', message: 'Đã thêm máy chủ mới!' })
    setShowAddModal(false)
    const nextList = await loadServers()
    if (res.server) {
      // Ping the newly added server
      window.electronAPI.pingServer({ address: res.server.address, port: res.server.port }).then((p) => {
        setPingData((prev) => ({ ...prev, [res.server.id]: { id: res.server.id, ...p } }))
      })
    }
  }

  const handleSaveEdit = async (id, patch) => {
    if (!isElectron) return
    const res = await window.electronAPI.updateServer(id, patch)
    if (res?.error) {
      toast.push({ type: 'error', message: res.error })
      return
    }
    toast.push({ type: 'success', message: 'Đã cập nhật thông tin máy chủ.' })
    setEditingServer(null)
    loadServers()
  }

  const handleResetDefaults = async () => {
    if (!isElectron) return
    const list = await window.electronAPI.resetDefaultServers()
    setServers(list || [])
    toast.push({ type: 'info', message: 'Đã khôi phục danh sách máy chủ gợi ý.' })
    pingAll(list)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <PageHeader
        eyebrow="🔮 CỔNG DỊCH CHUYỂN THỨ NGUYÊN"
        title="Cổng Ma Pháp & Ping Trực Tiếp"
        subtitle="Khám phá các thế giới song song, kiểm tra ma lực kết nối và bay thẳng vào máy chủ."
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => pingAll(servers)}
          disabled={refreshing}
          className="gap-2"
        >
          <ArrowsClockwise size={14} className={refreshing ? 'animate-spin text-accent' : ''} />
          {refreshing ? 'Đang ping…' : 'Làm mới tất cả'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setShowAddModal(true); playSound('click', soundEnabled) }}
          className="gap-1.5"
        >
          <Plus size={14} weight="bold" />
          Thêm máy chủ
        </Button>
      </PageHeader>

      {/* Top Banner info if profile selected */}
      {selectedProfile && (
        <div className="mx-8 mb-3 px-4 py-2.5 rounded-xl bg-bg2/40 border border-line flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-fgdim">
              Profile đang chọn để kết nối: <strong className="text-fg">{selectedProfile.name}</strong> ({selectedProfile.gameVersion} - {selectedProfile.loader})
            </span>
          </div>
          <span className="text-fgfaint text-[11px]">
            Bấm "Kết nối ngay" sẽ tự động vào thẳng Server khi mở game.
          </span>
        </div>
      )}

      {/* Server Cards List */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 max-w-6xl">
          {servers.map((server) => {
            const ping = pingData[server.id]
            const isOnline = ping ? ping.online : null
            const latency = ping?.ping ?? -1
            const fullAddress = server.port && server.port !== 25565 ? `${server.address}:${server.port}` : server.address

            return (
              <Card
                key={server.id}
                className="p-4 hover:border-linestrong transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top info */}
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Server Favicon or Icon */}
                    <div className="w-14 h-14 rounded-xl bg-bg0 ring-1 ring-line flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-inner">
                      {ping?.favicon ? (
                        <img
                          src={ping.favicon}
                          alt=""
                          className="w-full h-full object-cover rounded-xl"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <Globe size={28} className="text-accent opacity-80" />
                      )}
                      {server.featured && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" title="Nổi bật" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-bold text-fg truncate text-sm">{server.name}</h3>
                          <Badge tone="neutral">{server.tag || 'Server'}</Badge>
                        </div>

                        {/* Ping Badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isOnline === null ? (
                            <Badge tone="neutral">
                              <CircleNotch size={10} className="animate-spin" />
                              Ping…
                            </Badge>
                          ) : isOnline ? (
                            <Badge tone={latency < 80 ? 'success' : latency < 180 ? 'warn' : 'error'}>
                              {latency < 80 ? <WifiHigh size={11} /> : latency < 180 ? <WifiMedium size={11} /> : <WifiLow size={11} />}
                              {latency} ms
                            </Badge>
                          ) : (
                            <Badge tone="error">
                              <WarningCircle size={11} />
                              Offline
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* IP address and Copy Button */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs text-accent font-semibold select-all">
                          {fullAddress}
                        </span>
                        <button
                          onClick={() => copyIp(server)}
                          className="text-fgfaint hover:text-fg transition-colors p-1 rounded hover:bg-white/5"
                          title="Sao chép IP"
                        >
                          {copiedId === server.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Players & Version */}
                      {ping?.online && (
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-fgdim">
                          <span className="flex items-center gap-1 font-mono">
                            <Users size={12} className="text-accent" />
                            <strong>{ping.players.online.toLocaleString()}</strong>
                            <span className="text-fgfaint">/{ping.players.max.toLocaleString()}</span>
                          </span>
                          <span className="text-fgfaint truncate max-w-[180px]">
                            {ping.version}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MOTD Preview with colored HTML */}
                  {ping?.motd?.html ? (
                    <div
                      className="mt-3 p-2.5 rounded-lg bg-bg0/60 border border-line/60 font-mono text-[11px] leading-relaxed break-words text-fgdim overflow-hidden max-h-16 custom-scrollbar"
                      dangerouslySetInnerHTML={{ __html: ping.motd.html }}
                    />
                  ) : ping && !ping.online ? (
                    <div className="mt-3 p-2.5 rounded-lg bg-errorsoft/20 border border-error/20 text-xs text-error font-medium">
                      {ping.error || 'Không thể kết nối tới máy chủ này.'}
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 rounded-lg bg-bg0/40 border border-line/40 text-[11px] text-fgfaint italic">
                      Đang nhận thông tin máy chủ…
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => setEditingServer(server)}
                      title="Chỉnh sửa"
                    >
                      <PencilSimple size={12} />
                      Sửa
                    </Button>
                    <Button
                      variant="danger-soft"
                      size="xs"
                      onClick={() => setDeletingServerId(server.id)}
                      title="Xoá máy chủ"
                    >
                      <Trash size={12} />
                    </Button>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedProfile}
                    onClick={() => {
                      playSound('launch', soundEnabled)
                      onPlayServer?.(selectedProfile?.id, { address: server.address, port: server.port })
                    }}
                    className="gap-2 font-bold shadow-[0_0_12px_var(--color-accentsoft)]"
                  >
                    <DragonWingsIcon size={16} />
                    Bay Vào Server
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Footer info */}
        <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-xs text-fgfaint max-w-6xl">
          <span>Tổng cộng {servers.length} máy chủ được theo dõi.</span>
          <button
            onClick={handleResetDefaults}
            className="hover:text-accent transition-colors underline cursor-pointer"
          >
            Khôi phục danh sách mặc định
          </button>
        </div>
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <ServerEditModal
          title="Thêm Máy chủ Mới"
          initialData={{ name: '', address: '', port: 25565, tag: 'Survival' }}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveAdd}
        />
      )}

      {/* Edit Server Modal */}
      {editingServer && (
        <ServerEditModal
          title="Chỉnh sửa Máy chủ"
          initialData={editingServer}
          onClose={() => setEditingServer(null)}
          onSave={(patch) => handleSaveEdit(editingServer.id, patch)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletingServerId && (
        <Modal title="Xóa Máy chủ" onClose={() => setDeletingServerId(null)}>
          <div className="p-6">
            <p className="text-sm text-fgdim">
              Bạn có chắc chắn muốn xóa máy chủ này khỏi danh sách theo dõi không?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setDeletingServerId(null)}>
                Hủy
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deletingServerId)}>
                Xác nhận Xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ServerEditModal({ title, initialData, onClose, onSave }) {
  const [name, setName] = useState(initialData.name || '')
  const [address, setAddress] = useState(initialData.address || '')
  const [port, setPort] = useState(initialData.port || 25565)
  const [tag, setTag] = useState(initialData.tag || 'Survival')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!address.trim()) return
    onSave({
      name: name.trim() || address.trim(),
      address: address.trim(),
      port: parseInt(port, 10) || 25565,
      tag: tag.trim() || 'Custom',
    })
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Tên máy chủ" hint="Ví dụ: Hypixel Network, Survival Bạn bè">
          <TextInput
            placeholder="Tên máy chủ..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Địa chỉ IP / Domain" hint="Ví dụ: mc.hypixel.net hoặc 192.168.1.10">
              <TextInput
                required
                placeholder="mc.hypixel.net"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>
          <div>
            <Field label="Port" hint="Mặc định: 25565">
              <TextInput
                type="number"
                placeholder="25565"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field label="Thể loại / Tag" hint="Ví dụ: Minigames, Anarchy, Skyblock, SMP">
          <TextInput
            placeholder="SMP / Minigames"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </Field>

        <div className="pt-3 border-t border-line flex justify-end gap-2.5">
          <Button variant="ghost" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit">
            Lưu máy chủ
          </Button>
        </div>
      </form>
    </Modal>
  )
}
