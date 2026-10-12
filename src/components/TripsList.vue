<script setup lang="ts">
import { ref } from 'vue'
import { Check, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { useTripStore } from '@/stores/trip'
import type { Trip } from '@/types/db'

const emit = defineEmits<{ opened: [] }>()

const trip = useTripStore()
const newName = ref('')
const editingId = ref<string>()
const editName = ref('')

async function create() {
  const name = newName.value.trim()
  if (!name) return
  newName.value = ''
  await trip.createTrip(name)
  if (!trip.error) emit('opened')
}

async function open(id: string) {
  if (id !== trip.trip?.id) await trip.openTrip(id)
  emit('opened')
}

function startRename(t: Trip) {
  editingId.value = t.id
  editName.value = t.name
}

async function saveRename() {
  const id = editingId.value
  const name = editName.value.trim()
  editingId.value = undefined
  if (id && name) await trip.renameTrip(id, name)
}

function remove(t: Trip) {
  if (window.confirm(`Delete "${t.name}" with all its days and stops? This cannot be undone.`)) trip.deleteTrip(t.id)
}
</script>

<template>
  <form class="new" @submit.prevent="create">
    <input v-model="newName" placeholder="New trip name" aria-label="New trip name" />
    <button type="submit" :disabled="!newName.trim()"><Plus :size="18" /> Create</button>
  </form>

  <ul>
    <li v-for="t in trip.trips" :key="t.id" :class="{ current: t.id === trip.trip?.id }">
      <form v-if="editingId === t.id" class="rename" @submit.prevent="saveRename">
        <input v-model="editName" aria-label="Trip name" @keydown.esc="editingId = undefined" />
        <button type="submit" class="icon" aria-label="Save name"><Check :size="18" /></button>
      </form>
      <template v-else>
        <button class="open" @click="open(t.id)">
          <strong>{{ t.name }}</strong>
          <span v-if="t.id === trip.trip?.id">Open now</span>
        </button>
        <button class="icon" :aria-label="`Rename ${t.name}`" @click="startRename(t)"><Pencil :size="16" /></button>
        <button class="icon danger" :aria-label="`Delete ${t.name}`" @click="remove(t)"><Trash2 :size="16" /></button>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.new,
.rename {
  display: flex;
  gap: 8px;
}

.new {
  margin-bottom: 14px;
}

.rename {
  flex: 1;
}

input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgb(60 60 67 / 18%);
  border-radius: 12px;
  font: inherit;
  font-size: 16px;
  color: var(--text);
  background: rgb(255 255 255 / 70%);
}

.new button {
  display: inline-flex;
  flex: none;
  gap: 4px;
  align-items: center;
  padding: 0 14px;
  border-radius: 12px;
  font-weight: 500;
  color: #fff;
  background: var(--accent);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 8px;
  padding: 6px 6px 6px 14px;
  border-radius: 16px;
  background: rgb(255 255 255 / 55%);
}

li.current {
  box-shadow: inset 0 0 0 2px var(--accent);
}

.open {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 8px 0;
  text-align: left;
}

.open strong {
  font-size: 17px;
  font-weight: 500;
}

.open span {
  font-size: 13px;
  color: var(--accent);
}

.icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: var(--text-muted);
}

.icon.danger {
  color: var(--danger);
}
</style>
