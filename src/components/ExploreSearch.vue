<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import { resolvePlace, searchPlaces, type PlaceSuggestion, type ResolvedPlace } from '@/lib/places'

const props = defineProps<{ bias: () => google.maps.LatLngLiteral | undefined }>()
const emit = defineEmits<{ add: [place: ResolvedPlace]; focus: [] }>()

const DEBOUNCE_MS = 250

const query = ref('')
const suggestions = ref<PlaceSuggestion[]>([])
const searched = ref(false)
const adding = ref<string>()
const error = ref('')

let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

function onInput() {
  clearTimeout(timer)
  const input = query.value.trim()
  if (input.length < 2) {
    suggestions.value = []
    searched.value = false
    return
  }
  timer = setTimeout(async () => {
    const request = ++latest
    try {
      const found = await searchPlaces(input, props.bias())
      // Drop responses that arrive after a newer keystroke.
      if (request !== latest) return
      suggestions.value = found
      searched.value = true
      error.value = ''
    } catch (e) {
      error.value = `Search failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }, DEBOUNCE_MS)
}

async function add(suggestion: PlaceSuggestion) {
  adding.value = suggestion.id
  try {
    emit('add', await resolvePlace(suggestion))
    query.value = ''
    suggestions.value = []
    searched.value = false
  } catch (e) {
    error.value = `Could not add place: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    adding.value = undefined
  }
}
</script>

<template>
  <div class="explore">
    <label class="field">
      <Search :size="18" />
      <input
        v-model="query"
        type="search"
        placeholder="Search for a place"
        autocomplete="off"
        @input="onInput"
        @focus="emit('focus')"
      />
    </label>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="searched && suggestions.length === 0" class="hint">No places found.</p>
    <p v-else-if="!searched" class="hint">Results near the area shown on the map come first.</p>

    <ul>
      <li v-for="s in suggestions" :key="s.id">
        <button :disabled="adding !== undefined" @click="add(s)">
          <span class="text">
            <strong>{{ s.title }}</strong>
            <span>{{ s.subtitle }}</span>
          </span>
          <Plus :size="20" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 12px;
  border-radius: 14px;
  color: var(--text-muted);
  background: var(--control);
}

input {
  flex: 1;
  min-width: 0;
  padding: 11px 0;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 16px;
  color: var(--text);
  background: none;
}

.hint,
.error {
  margin: 12px 2px;
  font-size: 14px;
  color: var(--text-muted);
}

.error {
  color: var(--danger);
}

ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

li button {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 10px 4px;
  border-bottom: 1px solid rgb(60 60 67 / 12%);
  text-align: left;
  color: var(--accent);
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  color: var(--text);
}

.text span {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
}
</style>
