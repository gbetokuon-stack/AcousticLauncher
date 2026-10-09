import { useRef, useEffect, useState, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import wideGlbUrl from '../assets/model/wide.glb'
import slimGlbUrl from '../assets/model/slim.glb'

useGLTF.preload(wideGlbUrl)
useGLTF.preload(slimGlbUrl)

function PlayerMesh({ modelPath, skinUrl }) {
  const group = useRef()
  const { scene, animations } = useGLTF(modelPath)

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(obj => {
      if (obj.isMesh && obj.name === 'hitbox') obj.visible = false
    })
    return clone
  }, [scene])

  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    const idle = actions['idle'] ?? actions[names[0]]
    if (idle) {
      idle.reset().fadeIn(0.2).play()
      return () => { try { idle.stop() } catch {} }
    }
  }, [actions, names])

  useEffect(() => {
    return () => {
      clonedScene.traverse(obj => {
        if (!obj.isMesh) return
        if (obj.material) {
          obj.material.map?.dispose()
          obj.material.dispose()
        }
        obj.geometry?.dispose()
      })
    }
  }, [clonedScene])

  useEffect(() => {
    if (!skinUrl) return
    let cancelled = false
    let currentTex = null
    let currentMats = []

    const normalizeSkin = (img) => {
      const sw = img.naturalWidth  || img.width
      const sh = img.naturalHeight || img.height
      const scale = sw / 64

      const out = document.createElement('canvas')
      out.width  = 64
      out.height = 64
      const ctx = out.getContext('2d')
      ctx.imageSmoothingEnabled = false

      if (sh / sw === 0.5) {
        ctx.drawImage(img, 0, 0, sw, sh, 0, 0, 64, 32)
        const mirrorRegion = (sx, sy, sw2, sh2, dx, dy, flipX) => {
          ctx.save()
          if (flipX) {
            ctx.translate(dx + sw2, dy)
            ctx.scale(-1, 1)
            ctx.drawImage(out, sx, sy, sw2, sh2, 0, 0, sw2, sh2)
          } else {
            ctx.drawImage(out, sx, sy, sw2, sh2, dx, dy, sw2, sh2)
          }
          ctx.restore()
        }
        mirrorRegion(0,  16, 16, 16, 16, 48, true)
        mirrorRegion(40, 16, 16, 16, 32, 48, true)
      } else {
        ctx.drawImage(img, 0, 0, sw, sh, 0, 0, 64, 64)
      }
      return out.toDataURL('image/png')
    }

    const applyTexture = (dataUrl) => {
      const loader = new THREE.TextureLoader()
      loader.load(dataUrl, (tex) => {
        if (cancelled) { tex.dispose(); return }
        tex.magFilter  = THREE.NearestFilter
        tex.minFilter  = THREE.NearestFilter
        tex.flipY      = false
        tex.colorSpace = THREE.SRGBColorSpace

        currentMats.forEach(m => { m.map?.dispose(); m.dispose() })
        currentMats = []
        currentTex?.dispose()
        currentTex = tex

        clonedScene.traverse((obj) => {
          if (obj.isMesh && obj.name !== 'hitbox') {
            const mat = new THREE.MeshLambertMaterial({
              map: tex, transparent: true, alphaTest: 0.1,
            })
            obj.material = mat
            currentMats.push(mat)
          }
        })
      }, undefined, (err) => console.warn('Skin apply failed:', err))
    }

    const img = new Image()
    if (skinUrl && !skinUrl.startsWith('data:') && !skinUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      if (cancelled) return
      try {
        const normalized = normalizeSkin(img)
        applyTexture(normalized)
      } catch (e) {
        console.warn('Skin normalize failed, applying raw:', e)
        const canvas = document.createElement('canvas')
        canvas.width  = img.naturalWidth  || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        applyTexture(canvas.toDataURL('image/png'))
      }
    }
    img.onerror = (err) => {
      if (!cancelled) console.warn('Skin load failed:', skinUrl, err)
    }
    img.src = skinUrl

    return () => {
      cancelled = true
      currentMats.forEach(m => { m.map?.dispose(); m.dispose() })
      currentMats = []
      currentTex?.dispose()
      currentTex = null
    }
  }, [skinUrl, clonedScene])

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.4
  })

  return (
    <group ref={group}>
      <primitive object={clonedScene} scale={0.85} position={[0, -1.15, 0]} />
    </group>
  )
}

const FALLBACK_URLS = (uuid, username) => [
  username ? `https://minotar.net/skin/${username}`   : null,
  username ? `https://crafthead.net/skin/${username}` : null,
  uuid     ? `https://crafthead.net/skin/${uuid}`     : null,
  uuid     ? `https://minotar.net/skin/${uuid}`       : null,
].filter(Boolean)

function PlayerWithFallback({ uuid, username, modelPath, customSkinUrl }) {
  const urls = useMemo(() => FALLBACK_URLS(uuid, username), [uuid, username])
  const [idx, setIdx] = useState(0)
  const [resolvedDefault, setResolvedDefault] = useState(null)

  useEffect(() => { setIdx(0); setResolvedDefault(null) }, [uuid, username])

  useEffect(() => {
    if (customSkinUrl) { setResolvedDefault(null); return }
    if (urls.length === 0) { setResolvedDefault(null); return }
    let cancelled = false
    let current = 0

    function tryNext() {
      if (cancelled || current >= urls.length) return
      const url = urls[current]
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (!cancelled) { setResolvedDefault(url); setIdx(current) }
      }
      img.onerror = () => {
        if (!cancelled) { current++; tryNext() }
      }
      img.src = url
    }
    tryNext()
    return () => { cancelled = true }
  }, [uuid, username, customSkinUrl, urls])

  const skinUrl = customSkinUrl || resolvedDefault || urls[0] || null

  return (
    <PlayerWithFallbackMesh
      key={`${modelPath}-${customSkinUrl || resolvedDefault || idx}`}
      modelPath={modelPath}
      skinUrl={skinUrl}
    />
  )
}

// Rename the internal render component to match the export structure
function PlayerWithFallbackMesh({ modelPath, skinUrl }) {
  return <PlayerMesh modelPath={modelPath} skinUrl={skinUrl} />
}

function LoadingBox() {
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 1.2 })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshLambertMaterial color="#1a3a1a" wireframe />
    </mesh>
  )
}

export default function PlayerModel3D({ uuid, username, slim = false, customSkinUrl = null, className = '' }) {
  const modelPath = slim ? slimGlbUrl : wideGlbUrl
  const [visible, setVisible] = useState(true)
  const containerRef = useRef(null)
  const contextLostHandlerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      const ref = contextLostHandlerRef.current
      if (ref) ref.canvas.removeEventListener('webglcontextlost', ref.handler)
    }
  }, [])

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`} style={{ minWidth: 0, minHeight: 0 }}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0.5, 7.5], fov: 26 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          const handler = (e) => e.preventDefault()
          contextLostHandlerRef.current = { canvas, handler }
          canvas.addEventListener('webglcontextlost', handler)
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 3]}  intensity={1.1} castShadow />
        <directionalLight position={[-2, 2, -2]} intensity={0.3} />

        <Suspense fallback={<LoadingBox />}>
          <PlayerWithFallback
            key={modelPath}
            uuid={uuid}
            username={username}
            modelPath={modelPath}
            customSkinUrl={customSkinUrl}
          />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.6}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
