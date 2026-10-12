<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight, Sunrise } from 'lucide-vue-next'
import { formatDate } from '@/lib/format'

const props = defineProps<{
  date: string
  /** Every date of the trip that has a day, in order. */
  dates: string[]
  hasPrevious: boolean
  hasNext: boolean
}>()
const emit = defineEmits<{ previous: []; next: []; pickDate: [date: string] }>()

const open = ref(false)
const other = ref(props.date)

function weekday(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function go(date: string) {
  if (!date) return
  open.value = false
  if (date !== props.date) emit('pickDate', date)
}

watch(() => props.date, (date) => (other.value = date))
</script>

<template>
  <header class="day-header">
    <div class="bar">
      <h1><Sunrise :size="22" :stroke-width="2" /> Day</h1>
      <button class="date" :aria-expanded="open" @click="open = !open">
        {{ formatDate(date) }} <ChevronDown :size="16" />
      </button>
      <button class="round" aria-label="Previous day" :disabled="!hasPrevious" @click="emit('previous')">
        <ChevronLeft :size="20" />
      </button>
      <button class="round" aria-label="Next day" :disabled="!hasNext" @click="emit('next')">
        <ChevronRight :size="20" />
      </button>
    </div>

    <!-- A visible date field with its own button: the browser's hidden-picker events are unreliable. -->
    <div v-if="open" class="chooser" @pointerdown.stop>
      <div class="days">
        <button v-for="d in dates" :key="d" :class="{ current: d === date }" @click="go(d)">{{ weekday(d) }}</button>
      </div>
      <form class="other" @submit.prevent="go(other)">
        <label>
          Another date
          <input v-model="other" type="date" required />
        </label>
        <button type="submit">{{ dates.includes(other) ? 'Open' : 'Add day' }}</button>
      </form>
    </div>
  </header>
</template>

<style scoped>
.day-header {
  padding: 6px 0 12px;
}

.bar {
  display: flex;
  gap: 8px;
  align-items: center;
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

.chooser {
  margin-top: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgb(255 255 255 / 60%);
  touch-action: auto;
  user-select: auto;
}

.days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.days button {
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 14px;
  background: var(--control);
}

.days button.current {
  color: #fff;
  background: var(--accent);
}

.other {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.other label {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-muted);
}

.other input {
  padding: 8px 10px;
  border: 1px solid rgb(60 60 67 / 18%);
  border-radius: 10px;
  font: inherit;
  font-size: 16px;
  color: var(--text);
  background: #fff;
}

.other button {
  flex: none;
  padding: 9px 14px;
  border-radius: 10px;
  font-weight: 500;
  color: #fff;
  background: var(--accent);
}
</style>
