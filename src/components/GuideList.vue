<script setup lang="ts">
import { watch } from 'vue'
import { categories } from '@/lib/categories'
import { categoryFromTypes } from '@/lib/places'
import { useTripStore } from '@/stores/trip'

defineEmits<{ select: [id: string] }>()

const trip = useTripStore()

// Notes are written the first time a place is shown here; later visits read the stored copy.
watch(
  () => trip.stops.map((s) => s.place_id).join(),
  () => {
    for (const s of trip.stops) if (!s.place.guide) trip.loadPlaceInfo(s.place_id)
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="trip.stops.length === 0" class="muted">Add places to the day to read about them here.</p>
  <ol class="guide">
    <li v-for="(stop, i) in trip.stops" :key="stop.id">
      <button class="heading" @click="$emit('select', stop.id)">
        <span class="dot" :style="{ background: categories[categoryFromTypes(stop.place.types)].color }">{{ i + 1 }}</span>
        {{ stop.place.name }}
      </button>
      <p v-if="stop.place.guide">{{ stop.place.guide }}</p>
      <p v-else-if="trip.infoErrors[stop.place_id]" class="problem">
        Could not write this note: {{ trip.infoErrors[stop.place_id] }}
        <button class="retry" @click="trip.loadPlaceInfo(stop.place_id)">Try again</button>
      </p>
      <p v-else class="muted">Writing…</p>
    </li>
  </ol>
  <p v-if="trip.stops.length" class="muted small">Notes are written by AI. Check anything important.</p>
</template>

<style scoped>
.guide {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  margin-bottom: 22px;
}

.heading {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 0;
  font-size: 18px;
  font-weight: 600;
  text-align: left;
}

.dot {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 13px;
  color: #fff;
}

p {
  margin: 8px 0 0;
  line-height: 1.5;
}

.muted {
  color: var(--text-muted);
}

.small {
  font-size: 13px;
}

.problem {
  color: var(--danger);
}

.retry {
  margin-left: 6px;
  color: var(--accent);
}
</style>
