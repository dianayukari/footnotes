import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/format'
import type { ResolvedPlace } from '@/lib/places'
import type { Day, Place, Stop, Trip } from '@/types/db'
import type { TravelMode } from '@/types/itinerary'

export type StopWithPlace = Stop & { place: Place }
export type StopPatch = Partial<Pick<Stop, 'duration_minutes' | 'fixed_arrival' | 'notes'>> & {
  /** How to travel from this stop to the next; null lets the app choose. */
  travel_mode?: TravelMode | null
}

export const useTripStore = defineStore('trip', () => {
  const trip = ref<Trip | null>(null)
  const days = ref<Day[]>([])
  const dayId = ref<string>()
  const stops = ref<StopWithPlace[]>([])
  const loading = ref(true)
  const error = ref('')

  const day = computed(() => days.value.find((d) => d.id === dayId.value))
  const dayIndex = computed(() => days.value.findIndex((d) => d.id === dayId.value))

  function fail(message: string | undefined) {
    if (message) error.value = message
    return Boolean(message)
  }

  /** Loads the most recent trip, creating a first trip with one day for new users. */
  async function load() {
    loading.value = true
    error.value = ''
    const found = await supabase.from('trips').select('*').order('created_at', { ascending: false }).limit(1)
    if (fail(found.error?.message)) return (loading.value = false)

    trip.value = found.data?.[0] ?? null
    if (!trip.value) {
      const created = await supabase.from('trips').insert({ name: 'My first trip' }).select().single()
      if (fail(created.error?.message)) return (loading.value = false)
      trip.value = created.data
    }

    const loaded = await supabase.from('days').select('*').eq('trip_id', trip.value!.id).order('date')
    if (fail(loaded.error?.message)) return (loading.value = false)
    days.value = loaded.data ?? []

    if (days.value.length === 0) await goToDate(todayIso())
    else await selectDay((days.value.find((d) => d.date >= todayIso()) ?? days.value.at(-1)!).id)
    loading.value = false
  }

  async function selectDay(id: string) {
    dayId.value = id
    const { data, error: e } = await supabase
      .from('stops')
      .select('*, place:places!stops_place_id_fkey(*)')
      .eq('day_id', id)
      .order('position')
    if (fail(e?.message)) return
    // A newer selection may have replaced this one while the request was in flight.
    if (dayId.value === id) stops.value = (data ?? []) as StopWithPlace[]
  }

  /** Opens the day for a date, adding it to the trip if it does not exist yet. */
  async function goToDate(date: string) {
    const existing = days.value.find((d) => d.date === date)
    if (existing) return selectDay(existing.id)
    if (!trip.value) return
    const { data, error: e } = await supabase.from('days').insert({ trip_id: trip.value.id, date }).select().single()
    if (fail(e?.message) || !data) return
    days.value = [...days.value, data].sort((a, b) => a.date.localeCompare(b.date))
    await selectDay(data.id)
  }

  async function setStartTime(startTime: string) {
    const current = day.value
    if (!current) return
    const before = days.value
    days.value = before.map((d) => (d.id === current.id ? { ...d, start_time: startTime } : d))
    const { error: e } = await supabase.from('days').update({ start_time: startTime }).eq('id', current.id)
    if (fail(e?.message)) days.value = before
  }

  function stepDay(offset: -1 | 1) {
    const next = days.value[dayIndex.value + offset]
    if (next) return selectDay(next.id)
  }

  async function addPlace(place: ResolvedPlace) {
    if (!dayId.value) return
    // Places are shared between users; an existing row is left as it is.
    const saved = await supabase.from('places').upsert(place, { onConflict: 'place_id', ignoreDuplicates: true })
    if (fail(saved.error?.message)) return

    const position = Math.max(-1, ...stops.value.map((s) => s.position)) + 1
    const { data, error: e } = await supabase
      .from('stops')
      .insert({ day_id: dayId.value, place_id: place.place_id, position })
      .select('*, place:places!stops_place_id_fkey(*)')
      .single()
    if (fail(e?.message) || !data) return
    stops.value = [...stops.value, data as StopWithPlace]
    return data.id
  }

  async function updateStop(id: string, patch: StopPatch) {
    const before = stops.value
    stops.value = before.map((s) => (s.id === id ? { ...s, ...patch } : s))
    const { error: e } = await supabase.from('stops').update(patch).eq('id', id)
    if (fail(e?.message)) stops.value = before
  }

  async function removeStop(id: string) {
    const before = stops.value
    stops.value = before.filter((s) => s.id !== id)
    const { error: e } = await supabase.from('stops').delete().eq('id', id)
    if (fail(e?.message)) stops.value = before
  }

  /** Saves a new visit order, given every stop id of the day in that order. */
  async function reorder(ids: string[]) {
    const before = stops.value
    const byId = new Map(before.map((s) => [s.id, s]))
    const next = ids.flatMap((id, position) => {
      const s = byId.get(id)
      return s ? [{ ...s, position }] : []
    })
    const moved = next.filter((s) => byId.get(s.id)!.position !== s.position)
    stops.value = next
    const results = await Promise.all(
      moved.map((s) => supabase.from('stops').update({ position: s.position }).eq('id', s.id)),
    )
    const failed = results.find((r) => r.error)
    if (fail(failed?.error?.message)) await selectDay(dayId.value!)
  }

  return {
    trip, days, day, dayIndex, stops, loading, error,
    load, selectDay, goToDate, setStartTime, stepDay, addPlace, updateStop, removeStop, reorder,
  }
})
