import type { IconKey } from '../domain/types'

/** Saved places. `extraKm` is the extra distance from Indiranagar, which drives ETA and reach. */
export interface Address {
  id: string
  label: string
  line: string
  area: string
  extraKm: number
}

export const ADDRESSES: Address[] = [
  { id: 'home', label: 'Home', line: '12th Main, Indiranagar', area: 'Indiranagar', extraKm: 0 },
  { id: 'work', label: 'Work', line: 'Embassy Golf Links, Domlur', area: 'Domlur', extraKm: 2.5 },
  { id: 'parents', label: "Parents'", line: '4th Block, Koramangala', area: 'Koramangala', extraKm: 5.5 },
]

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

export const addressById = (id: string) => ADDRESSES.find(a => a.id === id) ?? ADDRESSES[0]
export const paymentById = (id: string) => PAYMENTS.find(p => p.id === id) ?? PAYMENTS[0]
