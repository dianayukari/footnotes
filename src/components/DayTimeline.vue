<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { GripVertical, Lock } from 'lucide-vue-next'
import Sortable from 'sortablejs'
import EndpointRow from './EndpointRow.vue'
import LegRow from './LegRow.vue'
import { categories } from '@/lib/categories'
import { formatDuration, formatTime } from '@/lib/format'
import type { EndpointKind, ItineraryDay, ItineraryStop, TravelMode } from '@/types/itinerary'

const props = defineProps<{ day: ItineraryDay; selectedId?: string }>()
const emit = defineEmits<{
  select: [id: string]
  reorder: [ids: string[]]
  /** The traveller picked how to leave a stop for the next one, or for the end point. */
  mode: [stopId: string, mode: TravelMode]
  /** The traveller picked how to leave the start point. */
  startMode: [mode: TravelMode]
  pickEndpoint: [kind: EndpointKind]
  clearEndpoint: [kind: EndpointKind]
  /** End the day where it started. */
  returnToStart: []
}>()

const list = ref<HTMLElement>()
let sortable: Sortable | undefined

onMounted(() => {
  sortable = Sortable.create(list.value!, {
    handle: '.grip',
    animation: 160,
    onEnd({ item, from, oldIndex, newIndex }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      // Put the element back where Vue rendered it; the new order arrives through props.
      item.remove()
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const ids = props.day.stops.map((s) => s.id)
      ids.splice(newIndex, 0, ...ids.splice(oldIndex, 1))
      emit('reorder', ids)
    },
  })
})

onBeforeUnmount(() => sortable?.destroy())

function timeText(stop: ItineraryStop) {
  const parts: string[] = []
  if (stop.arrive && stop.depart) parts.push(`${formatTime(stop.arrive)} – ${formatTime(stop.depart)}`)
  else if (stop.fixedArrival) parts.push(`Arrive ${formatTime(stop.fixedArrival)}`)
  parts.push(formatDuration(stop.durationMinutes))
  return parts.join(' · ')
}
</script>

<template>
  <div class="timeline">
    <EndpointRow kind="start" :place="day.start" @pick="emit('pickEndpoint', 'start')" @clear="emit('clearEndpoint', 'start')" />
    <LegRow v-if="day.start && day.startLeg" :leg="day.startLeg" :from="day.start.name" @mode="emit('startMode', $event)" />

    <p v-if="day.stops.length === 0" class="empty">No stops yet. Add places from Explore.</p>
    <ol ref="list">
      <li v-for="(stop, i) in day.stops" :key="stop.id">
        <div v-if="stop.waitMinutes" class="wait">Free time · {{ formatDuration(stop.waitMinutes) }}</div>
        <div class="row" :class="{ selected: stop.id === selectedId, late: stop.lateMinutes }">
          <button class="stop" @click="emit('select', stop.id)">
            <span class="dot" :style="{ background: categories[stop.category].color }">
              <component :is="categories[stop.category].icon" :size="13" :stroke-width="2.6" />
            </span>
            <span class="name">{{ stop.name }}</span>
            <span class="meta">
              <Lock v-if="stop.fixedArrival" :size="12" :stroke-width="2.4" aria-label="Fixed arrival time" />
              {{ timeText(stop) }}
            </span>
            <span v-if="stop.lateMinutes && stop.fixedArrival" class="meta problem">
              {{ formatDuration(stop.lateMinutes) }} after the fixed {{ formatTime(stop.fixedArrival) }} arrival
            </span>
          </button>
          <span class="grip" aria-label="Drag to reorder"><GripVertical :size="18" /></span>
        </div>
        <LegRow v-if="day.legs[i]" :leg="day.legs[i]!" :from="stop.name" @mode="emit('mode', stop.id, $event)" />
        <LegRow
          v-else-if="day.endLeg && i === day.stops.length - 1"
          :leg="day.endLeg"
          :from="stop.name"
          @mode="emit('mode', stop.id, $event)"
        />
      </li>
    </ol>

    <EndpointRow kind="end" :place="day.end" @pick="emit('pickEndpoint', 'end')" @clear="emit('clearEndpoint', 'end')">
      <button v-if="day.start && !day.end" class="same" @click="emit('returnToStart')">Same as start</button>
    </EndpointRow>
  </div>
</template>

<style scoped>
.empty {
  margin: 4px 0 12px 40px;
  color: var(--text-muted);
}

.timeline {
  position: relative;
  padding-top: 4px;
}

/* The vertical line behind the dots. */
.timeline::before {
  position: absolute;
  top: 20px;
  bottom: 24px;
  left: 12px;
  width: 2px;
  background: rgb(60 60 67 / 45%);
  content: '';
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  position: relative;
  display: flex;
  align-items: center;
  width: calc(100% + 16px);
  margin: 0 -8px 6px;
  border-radius: 14px;
}

.row.selected {
  background: var(--control);
}

.stop {
  display: grid;
  flex: 1;
  grid-template-columns: 26px 1fr;
  gap: 2px 14px;
  align-items: center;
  min-width: 0;
  padding: 8px;
  text-align: left;
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

.problem,
.late .meta {
  color: var(--danger);
}

.wait {
  padding: 0 0 10px 48px;
  font-size: 14px;
  font-style: italic;
  color: var(--text-muted);
}

.meta svg {
  margin-right: 2px;
  vertical-align: -1px;
}

.grip {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 44px;
  color: var(--text-muted);
  cursor: grab;
  touch-action: none;
}

.same {
  flex: none;
  padding: 8px;
  font-size: 14px;
  color: var(--accent);
}
</style>
