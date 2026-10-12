<script setup lang="ts">
import { BusFront, Footprints } from 'lucide-vue-next'
import { formatDuration } from '@/lib/format'
import { modeColors } from '@/lib/modes'
import type { ItineraryLeg, TravelMode } from '@/types/itinerary'

defineProps<{ leg: ItineraryLeg; from: string }>()
const emit = defineEmits<{ mode: [mode: TravelMode] }>()

const modes = [
  { id: 'walk', label: 'Walk', icon: Footprints },
  { id: 'transit', label: 'Public transit', icon: BusFront },
] as const

function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
</script>

<template>
  <div class="leg">
    <div class="leg-text">
      <div class="leg-title">{{ leg.summary }}</div>
      <div class="leg-meta">{{ formatDuration(leg.minutes) }} · {{ formatKm(leg.km) }}</div>
    </div>
    <div class="modes" role="radiogroup" :aria-label="`How to travel on from ${from}`">
      <button
        v-for="m in modes"
        :key="m.id"
        role="radio"
        :aria-checked="leg.mode === m.id"
        :aria-label="m.label"
        :title="m.label"
        :class="{ active: leg.mode === m.id }"
        :style="leg.mode === m.id ? { background: modeColors[m.id] } : undefined"
        @click="emit('mode', m.id)"
      >
        <component :is="m.icon" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.leg {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 0 10px 48px;
  color: var(--text-muted);
}

.leg-text {
  flex: 1;
  min-width: 0;
}

.leg-title {
  font-size: 15px;
  color: var(--text);
}

.leg-meta {
  font-size: 14px;
}

.modes {
  display: flex;
  flex: none;
  padding: 3px;
  border-radius: 12px;
  background: var(--control);
}

.modes button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 30px;
  border-radius: 9px;
  color: var(--text-muted);
}

.modes button.active {
  color: #fff;
}
</style>
