export type Mood =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'found'
  | 'delighted'
  | 'focused'
  | 'onTheWay'
  | 'care'
  | 'sleepy'

export type MouthShape = 'smile' | 'soft' | 'flat' | 'tiny' | 'o' | 'grin'

export interface MoodSpec {
  label: string
  /** When Hunch shows this mood */
  when: string
  /** One-line description of the expression */
  note: string
  eyes: 'open' | 'happy'
  /** Upper lid: 0 open … 1 closed */
  lidTop: number
  /** Lid tilt in radians: + raises the inner corners (worried), − lowers them (focused) */
  lidAng: number
  /** Lower lid push-up: 0 … 1 */
  lidBot: number
  /** Eye size multiplier */
  scale: number
  mouth: MouthShape
  /** Mouth width relative to body radius */
  mw: number
  /** Cheek glow opacity 0 … 1 */
  cheek: number
  /** Body wobble amplitude */
  wob: number
  /** Animation speed multiplier */
  speed: number
  /** Body lean in radians */
  tilt: number
  /** Fixed gaze, −1 … 1 on each axis */
  look?: [number, number]
  /** Fade toward graphite, 0 … 1 */
  dull?: number
  rings?: boolean
  dots?: boolean
  scan?: boolean
  pop?: boolean
  sparkle?: boolean
  twinkle?: boolean
  lines?: boolean
  zz?: boolean
}

export const MOODS: Record<Mood, MoodSpec> = {
  idle: {
    label: 'Idle', when: 'Waiting', note: 'Slow breath, relaxed lids, small smile.',
    eyes: 'open', lidTop: 0.06, lidAng: 0, lidBot: 0, scale: 1, mouth: 'smile', mw: 0.13, cheek: 0.25, wob: 0.03, speed: 1, tilt: 0,
  },
  listening: {
    label: 'Listening', when: 'Mic on', note: 'Wide eyes; mouth and rings follow your voice.',
    eyes: 'open', lidTop: 0, lidAng: 0, lidBot: 0, scale: 1.12, mouth: 'o', mw: 0.12, cheek: 0.15, wob: 0.04, speed: 1.3, tilt: 0,
    rings: true, look: [0, -0.55],
  },
  thinking: {
    label: 'Thinking', when: 'Agent working', note: 'Narrowed eyes scan up and around, mouth to one side.',
    eyes: 'open', lidTop: 0.38, lidAng: -0.12, lidBot: 0, scale: 1, mouth: 'flat', mw: 0.12, cheek: 0, wob: 0.06, speed: 2, tilt: -0.05,
    dots: true, scan: true,
  },
  found: {
    label: 'Found it', when: 'Pick ready', note: 'Happy squint, grin, cheek glow and a hop.',
    eyes: 'happy', lidTop: 0, lidAng: 0, lidBot: 0, scale: 1, mouth: 'grin', mw: 0.15, cheek: 0.7, wob: 0.04, speed: 1.2, tilt: 0,
    pop: true, sparkle: true,
  },
  delighted: {
    label: 'Delighted', when: 'Better deal', note: 'Wide sparkly eyes, open grin.',
    eyes: 'open', lidTop: 0, lidAng: 0.06, lidBot: 0.12, scale: 1.18, mouth: 'grin', mw: 0.17, cheek: 0.55, wob: 0.04, speed: 1.3, tilt: 0,
    pop: true, sparkle: true, twinkle: true,
  },
  focused: {
    label: 'Focused', when: 'Checkout', note: 'Steady lids, nearly still. Serious about your money.',
    eyes: 'open', lidTop: 0.22, lidAng: -0.05, lidBot: 0, scale: 0.95, mouth: 'soft', mw: 0.1, cheek: 0.05, wob: 0.01, speed: 0.5, tilt: 0,
    look: [0, 0.2],
  },
  onTheWay: {
    label: 'On the way', when: 'Tracking', note: 'Leans forward and looks ahead.',
    eyes: 'open', lidTop: 0.1, lidAng: -0.04, lidBot: 0, scale: 1, mouth: 'smile', mw: 0.12, cheek: 0.2, wob: 0.035, speed: 1.4, tilt: 0.14,
    look: [0.75, -0.05], lines: true,
  },
  care: {
    label: 'Care', when: 'Support', note: 'Worried brows, eyes down, slower and softer.',
    eyes: 'open', lidTop: 0.26, lidAng: 0.3, lidBot: 0, scale: 0.96, mouth: 'soft', mw: 0.09, cheek: 0.12, wob: 0.02, speed: 0.6, tilt: 0,
    look: [0, 0.45], dull: 0.25,
  },
  sleepy: {
    label: 'Sleepy', when: 'Late night', note: 'Heavy lids, tiny yawn.',
    eyes: 'open', lidTop: 0.62, lidAng: 0.05, lidBot: 0, scale: 1, mouth: 'tiny', mw: 0.1, cheek: 0.1, wob: 0.02, speed: 0.4, tilt: -0.06,
    look: [0, 0.25], dull: 0.35, zz: true,
  },
}

export const MOOD_ORDER = Object.keys(MOODS) as Mood[]
