<script setup lang="ts">
import { BusFront, Footprints } from 'lucide-vue-next'
import { modeColors } from '@/lib/modes'
import type { TravelMode } from '@/types/itinerary'

defineProps<{ mode: TravelMode }>()
</script>

<template>
  <div class="mode-badge" :style="{ background: modeColors[mode] }">
    <component :is="mode === 'walk' ? Footprints : BusFront" :size="13" :stroke-width="2.6" />
  </div>
</template>

<style scoped>
.mode-badge {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
  transform: translateY(50%);
}
</style>
