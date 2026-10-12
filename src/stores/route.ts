import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { minutesToTime, timeToMinutes } from '@/lib/format'
import { categoryFromTypes } from '@/lib/places'
import { departureInstant, estimateWalk, fetchLegRoute, fetchMatrix, type LegRoute, type Travel } from '@/lib/routing'
import { optimise as solve, schedule, type SolverStop, type Visit } from '@/lib/solver'
import { useTripStore } from './trip'
import type { Place } from '@/types/db'
import type { ItineraryDay, ItineraryLeg, TravelMode } from '@/types/itinerary'

/** Legs up to this many minutes on foot are walked even when transit would be faster. */
export const WALK_THRESHOLD_MINUTES = 15

interface Pair {
  walk: Travel | null
  transit: Travel | null
}

interface Choice extends Travel {
  mode: TravelMode
}

function message(e: unknown) {
  // Google appends a long machine-readable "Details:" tail to its errors.
  return (e instanceof Error ? e.message : String(e)).split(' Details:')[0]!
}

export const useRouteStore = defineStore('route', () => {
  const trip = useTripStore()

  // Travel times between places, kept per date because transit depends on the weekday.
  const pairs = new Map<string, Pair>()
  const covered = new Map<string, Set<string>>()
  const legRoutes = new Map<string, LegRoute | null>()

  const visits = ref<Visit[]>([])
  const legs = ref<ItineraryLeg[]>([])
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')

  // Bumped on every recompute so results of a superseded run are dropped.
  let run = 0

  const pairKey = (date: string, a: string, b: string) => `${date}|${a}|${b}`

  /** Fetches travel times for place pairs that are not cached yet. */
  async function ensureMatrix(date: string, start: number, places: Place[]) {
    const known = covered.get(date) ?? new Set<string>()
    covered.set(date, known)
    const fresh = places.filter((p) => !known.has(p.place_id))
    if (fresh.length === 0) return
    const old = places.filter((p) => known.has(p.place_id))
    const departure = departureInstant(date, start, places[0]!.utc_offset_minutes)

    // New places to everything, plus already-known places to the new ones.
    const blocks: [Place[], Place[]][] = [[fresh, places]]
    if (old.length > 0) blocks.push([old, fresh])

    await Promise.all(
      blocks.map(async ([from, to]) => {
        const [walk, transit] = await Promise.all([
          fetchMatrix(from, to, 'walk', departure),
          fetchMatrix(from, to, 'transit', departure),
        ])
        from.forEach((a, i) =>
          to.forEach((b, j) => {
            pairs.set(pairKey(date, a.place_id, b.place_id), { walk: walk[i]![j] ?? null, transit: transit[i]![j] ?? null })
          }),
        )
      }),
    )
    for (const p of fresh) known.add(p.place_id)
  }

  function choose(date: string, a: Place, b: Place): Choice {
    if (a.place_id === b.place_id) return { mode: 'walk', minutes: 0, meters: 0 }
    const pair = pairs.get(pairKey(date, a.place_id, b.place_id))
    const walk = pair?.walk ?? estimateWalk(a, b)
    const transit = pair?.transit
    if (!transit || walk.minutes <= WALK_THRESHOLD_MINUTES || walk.minutes <= transit.minutes) {
      return { mode: 'walk', ...walk }
    }
    return { mode: 'transit', ...transit }
  }

  function uniquePlaces() {
    return [...new Map(trip.stops.map((s) => [s.place_id, s.place])).values()]
  }

  function solverStops(): SolverStop[] {
    return trip.stops.map((s) => ({
      id: s.id,
      duration: s.duration_minutes,
      fixedArrival: s.fixed_arrival ? timeToMinutes(s.fixed_arrival) : undefined,
    }))
  }

  function travelMatrix(date: string) {
    return trip.stops.map((a) => trip.stops.map((b) => choose(date, a.place, b.place).minutes))
  }

  async function recompute() {
    const id = ++run
    const day = trip.day
    const stops = trip.stops
    error.value = ''
    if (!day || stops.length === 0) {
      visits.value = []
      legs.value = []
      loading.value = false
      return
    }
    const start = timeToMinutes(day.start_time)
    const order = stops.map((_, i) => i)

    loading.value = true
    try {
      if (stops.length > 1) await ensureMatrix(day.date, start, uniquePlaces())
    } catch (e) {
      // Fall through: the schedule is still drawn from straight-line walking estimates.
      error.value = `Could not load travel times: ${message(e)}`
    }
    if (id !== run) return

    const chosen = stops.slice(0, -1).map((s, i) => choose(day.date, s.place, stops[i + 1]!.place))
    const travel = travelMatrix(day.date)
    const draft = schedule(order, solverStops(), travel, start)
    visits.value = draft
    legs.value = chosen.map((c) => ({
      mode: c.mode,
      minutes: c.minutes,
      km: c.meters / 1000,
      summary: c.mode === 'walk' ? 'Walk' : 'Transit',
    }))

    // Then the real path of each leg, at the time the draft schedule departs on it.
    const routes = await Promise.all(
      chosen.map(async (c, i) => {
        const a = stops[i]!.place
        const b = stops[i + 1]!.place
        if (a.place_id === b.place_id) return null
        // Transit depends on the departure time; a 15-minute bucket keeps the cache useful.
        const bucket = c.mode === 'transit' ? `${day.date}@${Math.round(draft[i]!.depart / 15)}` : ''
        const key = `${a.place_id}|${b.place_id}|${c.mode}|${bucket}`
        if (!legRoutes.has(key)) {
          try {
            const departure = departureInstant(day.date, draft[i]!.depart, a.utc_offset_minutes)
            legRoutes.set(key, await fetchLegRoute(a, b, c.mode, departure))
          } catch (e) {
            error.value = `Could not load a route: ${message(e)}`
            return null
          }
        }
        return legRoutes.get(key) ?? null
      }),
    )
    if (id !== run) return

    routes.forEach((r, i) => {
      if (r) travel[i]![i + 1] = r.minutes
    })
    visits.value = schedule(order, solverStops(), travel, start)
    legs.value = chosen.map((c, i) => {
      const r = routes[i]
      return {
        mode: c.mode,
        minutes: r?.minutes ?? c.minutes,
        km: (r?.meters ?? c.meters) / 1000,
        summary: r?.summary ?? (c.mode === 'walk' ? 'Walk' : 'Transit'),
        path: r?.path,
      }
    })
    loading.value = false
  }

  /** Reorders the day's stops for the least travel that still meets every fixed arrival time. */
  async function optimise() {
    const day = trip.day
    if (!day || trip.stops.length < 2) return
    notice.value = ''
    error.value = ''
    loading.value = true
    try {
      await ensureMatrix(day.date, timeToMinutes(day.start_time), uniquePlaces())
    } catch (e) {
      error.value = `Could not load travel times: ${message(e)}`
      loading.value = false
      return
    }
    const solution = solve(solverStops(), travelMatrix(day.date), timeToMinutes(day.start_time))
    if (!solution.exact) notice.value = 'This day is too long for an exact answer, so the order is a good estimate.'
    const ids = solution.order.map((i) => trip.stops[i]!.id)
    const unchanged = ids.every((stopId, i) => stopId === trip.stops[i]!.id)
    if (unchanged) {
      if (solution.exact) notice.value = 'Already in the best order.'
      loading.value = false
      return
    }
    // The watcher below recomputes times once the new order is in place.
    await trip.reorder(ids)
  }

  const itinerary = computed<ItineraryDay>(() => ({
    date: trip.day?.date ?? '',
    stops: trip.stops.map((s, i) => {
      // Visits lag behind the stops while a recompute is in flight; only use matching ones.
      const visit = visits.value[i]?.id === s.id ? visits.value[i] : undefined
      return {
        id: s.id,
        name: s.place.name,
        category: categoryFromTypes(s.place.types),
        lat: s.place.lat,
        lng: s.place.lng,
        durationMinutes: s.duration_minutes,
        fixedArrival: s.fixed_arrival,
        arrive: visit && minutesToTime(visit.late > 0 ? visit.arrive : visit.begin),
        depart: visit && minutesToTime(visit.depart),
        // Waiting before the first stop just means the day starts later.
        waitMinutes: visit && i > 0 ? visit.begin - visit.arrive : 0,
        lateMinutes: visit?.late ?? 0,
      }
    }),
    legs: visits.value.length === trip.stops.length ? legs.value : [],
  }))

  watch(
    () =>
      [
        trip.day?.id,
        trip.day?.start_time,
        ...trip.stops.map((s) => `${s.id}:${s.place_id}:${s.duration_minutes}:${s.fixed_arrival}`),
      ].join('|'),
    () => {
      notice.value = ''
      recompute()
    },
    { immediate: true },
  )

  return { itinerary, loading, error, notice, optimise }
})
