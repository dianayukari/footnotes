<script setup lang="ts">
import { ChevronLeft, Trash2 } from 'lucide-vue-next'
import { formatDuration } from '@/lib/format'
import type { StopPatch, StopWithPlace } from '@/stores/trip'

const props = defineProps<{ stop: StopWithPlace }>()
const emit = defineEmits<{ back: []; update: [patch: StopPatch]; remove: [] }>()

function onDuration(e: Event) {
  const minutes = Math.round(Number((e.target as HTMLInputElement).value))
  if (minutes > 0) emit('update', { duration_minutes: minutes })
  else (e.target as HTMLInputElement).value = String(props.stop.duration_minutes)
}

function onFixedArrival(e: Event) {
  emit('update', { fixed_arrival: (e.target as HTMLInputElement).value || null })
}

function onNotes(e: Event) {
  emit('update', { notes: (e.target as HTMLTextAreaElement).value.trim() || null })
}
</script>

<template>
  <div class="detail">
    <button class="back" @click="emit('back')"><ChevronLeft :size="18" /> Day</button>
    <h2>{{ stop.place.name }}</h2>
    <p v-if="stop.place.address" class="address">{{ stop.place.address }}</p>

    <label>
      <span>Visit duration (minutes)</span>
      <input type="number" min="5" step="5" inputmode="numeric" :value="stop.duration_minutes" @change="onDuration" />
      <button
        v-if="stop.place.suggested_minutes && stop.place.suggested_minutes !== stop.duration_minutes"
        class="suggestion"
        @click="emit('update', { duration_minutes: stop.place.suggested_minutes })"
      >
        Use the suggested {{ formatDuration(stop.place.suggested_minutes) }}
      </button>
    </label>

    <label>
      <span>Must arrive at</span>
      <span class="time">
        <input type="time" :value="stop.fixed_arrival?.slice(0, 5) ?? ''" @change="onFixedArrival" />
        <button v-if="stop.fixed_arrival" class="clear" @click="emit('update', { fixed_arrival: null })">Clear</button>
      </span>
    </label>

    <label>
      <span>Notes</span>
      <textarea rows="3" :value="stop.notes ?? ''" @change="onNotes" />
    </label>

    <section v-if="stop.place.guide" class="guide">
      <h3>About this place</h3>
      <p>{{ stop.place.guide }}</p>
      <small>Written by AI. Check anything important.</small>
    </section>

    <button class="remove" @click="emit('remove')"><Trash2 :size="16" /> Remove from day</button>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  margin-left: -6px;
  padding: 4px 6px;
  font-size: 15px;
  color: var(--accent);
}

h2 {
  margin: 8px 0 2px;
  font-size: 22px;
  font-weight: 600;
}

.address {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-muted);
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-muted);
}

input,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgb(60 60 67 / 18%);
  border-radius: 12px;
  font: inherit;
  font-size: 16px;
  color: var(--text);
  background: rgb(255 255 255 / 70%);
}

textarea {
  resize: vertical;
}

.time {
  display: flex;
  gap: 8px;
}

.clear {
  flex: none;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--control);
}

.suggestion {
  align-self: flex-start;
  font-size: 14px;
  color: var(--accent);
}

.guide {
  margin-top: 22px;
}

.guide h3 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
}

.guide p {
  margin: 0 0 6px;
  line-height: 1.5;
}

.guide small {
  color: var(--text-muted);
}

.remove {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-top: 24px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 15px;
  color: var(--danger);
  background: var(--control);
}
</style>
