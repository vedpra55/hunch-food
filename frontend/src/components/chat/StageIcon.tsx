import {
  BarbellIcon,
  BowlFoodIcon,
  CakeIcon,
  ChatCircleIcon,
  ClockIcon,
  CloudRainIcon,
  CoffeeIcon,
  CookieIcon,
  EggIcon,
  FireIcon,
  FlowerLotusIcon,
  LeafIcon,
  MapPinIcon,
  MoonIcon,
  MopedIcon,
  ShuffleIcon,
  SnowflakeIcon,
  SunIcon,
  TagIcon,
  TargetIcon,
  ThermometerHotIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { IconKey } from '../../domain/types'

/** One icon, one meaning (HOME_SPEC icon map). The sparkle is reserved for Hunch's pick and lives elsewhere. */
const ICONS: Record<IconKey, Icon> = {
  sun: SunIcon,
  moon: MoonIcon,
  rain: CloudRainIcon,
  hot: ThermometerHotIcon,
  cold: SnowflakeIcon,
  clock: ClockIcon,
  pin: MapPinIcon,
  leaf: LeafIcon,
  lotus: FlowerLotusIcon,
  target: TargetIcon,
  barbell: BarbellIcon,
  fire: FireIcon,
  bowl: BowlFoodIcon,
  coffee: CoffeeIcon,
  egg: EggIcon,
  cake: CakeIcon,
  cookie: CookieIcon,
  shuffle: ShuffleIcon,
  moped: MopedIcon,
  tag: TagIcon,
  chat: ChatCircleIcon,
}

export function StageIcon({ icon, size = 16, className }: { icon: IconKey; size?: number; className?: string }) {
  const C = ICONS[icon]
  return <C size={size} className={className} aria-hidden />
}
