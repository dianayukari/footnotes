<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { EllipsisVertical, LocateFixed, Scan, WandSparkles } from 'lucide-vue-next'
import BottomSheet from '@/components/BottomSheet.vue'
import DayHeader from '@/components/DayHeader.vue'
import DayTimeline from '@/components/DayTimeline.vue'
import ExploreSearch from '@/components/ExploreSearch.vue'
import MapCanvas, { type MapPadding } from '@/components/MapCanvas.vue'
import SettingsMenu from '@/components/SettingsMenu.vue'
import StopDetail from '@/components/StopDetail.vue'
import TabBar from '@/components/TabBar.vue'
import { useViewport } from '@/lib/layout'
import { formatTime } from '@/lib/format'
import type { ResolvedPlace } from '@/lib/places'
import { useRouteStore } from '@/stores/route'
import { useTripStore } from '@/stores/trip'
import type { TabId } from '@/types/itinerary'

const PANEL_WIDTH = 400

const trip = useTripStore()
const route = useRouteStore()
const tab = ref<TabId>('day')
const selectedId = ref<string>()
const sheetHeight = ref(0)
const map = ref<InstanceType<typeof MapCanvas>>()
const sheet = ref<InstanceType<typeof BottomSheet>>()

const { isDesktop, height: viewportHeight } = useViewport()

const day = computed(() => route.itinerary)

// Fixed arrival times the current order cannot meet, spelled out above the timeline.
const problems = computed(() =>
  day.value.stops
    .filter((s) => s.lateMinutes && s.fixedArrival && s.arrive)
    .map((s) => `${s.name} can't be reached by ${formatTime(s.fixedArrival!)}. Earliest arrival is ${formatTime(s.arrive!)}.`),
)

function onStartTime(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (value) trip.setStartTime(`${value}:00`)
}

const selectedStop = computed(() => trip.stops.find((s) => s.id === selectedId.value))

// Keep the route inside the part of the map that the sheet or panel does not cover.
const padding = computed<MapPadding>(() =>
  isDesktop.value
    ? { top: 60, right: 80, bottom: 60, left: PANEL_WIDTH + 60 }
    : { top: 90, right: 50, bottom: Math.min(sheetHeight.value, viewportHeight.value * 0.5) + 40, left: 50 },
)

const placeholders: Record<'guide' | 'trips', { title: string; text: string }> = {
  guide: { title: 'Guide', text: 'Tour-guide notes for each stop, in visit order.' },
  trips: { title: 'Trips', text: 'Create and switch between trips.' },
}

function selectStop(id: string) {
  selectedId.value = id
  tab.value = 'day'
  const stop = trip.stops.find((s) => s.id === id)
  if (stop) map.value?.panTo({ lat: stop.place.lat, lng: stop.place.lng })
}

async function addPlace(place: ResolvedPlace) {
  await trip.addPlace(place)
  if (!trip.error) tab.value = 'day'
}

async function removeSelected() {
  const id = selectedId.value
  selectedId.value = undefined
  if (id) await trip.removeStop(id)
}

// A stop selected on one day must not stay open on another.
watch(() => trip.day?.id, () => (selectedId.value = undefined))

onMounted(trip.load)
</script>

<template>
  <div class="planner">
    <MapCanvas ref="map" :day="day" :padding="padding" @select-stop="selectStop" />

    <div class="controls left">
      <SettingsMenu />
      <button class="control" aria-label="More" disabled><EllipsisVertical :size="22" /></button>
    </div>
    <div class="controls right">
      <button class="control" aria-label="My location" @click="map?.locate()"><LocateFixed :size="22" /></button>
      <button class="control" aria-label="Fit route" @click="map?.fitRoute()"><Scan :size="22" /></button>
    </div>

    <BottomSheet ref="sheet" @height="sheetHeight = $event">
      <template #header>
        <DayHeader
          v-if="tab === 'day' && trip.day"
          :date="trip.day.date"
          :has-previous="trip.dayIndex > 0"
          :has-next="trip.dayIndex < trip.days.length - 1"
          @previous="trip.stepDay(-1)"
          @next="trip.stepDay(1)"
          @pick-date="trip.goToDate"
        />
        <h1 v-else class="title">{{ tab === 'day' ? 'Day' : tab === 'explore' ? 'Explore' : placeholders[tab].title }}</h1>
      </template>

      <p v-if="trip.error" class="error" role="alert">{{ trip.error }}</p>

      <template v-if="tab === 'day'">
        <p v-if="trip.loading" class="coming">Loading…</p>
        <StopDetail
          v-else-if="selectedStop"
          :key="selectedStop.id"
          :stop="selectedStop"
          @back="selectedId = undefined"
          @update="trip.updateStop(selectedStop.id, $event)"
          @remove="removeSelected"
        />
        <template v-else>
          <div class="toolbar">
            <button class="optimise" :disabled="route.loading || day.stops.length < 2" @click="route.optimise()">
              <WandSparkles :size="16" /> {{ route.loading ? 'Calculating…' : 'Optimise order' }}
            </button>
            <label v-if="trip.day" class="start">
              Start
              <input type="time" :value="trip.day.start_time.slice(0, 5)" @change="onStartTime" />
            </label>
          </div>
          <p v-for="problem in problems" :key="problem" class="error" role="alert">{{ problem }}</p>
          <p v-if="route.error" class="error" role="alert">{{ route.error }}</p>
          <p v-if="route.notice" class="notice">{{ route.notice }}</p>
          <DayTimeline
            :day="day"
            @select="selectStop"
            @reorder="trip.reorder"
            @mode="(id, mode) => trip.updateStop(id, { travel_mode: mode })"
          />
        </template>
      </template>
      <ExploreSearch
        v-else-if="tab === 'explore'"
        :bias="() => map?.searchBias()"
        @add="addPlace"
        @focus="sheet?.expand()"
      />
      <p v-else class="coming">{{ placeholders[tab].text }} Not built yet.</p>
    </BottomSheet>

    <TabBar v-model="tab" />
  </div>
</template>

<style scoped>
.planner {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.controls {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.controls.left {
  left: 16px;
}

.controls.right {
  right: 16px;
}

.controls :deep(.control) {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--glass);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow);
}

.title {
  margin: 0;
  padding: 6px 0 12px;
  font-size: 26px;
  font-weight: 600;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.start {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: var(--text-muted);
}

.start input {
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  font: inherit;
  color: var(--text);
  background: var(--control);
}

.notice {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-muted);
}

.optimise {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 14px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: var(--accent);
}

.coming {
  margin: 4px 0;
  color: var(--text-muted);
}

.error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  color: var(--danger);
  background: rgb(217 66 58 / 10%);
}

@media (min-width: 900px) {
  .controls.left {
    left: calc(var(--panel-width) + 32px);
  }
}
</style>
