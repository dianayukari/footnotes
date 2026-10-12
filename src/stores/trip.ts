import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { todayIso } from '@/lib/format'
import type { ResolvedPlace } from '@/lib/places'
import type { Day, Place, Stop, Trip } from '@/types/db'
import type { EndpointKind, TravelMode } from '@/types/itinerary'

export type StopWithPlace = Stop & { place: Place }
export type DayWithPlaces = Day & { start_place: Place | null; end_place: Place | null }

const DAY_COLUMNS = '*, start_place:places!days_start_place_id_fkey(*), end_place:places!days_end_place_id_fkey(*)'
export type StopPatch = Partial<Pick<Stop, 'duration_minutes' | 'fixed_arrival' | 'notes'>> & {
  /** How to travel from this stop to the next; null lets the app choose. */
  travel_mode?: TravelMode | null
}

export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const trip = ref<Trip | null>(null)
  const days = ref<DayWithPlaces[]>([])
  const dayId = ref<string>()
  const stops = ref<StopWithPlace[]>([])
  const loading = ref(true)
  const error = ref('')
  /** Why guide notes could not be loaded, by place id. */
  const infoErrors = ref<Record<string, string>>({})

  // Stops inserted with this default take the suggested visit length once it is known.
  const DEFAULT_DURATION = 60
  const infoRequests = new Map<string, Promise<Place | undefined>>()

  const day = computed(() => days.value.find((d) => d.id === dayId.value))
  const dayIndex = computed(() => days.value.findIndex((d) => d.id === dayId.value))

  function fail(message: string | undefined) {
    if (message) error.value = message
    return Boolean(message)
  }

  // Remembers which trip was open on this device; purely a convenience, so failures are ignored.
  const LAST_TRIP_KEY = 'footnotes:last-trip'
  function rememberTrip(id: string) {
    try {
      localStorage.setItem(LAST_TRIP_KEY, id)
    } catch {
      // Storage can be unavailable (private windows, blocked site data).
    }
  }
  function rememberedTrip() {
    try {
      return localStorage.getItem(LAST_TRIP_KEY)
    } catch {
      return null
    }
  }

  /** Loads the traveller's trips and opens the last one used, creating a first trip for new users. */
  async function load() {
    loading.value = true
    error.value = ''
    const found = await supabase.from('trips').select('*').order('created_at', { ascending: false })
    if (fail(found.error?.message)) return (loading.value = false)
    trips.value = found.data ?? []

    if (trips.value.length === 0) return createTrip('My first trip')
    const last = rememberedTrip()
    await openTrip((trips.value.find((t) => t.id === last) ?? trips.value[0]!).id)
  }

  /** Switches to a trip and opens its next upcoming day, adding today if it has no days yet. */
  async function openTrip(id: string) {
    const next = trips.value.find((t) => t.id === id)
    if (!next) return
    loading.value = true
    trip.value = next
    rememberTrip(id)
    days.value = []
    dayId.value = undefined
    stops.value = []

    const loaded = await supabase.from('days').select(DAY_COLUMNS).eq('trip_id', id).order('date')
    if (fail(loaded.error?.message)) return (loading.value = false)
    // A newer switch may have replaced this one while the request was in flight.
    if (trip.value?.id !== id) return
    days.value = (loaded.data ?? []) as DayWithPlaces[]

    if (days.value.length === 0) await goToDate(todayIso())
    else await selectDay((days.value.find((d) => d.date >= todayIso()) ?? days.value.at(-1)!).id)
    loading.value = false
  }

  async function createTrip(name: string) {
    const created = await supabase.from('trips').insert({ name }).select().single()
    if (fail(created.error?.message) || !created.data) return (loading.value = false)
    trips.value = [created.data, ...trips.value]
    await openTrip(created.data.id)
  }

  async function renameTrip(id: string, name: string) {
    const before = trips.value
    trips.value = before.map((t) => (t.id === id ? { ...t, name } : t))
    if (trip.value?.id === id) trip.value = { ...trip.value, name }
    const { error: e } = await supabase.from('trips').update({ name }).eq('id', id)
    if (fail(e?.message)) {
      trips.value = before
      if (trip.value?.id === id) trip.value = before.find((t) => t.id === id) ?? trip.value
    }
  }

  /** Deletes a trip with all its days and stops. Opens another trip, or a fresh one, if it was open. */
  async function deleteTrip(id: string) {
    const { error: e } = await supabase.from('trips').delete().eq('id', id)
    if (fail(e?.message)) return
    trips.value = trips.value.filter((t) => t.id !== id)
    if (trip.value?.id !== id) return
    if (trips.value.length > 0) await openTrip(trips.value[0]!.id)
    else await createTrip('My first trip')
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
    const created: DayWithPlaces = { ...data, start_place: null, end_place: null }
    days.value = [...days.value, created].sort((a, b) => a.date.localeCompare(b.date))
    await selectDay(data.id)
  }

  /** Applies a change to the current day at once and rolls it back if saving fails. */
  async function patchDay(local: Partial<DayWithPlaces>, saved: Partial<Day>) {
    const current = day.value
    if (!current) return
    const before = days.value
    days.value = before.map((d) => (d.id === current.id ? { ...d, ...local } : d))
    const { error: e } = await supabase.from('days').update(saved).eq('id', current.id)
    if (fail(e?.message)) days.value = before
  }

  const setStartTime = (startTime: string) => patchDay({ start_time: startTime }, { start_time: startTime })

  /** How to travel from the start point to the first stop; null lets the app choose. */
  const setStartTravelMode = (mode: TravelMode | null) =>
    patchDay({ start_travel_mode: mode }, { start_travel_mode: mode })

  /** Sets or clears where the day starts or ends. */
  async function setEndpoint(kind: EndpointKind, place: ResolvedPlace | Place | null) {
    if (place) {
      const { place_id, name, lat, lng, address, types, utc_offset_minutes } = place
      const saved = await supabase
        .from('places')
        .upsert({ place_id, name, lat, lng, address, types, utc_offset_minutes }, { onConflict: 'place_id', ignoreDuplicates: true })
      if (fail(saved.error?.message)) return
    }
    // A stored place may carry guide notes the freshly searched one lacks; keep whichever is fuller.
    const full = place && ({ guide: null, suggested_minutes: null, created_at: '', ...place } as Place)
    const id = place?.place_id ?? null
    if (kind === 'start') await patchDay({ start_place: full, start_place_id: id }, { start_place_id: id })
    else await patchDay({ end_place: full, end_place_id: id }, { end_place_id: id })
  }

  /**
   * Moves the open day's plans to another date. When that date already has plans nothing changes
   * and 'occupied' is returned, unless swap is set, in which case the two days trade dates.
   */
  async function moveDay(date: string, swap = false) {
    const current = day.value
    if (!current || !trip.value) return
    const { data: outcome, error: e } = await supabase.rpc('move_day', { p_day: current.id, p_date: date, p_swap: swap })
    if (fail(e?.message)) return
    if (outcome === 'occupied') return 'occupied' as const

    // Dates changed, and an empty day on the target date may be gone, so reload the list.
    const loaded = await supabase.from('days').select(DAY_COLUMNS).eq('trip_id', trip.value.id).order('date')
    if (fail(loaded.error?.message)) return
    days.value = (loaded.data ?? []) as DayWithPlaces[]
    return outcome === 'swapped' ? ('swapped' as const) : ('moved' as const)
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
    applySuggestedDuration(data.id, place.place_id)
    return data.id
  }

  /**
   * Fetches a place's guide notes and suggested visit length, generating them on first use.
   * Concurrent calls for the same place share one request.
   */
  function loadPlaceInfo(placeId: string) {
    const known = stops.value.find((s) => s.place_id === placeId)?.place
    if (known?.guide && known.suggested_minutes) return Promise.resolve(known)

    let request = infoRequests.get(placeId)
    if (!request) {
      request = (async () => {
        const { [placeId]: _cleared, ...rest } = infoErrors.value
        infoErrors.value = rest
        const { data, error: e } = await supabase.functions.invoke<Pick<Place, 'guide' | 'suggested_minutes'>>(
          'place-info',
          { body: { place_id: placeId } },
        )
        if (e || !data) {
          // The function's own explanation is in the response body, not in the error message.
          const detail = await (e as { context?: Response })?.context?.json?.().catch(() => null)
          infoErrors.value = { ...infoErrors.value, [placeId]: detail?.error ?? e?.message ?? 'No answer' }
          return undefined
        }
        stops.value = stops.value.map((s) => (s.place_id === placeId ? { ...s, place: { ...s.place, ...data } } : s))
        return stops.value.find((s) => s.place_id === placeId)?.place
      })().finally(() => infoRequests.delete(placeId))
      infoRequests.set(placeId, request)
    }
    return request
  }

  async function applySuggestedDuration(stopId: string, placeId: string) {
    const place = await loadPlaceInfo(placeId)
    const stop = stops.value.find((s) => s.id === stopId)
    // Leave the stop alone if the traveller has already set their own duration.
    if (!place?.suggested_minutes || !stop || stop.duration_minutes !== DEFAULT_DURATION) return
    if (place.suggested_minutes !== DEFAULT_DURATION) await updateStop(stopId, { duration_minutes: place.suggested_minutes })
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
    trips, trip, days, day, dayIndex, stops, loading, error, infoErrors,
    load, openTrip, createTrip, renameTrip, deleteTrip, selectDay, moveDay, goToDate, setStartTime, setStartTravelMode, setEndpoint, stepDay, addPlace, loadPlaceInfo, updateStop, removeStop, reorder,
  }
})
