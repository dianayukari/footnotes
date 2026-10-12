import type { TravelMode } from '@/types/itinerary'

/** Line and badge colour for each way of travelling. */
export const modeColors: Record<TravelMode, string> = {
  walk: '#1fa971',
  transit: '#1a73ff',
}

/** For legs whose mode is not known yet, while travel times are loading. */
export const PENDING_COLOR = '#8e8e93'
