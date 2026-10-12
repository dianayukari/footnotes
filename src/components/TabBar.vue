<script setup lang="ts">
import { Bookmark, Compass, Luggage, Sunrise } from 'lucide-vue-next'
import type { TabId } from '@/types/itinerary'

const active = defineModel<TabId>({ required: true })

const tabs = [
  { id: 'day', label: 'Day', icon: Sunrise },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'guide', label: 'Guide', icon: Bookmark },
  { id: 'trips', label: 'Trips', icon: Luggage },
] as const
</script>

<template>
  <nav class="tab-bar" aria-label="Sections">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab"
      :class="{ active: active === tab.id }"
      :aria-current="active === tab.id ? 'page' : undefined"
      @click="active = tab.id"
    >
      <component :is="tab.icon" :size="24" :stroke-width="1.8" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: absolute;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 50%;
  z-index: 20;
  display: flex;
  width: min(calc(100% - 48px), 380px);
  padding: 5px;
  border-radius: 36px;
  background: rgb(250 250 247 / 82%);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow);
  transform: translateX(-50%);
}

.tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 8px 0 6px;
  border-radius: 30px;
  font-size: 12px;
  color: var(--text-muted);
}

.tab.active {
  color: var(--accent);
  background: var(--control);
}

@media (min-width: 900px) {
  .tab-bar {
    top: 16px;
    bottom: auto;
    left: 16px;
    width: var(--panel-width);
    transform: none;
  }
}
</style>
