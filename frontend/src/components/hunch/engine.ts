import { graphite, indigo } from '../../design/palette'
import { MOODS, type Mood, type MoodSpec } from './moods'

type RGB = [number, number, number]
type Vec = [number, number]

const TAU = Math.PI * 2
const hex = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
const mix = <T extends number[]>(a: T, b: T, t: number) => a.map((v, i) => v + (b[i] - v) * t) as T
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const INK = hex(graphite[800])
const BODY: RGB[] = [hex(indigo[50]), hex(indigo[200]), hex(indigo[400])]
const DULL: RGB[] = [hex(graphite[25]), hex(graphite[100]), hex(graphite[300])]
const CHEEK = hex(indigo[300])
const ACCENT = hex(indigo[400])
const ZZ = hex(graphite[400])

const NUMERIC = ['lidTop', 'lidAng', 'lidBot', 'scale', 'mw', 'cheek', 'wob', 'speed', 'tilt'] as const
type Tuned = Record<(typeof NUMERIC)[number] | 'dull' | 'ring', number>

export type LookMode = 'pointer' | 'drift' | Vec

const reduceMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- shared pointer + ticker ----------
const pointer = { x: 0, y: 0, at: -1e9 }
let listening = false
function trackPointer() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener(
    'pointermove',
    e => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.at = performance.now()
    },
    { passive: true },
  )
}

const engines = new Set<HunchEngine>()
let raf = 0
let last = 0
function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  for (const e of engines) if (e.visible) e.frame(dt, now)
  raf = engines.size ? requestAnimationFrame(tick) : 0
}
function start(e: HunchEngine) {
  engines.add(e)
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

/**
 * Canvas renderer for Hunch. Framework-free; the React wrapper owns one per canvas.
 * Everything numeric eases toward the current mood, so mood changes are always smooth.
 */
export class HunchEngine {
  visible = true
  voice: number | null = null
  look: LookMode = 'drift'

  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private size = 0
  private dpr = 1
  private mood: Mood
  private v: Tuned
  private gaze: Vec = [0, 0]
  private t = Math.random() * 30
  private blinkAt = -1e9
  private nextBlink = 0
  private pop = 0
  private popPh = 0
  private voiceNow = 0
  private reduce = reduceMotion()

  constructor(canvas: HTMLCanvasElement, size: number, mood: Mood) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.mood = mood
    const m = MOODS[mood]
    this.v = { ...pick(m), dull: m.dull ?? 0, ring: m.rings ? 1 : 0 }
    this.nextBlink = performance.now() + 600 + Math.random() * 2500
    this.resize(size)
    trackPointer()
    start(this)
  }

  resize(size: number) {
    this.size = size
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = this.canvas.height = Math.round(size * this.dpr)
    this.canvas.style.width = this.canvas.style.height = `${size}px`
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return
    this.mood = mood
    if (MOODS[mood].pop) {
      this.pop = 1
      this.popPh = 0
    }
    this.blinkAt = performance.now()
  }

  /** Make Hunch hop and grin without changing its mood (e.g. on tap). */
  nudge() {
    this.pop = 1
    this.popPh = 0
  }

  destroy() {
    engines.delete(this)
  }

  frame(dt: number, now: number) {
    this.step(dt, now)
    this.draw(now)
  }

  private step(dt: number, now: number) {
    const m = MOODS[this.mood]
    const k = 1 - Math.exp(-dt * 7)
    for (const n of NUMERIC) {
      const target = n === 'wob' && this.reduce ? m[n] * 0.2 : m[n]
      this.v[n] = lerp(this.v[n], target, k)
    }
    this.v.dull = lerp(this.v.dull, m.dull ?? 0, k)
    this.v.ring = lerp(this.v.ring, m.rings ? 1 : 0, k)
    this.t += dt * this.v.speed

    const simulated = 0.35 + 0.65 * Math.abs(Math.sin(now / 160) * Math.sin(now / 410))
    this.voiceNow = m.rings ? (this.voice ?? simulated) : 0

    if (this.pop > 0) {
      this.popPh += dt * 10
      this.pop *= Math.exp(-dt * 2.2)
      if (this.pop < 0.01) this.pop = 0
    }
    if (now > this.nextBlink) {
      this.blinkAt = now
      this.nextBlink = now + 2400 + Math.random() * 3800
    }

    let target: Vec
    if (m.scan) target = [Math.sin(now / 700) * 0.7, -0.45]
    else if (m.look) target = m.look
    else if (Array.isArray(this.look)) target = this.look
    else if (this.look === 'pointer' && now - pointer.at < 3000) {
      const r = this.canvas.getBoundingClientRect()
      const dx = pointer.x - (r.left + r.width / 2)
      const dy = pointer.y - (r.top + r.height / 2)
      const len = Math.hypot(dx, dy) || 1
      const s = Math.min(1, len / 240)
      target = [(dx / len) * s, (dy / len) * s]
    } else target = [Math.sin(this.t * 0.31) * 0.35, Math.sin(this.t * 0.19) * 0.2]
    this.gaze = mix(this.gaze, target, 1 - Math.exp(-dt * 9))
  }

  private blobPath(R: number, sx: number, sy: number) {
    const c = this.ctx
    const { t } = this
    const w = this.v.wob
    c.beginPath()
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU
      const r = R * (1 + w * (Math.sin(3 * a + t * 1.3) * 0.55 + Math.sin(5 * a - t * 1.7) * 0.25 + Math.sin(2 * a + t * 0.8) * 0.45))
      const x = Math.cos(a) * r * sx
      const y = Math.sin(a) * r * sy
      if (i) c.lineTo(x, y)
      else c.moveTo(x, y)
    }
    c.closePath()
  }

  private draw(now: number) {
    const c = this.ctx
    const S = this.size
    const m = MOODS[this.mood]
    const { v, t } = this
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.clearRect(0, 0, S, S)

    const R = S * 0.3
    const cols = BODY.map((col, i) => mix(col, DULL[i], v.dull))
    const breath = Math.sin(t * 1.55) * 0.02
    let lift = 0
    let sx = 1 + breath
    let sy = 1 + breath * 0.6
    if (this.pop && !this.reduce) {
      lift = Math.abs(Math.sin(this.popPh)) * R * 0.4 * this.pop
      const q = Math.cos(this.popPh * 2) * 0.09 * this.pop
      sx *= 1 + q
      sy *= 1 - q
    }
    if (m.rings) {
      sx *= 1 + this.voiceNow * 0.02
      sy *= 1 + this.voiceNow * 0.03
    }
    const cx = S / 2
    const cy = S / 2 - lift + R * 0.02

    // ground shadow
    c.fillStyle = `rgba(24,24,27,${0.07 * (1 - lift / (R * 1.2))})`
    c.beginPath()
    c.ellipse(S / 2, S / 2 + R * 1.22, R * 0.72 * (1 - lift / (R * 2)), R * 0.09, 0, 0, TAU)
    c.fill()

    // aura
    let g = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.6)
    g.addColorStop(0, rgba(cols[1], 0.45))
    g.addColorStop(1, rgba(cols[1], 0))
    c.fillStyle = g
    c.beginPath()
    c.arc(cx, cy, R * 1.6, 0, TAU)
    c.fill()

    if (v.ring > 0.02) {
      for (let i = 0; i < 3; i++) {
        const p = (now / 1500 + i / 3) % 1
        c.strokeStyle = rgba(CHEEK, (1 - p) * 0.55 * v.ring * (0.5 + this.voiceNow * 0.5))
        c.lineWidth = Math.max(1, R * 0.035)
        c.beginPath()
        c.arc(cx, cy, R * (1.06 + p * 0.55), 0, TAU)
        c.stroke()
      }
    }

    if (m.lines && !this.reduce) {
      c.strokeStyle = rgba(CHEEK, 0.8)
      c.lineCap = 'round'
      c.lineWidth = Math.max(1.2, R * 0.06)
      for (let i = 0; i < 3; i++) {
        const p = (now / 700 + i * 0.33) % 1
        const y = cy + (i - 1) * R * 0.38
        const x0 = cx - R * 1.25 - p * R * 0.5
        c.globalAlpha = 1 - p
        c.beginPath()
        c.moveTo(x0, y)
        c.lineTo(x0 - R * 0.35, y)
        c.stroke()
      }
      c.globalAlpha = 1
    }

    c.save()
    c.translate(cx, cy)
    c.rotate(v.tilt + this.gaze[0] * 0.04)

    // body
    this.blobPath(R, sx, sy)
    g = c.createRadialGradient(-R * 0.38, -R * 0.45, R * 0.05, 0, 0, R * 1.15)
    g.addColorStop(0, rgba(cols[0]))
    g.addColorStop(0.55, rgba(cols[1]))
    g.addColorStop(1, rgba(cols[2]))
    c.fillStyle = g
    c.fill()

    c.save()
    this.blobPath(R, sx, sy)
    c.clip()
    // inner glow, like light through a glass bead
    g = c.createRadialGradient(R * 0.35, R * 0.5, 0, R * 0.35, R * 0.5, R * 0.8)
    g.addColorStop(0, 'rgba(255,255,255,.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(-R * 2, -R * 2, R * 4, R * 4)
    // slow drifting swirl
    const swx = Math.cos(t * 0.6) * R * 0.3
    const swy = Math.sin(t * 0.8) * R * 0.25
    g = c.createRadialGradient(swx, swy, 0, swx, swy, R * 0.7)
    g.addColorStop(0, rgba(cols[0], 0.35))
    g.addColorStop(1, rgba(cols[0], 0))
    c.fillStyle = g
    c.fillRect(-R * 2, -R * 2, R * 4, R * 4)
    if (m.dots) {
      const p = ((now / 1600) % 1) * 3 - 1.5
      c.rotate(-0.5)
      const sg = c.createLinearGradient(p * R - R * 0.35, 0, p * R + R * 0.35, 0)
      sg.addColorStop(0, 'rgba(255,255,255,0)')
      sg.addColorStop(0.5, 'rgba(255,255,255,.4)')
      sg.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = sg
      c.fillRect(-R * 2, -R * 2, R * 4, R * 4)
    }
    c.restore()

    // rim
    this.blobPath(R, sx, sy)
    c.strokeStyle = rgba(cols[2], 0.35)
    c.lineWidth = Math.max(0.8, R * 0.02)
    c.stroke()

    // pearl highlight
    c.save()
    c.translate(-R * 0.42, -R * 0.5)
    c.rotate(-0.6)
    g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.3)
    g.addColorStop(0, 'rgba(255,255,255,.95)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.beginPath()
    c.ellipse(0, 0, R * 0.3, R * 0.15, 0, 0, TAU)
    c.fill()
    c.restore()
    c.fillStyle = 'rgba(255,255,255,.9)'
    c.beginPath()
    c.arc(-R * 0.12, -R * 0.7, R * 0.035, 0, TAU)
    c.fill()

    // face slides toward the gaze, so the body reads as 3D
    const fx = this.gaze[0] * R * 0.2
    const fy = this.gaze[1] * R * 0.15 + R * 0.04
    if (v.cheek > 0.02) {
      for (const s of [-1, 1]) {
        const bx = fx + s * R * 0.5
        const by = fy + R * 0.14
        const bg = c.createRadialGradient(bx, by, 0, bx, by, R * 0.17)
        bg.addColorStop(0, rgba(CHEEK, 0.9 * v.cheek))
        bg.addColorStop(1, rgba(CHEEK, 0))
        c.fillStyle = bg
        c.beginPath()
        c.ellipse(bx, by, R * 0.17, R * 0.11, 0, 0, TAU)
        c.fill()
      }
    }
    this.eyes(fx, fy, R, m, now)
    this.mouth(fx, fy + R * 0.27, R, m, now)
    c.restore()

    if (m.dots) {
      for (let i = 0; i < 3; i++) {
        const a = now / 500 + (i * TAU) / 3
        c.fillStyle = rgba(ACCENT, 0.5 + 0.4 * Math.sin(a))
        c.beginPath()
        c.arc(cx + Math.cos(a) * R * 1.32, cy + Math.sin(a) * R * 0.5 - R * 0.1, R * (0.05 + 0.015 * Math.sin(a)), 0, TAU)
        c.fill()
      }
    }
    if (m.sparkle) {
      for (let i = 0; i < 3; i++) {
        const a = -2.4 + i * 1.1
        const ph = Math.sin(now / 420 + i * 2.1)
        if (ph > 0) this.star(cx + Math.cos(a) * R * 1.4, cy + Math.sin(a) * R * 1.3, R * 0.13 * ph, rgba(ACCENT, ph))
      }
    }
    if (m.zz) {
      for (let i = 0; i < 2; i++) {
        const p = (now / 2600 + i * 0.5) % 1
        c.fillStyle = rgba(ZZ, Math.sin(p * Math.PI))
        c.font = `600 ${R * (0.22 + p * 0.12)}px "Geist Variable", system-ui, sans-serif`
        c.fillText('z', cx + R * (0.8 + p * 0.35), cy - R * (0.75 + p * 0.55))
      }
    }
  }

  private eyes(fx: number, fy: number, R: number, m: MoodSpec, now: number) {
    const c = this.ctx
    const { v } = this
    const w = R * 0.17 * v.scale
    const h = R * 0.25 * v.scale
    const ex = R * 0.31
    const ey = fy - R * 0.08
    const bt = now - this.blinkAt
    const blink = bt < 180 ? 1 - Math.abs(bt / 90 - 1) : 0

    for (const side of [-1, 1]) {
      const x = fx + side * ex
      if (m.eyes === 'happy') {
        c.strokeStyle = rgba(INK)
        c.lineWidth = w * 0.55
        c.lineCap = 'round'
        c.beginPath()
        c.arc(x, ey + h * 0.25, w * 0.85, Math.PI * 1.15, Math.PI * 1.85)
        c.stroke()
        continue
      }
      const top = Math.min(1, Math.max(v.lidTop, blink))
      c.save()
      c.translate(x, ey)
      // lids: clip the eye with a tilted window
      c.rotate(side * v.lidAng)
      c.beginPath()
      c.rect(-w * 3, -h / 2 + top * h * 1.05, w * 6, h * (1 - top - v.lidBot) + h * 0.02)
      c.rotate(-side * v.lidAng)
      c.clip()
      c.fillStyle = rgba(INK)
      c.beginPath()
      c.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU)
      c.fill()
      c.fillStyle = 'rgba(255,255,255,.95)'
      c.beginPath()
      c.arc(-w * 0.12 + this.gaze[0] * w * 0.1, -h * 0.2, w * 0.2, 0, TAU)
      c.fill()
      if (m.twinkle) {
        c.beginPath()
        c.arc(w * 0.14, h * 0.12, w * 0.09, 0, TAU)
        c.fill()
      }
      c.restore()
      if (top > 0.9) {
        c.strokeStyle = rgba(INK)
        c.lineWidth = Math.max(1, h * 0.14)
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(x - w * 0.5, ey + h * 0.1)
        c.quadraticCurveTo(x, ey + h * 0.28, x + w * 0.5, ey + h * 0.1)
        c.stroke()
      }
    }
  }

  private mouth(x: number, y: number, R: number, m: MoodSpec, now: number) {
    const c = this.ctx
    const mw = R * this.v.mw
    c.strokeStyle = c.fillStyle = rgba(INK)
    c.lineCap = 'round'
    c.lineWidth = Math.max(1.3, R * 0.055)
    switch (m.mouth) {
      case 'smile':
        c.beginPath()
        c.arc(x, y - mw * 0.55, mw, Math.PI * 0.2, Math.PI * 0.8)
        c.stroke()
        break
      case 'soft':
        c.beginPath()
        c.arc(x, y - mw * 1.1, mw * 1.2, Math.PI * 0.35, Math.PI * 0.65)
        c.stroke()
        break
      case 'flat':
        c.beginPath()
        c.moveTo(x - mw * 0.2, y)
        c.lineTo(x + mw * 0.7, y - mw * 0.12)
        c.stroke()
        break
      case 'tiny': {
        const o = 0.6 + 0.4 * Math.sin(now / 900)
        c.beginPath()
        c.ellipse(x, y, mw * 0.22, mw * 0.28 * o, 0, 0, TAU)
        c.fill()
        break
      }
      case 'o': {
        const o = 0.45 + this.voiceNow * 0.75
        c.beginPath()
        c.ellipse(x, y, mw * 0.42, mw * 0.5 * o, 0, 0, TAU)
        c.fill()
        break
      }
      case 'grin':
        c.beginPath()
        c.moveTo(x - mw, y - mw * 0.15)
        c.quadraticCurveTo(x, y - mw * 0.3, x + mw, y - mw * 0.15)
        c.quadraticCurveTo(x + mw * 0.8, y + mw * 0.95, x, y + mw * 0.95)
        c.quadraticCurveTo(x - mw * 0.8, y + mw * 0.95, x - mw, y - mw * 0.15)
        c.fill()
        c.save()
        c.clip()
        c.fillStyle = rgba(ACCENT)
        c.beginPath()
        c.ellipse(x, y + mw * 0.95, mw * 0.55, mw * 0.4, 0, 0, TAU)
        c.fill()
        c.restore()
        break
    }
  }

  private star(x: number, y: number, r: number, col: string) {
    const c = this.ctx
    c.fillStyle = col
    c.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2
      const rr = i % 2 ? r * 0.32 : r
      const px = x + Math.cos(a) * rr
      const py = y + Math.sin(a) * rr
      if (i) c.lineTo(px, py)
      else c.moveTo(px, py)
    }
    c.closePath()
    c.fill()
  }
}

function pick(m: MoodSpec) {
  const out = {} as Record<(typeof NUMERIC)[number], number>
  for (const n of NUMERIC) out[n] = m[n]
  return out
}
