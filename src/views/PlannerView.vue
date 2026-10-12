<script setup lang="ts">
import { computed, ref } from 'vue'
import { EllipsisVertical, LocateFixed, Scan, WandSparkles } from 'lucide-vue-next'
import BottomSheet from '@/components/BottomSheet.vue'
import DayHeader from '@/components/DayHeader.vue'
import DayTimeline from '@/components/DayTimeline.vue'
import MapCanvas, { type MapPadding } from '@/components/MapCanvas.vue'
import SettingsMenu from '@/components/SettingsMenu.vue'
import TabBar from '@/components/TabBar.vue'
import { placeholderDay } from '@/data/placeholder'
import { useViewport } from '@/lib/layout'
import type { TabId } from '@/types/itinerary'

const PANEL_WIDTH = 400

const day = ref(placeholderDay)
const tab = ref<TabId>('day')
const selectedId = ref<string>()
const sheetHeight = ref(0)
const map = ref<InstanceType<typeof MapCanvas>>()

const { isDesktop, height: viewportHeight } = useViewport()

// Keep the route inside the part of the map that the sheet or panel does not cover.
const padding = computed<MapPadding>(() =>
  isDesktop.value
    ? { top: 60, right: 80, bottom: 60, left: PANEL_WIDTH + 60 }
    : { top: 90, right: 50, bottom: Math.min(sheetHeight.value, viewportHeight.value * 0.5) + 40, left: 50 },
)

const placeholders: Record<Exclude<TabId, 'day'>, { title: string; text: string }> = {
  explore: { title: 'Explore', text: 'Search for places and add them to the day.' },
  guide: { title: 'Guide', text: 'Tour-guide notes for each stop, in visit order.' },
  trips: { title: 'Trips', text: 'Create and switch between trips.' },
}

function selectStop(id: string) {
  selectedId.value = id
  tab.value = 'day'
  const stop = day.value.stops.find((s) => s.id === id)
  if (stop) map.value?.panTo({ lat: stop.lat, lng: stop.lng })
}
</script>

<template>
  <div class="planner">
    <MapCanvas ref="map" :day="day" :padding="padding" @select-stop="selectStop" />

    <div class="controls left">
      <SettingsMenu />
      <button class="control" aria-label="More"><EllipsisVertical :size="22" /></button>
    </div>
    <div class="controls right">
      <button class="control" aria-label="My location" @click="map?.locate()"><LocateFixed :size="22" /></button>
      <button class="control" aria-label="Fit route" @click="map?.fitRoute()"><Scan :size="22" /></button>
    </div>

    <BottomSheet @height="sheetHeight = $event">
      <template #header>
        <DayHeader v-if="tab === 'day'" :date="day.date" :has-previous="false" :has-next="false" />
        <h1 v-else class="title">{{ placeholders[tab].title }}</h1>
      </template>

      <template v-if="tab === 'day'">
        <button class="optimise" disabled><WandSparkles :size="16" /> Optimise order</button>
        <DayTimeline :day="day" :selected-id="selectedId" @select="selectStop" />
      </template>
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

.optimise {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
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

@media (min-width: 900px) {
  .controls.left {
    left: calc(var(--panel-width) + 32px);
  }
}
</style>
