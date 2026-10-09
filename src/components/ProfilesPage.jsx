import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '../hooks/useToast.jsx'
import { formatBytes, formatRelative } from '../utils/format.js'
import {
  Plus, FolderOpen, Trash, Play, Stop, Check, Stack, Clock, Cpu,
  PuzzlePiece, PencilSimple, DownloadSimple, CircleNotch,
  CaretDown, CaretRight, Gear, Terminal, X, MagnifyingGlass,
  ArrowLeft, ToggleLeft, ToggleRight, Copy, Image, Sliders, Globe, Sparkle
} from '@phosphor-icons/react'
import {
  DragonTailIcon,
  TohruHornsIcon,
  DragonFlameIcon,
  DragonMeatIcon,
  MaidBowIcon,
} from './DragonIcons.jsx'
import {
  PageHeader, Card, Button, Badge, Stat, Modal, Field, TextInput, Select,
  EmptyState, ProgressBar,
} from './ui.jsx'
import LoaderIcon from './LoaderIcon.jsx'
import { getVersionImage, getVersionGroups, getMajorVersion } from './versionGroups.js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export default function ProfilesPage({ profiles, selectedProfileId, reload, onSelect, onPlay, navigate, runningProfileId, playState, installs = {}, doInstall }) {
  const toast = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [managingProfileId, setManagingProfileId] = useState(null)
  const [cloneModalProfile, setCloneModalProfile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const doDelete = async (id) => {
    const r = await window.electronAPI.deleteProfile(id)
    if (r?.error) { toast.push({ type: 'error', title: 'Xoá thất bại', message: r.error }); return }
    toast.push({ type: 'success', message: 'Đã xoá profile.' })
    setDeleteId(null)
    await reload()
  }

  const doClone = async (id, newName) => {
    const r = await window.electronAPI.cloneProfile(id, newName)
    if (r?.error) {
      toast.push({ type: 'error', title: 'Nhân bản thất bại', message: r.error })
      return
    }
    toast.push({ type: 'success', message: 'Đã nhân bản profile thành công!' })
    setCloneModalProfile(null)
    await reload()
  }

  const filteredProfiles = profiles.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) ||
           (p.loader || '').toLowerCase().includes(q) ||
           (p.gameVersion || '').toLowerCase().includes(q)
  })

  const managingProfile = profiles.find(p => p.id === managingProfileId)

  if (managingProfile) {
    return (
      <ProfileDetailView
        profile={managingProfile}
        onBack={() => setManagingProfileId(null)}
        navigate={navigate}
        onPlay={onPlay}
        reload={reload}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0">
        <PageHeader
          eyebrow="🐉 KHO LƯU TRỮ BẢN RỒNG"
          title="Quản Lý Bản Cài Đặt (Profiles)"
          subtitle="Mỗi profile là một thế giới riêng biệt với mods, shaders, và thiết lập tối ưu."
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fgfaint" />
              <input
                type="text"
                placeholder="Lọc profiles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 sm:w-48 pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-bg0/80 border border-line text-fg placeholder-fgfaint focus:outline-none focus:border-accent"
              />
            </div>
            <Button variant="primary" onClick={() => setShowCreate(true)} className="gap-1.5 font-bold">
              <TohruHornsIcon size={15} />
              Tạo Bản Rồng Mới
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-5 pt-4 custom-scrollbar">
        {profiles.length === 0 ? (
          <EmptyState
            icon={<PuzzlePiece size={24} weight="duotone" />}
            title="Chưa có profile nào"
            desc="Tạo profile Minecraft đầu tiên của bạn. Hỗ trợ Vanilla, Fabric và Forge."
            action={
              <Button variant="primary" size="lg" onClick={() => setShowCreate(true)}>
                <Plus size={16} weight="bold" />
                Tạo profile đầu tiên
              </Button>
            }
          />
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-12 text-xs text-fgfaint">
            Không tìm thấy profile nào khớp với từ khóa "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-5xl items-start">
            {filteredProfiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                isSelected={p.id === selectedProfileId}
                onSelect={async () => {
                  const r = await window.electronAPI.selectProfile(p.id)
                  if (!r?.error) { await reload(); onSelect?.(p.id) }
                }}
                onPlay={() => onPlay(p.id)}
                onEdit={() => setEditId(p.id)}
                onClone={() => setCloneModalProfile(p)}
                onInstall={() => doInstall(p.id)}
                installState={installs[p.id]}
                onOpenFolder={() => window.electronAPI.openProfileFolder(p.id)}
                onDelete={() => setDeleteId(p.id)}
                onManageMods={() => setManagingProfileId(p.id)}
                runningProfileId={runningProfileId}
                playState={playState}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProfileModal
          onClose={() => setShowCreate(false)}
          onCreated={async (newId) => {
            await reload()
            setShowCreate(false)
            if (newId) doInstall(newId)
          }}
        />
      )}
      {deleteId && (
        <ConfirmDeleteModal
          name={profiles.find((p) => p.id === deleteId)?.name}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => doDelete(deleteId)}
        />
      )}
      {cloneModalProfile && (
        <ConfirmCloneModal
          profile={cloneModalProfile}
          onCancel={() => setCloneModalProfile(null)}
          onConfirm={(newName) => doClone(cloneModalProfile.id, newName)}
        />
      )}
      {editId && (
        <EditProfileModal
          profile={profiles.find((p) => p.id === editId)}
          onClose={() => setEditId(null)}
          onSaved={async () => { await reload(); setEditId(null) }}
        />
      )}
    </div>
  )
}

const PHASE_LABEL = {
  starting: 'Đang khởi động…',
  manifests: 'Đang tải manifest…',
  libraries: 'Tải thư viện…',
  assets: 'Tải assets…',
  client: 'Tải client.jar…',
  forge: 'Forge installer…',
  fabric: 'Fabric loader…',
  patching: 'Đang patch…',
}

function ProfileCard({ profile, isSelected, onSelect, onPlay, onEdit, onClone, onInstall, installState, onOpenFolder, onDelete, onManageMods, runningProfileId, playState }) {
  const isInstalling = !!installState && !profile.installedAt
  const percent = installState?.percent ?? 0
  const phaseLabel = installState ? (installState.label || PHASE_LABEL[installState.phase] || installState.phase) : ''
  const showIndet = installState && (installState.phase === 'starting' || installState.phase === 'manifests') && percent === 0
  const isInstalled = !!profile.installedAt
  const isRunningThis = runningProfileId === profile.id && playState === 'running'
  const isPreparingThis = isSelected && (playState === 'preparing' || playState === 'launching')
  const isBusyThis = isRunningThis || isPreparingThis

  return (
    <Card className={[
      'p-5 transition-colors relative flex flex-col gap-4',
      isSelected ? 'border-accent/60 bg-accentsoft/30' : 'hover:border-linestrong',
    ].join(' ')}>

      {/* ─── 1. Header — icon, name, badges ─────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className={[
          'w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 overflow-hidden',
          isSelected ? 'bg-accentsoft ring-accent/40' : 'bg-bg2 ring-line',
        ].join(' ')}>
          {profile.importIconUrl ? (
            <img src={profile.importIconUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <LoaderIcon loader={profile.loader} className="w-full h-full" />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <div className="font-bold text-fg truncate text-[15px]" title={profile.name}>{profile.name}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge tone="accent">{profile.loader}</Badge>
            <Badge mono tone="neutral">{profile.gameVersion}</Badge>
            {profile.loaderVersion && <Badge mono tone="neutral">{profile.loaderVersion}</Badge>}
          </div>
        </div>
      </div>

      {/* ─── 2. Stats grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Stack size={11} />}  label="Dung lượng" value={formatBytes(profile.sizeBytes)} />
        <Stat icon={<Cpu size={11} />}    label="RAM"        value={`${profile.ramGb || 4} GB`} />
        <Stat icon={<Clock size={11} />}  label="Lần cuối"   value={formatRelative(profile.lastPlayed)} />
      </div>

      {/* Quick subfolder shortcuts */}
      <div className="flex items-center gap-1 flex-wrap text-[10px] text-fgfaint">
        <span className="text-[9px] uppercase font-bold text-fgfaint mr-1">Thư mục:</span>
        <button
          onClick={(e) => { e.stopPropagation(); window.electronAPI.openProfileSubfolder(profile.id, 'mods') }}
          className="px-2 py-0.5 rounded bg-bg0/60 hover:bg-bg2 hover:text-accent border border-line transition-colors cursor-pointer"
        >
          Mods
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.electronAPI.openProfileSubfolder(profile.id, 'resourcepacks') }}
          className="px-2 py-0.5 rounded bg-bg0/60 hover:bg-bg2 hover:text-accent border border-line transition-colors cursor-pointer"
        >
          ResourcePacks
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.electronAPI.openProfileSubfolder(profile.id, 'shaderpacks') }}
          className="px-2 py-0.5 rounded bg-bg0/60 hover:bg-bg2 hover:text-accent border border-line transition-colors cursor-pointer"
        >
          Shaders
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.electronAPI.openProfileSubfolder(profile.id, 'screenshots') }}
          className="px-2 py-0.5 rounded bg-bg0/60 hover:bg-bg2 hover:text-accent border border-line transition-colors cursor-pointer"
        >
          Ảnh F2
        </button>
      </div>

      {/* ─── 3. Install progress ────────────────────────────────────── */}
      {isInstalling && (
        <div className="rounded-lg bg-bg0 ring-1 ring-line p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs text-fgdim min-w-0 flex-1">
              <CircleNotch size={12} className="animate-spin text-accent shrink-0" />
              <span className="truncate">{phaseLabel}</span>
            </div>
          </div>
          <ProgressBar value={0} indeterminate={true} />
          {installState.total > 0 && (
            <div className="text-[10px] text-fgfaint font-mono tabular-nums mt-1.5">
              {installState.current.toLocaleString()} / {installState.total.toLocaleString()} file
            </div>
          )}
        </div>
      )}

      {/* ─── 4. Actions — 2 rows, color-coded ───────────────────────── */}
      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex gap-2">
          {isBusyThis ? (
            <Button
              variant="danger"
              size="md"
              onClick={async (e) => {
                e.stopPropagation()
                await window.electronAPI.killGame?.()
              }}
              title="Dừng game"
              className="w-full"
            >
              <Stop size={13} weight="fill" />
              {isRunningThis ? 'Đang chơi — Dừng' : 'Đang chuẩn bị — Dừng'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              disabled={isInstalling}
              onClick={onPlay}
              title="Khởi chạy Minecraft"
              className="w-full"
            >
              <Play size={13} weight="fill" />
              {isInstalling ? 'Đang tự động cài đặt...' : 'Chơi'}
            </Button>
          )}
        </div>

        <div className="flex gap-1.5">
          <Button variant="subtle" size="sm" onClick={onManageMods} title="Quản lý chi tiết & mods" className="flex-1 font-semibold text-accent bg-accentsoft/10 ring-accent/20 hover:bg-accentsoft/25">
            <PuzzlePiece size={14} weight="fill" />
            Chi tiết
          </Button>
          <Button variant="subtle" size="sm" onClick={onClone} title="Nhân bản profile" className="px-2.5">
            <Copy size={13} />
          </Button>
          <Button variant="subtle" size="sm" onClick={onEdit} title="Chỉnh sửa" className="px-2.5">
            <PencilSimple size={14} weight="bold" />
          </Button>
          <Button variant="subtle" size="sm" onClick={onOpenFolder} title="Mở thư mục instance" className="px-2.5">
            <FolderOpen size={14} />
          </Button>
          <Button variant="danger-soft" size="sm" onClick={onDelete} title="Xoá profile" className="px-2.5">
            <Trash size={14} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ConfirmDeleteModal({ name, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} title="Xoá profile?">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-errorsoft ring-1 ring-error/30 flex items-center justify-center flex-shrink-0">
          <Trash size={20} className="text-error" />
        </div>
        <p className="text-sm text-fgdim">
          Bạn sắp xoá <span className="font-semibold text-fg">"{name}"</span>. Toàn bộ thư mục instance,
          mods, saves và logs của profile này sẽ bị xoá. Hành động này không thể hoàn tác.
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="subtle" onClick={onCancel}>Huỷ</Button>
        <Button variant="danger" onClick={onConfirm}>
          <Trash size={13} />
          Xoá
        </Button>
      </div>
    </Modal>
  )
}

function ConfirmCloneModal({ profile, onCancel, onConfirm }) {
  const [name, setName] = useState(`${profile?.name || 'Profile'} (Bản sao)`)
  return (
    <Modal onClose={onCancel} title="Nhân bản Profile">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accentsoft ring-1 ring-accent/30 flex items-center justify-center flex-shrink-0 text-accent">
            <Copy size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-fg">Nhân bản "{profile?.name}"</h4>
            <p className="text-xs text-fgdim mt-0.5">
              Toàn bộ mod, thiết lập và tài nguyên của profile này sẽ được sao chép sang một instance độc lập mới.
            </p>
          </div>
        </div>

        <Field label="Tên Profile mới">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên bản sao..."
            autoFocus
          />
        </Field>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button variant="primary" onClick={() => onConfirm(name.trim())}>
            <Copy size={13} />
            Xác nhận Nhân bản
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* Collapsible "Tùy chọn nâng cao" — similar to CurseForge's "Show more options".
 * Lets the user attach extra JVM args, pick a release channel, or override
 * the Java executable path. All fields are optional. */
function AdvancedSection({ values, onChange }) {
  const [open, setOpen] = useState(!!(
    (values.jvmArgs && values.jvmArgs.trim()) ||
    values.releaseChannel === 'beta' ||
    (values.javaPath && values.javaPath.trim())
  ))
  const update = (patch) => onChange({ ...values, ...patch })

  return (
    <div className="rounded-lg ring-1 ring-line overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-bg2 hover:bg-bg3 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-fg">
          <Gear size={13} />
          Tùy chọn nâng cao
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-fgdim">
          {!open && (values.jvmArgs || values.releaseChannel === 'beta' || values.javaPath)
            ? <Badge tone="accent">Đã đặt</Badge>
            : <span className="text-fgfaint">không bắt buộc</span>}
          <CaretDown
            size={12}
            className={['transition-transform', open ? 'rotate-180' : ''].join(' ')}
          />
        </span>
      </button>

      {open && (
        <div className="p-3 space-y-3 bg-bg0 border-t border-line">
          <Field
            label="Additional JVM Arguments"
            hint={
              <span className="flex items-start gap-1.5">
                <Terminal size={11} className="mt-0.5 shrink-0" />
                <span>Mỗi dòng là một arg. Hỗ trợ quote, ví dụ: <code className="font-mono text-fgdim">-XX:+UseG1GC</code></span>
              </span>
            }
          >
            <textarea
              value={values.jvmArgs || ''}
              onChange={(e) => update({ jvmArgs: e.target.value })}
              rows={4}
              placeholder={`# Ví dụ:\n-XX:+UseG1GC\n-XX:MaxGCPauseMillis=50\n-Dfile.encoding=UTF-8`}
              className="w-full px-3 py-2 bg-bg1 border border-line rounded-lg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 text-[12px] font-mono text-fg placeholder:text-fgfaint transition resize-y min-h-[80px]"
              spellCheck={false}
            />
          </Field>

          <Field label="Release Channel">
            <Select value={values.releaseChannel || 'release'} onChange={(e) => update({ releaseChannel: e.target.value })}>
              <option value="release">Release (ổn định)</option>
              <option value="beta">Beta (thử nghiệm)</option>
            </Select>
          </Field>

          <Field
            label="Java Executable (nâng cao)"
            hint={
              <span>Để trống sẽ dùng runtime phù hợp với phiên bản Minecraft. Chỉ định đường dẫn tuyệt đối tới javaw.exe / java.</span>
            }
          >
            <TextInput
              value={values.javaPath || ''}
              onChange={(e) => update({ javaPath: e.target.value })}
              placeholder="C:\Program Files\Java\jdk-17\bin\javaw.exe"
              className="font-mono"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const toast = useToast()
  const [name, setName] = useState(profile?.name || '')
  const [ram, setRam] = useState(profile?.ramGb || 4)
  const [advanced, setAdvanced] = useState({
    jvmArgs:        profile?.jvmArgs        || '',
    releaseChannel: profile?.releaseChannel || 'release',
    javaPath:       profile?.javaPath       || '',
  })
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  const save = async () => {
    setSaving(true)
    const patch = {
      name: name.trim() || profile.name,
      ramGb: ram,
      jvmArgs: advanced.jvmArgs,
      releaseChannel: advanced.releaseChannel,
      javaPath: advanced.javaPath,
    }
    const r = await window.electronAPI.updateProfile(profile.id, patch)
    setSaving(false)
    if (r?.error) { toast.push({ type: 'error', title: 'Lỗi', message: r.error }); return }
    toast.push({ type: 'success', message: 'Đã cập nhật profile.' })
    onSaved()
  }

  return (
    <Modal onClose={onClose} title="Chỉnh sửa profile" wide>
      <div className="space-y-4">
        <Field label="Tên profile">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={profile.name}
          />
        </Field>

        <Field label={`RAM: ${ram} GB`}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="16"
              value={ram}
              onChange={(e) => setRam(parseInt(e.target.value, 10))}
              className="flex-1 accent-accent"
            />
            <div className="font-mono text-sm text-fg bg-bg2 ring-1 ring-line px-2.5 py-1 rounded-md w-16 text-center tabular-nums">
              {ram} GB
            </div>
          </div>
        </Field>

        <AdvancedSection values={advanced} onChange={setAdvanced} />
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-line">
        <Button variant="subtle" onClick={onClose}>Huỷ</Button>
        <Button variant="primary" loading={saving} onClick={save}>
          {!saving && <Check size={13} weight="bold" />}
          Lưu thay đổi
        </Button>
      </div>
    </Modal>
  )
}

const LOADERS = [
  { id: 'vanilla',  label: 'Vanilla',  desc: 'Minecraft gốc, không mod loader.' },
  { id: 'fabric',   label: 'Fabric',   desc: 'Mod loader nhẹ, hiện đại.' },
  { id: 'forge',    label: 'Forge',    desc: 'Mod loader phổ biến nhất.' },
]

function CreateProfileModal({ onClose, onCreated }) {
  const toast = useToast()
  const [loader, setLoader] = useState('vanilla')
  const [version, setVersion] = useState('')
  const [loaderVersion, setLoaderVersion] = useState('')
  const [name, setName] = useState('')
  const [ram, setRam] = useState(4)
  const [advanced, setAdvanced] = useState({
    jvmArgs: '',
    releaseChannel: 'release',
    javaPath: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [versionGroups, setVersionGroups] = useState({ releaseGroups: [], vanillaGroups: [] })
  const [loadingMc, setLoadingMc] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingMc(true)
    getVersionGroups().then((g) => {
      if (cancelled) return
      setVersionGroups(g)
      const first = (g.releaseGroups?.[0]?.versions || [])[0]
      setVersion(first || '')
      setLoadingMc(false)
    }).catch(() => setLoadingMc(false))
    return () => { cancelled = true }
  }, [])

  const loaderLabel = LOADERS.find((l) => l.id === loader)?.label || loader

  const submit = async () => {
    if (!version) { toast.push({ type: 'warn', title: 'Chọn phiên bản', message: 'Vui lòng chọn phiên bản Minecraft.' }); return }
    if ((loader === 'forge' || loader === 'fabric') && !loaderVersion) {
      toast.push({ type: 'warn', title: 'Thiếu phiên bản loader', message: `Vui lòng chọn phiên bản ${loaderLabel}.` }); return
    }
    setSubmitting(true)
    const payload = {
      name: name.trim(),
      loader,
      gameVersion: version,
      ramGb: ram,
      jvmArgs: advanced.jvmArgs,
      releaseChannel: advanced.releaseChannel,
      javaPath: advanced.javaPath,
    }
    if (loader === 'forge' || loader === 'fabric') payload.loaderVersion = loaderVersion
    const r = await window.electronAPI.createProfile(payload)
    setSubmitting(false)
    if (r?.error) { toast.push({ type: 'error', title: 'Lỗi', message: r.error }); return }
    toast.push({ type: 'success', message: `Đã tạo profile ${loaderLabel}.` })
    onCreated(r?.profile?.id)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="rounded-2xl bg-bg1 ring-1 ring-line shadow-2xl flex flex-col"
        style={{ width: 'min(960px, 96vw)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-base font-bold text-fg">Tạo profile</h2>
            <p className="text-xs mt-0.5 text-fgdim">
              {loaderLabel}{version ? ` · ${version}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-fgfaint hover:text-fg hover:bg-bg2 transition-all ml-4"
            title="Đóng"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex">
            {/* Left — form */}
            <div className="flex flex-col gap-5 p-6 border-r border-line" style={{ width: 340 }}>
              {/* Hero preview — MC version image */}
              <div className="rounded-xl overflow-hidden ring-1 ring-line bg-bg0" style={{ height: 120 }}>
                <img
                  src={getVersionImage(version)}
                  alt={version || 'preview'}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              <Field label="Tên profile" hint="Để trống sẽ tự đặt theo loader và phiên bản.">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${loaderLabel} ${version || '1.21'}`}
                  maxLength={64}
                />
              </Field>

              <Field label="RAM (GB)">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={ram}
                    onChange={(e) => setRam(parseInt(e.target.value, 10))}
                    className="flex-1 accent-accent"
                  />
                  <div className="font-mono text-sm text-fg bg-bg2 ring-1 ring-line px-2.5 py-1 rounded-md w-16 text-center tabular-nums">
                    {ram} GB
                  </div>
                </div>
              </Field>

              <AdvancedSection values={advanced} onChange={setAdvanced} />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-fgfaint font-semibold uppercase tracking-wider">
                  Loader
                </label>
                <div className="flex gap-2">
                  {LOADERS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLoader(l.id)}
                      className={[
                        'flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl ring-1 transition-all',
                        loader === l.id
                          ? 'bg-accentsoft/60 ring-accent/40 text-fg'
                          : 'bg-bg0 ring-line text-fgdim hover:bg-bg2 hover:text-fg',
                      ].join(' ')}
                      title={l.desc}
                    >
                      <LoaderIcon loader={l.id} className="w-6 h-6" />
                      <span className="text-xs font-semibold">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — version picker */}
            <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
              {loader === 'vanilla' ? (
                <VanillaVersionAccordion
                  selectedVersion={version}
                  onSelect={(v) => setVersion(v)}
                  groups={versionGroups.vanillaGroups ?? versionGroups.releaseGroups.map((g) => ({ major: g.major, sections: [{ label: 'Release', versions: g.versions }] }))}
                  loading={loadingMc}
                />
              ) : !version ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-bg3 ring-1 ring-line flex items-center justify-center text-[10px] font-bold text-fg">1</div>
                    <p className="text-xs font-semibold text-fgdim">Chọn phiên bản Minecraft</p>
                  </div>
                  <VanillaVersionAccordion
                    selectedVersion={version}
                    onSelect={(v) => setVersion(v)}
                    groups={versionGroups.releaseGroups}
                    loading={loadingMc}
                  />
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => { setVersion(''); setLoaderVersion('') }}
                    className="flex items-center gap-1.5 text-xs text-fgfaint hover:text-fg mb-4 transition-colors"
                  >
                    <CaretRight size={12} weight="bold" className="rotate-180" />
                    Quay lại chọn phiên bản Minecraft
                  </button>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-accentsoft ring-1 ring-accent/40 flex items-center justify-center text-[10px] font-bold text-accent">2</div>
                    <p className="text-xs font-semibold text-fgdim">Chọn phiên bản {loaderLabel}</p>
                  </div>
                  <LoaderVersionList
                    loader={loader}
                    gameVersion={version}
                    selectedVersion={loaderVersion}
                    onSelect={setLoaderVersion}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-line">
          <Button variant="subtle" onClick={onClose}>Huỷ</Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={submitting || loadingMc || !version}
            onClick={submit}
            size="lg"
          >
            {!submitting && <Plus size={14} weight="bold" />}
            Tạo profile
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ===== Version accordion / list (VoxelX-style) ======================== */

const TAB_COLORS = {
  'Release':          'bg-accentsoft text-accent ring-accent/40',
  'Pre-release / RC': 'bg-amber-500/15 text-amber-400 ring-amber-500/40',
  'Snapshot':         'bg-sky-500/15 text-sky-400 ring-sky-500/40',
}

function GroupContent({ group, selectedVersion, onSelect }) {
  const sections = group.sections || [{ label: 'Release', versions: group.versions || [] }]
  const [activeTab, setActiveTab] = useState(sections[0]?.label || 'Release')
  const currentTab = sections.find((s) => s.label === activeTab) ? activeTab : sections[0]?.label
  const currentVersions = sections.find((s) => s.label === currentTab)?.versions || []

  return (
    <div className="rounded-xl bg-bg0 ring-1 ring-line overflow-hidden">
      {sections.length > 1 && (
        <div className="flex gap-1.5 px-3 pt-3 pb-2">
          {sections.map((sec) => {
            const isActive = sec.label === currentTab
            const colorClass = TAB_COLORS[sec.label] || 'bg-bg2 text-fg ring-line'
            return (
              <button
                key={sec.label}
                onClick={() => setActiveTab(sec.label)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold ring-1 transition-all',
                  isActive
                    ? colorClass
                    : 'bg-transparent text-fgfaint ring-transparent hover:text-fgdim',
                ].join(' ')}
              >
                {sec.label}
                <span className={[
                  'text-[9px] font-bold px-1.5 py-0.5 rounded min-w-[18px] text-center tabular-nums',
                  isActive ? 'bg-bg0/30' : 'bg-bg2 text-fgfaint',
                ].join(' ')}>
                  {sec.versions.length > 99 ? '99+' : sec.versions.length}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="px-3 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {currentVersions.map((v) => {
          const active = selectedVersion === v
          return (
            <button
              key={v}
              onClick={() => onSelect(v)}
              className={[
                'text-left px-2.5 py-1.5 rounded-lg text-[12px] font-mono tabular-nums transition-colors ring-1',
                active
                  ? 'bg-accentsoft ring-accent/40 text-accent font-bold'
                  : 'bg-bg2 ring-line text-fgdim hover:bg-bg3 hover:text-fg',
              ].join(' ')}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VanillaVersionAccordion({ groups, selectedVersion, onSelect, loading }) {
  const [openMajors, setOpenMajors] = useState(() => {
    const first = groups?.find((g) => {
      const v = g.sections?.[0]?.versions || g.versions || []
      return v.length > 0
    })
    return first ? new Set([first.major]) : new Set()
  })

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-fgfaint">
        <CircleNotch size={14} className="animate-spin" />
        Đang tải danh sách phiên bản…
      </div>
    )
  }
  if (!groups || groups.length === 0) {
    return <p className="text-xs text-fgfaint">Không có phiên bản nào.</p>
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const open = openMajors.has(g.major)
        const flatVersions = (g.sections || [{ label: 'Release', versions: g.versions || [] }])
          .reduce((acc, s) => acc.concat(s.versions || []), [])
        const isCurrent = flatVersions.includes(selectedVersion)
        const majorKey = g.major
        return (
          <div key={g.major} className="rounded-xl bg-bg0 ring-1 ring-line overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setOpenMajors((prev) => {
                  const next = new Set(prev)
                  next.has(g.major) ? next.delete(g.major) : next.add(g.major)
                  return next
                })
              }}
              className={[
                'w-full flex items-center justify-between px-4 py-3 transition-colors',
                isCurrent ? 'bg-accentsoft/40' : 'hover:bg-bg2',
              ].join(' ')}
            >
              <span className="flex items-center gap-3">
                <img
                  src={getVersionImage(majorKey === 'Beta' || majorKey === 'Alpha' ? '' : majorKey)}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover ring-1 ring-line"
                  draggable={false}
                />
                <span className="text-left">
                  <span className="block text-sm font-bold text-fg">
                    Minecraft {majorKey === '26' ? `26.x` : majorKey}
                  </span>
                  <span className="block text-[10px] text-fgfaint mt-0.5">
                    {flatVersions.length} phiên bản
                    {g.sections?.length > 1 ? ` · ${g.sections.length} loại` : ''}
                  </span>
                </span>
              </span>
              <CaretRight
                size={12}
                weight="bold"
                className={['text-fgfaint transition-transform shrink-0', open ? 'rotate-90' : ''].join(' ')}
              />
            </button>
            {open && (
              <div className="border-t border-line">
                <GroupContent group={g} selectedVersion={selectedVersion} onSelect={onSelect} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LoaderVersionList({ loader, gameVersion, selectedVersion, onSelect }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isElectron || !gameVersion) { setList([]); return }
    setLoading(true)
    setList([])
    window.electronAPI.listLoaderVersions(loader, gameVersion).then((r) => {
      setLoading(false)
      if (r?.ok) setList(r.versions || [])
    }).catch(() => setLoading(false))
  }, [loader, gameVersion])

  useEffect(() => {
    if (list.length > 0 && !selectedVersion) {
      const stable = list.find((v) => v.stable || v.recommended || v.latest)
      onSelect((stable || list[0]).version)
    }
  }, [list])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-fgfaint">
        <CircleNotch size={14} className="animate-spin" />
        Đang tải danh sách {loader}…
      </div>
    )
  }
  if (list.length === 0) {
    return <p className="text-xs text-fgfaint">Không có phiên bản {loader} nào cho Minecraft {gameVersion}.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {list.map((v) => {
        const active = selectedVersion === v.version
        const tag = v.recommended ? 'Khuyến nghị' : v.latest ? 'Mới nhất' : null
        return (
          <button
            key={v.version}
            onClick={() => onSelect(v.version)}
            className={[
              'text-left px-2.5 py-2 rounded-lg text-[12px] font-mono tabular-nums transition-colors ring-1 flex items-center justify-between gap-2',
              active
                ? 'bg-accentsoft ring-accent/40 text-accent font-bold'
                : 'bg-bg2 ring-line text-fgdim hover:bg-bg3 hover:text-fg',
            ].join(' ')}
          >
            <span className="truncate">{v.version}</span>
            {tag && (
              <span className={[
                'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0',
                active ? 'bg-bg0/30' : 'bg-bg0 text-fgfaint',
              ].join(' ')}>
                {tag}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function ProfileDetailView({ profile, onBack, navigate, onPlay, reload }) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('mods') // mods | resourcepacks | shaders | screenshots | saves | jvm

  // Mods state
  const [mods, setMods] = useState([])
  const [totalMods, setTotalMods] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [deletingModFile, setDeletingModFile] = useState(null)
  const [expandedMod, setExpandedMod] = useState(null)

  // Other tabs state
  const [resourcePacks, setResourcePacks] = useState([])
  const [shaders, setShaders] = useState([])
  const [screenshots, setScreenshots] = useState([])
  const [worlds, setWorlds] = useState([])
  const [lightboxImg, setLightboxImg] = useState(null)

  // JVM tuning state
  const [ram, setRam] = useState(profile.ramGb || 4)
  const [jvmPreset, setJvmPreset] = useState(profile.jvmPreset || 'aikar')
  const [jvmArgs, setJvmArgs] = useState(profile.jvmArgs || '')
  const [resWidth, setResWidth] = useState(profile.customResolution?.width || 1280)
  const [resHeight, setResHeight] = useState(profile.customResolution?.height || 720)
  const [fullscreen, setFullscreen] = useState(!!profile.fullscreen)
  const [savingJvm, setSavingJvm] = useState(false)

  const loadMods = useCallback(async () => {
    if (profile.loader === 'vanilla') return
    setLoading(true)
    try {
      const r = await window.electronAPI.listMods(profile.id, { page, pageSize: 10, search })
      setMods(r?.mods || [])
      setTotalMods(r?.total || 0)
    } catch (err) {
      toast.push({ type: 'error', message: 'Không thể tải danh sách mod: ' + err.message })
    } finally {
      setLoading(false)
    }
  }, [profile.id, profile.loader, page, search, toast])

  const loadTabContent = useCallback(async (tab) => {
    if (!isElectron) return
    if (tab === 'resourcepacks') {
      window.electronAPI.listResourcePacks(profile.id).then(setResourcePacks)
    } else if (tab === 'shaders') {
      window.electronAPI.listShaders(profile.id).then(setShaders)
    } else if (tab === 'screenshots') {
      window.electronAPI.listScreenshots(profile.id).then(setScreenshots)
    } else if (tab === 'saves') {
      window.electronAPI.listWorlds(profile.id).then(setWorlds)
    }
  }, [profile.id])

  useEffect(() => {
    if (activeTab === 'mods') loadMods()
    else loadTabContent(activeTab)
  }, [activeTab, loadMods, loadTabContent])

  const handleToggle = async (mod) => {
    try {
      const nextVal = !mod.enabled
      const r = await window.electronAPI.toggleMod(profile.id, mod.filename, nextVal)
      if (r?.error) {
        toast.push({ type: 'error', message: r.error })
      } else {
        toast.push({
          type: 'success',
          message: `${nextVal ? 'Đã kích hoạt' : 'Đã vô hiệu hóa'} mod ${mod.name}`
        })
        await loadMods()
      }
    } catch (err) {
      toast.push({ type: 'error', message: err.message })
    }
  }

  const handleDelete = async (filename) => {
    try {
      const r = await window.electronAPI.deleteMod(profile.id, filename)
      if (r?.error) {
        toast.push({ type: 'error', message: r.error })
      } else {
        toast.push({ type: 'success', message: 'Đã xóa mod thành công.' })
        if (mods.length === 1 && page > 1) {
          setPage(p => p - 1)
        } else {
          await loadMods()
        }
      }
      setDeletingModFile(null)
    } catch (err) {
      toast.push({ type: 'error', message: err.message })
    }
  }

  const handleApplyPreset = (presetKey) => {
    setJvmPreset(presetKey)
    if (presetKey === 'aikar') {
      setJvmArgs('# Aikar\'s Flags (Mặc định cho Minecraft mượt mà)\n-XX:+UseG1GC\n-XX:+ParallelRefProcEnabled\n-XX:MaxGCPauseMillis=200\n-XX:+UnlockExperimentalVMOptions\n-XX:+DisableExplicitGC\n-XX:+AlwaysPreTouch')
    } else if (presetKey === 'zgc') {
      setJvmArgs('# ZGC Ultra-Low Latency Garbage Collector (Yêu cầu Java 17+)\n-XX:+UseZGC\n-XX:+ZGenerational\n-XX:+UnlockExperimentalVMOptions')
    } else if (presetKey === 'potato') {
      setJvmArgs('# Potato PC — Tiết kiệm RAM tối đa\n-XX:+UseSerialGC\n-Xnoclassgc\n-XX:MinHeapFreeRatio=5\n-XX:MaxHeapFreeRatio=10')
    } else if (presetKey === 'default') {
      setJvmArgs('')
    }
  }

  const handleSaveJvmSettings = async () => {
    setSavingJvm(true)
    const patch = {
      ramGb: ram,
      jvmPreset,
      jvmArgs,
      customResolution: { width: parseInt(resWidth, 10) || 1280, height: parseInt(resHeight, 10) || 720 },
      fullscreen,
    }
    const r = await window.electronAPI.updateProfile(profile.id, patch)
    setSavingJvm(false)
    if (r?.error) {
      toast.push({ type: 'error', message: r.error })
    } else {
      toast.push({ type: 'success', message: 'Đã lưu cấu hình JVM & Hiển thị!' })
      await reload?.()
    }
  }

  const isVanilla = profile.loader === 'vanilla'

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950">
      {/* Detail Header */}
      <div className="flex-shrink-0 px-8 pt-7 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-bg2 border border-line text-fgdim hover:text-fg hover:bg-bg3 transition-colors cursor-pointer"
              title="Quay lại danh sách"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-accent font-bold mb-1">
                Chi tiết Profile & Quản lý
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-fg tracking-tight">{profile.name}</h1>
                <div className="flex items-center gap-1.5">
                  <Badge tone="accent">{profile.loader}</Badge>
                  <Badge mono tone="neutral">{profile.gameVersion}</Badge>
                  {profile.loaderVersion && <Badge mono tone="neutral">{profile.loaderVersion}</Badge>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => window.electronAPI.openProfileFolder(profile.id)}
              title="Mở thư mục instance"
              className="gap-1.5"
            >
              <FolderOpen size={14} />
              Thư mục
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onPlay(profile.id)}
              title="Khởi chạy Minecraft"
              className="gap-2 shadow-[0_0_15px_var(--color-accentsoft)]"
            >
              <Play size={15} weight="fill" />
              Chơi ngay
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 mt-5 border-b border-line pb-2 flex-wrap">
          {[
            { id: 'mods', label: 'Mods', icon: PuzzlePiece },
            { id: 'resourcepacks', label: 'Resource Packs', icon: Stack },
            { id: 'shaders', label: 'Shader Packs', icon: Sparkle },
            { id: 'screenshots', label: 'Ảnh chụp F2', icon: Image },
            { id: 'saves', label: 'Thế giới (Saves)', icon: Globe },
            { id: 'jvm', label: 'Cấu hình JVM & Màn hình', icon: Sliders },
          ].map((t) => {
            const active = activeTab === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-accent text-bg0 shadow'
                    : 'text-fgdim hover:bg-white/5 hover:text-fg'
                }`}
              >
                <Icon size={14} weight={active ? 'fill' : 'regular'} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-6 custom-scrollbar">
        {/* TAB 1: MODS */}
        {activeTab === 'mods' && (
          isVanilla ? (
            <div className="max-w-3xl py-12">
              <EmptyState
                icon={<PuzzlePiece size={28} weight="duotone" />}
                title="Vanilla Không Hỗ Trợ Mod"
                desc="Profile Vanilla là bản cài Minecraft gốc. Để sử dụng mod, hãy tạo profile có cài loader Fabric, Forge hoặc NeoForge."
              />
            </div>
          ) : (
            <div className="max-w-5xl flex flex-col gap-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-72">
                  <MagnifyingGlass
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-fgfaint pointer-events-none"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Tìm mod trong máy..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-bg2 rounded-xl ring-1 ring-line text-fg placeholder:text-fgfaint focus:outline-none focus:ring-accent/50 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'mods')}
                    className="gap-1.5"
                  >
                    <FolderOpen size={13} />
                    Mở thư mục mods
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('mods', {
                      profileId: profile.id,
                      loader: profile.loader,
                      gameVersion: profile.gameVersion,
                      profileName: profile.name
                    })}
                    className="gap-1.5"
                  >
                    <Plus size={12} weight="bold" />
                    Tải thêm mod
                  </Button>
                </div>
              </div>

              {/* List */}
              {loading ? (
                <div className="flex items-center justify-center py-16 text-white/50 text-sm">
                  <CircleNotch size={18} className="animate-spin text-accent mr-2" />
                  Đang quét thư mục mod…
                </div>
              ) : mods.length === 0 ? (
                <EmptyState
                  icon={<PuzzlePiece size={24} />}
                  title={search ? "Không tìm thấy kết quả" : "Thư mục mod trống"}
                  desc={search ? `Không có mod nào khớp với từ khóa "${search}".` : "Chưa có mod nào trong profile này. Bấm Tải thêm mod để khám phá."}
                />
              ) : (
                <>
                  <Card className="overflow-hidden">
                    <div className="divide-y divide-line">
                      {mods.map((mod) => {
                        const isExpanded = expandedMod === mod.filename
                        return (
                          <div
                            key={mod.filename}
                            className={[
                              'p-3.5 transition-colors flex flex-col gap-2',
                              mod.enabled ? 'bg-bg1/20' : 'bg-bg0/40 opacity-70'
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={() => handleToggle(mod)}
                                  className="text-fgfaint hover:text-fg transition-colors shrink-0 cursor-pointer"
                                  title={mod.enabled ? 'Tắt mod' : 'Bật mod'}
                                >
                                  {mod.enabled ? (
                                    <ToggleRight size={24} className="text-emerald-400" weight="fill" />
                                  ) : (
                                    <ToggleLeft size={24} className="text-fgfaint" />
                                  )}
                                </button>

                                <div
                                  onClick={() => setExpandedMod(isExpanded ? null : mod.filename)}
                                  className="cursor-pointer min-w-0 flex-1"
                                >
                                  <div className="font-bold text-[13.5px] text-fg hover:text-accent transition-colors truncate">
                                    {mod.name}
                                  </div>
                                  <div className="text-[10px] text-fgfaint font-mono truncate mt-0.5" title={mod.filename}>
                                    {mod.filename}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <Badge tone="neutral" mono>{mod.version}</Badge>
                                <span className="text-[11px] text-fgfaint font-mono">
                                  {formatBytes(mod.sizeBytes)}
                                </span>
                                <button
                                  onClick={() => setDeletingModFile(mod.filename)}
                                  className="p-1.5 rounded-lg bg-bg2 hover:bg-errorsoft hover:text-error text-fgdim transition-colors cursor-pointer"
                                  title="Xóa mod"
                                >
                                  <Trash size={12} />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pl-9 pr-4 py-2 text-[12px] text-fgdim leading-relaxed border-t border-line/30 mt-2 bg-bg0/30 rounded-lg">
                                <div className="font-semibold text-fg mb-1">Mô tả:</div>
                                <p>{mod.description || 'Không có mô tả cho mod này.'}</p>
                                <div className="mt-2 text-[10px] text-fgfaint flex items-center gap-3">
                                  <span>Loader: <b className="text-fgdim uppercase">{mod.loader}</b></span>
                                  <span>•</span>
                                  <span>Ngày cập nhật: <b>{new Date(mod.updatedAt).toLocaleDateString()}</b></span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  {/* Pagination */}
                  {totalMods > 10 && (
                    <div className="flex items-center justify-between mt-3 px-1">
                      <span className="text-[11px] text-fgfaint font-medium">
                        Hiển thị {Math.min((page - 1) * 10 + 1, totalMods)}-{Math.min(page * 10, totalMods)} trong số {totalMods} mod
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={page === 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                          Trang trước
                        </Button>
                        <span className="text-xs font-bold text-fg font-mono px-2 py-1 bg-bg2 rounded-lg border border-line">
                          {page} / {Math.ceil(totalMods / 10)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={page >= Math.ceil(totalMods / 10)}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Trang sau
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        )}

        {/* TAB 2: RESOURCE PACKS */}
        {activeTab === 'resourcepacks' && (
          <div className="max-w-5xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fgdim font-medium">
                Tìm thấy {resourcePacks.length} gói tài nguyên trong profile này.
              </span>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'resourcepacks')}
                className="gap-1.5"
              >
                <FolderOpen size={13} />
                Mở thư mục resourcepacks
              </Button>
            </div>

            {resourcePacks.length === 0 ? (
              <EmptyState
                icon={<Stack size={28} weight="duotone" />}
                title="Chưa có Resource Pack nào"
                desc="Bạn có thể sao chép các file .zip gói tài nguyên vào thư mục resourcepacks."
                action={
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'resourcepacks')}
                  >
                    <FolderOpen size={14} />
                    Mở thư mục resourcepacks
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resourcePacks.map((rp) => (
                  <Card key={rp.name} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-bg0 ring-1 ring-line flex items-center justify-center text-accent shrink-0">
                        <Stack size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-fg truncate" title={rp.name}>{rp.name}</div>
                        <div className="text-[10px] text-fgfaint mt-0.5 font-mono">
                          {rp.isDirectory ? 'Thư mục' : formatBytes(rp.sizeBytes)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SHADERS */}
        {activeTab === 'shaders' && (
          <div className="max-w-5xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fgdim font-medium">
                Tìm thấy {shaders.length} shader pack trong profile này.
              </span>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'shaderpacks')}
                className="gap-1.5"
              >
                <FolderOpen size={13} />
                Mở thư mục shaderpacks
              </Button>
            </div>

            {shaders.length === 0 ? (
              <EmptyState
                icon={<Sparkle size={28} weight="duotone" />}
                title="Chưa có Shader Pack nào"
                desc="Chép các shader như BSL, Complementary Shaders vào thư mục shaderpacks (cần Iris hoặc OptiFine)."
                action={
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'shaderpacks')}
                  >
                    <FolderOpen size={14} />
                    Mở thư mục shaderpacks
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shaders.map((sh) => (
                  <Card key={sh.name} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-bg0 ring-1 ring-line flex items-center justify-center text-accent shrink-0">
                        <Sparkle size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-fg truncate" title={sh.name}>{sh.name}</div>
                        <div className="text-[10px] text-fgfaint mt-0.5 font-mono">
                          {sh.isDirectory ? 'Thư mục' : formatBytes(sh.sizeBytes)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SCREENSHOTS */}
        {activeTab === 'screenshots' && (
          <div className="max-w-5xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fgdim font-medium">
                Tìm thấy {screenshots.length} ảnh chụp F2 trong profile này.
              </span>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'screenshots')}
                className="gap-1.5"
              >
                <FolderOpen size={13} />
                Mở thư mục ảnh
              </Button>
            </div>

            {screenshots.length === 0 ? (
              <EmptyState
                icon={<Image size={28} weight="duotone" />}
                title="Chưa có ảnh chụp nào"
                desc="Nhấn F2 trong game Minecraft để chụp lại khoảnh khắc."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {screenshots.map((s) => (
                  <div
                    key={s.name}
                    className="group rounded-xl overflow-hidden bg-bg1 border border-line hover:border-accent/40 transition-all flex flex-col shadow cursor-pointer"
                    onClick={() => setLightboxImg(s)}
                  >
                    <div className="aspect-video bg-bg0 overflow-hidden relative">
                      <img src={s.dataUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2 text-[11px] truncate text-fg font-semibold bg-bg1/90">
                      {s.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SAVES / WORLDS */}
        {activeTab === 'saves' && (
          <div className="max-w-5xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fgdim font-medium">
                Tìm thấy {worlds.length} thế giới chơi đơn (Saves).
              </span>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => window.electronAPI.openProfileSubfolder(profile.id, 'saves')}
                className="gap-1.5"
              >
                <FolderOpen size={13} />
                Mở thư mục saves
              </Button>
            </div>

            {worlds.length === 0 ? (
              <EmptyState
                icon={<Globe size={28} weight="duotone" />}
                title="Chưa có thế giới đơn nào"
                desc="Tạo thế giới chơi đơn trong game để lưu trữ dữ liệu tại đây."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {worlds.map((w) => (
                  <Card key={w.name} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-bg0 ring-1 ring-line flex items-center justify-center text-accent shrink-0">
                        <Globe size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-fg truncate" title={w.name}>{w.name}</div>
                        <div className="text-[10px] text-fgfaint mt-0.5">
                          Lần cuối: {w.mtimeMs ? formatRelative(new Date(w.mtimeMs).toISOString()) : 'Chưa rõ'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => window.electronAPI.openFolder(w.path)}
                    >
                      Mở
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: JVM & DISPLAY SETTINGS */}
        {activeTab === 'jvm' && (
          <div className="max-w-3xl space-y-5">
            {/* JVM Presets Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-fg">Bộ Tối Ưu Hóa JVM Presets</h3>
                  <p className="text-xs text-fgfaint mt-0.5">Chọn bộ cờ tối ưu Garbage Collector để giảm giật lag khung hình.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'aikar', label: 'Aikar\'s Flags', tag: 'Khuyến nghị' },
                  { key: 'zgc', label: 'ZGC Latency', tag: 'Java 17+' },
                  { key: 'potato', label: 'Potato PC', tag: 'Tiết kiệm RAM' },
                  { key: 'default', label: 'Mặc định', tag: 'Chuẩn' },
                ].map((p) => {
                  const active = jvmPreset === p.key
                  return (
                    <button
                      key={p.key}
                      onClick={() => handleApplyPreset(p.key)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-accentsoft border-accent text-fg shadow'
                          : 'bg-bg2/40 border-line text-fgdim hover:bg-bg2 hover:text-fg'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{p.label}</div>
                      <div className="text-[10px] text-accent font-semibold mt-1">{p.tag}</div>
                    </button>
                  )
                })}
              </div>

              <Field label="Tham số JVM Tùy chỉnh (JVM Arguments)">
                <textarea
                  value={jvmArgs}
                  onChange={(e) => {
                    setJvmArgs(e.target.value)
                    setJvmPreset('custom')
                  }}
                  rows={5}
                  placeholder="-XX:+UseG1GC..."
                  className="w-full px-3 py-2 bg-bg0 border border-line rounded-xl text-xs font-mono text-fg placeholder:text-fgfaint focus:border-accent focus:outline-none"
                  spellCheck={false}
                />
              </Field>

              <Field label={`Phân bổ RAM: ${ram} GB`}>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={ram}
                    onChange={(e) => setRam(parseInt(e.target.value, 10))}
                    className="flex-1 accent-accent"
                  />
                  <span className="font-mono text-xs font-bold text-accent bg-bg0 px-3 py-1 rounded-lg border border-line">
                    {ram} GB
                  </span>
                </div>
              </Field>
            </Card>

            {/* Display & Resolution Card */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-fg">Độ Phân Giải Cửa Sổ Game</h3>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Chiều rộng (Width)">
                  <TextInput
                    type="number"
                    value={resWidth}
                    onChange={(e) => setResWidth(e.target.value)}
                    placeholder="1280"
                  />
                </Field>
                <Field label="Chiều cao (Height)">
                  <TextInput
                    type="number"
                    value={resHeight}
                    onChange={(e) => setResHeight(e.target.value)}
                    placeholder="720"
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-xs text-fg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={fullscreen}
                  onChange={(e) => setFullscreen(e.target.checked)}
                  className="accent-accent"
                />
                <span>Mở ở chế độ Toàn màn hình (Fullscreen)</span>
              </label>

              <div className="pt-3 border-t border-line flex justify-end">
                <Button
                  variant="primary"
                  loading={savingJvm}
                  onClick={handleSaveJvmSettings}
                  className="gap-1.5"
                >
                  <Check size={14} weight="bold" />
                  Lưu cấu hình
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Lightbox for screenshots */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg.dataUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {/* Delete Mod Confirmation Modal */}
      {deletingModFile && (
        <Modal onClose={() => setDeletingModFile(null)} title="Xóa Mod?">
          <div className="p-6">
            <p className="text-sm text-fgdim">
              Bạn có chắc muốn xóa file mod <span className="font-bold text-fg">{deletingModFile}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setDeletingModFile(null)}>Hủy</Button>
              <Button variant="danger" onClick={() => handleDelete(deletingModFile)}>
                <Trash size={13} />
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}