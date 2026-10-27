import type { Weather } from '../domain/types'

/**
 * The Today card's sky: the moment, in Indigo and Graphite only.
 * `moment` paints the real time of day with weather moving in it; `tint` is a quiet wash of the same sky.
 */
export type SkyMode = 'moment' | 'tint'
export type SkyTime = 'morning' | 'day' | 'dusk' | 'evening' | 'night'

export interface Sky {
  time: SkyTime
  weather?: 'rain' | 'hot' | 'cold'
  /** Text sits in white on this sky */
  dark: boolean
}

export function skyFor(now: Date, weather: Weather, useWeather = true): Sky {
  const h = now.getHours()
  const time: SkyTime = h >= 5 && h < 10 ? 'morning' : h < 16 && h >= 10 ? 'day' : h < 19 && h >= 16 ? 'dusk' : h < 23 && h >= 19 ? 'evening' : 'night'
  const w = !useWeather ? undefined : weather.kind === 'rain' ? 'rain' : weather.kind === 'hot' || weather.tempC >= 33 ? 'hot' : weather.kind === 'cold' || weather.tempC <= 15 ? 'cold' : undefined
  return { time, weather: w, dark: time === 'evening' || time === 'night' }
}

const c = (name: string) => `var(--color-${name})`

/** Colour moment: the band fills with the sky. */
export function skyFill(s: Sky): string {
  // Daytime rain greys the sky; at night the dark already reads as weather.
  if (s.weather === 'rain' && !s.dark) return `linear-gradient(180deg, ${c('graphite-300')} 0%, ${c('indigo-200')} 70%, ${c('indigo-100')} 100%)`
  switch (s.time) {
    case 'morning':
      return `linear-gradient(180deg, ${c('indigo-200')} 0%, ${c('indigo-100')} 45%, ${c('indigo-50')} 100%)`
    case 'day':
      return `radial-gradient(90% 120% at 85% 0%, ${c('white')} 0%, rgb(255 255 255 / 0) 55%), linear-gradient(180deg, ${c('indigo-200')} 0%, ${c('indigo-100')} 60%, ${c('indigo-50')} 100%)`
    case 'dusk':
      return `linear-gradient(180deg, ${c('indigo-400')} 0%, ${c('indigo-300')} 50%, ${c('indigo-100')} 100%)`
    case 'evening':
      return `linear-gradient(180deg, ${c('indigo-800')} 0%, ${c('indigo-600')} 65%, ${c('indigo-500')} 100%)`
    case 'night':
      return `linear-gradient(180deg, ${c('graphite-900')} 0%, ${c('indigo-900')} 55%, ${c('indigo-800')} 100%)`
  }
}

/** Subtle tint: a white card with the sky as a still wash from the top. */
export function skyTint(s: Sky): string {
  const top = s.weather === 'rain' ? c('graphite-100') : s.time === 'dusk' || s.dark ? c('indigo-100') : c('indigo-50')
  return `linear-gradient(180deg, ${top} 0%, ${c('white')} 70%)`
}
