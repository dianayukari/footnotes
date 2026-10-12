<script setup lang="ts">
import { ChevronDown, ChevronLeft, ChevronRight, Sunrise } from 'lucide-vue-next'
import { formatDate } from '@/lib/format'

defineProps<{ date: string; hasPrevious: boolean; hasNext: boolean }>()
defineEmits<{ previous: []; next: []; pickDate: [] }>()
</script>

<template>
  <header class="day-header">
    <h1><Sunrise :size="22" :stroke-width="2" /> Day</h1>
    <button class="date" @click="$emit('pickDate')">
      {{ formatDate(date) }} <ChevronDown :size="16" />
    </button>
    <button class="round" aria-label="Previous day" :disabled="!hasPrevious" @click="$emit('previous')">
      <ChevronLeft :size="20" />
    </button>
    <button class="round" aria-label="Next day" :disabled="!hasNext" @click="$emit('next')">
      <ChevronRight :size="20" />
    </button>
  </header>
</template>

<style scoped>
.day-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 0 12px;
}

h1 {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 26px;
  font-weight: 600;
}

.date {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 6px 4px;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
}

.round {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--control);
}
</style>
