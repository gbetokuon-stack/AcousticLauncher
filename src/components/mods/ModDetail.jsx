import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  DownloadSimple,
  Heart,
  Calendar,
  Cube,
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import { formatDownloads, formatDate } from './shared.jsx'
import { useToast } from '../../hooks/useToast.jsx'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// Sanitize HTML - remove dangerous tags but keep safe formatting
function sanitizeHtml(html) {
  if (!html) return '<p class="text-fgfaint">Không có mô tả.</p>'

  // Decode HTML entities if present
  let text = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")

  // If after decoding it looks like plain text (no proper HTML structure),
  // wrap in paragraph
  if (!/<(p|div|h[1-6]|ul|ol|li)\b/i.test(text)) {
    text = `<p>${text.replace(/\n/g, '<br>')}</p>`
  }

  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<iframe[^>]*>/gi, '')
    .replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer" ')
}

const LOADER_COLORS = {
  fabric: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  forge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  neoforge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  quilt: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  vanilla: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
}

const VERSION_TYPE_STYLE = {
  release: 'bg-accent/20 text-accent border-accent/40',
  beta: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  alpha: 'bg-red-500/20 text-red-300 border-red-500/40',
}

function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      {label && <span className="text-sm text-fgfaint">{label}</span>}
    </div>
  )
}

export function ModDetail({ projectId, projectType = 'mod', platform, onBack, selectedProfileId, onInstall }) {
  const toast = useToast()
  const showToast = (message, type = 'info') => {
    toast.push({ type, message })
  }
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [importProgress, setImportProgress] = useState(null)
  const [showProgressModal, setShowProgressModal] = useState(false)

  const [project, setProject] = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('versions')
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState(null)

  const [filterLoader, setFilterLoader] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterGameVer, setFilterGameVer] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const VERSIONS_PER_PAGE = 20

  // Load project details based on platform
  useEffect(() => {
    if (!projectId || !platform) return
    setLoading(true)
    setError(null)
    setProject(null)
    setVersions([])

    const fetchData = async () => {
      try {
        let proj = null
        let vers = []

        if (platform === 'modrinth') {
          ;[proj, vers] = await Promise.all([
            window.electronAPI.modrinthProject(projectId),
            window.electronAPI.modrinthVersions(projectId, {}),
          ])
        } else if (platform === 'curseforge') {
          ;[proj, vers] = await Promise.all([
            window.electronAPI.curseforgeProject(projectId),
            window.electronAPI.curseforgeVersions(projectId, {}),
          ])
        }

        if (proj?.error) {
          setError(proj.error)
          return
        }

        setProject({
          ...proj,
          id: proj.project_id || proj.id || projectId,
          title: proj.title || proj.name,
          icon: proj.icon_url || proj.icon || null,
          description: proj.body || proj.description || proj.summary || '',
          author: proj.author || proj.team || proj.authors?.[0]?.name || 'Unknown',
          downloads: proj.downloads || proj.downloadCount || 0,
          follows: proj.follows || proj.followers || 0,
          date: proj.updated || proj.date_modified || null,
          loaders: proj.loaders || [],
          versions: proj.game_versions || [],
          gallery: proj.gallery || [],
          source_url: proj.url || proj.source_url || null,
        })

        // Normalize versions
        const normalizedVers = (vers || []).map((v) => ({
          id: v.id?.toString() || v.version_number || v.name,
          name: v.name || v.version_number || v.displayName,
          version: v.version_number || v.version || v.displayName || '',
          loaders: v.loaders || [],
          gameVersion: v.game_versions?.[0] || v.gameVersion || '',
          gameVersions: v.game_versions || (v.gameVersion ? [v.gameVersion] : []),
          releaseType: v.version_type || v.releaseType || 'release',
          recommended: v.featured || v.recommended || false,
          latest: v.latest || false,
          date: v.date_published || v.date || v.fileDate,
          files: v.files || [],
        }))
        setVersions(normalizedVers)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId, platform])

  const handleOpenInstallModal = async () => {
    if (!selectedVersion) {
      showToast('Vui lòng chọn một phiên bản từ danh sách bên dưới trước khi cài đặt!', 'warn')
      return
    }
    try {
      const data = await window.electronAPI.getProfiles()
      setAllProfiles(data?.profiles || [])
      setShowProfileModal(true)
    } catch (err) {
      showToast('Không tải được danh sách profile: ' + err.message, 'error')
    }
  }

  // Handle install
  const handleInstall = async (profileId) => {
    if (!selectedVersion || !profileId) return
    setInstalling(true)
    setInstallError(null)

    // Normalize projectType for backend folder mapping
    const type = (projectType || '').toLowerCase()
    let normalizedType = 'mod'
    if (type === 'shader' || type === 'shaders') normalizedType = 'shader'
    if (type === 'resourcepack' || type === 'texturepacks') normalizedType = 'resourcepack'
    if (type === 'datapack' || type === 'datapacks') normalizedType = 'datapack'

    try {
      // Call install API
      if (window.electronAPI.installMod) {
        const res = await window.electronAPI.installMod({
          platform,
          modId: projectId,
          versionId: selectedVersion.id,
          profileId: profileId,
          projectType: normalizedType,
        })
        if (res && res.error) {
          throw new Error(res.error)
        }
        showToast(`Đã cài đặt thành công ${selectedVersion.name || selectedVersion.version}!`, 'success')
      } else {
        // Fallback: open external download
        const file = selectedVersion.files?.[0]
        if (file?.url) {
          window.electronAPI.openExternal(file.url)
        } else {
          throw new Error('Không tìm thấy file để tải')
        }
      }
      setShowProfileModal(false)
    } catch (err) {
      setInstallError(err.message)
      showToast(err.message || 'Lỗi cài đặt', 'error')
    } finally {
      setInstalling(false)
    }
  }

  // Filter profiles based on compatibility
  const compatibleProfiles = useMemo(() => {
    if (!selectedVersion) return []
    return allProfiles.filter(profile => {
      const type = (projectType || '').toLowerCase()
      const isMod = type === 'mod' || type === 'mods'
      const isShader = type === 'shader' || type === 'shaders'
      
      // Check Vanilla restriction for Mods & Shaders:
      if ((isMod || isShader) && (!profile.loader || profile.loader === 'vanilla')) {
        return false
      }

      // Check Loader compatibility for Mods:
      if (isMod && profile.loader) {
        const modLoaders = selectedVersion.loaders || []
        if (modLoaders.length > 0) {
          const profileLoaderLower = profile.loader.toLowerCase()
          const isLoaderMatch = modLoaders.some(l => {
            const lLower = l.toLowerCase()
            if (profileLoaderLower === 'forge') {
              return lLower === 'forge' || lLower === 'neoforge'
            }
            return lLower === profileLoaderLower
          })
          if (!isLoaderMatch) return false
        }
      }

      // Check Game Version compatibility:
      if (selectedVersion.gameVersions && selectedVersion.gameVersions.length > 0) {
        if (!selectedVersion.gameVersions.includes(profile.gameVersion)) {
          return false
        }
      } else if (selectedVersion.gameVersion) {
        if (profile.gameVersion !== selectedVersion.gameVersion) {
          return false
        }
      }

      return true
    })
  }, [allProfiles, selectedVersion, projectType])

  const isModpack = useMemo(() => {
    const type = (projectType || '').toLowerCase()
    return type === 'modpack' || type === 'modpacks'
  }, [projectType])

  const handleDownloadAndImportModpack = async () => {
    if (!selectedVersion) {
      showToast('Vui lòng chọn một phiên bản modpack từ danh sách bên dưới trước!', 'warn')
      return
    }

    const file = selectedVersion.files?.find(f => f.primary) || selectedVersion.files?.[0]
    const url = file?.url || project?.source_url
    if (!url) {
      showToast('Không tìm thấy liên kết tải cho phiên bản này.', 'error')
      return
    }

    if (typeof window.electronAPI?.downloadAndImportModpack !== 'function') {
      showToast('Tính năng này yêu cầu khởi động lại ứng dụng Electron để nạp phiên bản mới nhất.', 'error')
      return
    }

    setShowProgressModal(true)
    setImportProgress({ phase: 'download', log: 'Đang chuẩn bị tải modpack...', percent: 0 })

    let unsubProgress = null
    if (typeof window.electronAPI?.onImportProgress === 'function') {
      unsubProgress = window.electronAPI.onImportProgress((data) => {
        setImportProgress(data)
        if (data.phase === 'done') {
          showToast('Cài đặt Modpack thành công! Đã tạo profile mới.', 'success')
          setTimeout(() => {
            setShowProgressModal(false)
            setImportProgress(null)
            if (onBack) onBack()
          }, 1500)
        } else if (data.phase === 'error') {
          showToast(data.log || 'Có lỗi xảy ra trong quá trình cài đặt.', 'error')
        }
      })
    }

    try {
      const res = await window.electronAPI.downloadAndImportModpack({
        downloadUrl: url,
        filename: file?.name || `${project.slug || project.id || 'modpack'}.zip`,
        source: platform === 'curseforge' ? 'curseforge' : 'modrinth',
        profileMeta: {
          name: project.title,
          iconUrl: project.icon || null,
          gameVersion: selectedVersion.gameVersion || '',
          loader: selectedVersion.loaders?.[0] || 'forge',
        }
      })

      if (res && res.error) {
        showToast(res.error, 'error')
        setShowProgressModal(false)
        setImportProgress(null)
      }
    } catch (err) {
      showToast(err.message || 'Lỗi cài đặt modpack', 'error')
      setShowProgressModal(false)
      setImportProgress(null)
    } finally {
      if (unsubProgress) unsubProgress()
    }
  }

  // Available filters based on versions
  const availableLoaders = useMemo(() => {
    const set = new Set()
    versions.forEach((v) => (v.loaders || []).forEach((l) => set.add(l)))
    return Array.from(set)
  }, [versions])

  const availableTypes = useMemo(() => {
    const set = new Set()
    versions.forEach((v) => { if (v.releaseType) set.add(v.releaseType) })
    return Array.from(set)
  }, [versions])

  const availableGameVersions = useMemo(() => {
    const set = new Set()
    versions.forEach((v) => { if (v.gameVersion) set.add(v.gameVersion) })
    return Array.from(set)
  }, [versions])

  // Filter versions
  const filteredVersions = useMemo(() => {
    return versions.filter((v) => {
      const matchLoader = filterLoader === 'all' || (v.loaders || []).includes(filterLoader)
      const matchType = filterType === 'all' || v.releaseType === filterType
      const matchGameVer = filterGameVer === 'all' || v.gameVersion === filterGameVer
      return matchLoader && matchType && matchGameVer
    })
  }, [versions, filterLoader, filterType, filterGameVer])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterLoader, filterType, filterGameVer])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredVersions.length / VERSIONS_PER_PAGE))
  const paginatedVersions = useMemo(() => {
    const start = (currentPage - 1) * VERSIONS_PER_PAGE
    return filteredVersions.slice(start, start + VERSIONS_PER_PAGE)
  }, [filteredVersions, currentPage, VERSIONS_PER_PAGE])

  const getPageNumbers = useCallback(() => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    if (start > 1) { pages.push(1); if (start > 2) pages.push('...') }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages) }
    return pages
  }, [currentPage, totalPages])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-bg1">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg2 hover:bg-bg3 text-fgdim hover:text-fg ring-1 ring-line transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm text-fgfaint">Đang tải...</span>
        </div>
        <LoadingSpinner label="Đang tải thông tin mod..." />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-bg1">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg2 hover:bg-bg3 text-fgdim hover:text-fg ring-1 ring-line transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-red-400 text-sm">{error || 'Không tìm thấy mod'}</p>
          <button onClick={onBack} className="text-xs text-fgfaint hover:text-fg transition-colors">
            ← Quay lại
          </button>
        </div>
      </div>
    )
  }

  const { title, icon, author, description, downloads, follows, date, loaders, gallery } = project

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden pt-4 pr-4">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-0 pb-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-fgfaint hover:text-fg transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Quay lại
        </button>

        {/* Project info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-bg2 flex items-center justify-center flex-shrink-0 ring-1 ring-line">
            {icon ? (
              <img src={icon} alt="" className="w-full h-full object-cover" />
            ) : (
              <Cube size={24} weight="fill" className="text-fgfaint" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-fg leading-tight">{title}</h2>
                <p className="text-xs text-fgfaint mt-0.5">bởi <span className="text-fgdim">{author}</span></p>
              </div>
              {isElectron && project.source_url && (
                <button
                  onClick={() => window.electronAPI.openExternal(project.source_url)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-fgfaint hover:text-fg hover:bg-bg2 transition-colors"
                  title={`Mở trên ${platform}`}
                >
                  <ArrowSquareOut size={14} />
                </button>
              )}
            </div>
            <p className="text-xs text-fgfaint mt-1.5 line-clamp-2 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          {downloads > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <DownloadSimple size={14} />
              <span className="font-semibold">{formatDownloads(downloads)}</span>
              <span className="text-fgfaint">lượt tải</span>
            </span>
          )}
          {follows > 0 && (
            <span className="flex items-center gap-1 text-pink-400">
              <Heart size={14} />
              <span className="font-semibold">{formatDownloads(follows)}</span>
              <span className="text-fgfaint">theo dõi</span>
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1 text-fgfaint ml-auto">
              <Calendar size={12} />
              {formatDate(date)}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {loaders.map((l) => (
            <span
              key={l}
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${
                LOADER_COLORS[l] || 'bg-bg2 text-fgfaint border-line'
              }`}
            >
              {l}
            </span>
          ))}
          {/* Install button */}
          {versions.length > 0 && (
            isModpack ? (
              <button
                onClick={handleDownloadAndImportModpack}
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accentstrong text-bg-0 text-xs font-semibold transition-all active:scale-[0.98]"
              >
                <DownloadSimple size={14} />
                Cài đặt Modpack
              </button>
            ) : (
              <button
                onClick={handleOpenInstallModal}
                disabled={installing}
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accentstrong text-bg-0 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {installing ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-bg-0/30 border-t-bg-0 rounded-full animate-spin" />
                    Đang cài...
                  </>
                ) : (
                  <>
                    <DownloadSimple size={14} />
                    Cài đặt
                  </>
                )}
              </button>
            )
          )}
        </div>

        {/* Install error */}
        {installError && (
          <div className="text-xs text-red-400 mb-2">{installError}</div>
        )}

        {/* Modpack warning banner */}
        {isModpack && (
          <div className="mb-3 p-3 rounded-lg bg-accentsoft/30 border border-accent/25 text-xs text-fgdim leading-relaxed">
            <strong>Lưu ý:</strong> Modpack là một cấu hình phiên bản độc lập (chứa hàng trăm mod/config riêng). AcousticForge sẽ <strong>tự động tải xuống và khởi tạo một profile mới hoàn toàn</strong> từ modpack này để tránh xung đột dữ liệu. Bạn hãy chọn phiên bản bên dưới rồi bấm <strong>"Cài đặt Modpack"</strong>.
          </div>
        )}

        {/* Filter pills (only show if there are versions) */}
        {(availableLoaders.length > 1 || availableTypes.length > 1 || availableGameVersions.length > 1) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {availableLoaders.length > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg2 ring-1 ring-line">
                <span className="text-[9px] text-fgfaint uppercase mr-1">Loader</span>
                <button
                  onClick={() => setFilterLoader('all')}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors ${
                    filterLoader === 'all' ? 'bg-accent text-bg-0' : 'text-fgfaint hover:text-fg'
                  }`}
                >
                  All
                </button>
                {availableLoaders.map((l) => (
                  <button
                    key={l}
                    onClick={() => setFilterLoader(l)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize transition-colors ${
                      filterLoader === l ? `border ${LOADER_COLORS[l] || 'bg-accent/20 text-accent border-accent/40'}` : 'text-fgfaint hover:text-fg'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}

            {availableTypes.length > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg2 ring-1 ring-line">
                <span className="text-[9px] text-fgfaint uppercase mr-1">Type</span>
                <button
                  onClick={() => setFilterType('all')}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    filterType === 'all' ? 'bg-accent text-bg-0' : 'text-fgfaint hover:text-fg'
                  }`}
                >
                  All
                </button>
                {availableTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(filterType === t ? 'all' : t)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${
                      filterType === t ? `border ${VERSION_TYPE_STYLE[t] || 'bg-accent/20 text-accent'}` : 'text-fgfaint hover:text-fg'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {availableGameVersions.length > 1 && (
              <select
                value={filterGameVer}
                onChange={(e) => setFilterGameVer(e.target.value)}
                className="bg-bg2 border border-line text-[10px] text-fg px-2 py-1 rounded-lg focus:outline-none focus:ring-accent/50"
              >
                <option value="all">All MC</option>
                {availableGameVersions.slice(0, 20).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-line">
          {['versions', 'description', 'gallery'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-fgfaint hover:text-fg'
              }`}
            >
              {tab === 'versions' ? `Phiên bản (${filteredVersions.length})` : tab === 'description' ? 'Mô tả' : 'Hình ảnh'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {activeTab === 'versions' && (
          <div className="flex flex-col gap-2">
            {filteredVersions.length === 0 && (
              <p className="text-fgfaint text-xs py-4 text-center">Không có phiên bản nào</p>
            )}
            {paginatedVersions.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedVersion(v)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  selectedVersion?.id === v.id
                    ? 'bg-accent/10 ring-1 ring-accent/30'
                    : 'bg-bg2 hover:bg-bg3 ring-1 ring-line'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-fg">{v.name || v.version}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${VERSION_TYPE_STYLE[v.releaseType] || 'bg-bg3 text-fgfaint'}`}>
                      {v.releaseType}
                    </span>
                    {(v.loaders || []).slice(0, 2).map((l) => (
                      <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize border ${LOADER_COLORS[l] || 'bg-bg3 text-fgfaint border-line'}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-fgfaint flex-wrap">
                    {v.gameVersion && <span>{v.gameVersion}</span>}
                    {v.date && <><span>·</span><span>{formatDate(v.date)}</span></>}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-3 pb-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg2 hover:bg-bg3 text-fgdim hover:text-fg ring-1 ring-line transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <CaretLeft size={14} />
                </button>
                {getPageNumbers().map((page, i) => (
                  page === '...' ? (
                    <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-[10px] text-fgfaint">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${
                        currentPage === page
                          ? 'bg-accent text-bg-0 shadow-lg shadow-accent/25'
                          : 'bg-bg2 hover:bg-bg3 text-fgdim hover:text-fg ring-1 ring-line'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg2 hover:bg-bg3 text-fgdim hover:text-fg ring-1 ring-line transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <CaretRight size={14} />
                </button>
                <span className="ml-2 text-[10px] text-fgfaint">
                  {filteredVersions.length} phiên bản
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'description' && (
          <div className="text-sm text-fg leading-relaxed">
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
          </div>
        )}

        {activeTab === 'gallery' && (
          <div>
            {gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {gallery.map((img, i) => (
                  <div key={i} className="rounded-xl overflow-hidden aspect-video bg-bg2">
                    <img
                      src={typeof img === 'string' ? img : img.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fgfaint text-xs text-center py-8">Không có hình ảnh</p>
            )}
          </div>
        )}
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg1 border border-line rounded-xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-fg">Chọn Profile cài đặt</h3>
                <p className="text-[11px] text-fgfaint mt-0.5 line-clamp-1">
                  Cài đặt vào phiên bản tương thích
                </p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-fgfaint hover:text-fg text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="p-2.5 rounded-lg bg-bg2/40 border border-line flex items-center gap-3">
                {project.icon ? (
                  <img src={project.icon} className="w-8 h-8 rounded-md object-cover" />
                ) : (
                  <Cube size={24} weight="fill" className="text-fgfaint" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-fg truncate">{project.title}</div>
                  <div className="text-[10px] text-fgfaint truncate">Phiên bản: {selectedVersion.name || selectedVersion.version}</div>
                </div>
              </div>

              <div className="text-xs font-semibold text-fgdim pt-2">Profiles tương thích ({compatibleProfiles.length}):</div>

              {compatibleProfiles.length === 0 ? (
                <div className="text-center py-6 px-4 bg-bg2/20 border border-dashed border-line rounded-lg">
                  <p className="text-xs text-fgfaint leading-normal">
                    Không tìm thấy profile tương thích với phiên bản này.<br />
                    Yêu cầu:
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1 justify-center text-[10px]">
                    {selectedVersion.loaders && selectedVersion.loaders.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-bg3 text-fgfaint">
                        Loader: {selectedVersion.loaders.join('/')}
                      </span>
                    )}
                    {selectedVersion.gameVersion && (
                      <span className="px-1.5 py-0.5 rounded bg-bg3 text-fgfaint">
                        Minecraft: {selectedVersion.gameVersion}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                  {compatibleProfiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => handleInstall(profile.id)}
                      disabled={installing}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-bg2 hover:bg-bg3 border border-line hover:border-accent/40 text-left transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-fg truncate">{profile.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-fgfaint uppercase">
                          <span className="font-semibold text-accent">{profile.loader}</span>
                          <span>·</span>
                          <span>Minecraft {profile.gameVersion}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-accent hover:underline shrink-0">
                        Chọn
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProgressModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-bg1 border border-line rounded-xl w-full max-w-md p-6 flex flex-col items-center text-center shadow-2xl animate-scale-in">
            {project.icon ? (
              <img src={project.icon} className="w-16 h-16 rounded-xl object-cover shadow-lg border border-line mb-4" />
            ) : (
              <Cube size={48} weight="fill" className="text-accent mb-4" />
            )}
            <h3 className="text-base font-bold text-fg truncate w-full mb-1">
              Đang cài đặt {project.title}
            </h3>
            <p className="text-xs text-fgfaint mb-5">
              Tạo profile mới và tải các mod đi kèm
            </p>

            {/* Progress bar */}
            <div className="w-full bg-bg3 rounded-full h-2.5 mb-4 overflow-hidden border border-line">
              <div
                className="bg-accent h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                style={{ width: `${importProgress?.percent || 0}%` }}
              />
            </div>

            <div className="text-sm font-bold text-accent mb-2">
              {importProgress?.percent || 0}%
            </div>

            {/* Status log */}
            <div className="w-full bg-bg2/50 border border-line rounded-lg p-3 max-h-24 overflow-y-auto text-left">
              <p className="text-[11px] font-mono text-fgdim leading-relaxed break-words">
                {importProgress?.log || 'Đang thiết lập...'}
              </p>
            </div>

            {importProgress?.phase === 'error' && (
              <button
                onClick={() => {
                  setShowProgressModal(false)
                  setImportProgress(null)
                }}
                className="mt-5 px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
