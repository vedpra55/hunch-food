import type { IconKey } from '../domain/types'

/** Saved places. `extraKm` is the extra distance from Indiranagar, which drives ETA and reach. */
export interface Address {
  id: string
  label: string
  line: string
  area: string
  extraKm: number
}

/** Areas Hunch knows, with their distance from the kitchens' side of town. */
export const AREAS: { area: string; extraKm: number }[] = [
  { area: 'Indiranagar', extraKm: 0 },
  { area: 'HAL 2nd Stage', extraKm: 1 },
  { area: 'Domlur', extraKm: 2.5 },
  { area: 'Ulsoor', extraKm: 3 },
  { area: 'Koramangala', extraKm: 5.5 },
  { area: 'HSR Layout', extraKm: 8 },
  { area: 'Whitefield', extraKm: 12 },
]

/** What the phone's location resolves to in the demo */
export const CURRENT_LOCATION = { line: '100 Feet Road', area: 'Indiranagar' }

export const ADDRESSES: Address[] = [
  { id: 'home', label: 'Home', line: '12th Main, Indiranagar', area: 'Indiranagar', extraKm: 0 },
  { id: 'work', label: 'Work', line: 'Embassy Golf Links, Domlur', area: 'Domlur', extraKm: 2.5 },
  { id: 'parents', label: "Parents'", line: '4th Block, Koramangala', area: 'Koramangala', extraKm: 5.5 },
]

export const addressIcon = (a: Pick<Address, 'label'>): IconKey => (a.label === 'Home' ? 'home' : a.label === 'Work' ? 'briefcase' : 'pin')

export const findAddress = (list: Address[], id: string) => list.find(a => a.id === id) ?? list[0]
/** From the default saved places (tests, scenarios) */
export const addressById = (id: string) => findAddress(ADDRESSES, id)

export interface PaymentMethod {
  id: string
  label: string
  detail: string
  icon: IconKey
  /** Cash: nothing is charged up front, so nothing can be refunded */
  cash?: boolean
}

export const PAYMENTS: PaymentMethod[] = [
  { id: 'gpay', label: 'UPI · GPay', detail: '••4821', icon: 'phone' },
  { id: 'phonepe', label: 'UPI · PhonePe', detail: '••1190', icon: 'phone' },
  { id: 'hdfc', label: 'HDFC Credit Card', detail: '••4417', icon: 'card' },
  { id: 'cod', label: 'Cash on delivery', detail: 'Pay at the door', icon: 'cash', cash: true },
]

export const paymentById = (id: string) => PAYMENTS.find(p => p.id === id) ?? PAYMENTS[0]
