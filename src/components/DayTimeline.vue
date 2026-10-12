<script setup lang="ts">
import { BusFront, Footprints, Lock } from 'lucide-vue-next'
import { categories } from '@/lib/categories'
import { formatDuration } from '@/lib/format'
import type { ItineraryDay, ItineraryStop } from '@/types/itinerary'

defineProps<{ day: ItineraryDay; selectedId?: string }>()
defineEmits<{ select: [id: string] }>()

function timeText(stop: ItineraryStop) {
  if (!stop.arrive) return `Till ${stop.depart}`
  if (!stop.depart) return `From ${stop.arrive}`
  return `${stop.arrive} – ${stop.depart}`
}
</script>

<template>
  <ol class="timeline">
    <li v-for="(stop, i) in day.stops" :key="stop.id">
      <button class="stop" :class="{ selected: stop.id === selectedId }" @click="$emit('select', stop.id)">
        <span class="dot" :style="{ background: categories[stop.category].color }">
          <component :is="categories[stop.category].icon" :size="13" :stroke-width="2.6" />
        </span>
        <span class="name">{{ stop.name }}</span>
        <span class="meta">
          <Lock v-if="stop.fixed" :size="12" :stroke-width="2.4" aria-label="Fixed arrival time" />
          {{ timeText(stop) }}
          <template v-if="stop.durationMinutes"> · {{ formatDuration(stop.durationMinutes) }}</template>
        </span>
      </button>
      <div v-if="day.legs[i]" class="leg">
        <component :is="day.legs[i]!.mode === 'walk' ? Footprints : BusFront" :size="18" />
        <div>
          <div class="leg-title">{{ day.legs[i]!.summary }}</div>
          <div class="leg-meta">{{ formatDuration(day.legs[i]!.minutes) }} · {{ day.legs[i]!.km }} km</div>
        </div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  position: relative;
  margin: 0;
  padding: 8px 0 0;
  list-style: none;
}

/* The vertical line behind the stop dots. */
.timeline::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 12px;
  width: 2px;
  background: rgb(60 60 67 / 45%);
  content: '';
}

.stop {
  position: relative;
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 2px 14px;
  align-items: center;
  width: calc(100% + 16px);
  margin: 0 -8px;
  padding: 8px;
  border-radius: 14px;
  text-align: left;
}

.stop.selected {
  background: var(--control);
}

.dot {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 0 0 3px rgb(244 245 240);
}

.name {
  font-size: 17px;
  font-weight: 500;
}

.meta {
  grid-column: 2;
  font-size: 14px;
  color: var(--text-muted);
}

.meta svg {
  margin-right: 2px;
  vertical-align: -1px;
}

.leg {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 6px 0 10px 44px;
  color: var(--text-muted);
}

.leg-title {
  font-size: 15px;
  color: var(--text);
}

.leg-meta {
  font-size: 14px;
}
</style>
