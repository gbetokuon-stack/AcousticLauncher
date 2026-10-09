import React, { useCallback, useEffect, useState, useRef } from 'react'
import TitleBar from './components/TitleBar.jsx'
import HomePage from './components/HomePage.jsx'
import ProfilesPage from './components/ProfilesPage.jsx'
import AccountsPage from './components/AccountsPage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import PlayPage from './components/PlayPage.jsx'
import ModsPage from './components/ModsPage.jsx'
import ServersPage from './components/ServersPage.jsx'
import ScreenshotsPage from './components/ScreenshotsPage.jsx'
import AmbientParticles from './components/AmbientParticles.jsx'
import LauncherSplashLoader from './components/LauncherSplashLoader.jsx'
import JavaDownloadModal from './components/JavaDownloadModal.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AccountsProvider } from './hooks/useAccounts.jsx'
import { ToastProvider, useToast } from './hooks/useToast.jsx'
import { THEMES, applyTheme } from './theme/themeConfig.js'

import cherryBlossom from './assets/video/cherry-blossom.1920x1080.mp4'
import minecraftSunsetFarm from './assets/video/minecraft-sunset-farm.3840x2160.mp4'
import sakuraForest from './assets/video/sakura-forest-minecraft.1920x1080.mp4'
import sunsetShader from './assets/video/sunset-shader.1920x1080.mp4'

const VIDEO_MAP = {
  'cherry-blossom.1920x1080.mp4': cherryBlossom,
  'minecraft-sunset-farm.3840x2160.mp4': minecraftSunsetFarm,
  'sakura-forest-minecraft.1920x1080.mp4': sakuraForest,
  'sunset-shader.1920x1080.mp4': sunsetShader,
}

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

function AppInner() {
  const [activePage, setActivePage] = useState('home')
  const [settings, setSettings] = useState(null)
  const [activeVideoBg, setActiveVideoBg] = useState(null)
  
  const reloadSettings = useCallback(async () => {
    if (!isElectron) return
    const s = await window.electronAPI.getSettings()
    setSettings(s)
  }, [])

  useEffect(() => {
    reloadSettings()
  }, [reloadSettings])

  useEffect(() => {
    // If settings are not loaded yet, default to the sunset shader immediately
    const chosen = settings ? (settings.videoBg || 'sunset-shader.1920x1080.mp4') : 'sunset-shader.1920x1080.mp4'
    if (chosen === 'random') {
      // Pick a random video if not initialized, or if the setting just changed to random
      const keys = Object.keys(VIDEO_MAP)
      const rand = keys[Math.floor(Math.random() * keys.length)]
      setActiveVideoBg(rand)
    } else {
      setActiveVideoBg(chosen)
    }
  }, [settings])

  const handleVideoEnded = useCallback(() => {
    const chosen = settings ? (settings.videoBg || 'sunset-shader.1920x1080.mp4') : 'sunset-shader.1920x1080.mp4'
    if (chosen === 'random') {
      const keys = Object.keys(VIDEO_MAP)
      const filtered = keys.filter((k) => k !== activeVideoBg)
      const rand = filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : keys[Math.floor(Math.random() * keys.length)]
      setActiveVideoBg(rand)
    }
  }, [settings, activeVideoBg])

  const [profilesData, setProfilesData] = useState({ profiles: [], selectedProfileId: null })
  const [loading, setLoading] = useState(true)
  const [splashDone, setSplashDone] = useState(false)
  const [pageContext, setPageContext] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true)
    }, 950)
    return () => clearTimeout(timer)
  }, [])
  
  // Theme, Sound FX, Particles, and Launch Options
  const [currentTheme, setCurrentTheme] = useState(() => {
    try { return localStorage.getItem('xforge_theme') || 'tohru' } catch { return 'tohru' }
  })
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('xforge_sound') !== 'false' } catch { return true }
  })
  const [particlesEnabled, setParticlesEnabled] = useState(() => {
    try { return localStorage.getItem('xforge_particles') !== 'false' } catch { return true }
  })
  const [launchOptions, setLaunchOptions] = useState(null)

  useEffect(() => {
    applyTheme(currentTheme)
    try { localStorage.setItem('xforge_theme', currentTheme) } catch {}
  }, [currentTheme])

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      try { localStorage.setItem('xforge_sound', String(next)) } catch {}
      return next
    })
  }, [])

  const handleParticlesToggle = useCallback(() => {
    setParticlesEnabled((prev) => {
      const next = !prev
      try { localStorage.setItem('xforge_particles', String(next)) } catch {}
      return next
    })
  }, [])

  // Persist launch logs + state at App level so navigating away/back to
  // the Play tab keeps the running instance, log buffer, and elapsed timer.
  const [playLogs, setPlayLogs] = useState([])
  const [playState, setPlayState] = useState('idle')
  const [runningProfileId, setRunningProfileId] = useState(null)
  const startedAtRef = useRef(null)
  const toast = useToast()

  const [javaModalOpen, setJavaModalOpen] = useState(false)
  const [javaModalMode, setJavaModalMode] = useState('all')
  const [javaModalGameVer, setJavaModalGameVer] = useState(null)
  const [javaModalComponent, setJavaModalComponent] = useState(null)
  const [javaSuccessCallback, setJavaSuccessCallback] = useState(null)

  const [installs, setInstalls] = useState({})
  const completedInstalls = useRef(new Set())

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.javaGetInstalled().then((res) => {
      const inst = res?.installed || []
      if (inst.length === 0) {
        setJavaModalMode('all')
        setJavaModalOpen(true)
      }
    }).catch((err) => console.error('Lỗi check java khi khởi động:', err))
  }, [])

  useEffect(() => {
    if (!isElectron) return
    const off = window.electronAPI.onInstallProgress((p) => {
      if (!p || !p.profileId) return
      if (completedInstalls.current.has(p.profileId)) return
      if (p.phase === 'done' || p.phase === 'error' || p.phase === 'cancelled') {
        completedInstalls.current.add(p.profileId)
        setInstalls((m) => {
          const next = { ...m }
          delete next[p.profileId]
          return next
        })
      } else {
        setInstalls((m) => {
          const next = { ...m }
          next[p.profileId] = {
            phase: p.phase,
            percent: typeof p.percent === 'number' ? p.percent : 0,
            current: p.current || p.done || 0,
            total: p.total || 0,
            file: p.file || null,
            label: p.label || p.msg || null,
          }
          return next
        })
      }
    })
    return () => { try { off && off() } catch {} }
  }, [])

  const reload = useCallback(async () => {
    if (!isElectron) { setLoading(false); return }
    try {
      const r = await window.electronAPI.getProfiles()
      setProfilesData(r || { profiles: [], selectedProfileId: null })
    } catch (ex) {
      toast.push({ type: 'error', title: 'Lỗi tải profiles', message: ex.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const doInstall = useCallback(async (id) => {
    if (installs[id]) return false
    completedInstalls.current.delete(id)
    setInstalls((m) => ({ ...m, [id]: { phase: 'starting', percent: 0 } }))
    const r = await window.electronAPI.prepareInstall(id)
    completedInstalls.current.add(id)
    setInstalls((m) => { const next = { ...m }; delete next[id]; return next })
    if (r?.error) {
      toast.push({ type: 'error', title: 'Cài đặt thất bại', message: r.error, timeout: 8000 })
      return false
    } else {
      toast.push({ type: 'success', message: 'Đã chuẩn bị xong profile.' })
      await reload()
      return true
    }
  }, [installs, toast, reload])

  useEffect(() => {
    if (!isElectron) return
    const offLog = window.electronAPI.onLog((line) => {
      setPlayLogs((prev) => {
        const next = [...prev, { id: prev.length + 1, ts: Date.now(), ...line }]
        return next.length > 5000 ? next.slice(next.length - 5000) : next
      })
    })
    const offState = window.electronAPI.onGameState((s) => {
      setPlayState(s.phase || 'idle')
      setRunningProfileId(s.profileId || null)
      if (s.phase === 'running') startedAtRef.current = startedAtRef.current || Date.now()
      if (s.phase === 'idle')   { startedAtRef.current = null }
    })
    window.electronAPI.getLaunchState?.().then((s) => {
      if (s?.phase) {
        setPlayState(s.phase)
        setRunningProfileId(s.profileId || null)
      }
    }).catch(() => {})
    return () => {
      try { offLog && offLog() } catch {}
      try { offState && offState() } catch {}
    }
  }, [])

  const navigate = useCallback((page, context = null) => {
    setActivePage(page)
    setPageContext(context)
  }, [])

  useEffect(() => { reload() }, [reload])

  // Automatically clean up any hanging install progress state for profiles that are already marked as installed
  useEffect(() => {
    if (!profilesData.profiles || profilesData.profiles.length === 0) return
    setInstalls((prev) => {
      let changed = false
      const next = { ...prev }
      for (const p of profilesData.profiles) {
        if (p.installedAt && next[p.id]) {
          delete next[p.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [profilesData.profiles])

  // When the main process updates a profile (e.g. stamps lastPlayed on
  // game exit), the renderer must re-fetch so the UI shows fresh data.
  useEffect(() => {
    if (!isElectron || !window.electronAPI.onProfilesChanged) return
    const off = window.electronAPI.onProfilesChanged(() => { reload() })
    return off
  }, [reload])

  // Update Discord Rich Presence state on navigation or game exit
  useEffect(() => {
    if (!isElectron) return
    if (playState !== 'running' && playState !== 'launching') {
      window.electronAPI.setDiscordActivity?.(activePage).catch(() => {})
    }
  }, [activePage, playState])

  const onSelectProfile = useCallback(async (id) => {
    const r = await window.electronAPI.selectProfile(id)
    if (r?.error) toast.push({ type: 'error', message: r.error })
    await reload()
  }, [reload, toast])

  const onPlay = useCallback(async (id) => {
    setLaunchOptions(null)
    const profileId = id || profilesData.selectedProfileId
    if (!profileId) {
      toast.push({ type: 'warn', message: 'Chọn profile trước khi chơi.' })
      setActivePage('profiles')
      return
    }
    if (id && id !== profilesData.selectedProfileId) {
      await onSelectProfile(id)
    }
    setActivePage('play')
  }, [profilesData, onSelectProfile, toast])

  const handlePlayServer = useCallback(async (profileId, serverInfo) => {
    if (profileId && profileId !== profilesData.selectedProfileId) {
      await onSelectProfile(profileId)
    }
    setLaunchOptions({ server: serverInfo })
    setActivePage('play')
  }, [profilesData.selectedProfileId, onSelectProfile])

  const render = () => {
    switch (activePage) {
      case 'home':
        return (
          <HomePage
            profiles={profilesData.profiles}
            selectedProfileId={profilesData.selectedProfileId}
            onPlay={onPlay}
            onNavigate={setActivePage}
            soundEnabled={soundEnabled}
          />
        )
      case 'profiles':
        return (
          <ProfilesPage
            profiles={profilesData.profiles}
            selectedProfileId={profilesData.selectedProfileId}
            reload={reload}
            onSelect={onSelectProfile}
            onPlay={onPlay}
            navigate={navigate}
            runningProfileId={runningProfileId}
            playState={playState}
            installs={installs}
            doInstall={doInstall}
            soundEnabled={soundEnabled}
          />
        )
      case 'servers':
        return (
          <ServersPage
            profiles={profilesData.profiles}
            selectedProfileId={profilesData.selectedProfileId}
            onPlayServer={handlePlayServer}
            soundEnabled={soundEnabled}
          />
        )
      case 'screenshots':
        return (
          <ScreenshotsPage
            profiles={profilesData.profiles}
            selectedProfileId={profilesData.selectedProfileId}
            onSelectProfile={onSelectProfile}
            soundEnabled={soundEnabled}
          />
        )
      case 'accounts':
        return <AccountsPage />
      case 'settings':
        return (
          <SettingsPage
            onSettingsChanged={reloadSettings}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            soundEnabled={soundEnabled}
            onSoundToggle={handleSoundToggle}
            particlesEnabled={particlesEnabled}
            onParticlesToggle={handleParticlesToggle}
            onOpenJavaModal={(mode, target, cb) => {
              setJavaModalMode(mode)
              if (mode === 'single') {
                if (target.includes('.')) {
                  setJavaModalGameVer(target)
                  setJavaModalComponent(null)
                } else {
                  setJavaModalComponent(target)
                  setJavaModalGameVer(null)
                }
              } else {
                setJavaModalGameVer(null)
                setJavaModalComponent(null)
              }
              setJavaSuccessCallback(() => cb)
              setJavaModalOpen(true)
            }}
          />
        )
      case 'play':
        return (
          <PlayPage
            profiles={profilesData.profiles}
            selectedProfileId={profilesData.selectedProfileId}
            onNavigate={setActivePage}
            reload={reload}
            onSelectProfile={onSelectProfile}
            logs={playLogs}
            setLogs={setPlayLogs}
            state={playState}
            setState={setPlayState}
            startedAtRef={startedAtRef}
            onRequireJava={() => {
              setJavaModalGameVer(null)
              setJavaModalComponent(null)
              setJavaModalMode('all')
              setJavaSuccessCallback(null)
              setJavaModalOpen(true)
            }}
            installState={installs[profilesData.selectedProfileId]}
            doInstall={doInstall}
            soundEnabled={soundEnabled}
            launchOptions={launchOptions}
          />
        )
      case 'mods':
        return (
          <ModsPage
            profiles={profilesData.profiles}
            selectedProfileId={pageContext?.profileId || profilesData.selectedProfileId}
            pageContext={pageContext}
            setPageContext={setPageContext}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-bg0 text-white relative overflow-hidden">
      {/* Ambient Canvas Particles */}
      <AmbientParticles enabled={particlesEnabled} />

      {/* Video Background */}
      {activeVideoBg && activeVideoBg !== 'none' && VIDEO_MAP[activeVideoBg] && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <video
            key={activeVideoBg}
            autoPlay
            loop={settings?.videoBg !== 'random'}
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="absolute inset-0 w-full h-full object-cover opacity-50 filter brightness-[0.4] contrast-[1.1]"
            src={VIDEO_MAP[activeVideoBg]}
          />
        </div>
      )}

      {/* Moving Ambient Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[40vw] h-[40vw] rounded-full bg-accent/12 blur-[100px] animate-blob1 top-[-10%] left-[-10%]" />
        <div className="absolute w-[35vw] h-[35vw] rounded-full bg-orange-500/8 blur-[100px] animate-blob2 bottom-[-10%] right-[-10%]" />
        <div className="absolute w-[30vw] h-[30vw] rounded-full bg-rose-500/7 blur-[80px] animate-blob3 top-[40%] left-[50%]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <TitleBar
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          soundEnabled={soundEnabled}
          onSoundToggle={handleSoundToggle}
          particlesEnabled={particlesEnabled}
          onParticlesToggle={handleParticlesToggle}
          playState={playState}
          activePage={activePage}
          onNavigate={(id) => { setActivePage(id); setPageContext(null) }}
        />
        {(loading || !splashDone) ? (
          <LauncherSplashLoader />
        ) : (
          <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {render()}
          </main>
        )}
      </div>

      <JavaDownloadModal
        isOpen={javaModalOpen}
        onClose={() => setJavaModalOpen(false)}
        mode={javaModalMode}
        gameVersion={javaModalGameVer}
        component={javaModalComponent}
        onSuccess={() => {
          toast.push({ type: 'success', message: 'Tải Java Runtime thành công!' })
          if (javaSuccessCallback) {
            javaSuccessCallback()
          }
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AccountsProvider>
          <AppInner />
        </AccountsProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
