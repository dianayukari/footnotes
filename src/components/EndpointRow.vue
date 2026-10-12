<script setup lang="ts">
import { Flag, Play, X } from 'lucide-vue-next'
import { formatTime } from '@/lib/format'
import type { EndpointKind, ItineraryEndpoint } from '@/types/itinerary'

defineProps<{ kind: EndpointKind; place?: ItineraryEndpoint }>()
const emit = defineEmits<{ pick: []; clear: [] }>()
</script>

<template>
  <div class="endpoint">
    <button class="main" @click="emit('pick')">
      <span class="dot" :class="{ unset: !place }">
        <component :is="kind === 'start' ? Play : Flag" :size="12" :stroke-width="2.6" />
      </span>
      <span v-if="place" class="name">{{ place.name }}</span>
      <span v-else class="name choose">{{ kind === 'start' ? 'Choose where the day starts' : 'Choose where the day ends' }}</span>
      <span v-if="place" class="meta">
        {{ kind === 'start' ? 'Start' : 'End' }}<template v-if="place.time">
          · {{ kind === 'start' ? 'leave' : 'arrive' }} {{ formatTime(place.time) }}</template>
      </span>
    </button>
    <slot />
    <button v-if="place" class="clear" :aria-label="`Remove the ${kind} point`" @click="emit('clear')">
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.endpoint {
  position: relative;
  display: flex;
  align-items: center;
  width: calc(100% + 16px);
  margin: 0 -8px 6px;
}

.main {
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
  background: #48484a;
  box-shadow: 0 0 0 3px rgb(244 245 240);
}

.dot.unset {
  color: var(--text-muted);
  background: rgb(244 245 240);
  box-shadow: inset 0 0 0 2px rgb(60 60 67 / 35%);
}

.name {
  font-size: 17px;
  font-weight: 500;
}

.choose {
  font-size: 15px;
  font-weight: 400;
  color: var(--accent);
}

.meta {
  grid-column: 2;
  font-size: 14px;
  color: var(--text-muted);
}

.clear {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 44px;
  color: var(--text-muted);
}
</style>
