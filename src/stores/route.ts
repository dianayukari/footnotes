import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { minutesToTime, timeToMinutes } from '@/lib/format'
import { categoryFromTypes } from '@/lib/places'
import { departureInstant, estimateWalk, fetchLegRoute, fetchMatrix, type LegRoute, type Travel } from '@/lib/routing'
import { optimise as solve, schedule, type Ends, type SolverStop, type Visit } from '@/lib/solver'
import { useTripStore } from './trip'
import type { Place } from '@/types/db'
import type { ItineraryDay, ItineraryEndpoint, ItineraryLeg, TravelMode } from '@/types/itinerary'

/** Unless the traveller picks a mode, legs up to this many minutes on foot are walked. */
export const WALK_THRESHOLD_MINUTES = 15

const MODES: TravelMode[] = ['walk', 'transit']

interface Choice extends Travel {
  mode: TravelMode
}

/** One piece of the day's path: start point to first stop, stop to stop, or last stop to end point. */
interface Segment {
  from: Place
  to: Place
  /** The mode the traveller picked for this segment, if any. */
  picked: TravelMode | null
  /** When the traveller sets off, in minutes from midnight. */
  depart: number
}

function message(e: unknown) {
  // Google appends a long machine-readable "Details:" tail to its errors.
  return (e instanceof Error ? e.message : String(e)).split(' Details:')[0]!
}

function endpoint(place: Place, minutes?: number): ItineraryEndpoint {
  return {
    name: place.name,
    category: categoryFromTypes(place.types),
    lat: place.lat,
    lng: place.lng,
    time: minutes === undefined ? undefined : minutesToTime(minutes),
  }
}

export const useRouteStore = defineStore('route', () => {
  const trip = useTripStore()

  // Travel times between places, kept per date because transit depends on the weekday.
  // A null value means Google found no route for that pair.
  const pairs = new Map<string, Travel | null>()
  const covered = new Map<string, Set<string>>()
  const legRoutes = new Map<string, LegRoute | null>()

  const visits = ref<Visit[]>([])
  // Aligned with the segments of the current order: [start leg?, ...between stops, end leg?].
  const segmentLegs = ref<ItineraryLeg[]>([])
  const endArrival = ref<number>()
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')

  // Bumped on every recompute so results of a superseded run are dropped.
  let run = 0

  const pairKey = (date: string, mode: TravelMode, a: string, b: string) => `${date}|${mode}|${a}|${b}`

  /** Fetches one mode's travel times for place pairs that are not cached yet. */
  async function ensureModeMatrix(date: string, start: number, places: Place[], mode: TravelMode) {
    const coverKey = `${date}|${mode}`
    const known = covered.get(coverKey) ?? new Set<string>()
    covered.set(coverKey, known)
    const fresh = places.filter((p) => !known.has(p.place_id))
    if (fresh.length === 0) return
    const old = places.filter((p) => known.has(p.place_id))
    const departure = departureInstant(date, start, places[0]!.utc_offset_minutes)

    // New places to everything, plus already-known places to the new ones.
    const blocks: [Place[], Place[]][] = [[fresh, places]]
    if (old.length > 0) blocks.push([old, fresh])

    await Promise.all(
      blocks.map(async ([from, to]) => {
        const matrix = await fetchMatrix(from, to, mode, departure)
        from.forEach((a, i) =>
          to.forEach((b, j) => pairs.set(pairKey(date, mode, a.place_id, b.place_id), matrix[i]![j] ?? null)),
        )
      }),
    )
    for (const p of fresh) known.add(p.place_id)
  }

  /** Every place the day touches: its stops plus the start and end points. */
  function dayPlaces() {
    const all = [trip.day?.start_place, ...trip.stops.map((s) => s.place), trip.day?.end_place].filter((p) => !!p)
    return [...new Map(all.map((p) => [p.place_id, p])).values()]
  }

  async function ensureMatrix(date: string, start: number) {
    const places = dayPlaces()
    if (places.length < 2) return
    await Promise.all(MODES.map((mode) => ensureModeMatrix(date, start, places, mode)))
  }

  /** How to get from one place to another: the picked mode, or the better one. */
  function choose(date: string, a: Place, b: Place, picked: TravelMode | null): Choice {
    if (a.place_id === b.place_id) return { mode: 'walk', minutes: 0, meters: 0 }
    const walk = pairs.get(pairKey(date, 'walk', a.place_id, b.place_id)) ?? estimateWalk(a, b)
    const transit = pairs.get(pairKey(date, 'transit', a.place_id, b.place_id))
    // Google answers a transit request with a walking route when no line helps, so a missing
    // result means there is genuinely no route and walking is the fallback.
    if (picked === 'walk' || !transit) return { mode: 'walk', ...walk }
    if (picked === 'transit') return { mode: 'transit', ...transit }
    if (walk.minutes <= WALK_THRESHOLD_MINUTES || walk.minutes <= transit.minutes) return { mode: 'walk', ...walk }
    return { mode: 'transit', ...transit }
  }

  function solverStops(): SolverStop[] {
    return trip.stops.map((s) => ({
      id: s.id,
      duration: s.duration_minutes,
      fixedArrival: s.fixed_arrival ? timeToMinutes(s.fixed_arrival) : undefined,
    }))
  }

  /** Travel times between every pair of stops, and to and from the day's start and end points. */
  function travelTimes(date: string) {
    const day = trip.day
    const stops = trip.stops
    const mode = (m: string | null) => m as TravelMode | null
    const travel = stops.map((a) => stops.map((b) => choose(date, a.place, b.place, mode(a.travel_mode)).minutes))
    const ends: Ends = {
      fromStart: day?.start_place
        ? stops.map((s) => choose(date, day.start_place!, s.place, mode(day.start_travel_mode)).minutes)
        : undefined,
      toEnd: day?.end_place
        ? stops.map((s) => choose(date, s.place, day.end_place!, mode(s.travel_mode)).minutes)
        : undefined,
    }
    return { travel, ends }
  }

  /** The path pieces of the current order, with departure times taken from a schedule. */
  function segments(start: number, scheduled: Visit[]): Segment[] {
    const day = trip.day
    const stops = trip.stops
    const mode = (m: string | null) => m as TravelMode | null
    const list: Segment[] = []
    if (day?.start_place) {
      list.push({ from: day.start_place, to: stops[0]!.place, picked: mode(day.start_travel_mode), depart: start })
    }
    stops.slice(0, -1).forEach((s, i) => {
      list.push({ from: s.place, to: stops[i + 1]!.place, picked: mode(s.travel_mode), depart: scheduled[i]!.depart })
    })
    if (day?.end_place) {
      const last = stops.at(-1)!
      list.push({ from: last.place, to: day.end_place, picked: mode(last.travel_mode), depart: scheduled.at(-1)!.depart })
    }
    return list
  }

  async function recompute() {
    const id = ++run
    const day = trip.day
    const stops = trip.stops
    error.value = ''
    if (!day || stops.length === 0) {
      visits.value = []
      segmentLegs.value = []
      endArrival.value = undefined
      loading.value = false
      return
    }
    const start = timeToMinutes(day.start_time)
    const order = stops.map((_, i) => i)
    const hasStart = Boolean(day.start_place)
    const hasEnd = Boolean(day.end_place)

    loading.value = true
    try {
      await ensureMatrix(day.date, start)
    } catch (e) {
      // Fall through: the schedule is still drawn from straight-line walking estimates.
      error.value = `Could not load travel times: ${message(e)}`
    }
    if (id !== run) return

    const { travel, ends } = travelTimes(day.date)
    const draft = schedule(order, solverStops(), travel, start, ends)
    const pieces = segments(start, draft)
    const chosen = pieces.map((p) => choose(day.date, p.from, p.to, p.picked))

    function publish(scheduled: Visit[], routes: (LegRoute | null)[]) {
      visits.value = scheduled
      segmentLegs.value = chosen.map((c, i) => ({
        mode: c.mode,
        minutes: routes[i]?.minutes ?? c.minutes,
        km: (routes[i]?.meters ?? c.meters) / 1000,
        summary: routes[i]?.summary ?? (c.mode === 'walk' ? 'Walk' : 'Transit'),
        path: routes[i]?.path,
      }))
      endArrival.value = hasEnd ? scheduled.at(-1)!.depart + segmentLegs.value.at(-1)!.minutes : undefined
    }
    publish(draft, [])

    // Then the real path of each piece, at the time the draft schedule sets off on it.
    const routes = await Promise.all(
      pieces.map(async (p, i) => {
        const mode = chosen[i]!.mode
        if (p.from.place_id === p.to.place_id) return null
        // Transit depends on the departure time; a 15-minute bucket keeps the cache useful.
        const bucket = mode === 'transit' ? `${day.date}@${Math.round(p.depart / 15)}` : ''
        const key = `${p.from.place_id}|${p.to.place_id}|${mode}|${bucket}`
        if (!legRoutes.has(key)) {
          try {
            const departure = departureInstant(day.date, p.depart, p.from.utc_offset_minutes)
            legRoutes.set(key, await fetchLegRoute(p.from, p.to, mode, departure))
          } catch (e) {
            error.value = `Could not load a route: ${message(e)}`
            return null
          }
        }
        return legRoutes.get(key) ?? null
      }),
    )
    if (id !== run) return

    // Reschedule with the real durations of the pieces actually travelled.
    const offset = hasStart ? 1 : 0
    const real = { fromStart: ends.fromStart && [...ends.fromStart], toEnd: ends.toEnd && [...ends.toEnd] }
    routes.forEach((r, i) => {
      if (!r) return
      if (hasStart && i === 0) real.fromStart![0] = r.minutes
      else if (hasEnd && i === routes.length - 1) real.toEnd![stops.length - 1] = r.minutes
      else travel[i - offset]![i - offset + 1] = r.minutes
    })
    publish(schedule(order, solverStops(), travel, start, real), routes)
    loading.value = false
  }

  /** Reorders the day's stops for the least travel that still meets every fixed arrival time. */
  async function optimise() {
    const day = trip.day
    if (!day || trip.stops.length < 2) return
    notice.value = ''
    error.value = ''
    loading.value = true
    const start = timeToMinutes(day.start_time)
    try {
      await ensureMatrix(day.date, start)
    } catch (e) {
      error.value = `Could not load travel times: ${message(e)}`
      loading.value = false
      return
    }
    const { travel, ends } = travelTimes(day.date)
    const solution = solve(solverStops(), travel, start, ends)
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

  const itinerary = computed<ItineraryDay>(() => {
    const day = trip.day
    const stops = trip.stops
    // Results lag behind the stops while a recompute is in flight; only use them when they match.
    const current = visits.value.length === stops.length && visits.value.every((v, i) => v.id === stops[i]!.id)
    const hasStart = Boolean(day?.start_place) && stops.length > 0
    const hasEnd = Boolean(day?.end_place) && stops.length > 0
    const expected = Math.max(stops.length - 1, 0) + (hasStart ? 1 : 0) + (hasEnd ? 1 : 0)
    const legs = current && segmentLegs.value.length === expected ? segmentLegs.value : []
    const between = legs.slice(hasStart ? 1 : 0, hasEnd ? -1 : undefined)

    return {
      date: day?.date ?? '',
      stops: stops.map((s, i) => {
        const visit = current ? visits.value[i] : undefined
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
          // Without a start point, waiting before the first stop just means the day starts later.
          waitMinutes: visit && (i > 0 || hasStart) ? visit.begin - visit.arrive : 0,
          lateMinutes: visit?.late ?? 0,
        }
      }),
      legs: between,
      start: day?.start_place ? endpoint(day.start_place, timeToMinutes(day.start_time)) : undefined,
      end: day?.end_place ? endpoint(day.end_place, current ? endArrival.value : undefined) : undefined,
      startLeg: hasStart ? legs[0] : undefined,
      endLeg: hasEnd ? legs.at(-1) : undefined,
    }
  })

  watch(
    () =>
      [
        trip.day?.id,
        trip.day?.start_time,
        trip.day?.start_place_id,
        trip.day?.end_place_id,
        trip.day?.start_travel_mode,
        ...trip.stops.map((s) => `${s.id}:${s.place_id}:${s.duration_minutes}:${s.fixed_arrival}:${s.travel_mode}`),
      ].join('|'),
    () => {
      notice.value = ''
      recompute()
    },
    { immediate: true },
  )

  return { itinerary, loading, error, notice, optimise }
})
