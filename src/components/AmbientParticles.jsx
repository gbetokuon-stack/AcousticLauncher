import React, { useEffect, useRef } from 'react'

export default function AmbientParticles({ enabled = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    const PARTICLE_COUNT = 36
    const particles = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1.2,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.25 - 0.2, // gentle upward drift
        alpha: Math.random() * 0.5 + 0.2,
        maxAlpha: Math.random() * 0.4 + 0.35,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        shape: Math.random() < 0.4 ? 'star' : Math.random() < 0.7 ? 'petal' : 'circle',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      })
    }

    // Helper to draw a 4-point anime sparkle star
    const drawStar = (cx, cy, r) => {
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2
        ctx.lineTo(cx + Math.cos(angle) * r * 2.2, cy + Math.sin(angle) * r * 2.2)
        const innerAngle = angle + Math.PI / 4
        ctx.lineTo(cx + Math.cos(innerAngle) * (r * 0.4), cy + Math.sin(innerAngle) * (r * 0.4))
      }
      ctx.closePath()
    }

    // Helper to draw a soft sakura petal
    const drawPetal = (cx, cy, r) => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 1.8, r * 0.9, 0, 0, Math.PI * 2)
      ctx.closePath()
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Fetch active accent color
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#ff5722'

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.alpha += p.pulseSpeed
        p.rotation += p.rotSpeed

        if (p.alpha > p.maxAlpha || p.alpha < 0.08) {
          p.pulseSpeed = -p.pulseSpeed
        }

        if (p.x < 0) p.x = width
        else if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        else if (p.y > height) p.y = 0

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = accent
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))
        ctx.shadowBlur = 12
        ctx.shadowColor = accent

        if (p.shape === 'star') {
          drawStar(0, 0, p.radius)
          ctx.fill()
        } else if (p.shape === 'petal') {
          drawPetal(0, 0, p.radius)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1] w-full h-full opacity-65"
    />
  )
}
