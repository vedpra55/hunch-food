import type { Meal, Restaurant, Weekday } from './types'

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export const weekday = (d: Date) => d.getDay() as Weekday

/** Meal slot for a local time. See HOME_SPEC §4. */
export function mealAt(d: Date): Meal {
  const h = d.getHours()
  if (h >= 6 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 19) return 'snack'
  if (h >= 19 && h < 23) return 'dinner'
  return 'late'
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function isOpen(r: Restaurant, d: Date) {
  const now = d.getHours() * 60 + d.getMinutes()
  const open = minutes(r.opens)
  const close = minutes(r.closes)
  // Closing after midnight: open late tonight, or still open from last night.
  return close > open ? now >= open && now < close : now >= open || now < close
}

/** "7 pm", "11:30 pm", "12:30 am" */
export function clockLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 && h < 24 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`
}

/** Whole days from `from` to `to`, by calendar date. */
export function daysBetween(from: Date, to: Date) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / 86_400_000)
}

/** Parse "YYYY-MM-DD" as a local date. */
export function localDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
