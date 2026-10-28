/**
 * Multi-sensory feedback: procedural Web Audio API sounds + mobile haptic vibration.
 *
 * Rules:
 * - Zero external audio files: synthesized using Web Audio API oscillators and gain envelopes.
 * - Calm by default: sound and vibration only at 4 purposeful moments (Add, Paid, Delivered, Cancel).
 * - Autoplay safe: audio unlocks on user gesture (e.g. tapping Pay). If audio is blocked upon return,
 *   visual celebration displays cleanly without error, and audio catches up on the next tap.
 * - Single-fire guards: sessionStorage ensures celebration and delivery dings fire only once per order.
 */

const STORAGE_KEYS = {
  sound: 'hunch_sound',
  vibrate: 'hunch_vibrate',
} as const

class FeedbackEngine {
  private ctx: AudioContext | null = null
  private soundEnabled: boolean = true
  private vibrateEnabled: boolean = true
  private listeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.sound)
        if (s !== null) this.soundEnabled = s === 'true'
        const v = localStorage.getItem(STORAGE_KEYS.vibrate)
        if (v !== null) this.vibrateEnabled = v === 'true'
      } catch {}
    }
  }

  /** Initialize or resume AudioContext on user gesture. */
  unlockAudio(): void {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      if (!this.ctx) {
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }
    } catch {}
  }

  get isSoundEnabled(): boolean {
    return this.soundEnabled
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled
    try {
      localStorage.setItem(STORAGE_KEYS.sound, String(enabled))
    } catch {}
    this.notify()
  }

  get isVibrateEnabled(): boolean {
    return this.vibrateEnabled
  }

  setVibrateEnabled(enabled: boolean): void {
    this.vibrateEnabled = enabled
    try {
      localStorage.setItem(STORAGE_KEYS.vibrate, String(enabled))
    } catch {}
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach(fn => fn())
  }

  /** Safe vibration helper. Never throws, ignored on iOS/unsupported devices. */
  vibrate(pattern: number | number[]): void {
    if (!this.vibrateEnabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return
    try {
      navigator.vibrate(pattern)
    } catch {}
  }

  /** Check if an order has already celebrated in this session. */
  hasCelebrated(orderId: string): boolean {
    if (typeof sessionStorage === 'undefined') return false
    try {
      return sessionStorage.getItem(`hunch_celebrated_${orderId}`) === 'true'
    } catch {
      return false
    }
  }

  /** Mark order as celebrated so reloads, back navigation, or tab focus never re-celebrate. */
  markCelebrated(orderId: string): void {
    if (typeof sessionStorage === 'undefined') return
    try {
      sessionStorage.setItem(`hunch_celebrated_${orderId}`, 'true')
    } catch {}
  }

  /** Check if delivery ding has fired for an order in this session. */
  hasDeliveredDinged(orderId: string): boolean {
    if (typeof sessionStorage === 'undefined') return false
    try {
      return sessionStorage.getItem(`hunch_delivered_${orderId}`) === 'true'
    } catch {
      return false
    }
  }

  /** Mark delivery ding as completed. */
  markDeliveredDinged(orderId: string): void {
    if (typeof sessionStorage === 'undefined') return
    try {
      sessionStorage.setItem(`hunch_delivered_${orderId}`, 'true')
    } catch {}
  }

  // ---------- Procedural Audio Synthesizers ----------

  private getAudioContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') return null
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      if (!this.ctx) {
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }
      return this.ctx
    } catch {
      return null
    }
  }

  /**
   * 1. Add to cart:
   * - Haptic: 15–20 ms pulse.
   * - Audio: Soft bubble pop (water droplet upward pitch slide 420Hz → 840Hz over 35ms).
   */
  add(): void {
    this.vibrate(18)
    const ctx = this.getAudioContext()
    if (!ctx || ctx.state !== 'running') return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.035)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.045)
    } catch {}
  }

  /**
   * 2. Paid / Placed (The Celebration):
   * - Haptic: [30, 60, 40] (rhythmic heartbeat: quick tap, breath, confident thump).
   * - Audio: Ascending 3-note chime (~500ms, warm sine/triangle blend, C5 523Hz -> E5 659Hz -> G5 784Hz).
   */
  celebrate(orderId?: string): void {
    if (orderId && this.hasCelebrated(orderId)) return
    if (orderId) this.markCelebrated(orderId)

    this.vibrate([30, 60, 40])
    const ctx = this.getAudioContext()
    if (!ctx || ctx.state !== 'running') return

    try {
      const notes = [523.25, 659.25, 783.99] // C5, E5, G5
      const startTime = ctx.currentTime

      notes.forEach((freq, i) => {
        const noteTime = startTime + i * 0.11
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = i === 2 ? 'triangle' : 'sine'
        osc.frequency.setValueAtTime(freq, noteTime)

        gain.gain.setValueAtTime(0.001, noteTime)
        gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteTime)
        osc.stop(noteTime + 0.36)
      })
    } catch {}
  }

  /**
   * 3. Delivered (only if app is open when stage arrives):
   * - Haptic: [25, 40, 25].
   * - Audio: Warm 2-note arrival ding (G5 784Hz -> C6 1046Hz over ~400ms).
   */
  delivered(orderId?: string): void {
    if (orderId && this.hasDeliveredDinged(orderId)) return
    if (orderId) this.markDeliveredDinged(orderId)

    this.vibrate([25, 40, 25])
    const ctx = this.getAudioContext()
    if (!ctx || ctx.state !== 'running') return

    try {
      const notes = [783.99, 1046.5] // G5, C6
      const startTime = ctx.currentTime

      notes.forEach((freq, i) => {
        const noteTime = startTime + i * 0.12
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, noteTime)

        gain.gain.setValueAtTime(0.001, noteTime)
        gain.gain.linearRampToValueAtTime(0.13, noteTime + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteTime)
        osc.stop(noteTime + 0.3)
      })
    } catch {}
  }

  /**
   * 4. Cancelled:
   * - Haptic: 40ms soft thud.
   * - Audio: Gentle descending low mallet tone (520Hz -> 390Hz, 300ms).
   */
  cancel(): void {
    this.vibrate(40)
    const ctx = this.getAudioContext()
    if (!ctx || ctx.state !== 'running') return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(520, now)
      osc.frequency.exponentialRampToValueAtTime(390, now + 0.25)

      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    } catch {}
  }
}

export const feedback = new FeedbackEngine()
