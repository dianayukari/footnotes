// Orders a day's stops to minimise total travel time while respecting fixed arrival times.
// All times are minutes; clock times are minutes from midnight.

export interface SolverStop {
  id: string
  duration: number
  /** Must arrive at or before this time; the visit then starts exactly at it. */
  fixedArrival?: number
}

/** travel[i][j] is the travel time from stop i to stop j. */
export type TravelMatrix = number[][]

/** Optional fixed places the day starts from and ends at, as travel times to and from each stop. */
export interface Ends {
  fromStart?: number[]
  toEnd?: number[]
}

export interface Visit {
  id: string
  arrive: number
  /** When the visit starts: the arrival, or the fixed time if that is later. */
  begin: number
  depart: number
  /** Minutes past the fixed arrival time; 0 when on time or not fixed. */
  late: number
}

export interface Solution {
  /** Indices into the stops array, in visit order. */
  order: number[]
  /** False when the day was too long for the exact search and a heuristic was used. */
  exact: boolean
  /** Ids of fixed stops whose time cannot be met in the returned order. */
  unmet: string[]
}

/** Largest day the exact search handles; its cost grows with 2^n. */
export const EXACT_LIMIT = 12

export function schedule(
  order: number[],
  stops: SolverStop[],
  travel: TravelMatrix,
  start: number,
  ends: Ends = {},
): Visit[] {
  const visits: Visit[] = []
  let clock = start
  order.forEach((index, n) => {
    const stop = stops[index]!
    const arrive = clock + (n === 0 ? (ends.fromStart?.[index] ?? 0) : travel[order[n - 1]!]![index]!)
    const fixed = stop.fixedArrival
    const begin = fixed !== undefined && fixed > arrive ? fixed : arrive
    const late = fixed !== undefined && arrive > fixed ? arrive - fixed : 0
    clock = begin + stop.duration
    visits.push({ id: stop.id, arrive, begin, depart: clock, late })
  })
  return visits
}

export function totalTravel(order: number[], travel: TravelMatrix, ends: Ends = {}): number {
  if (order.length === 0) return 0
  let sum = (ends.fromStart?.[order[0]!] ?? 0) + (ends.toEnd?.[order[order.length - 1]!] ?? 0)
  for (let n = 1; n < order.length; n++) sum += travel[order[n - 1]!]![order[n]!]!
  return sum
}

interface Label {
  depart: number
  cost: number
  prevLast: number
  prev: Label | null
}

/**
 * Exact search over (visited set, last stop). Each state keeps every label that is not beaten on
 * both departure time and travel cost, because an earlier departure can rescue a later fixed time
 * even when it costs more travel. Returns null when no order meets every fixed time.
 */
function solveExact(stops: SolverStop[], travel: TravelMatrix, start: number, ends: Ends): number[] | null {
  const n = stops.length
  const full = (1 << n) - 1
  const labels: Label[][] = Array.from({ length: (full + 1) * n }, () => [])

  function visit(index: number, arrive: number): number | null {
    const fixed = stops[index]!.fixedArrival
    if (fixed !== undefined && arrive > fixed) return null
    return Math.max(arrive, fixed ?? arrive) + stops[index]!.duration
  }

  function add(mask: number, last: number, label: Label) {
    const list = labels[mask * n + last]!
    if (list.some((l) => l.depart <= label.depart && l.cost <= label.cost)) return
    labels[mask * n + last] = list.filter((l) => !(label.depart <= l.depart && label.cost <= l.cost))
    labels[mask * n + last]!.push(label)
  }

  for (let j = 0; j < n; j++) {
    const hop = ends.fromStart?.[j] ?? 0
    const depart = visit(j, start + hop)
    if (depart !== null) add(1 << j, j, { depart, cost: hop, prevLast: -1, prev: null })
  }

  // Extending a set only ever produces a larger mask, so ascending order sees each state complete.
  for (let mask = 1; mask <= full; mask++) {
    for (let last = 0; last < n; last++) {
      if (!(mask & (1 << last))) continue
      for (const label of labels[mask * n + last]!) {
        for (let j = 0; j < n; j++) {
          if (mask & (1 << j)) continue
          const hop = travel[last]![j]!
          const depart = visit(j, label.depart + hop)
          if (depart !== null) add(mask | (1 << j), j, { depart, cost: label.cost + hop, prevLast: last, prev: label })
        }
      }
    }
  }

  let best: Label | null = null
  let bestLast = -1
  let bestCost = Infinity
  for (let last = 0; last < n; last++) {
    for (const label of labels[full * n + last]!) {
      const cost = label.cost + (ends.toEnd?.[last] ?? 0)
      if (cost < bestCost || (cost === bestCost && label.depart < best!.depart)) {
        best = label
        bestLast = last
        bestCost = cost
      }
    }
  }
  if (!best) return null

  const order: number[] = []
  for (let label: Label | null = best, last = bestLast; label; last = label.prevLast, label = label.prev) {
    order.unshift(last)
  }
  return order
}

/**
 * Cheapest-insertion heuristic for days too long for the exact search: fixed stops go first in
 * time order, then each remaining stop takes the position that adds the least travel without
 * making any fixed stop late. Returns null when some stop has no such position.
 */
function solveHeuristic(stops: SolverStop[], travel: TravelMatrix, start: number, ends: Ends): number[] | null {
  const indices = stops.map((_, i) => i)
  const order = indices
    .filter((i) => stops[i]!.fixedArrival !== undefined)
    .sort((a, b) => stops[a]!.fixedArrival! - stops[b]!.fixedArrival!)
  const onTime = (candidate: number[]) => schedule(candidate, stops, travel, start, ends).every((v) => v.late === 0)
  const cost = (candidate: number[]) => totalTravel(candidate, travel, ends)
  if (!onTime(order)) return null

  for (const i of indices.filter((i) => stops[i]!.fixedArrival === undefined)) {
    let best: number[] | null = null
    for (let at = 0; at <= order.length; at++) {
      const candidate = [...order.slice(0, at), i, ...order.slice(at)]
      if (onTime(candidate) && (!best || cost(candidate) < cost(best))) best = candidate
    }
    if (!best) return null
    order.splice(0, order.length, ...best)
  }
  return order
}

export function optimise(stops: SolverStop[], travel: TravelMatrix, start: number, ends: Ends = {}): Solution {
  if (stops.length === 0) return { order: [], exact: true, unmet: [] }
  const exact = stops.length <= EXACT_LIMIT
  const solve = (candidates: SolverStop[]) => (exact ? solveExact : solveHeuristic)(candidates, travel, start, ends)
  const cost = (candidate: number[]) => totalTravel(candidate, travel, ends)

  const order = solve(stops)
  if (order) return { order, exact, unmet: [] }

  // Not every fixed time can be met. Prefer an order that breaks only one of them.
  const relaxed = (drop: (s: SolverStop) => boolean) =>
    stops.map((s) => (drop(s) ? { ...s, fixedArrival: undefined } : s))
  const lateIds = (o: number[]) => schedule(o, stops, travel, start, ends).filter((v) => v.late > 0).map((v) => v.id)

  let best: number[] | null = null
  for (const stop of stops) {
    if (stop.fixedArrival === undefined) continue
    const candidate = solve(relaxed((s) => s.id === stop.id))
    if (candidate && (!best || cost(candidate) < cost(best))) best = candidate
  }
  best ??= solve(relaxed(() => true)) ?? stops.map((_, i) => i)
  return { order: best, exact, unmet: lateIds(best) }
}
