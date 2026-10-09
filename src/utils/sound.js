// Web Audio API Synthesizer - Phong cách Anime Chime & Dragon Maid Sparkles
// Không cần bất kỳ file audio bên ngoài nào (0% dung lượng)

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext) {
      audioCtx = new AudioContext()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playSound(type = 'click', enabled = true) {
  if (!enabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    if (type === 'click') {
      // Cute anime bubble / soft click
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.045)
      gain.gain.setValueAtTime(0.07, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.045)
    } else if (type === 'tab') {
      // Anime dual chime / sparkle
      const notes = [659.25, 987.77] // E5, B5 (bright anime interval)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        const start = now + idx * 0.035
        osc.frequency.setValueAtTime(freq, start)
        gain.gain.setValueAtTime(0.06, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.08)
      })
    } else if (type === 'launch') {
      // Dragon Magic Flare / Epic swoop
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.32)

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(440, now)
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.32)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc2.start(now)
      osc.stop(now + 0.35)
      osc2.stop(now + 0.35)
    } else if (type === 'success') {
      // Anime magic sparkle arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        const start = now + i * 0.06
        osc.frequency.setValueAtTime(freq, start)
        gain.gain.setValueAtTime(0.08, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.16)
      })
    }
  } catch (err) {
    // Ignore audio restrictions
  }
}
