<script setup lang="ts">
import { categories } from '@/lib/categories'
import type { ItineraryStop } from '@/types/itinerary'

defineProps<{ stop: Pick<ItineraryStop, 'name' | 'category'> }>()
</script>

<template>
  <div class="stop-marker">
    <div class="pin" :style="{ background: categories[stop.category].color }">
      <component :is="categories[stop.category].icon" :size="18" :stroke-width="2.4" />
    </div>
    <div class="label">{{ stop.name }}</div>
  </div>
</template>

<style scoped>
.stop-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Anchor the centre of the pin, not the label, on the coordinate. */
  transform: translateY(calc(50% - 19px));
  cursor: pointer;
}

.pin {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 3px solid #fff;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 30%);
}

.label {
  margin-top: 2px;
  max-width: 130px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  color: #1c1c1e;
  text-shadow:
    0 0 3px #fff,
    0 0 3px #fff,
    0 0 3px #fff;
}
</style>
