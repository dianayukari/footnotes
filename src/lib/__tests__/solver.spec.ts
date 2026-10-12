import { describe, expect, it } from 'vitest'
import { EXACT_LIMIT, optimise, schedule, totalTravel, type SolverStop, type TravelMatrix } from '../solver'

/** Stops on a line; travel time is the distance between positions. */
function line(positions: number[]): TravelMatrix {
  return positions.map((a) => positions.map((b) => Math.abs(a - b)))
}

function stopsFor(count: number, fixed: Record<number, number> = {}, duration = 30): SolverStop[] {
  return Array.from({ length: count }, (_, i) => ({ id: `s${i}`, duration, fixedArrival: fixed[i] }))
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((p) => [x, ...p]))
}

describe('schedule', () => {
  it('adds travel and visit time, and waits for a fixed arrival', () => {
    const stops = stopsFor(3, { 2: 700 })
    const visits = schedule([0, 1, 2], stops, line([0, 10, 25]), 540)
    expect(visits.map((v) => [v.arrive, v.begin, v.depart])).toEqual([
      [540, 540, 570],
      [580, 580, 610],
      [625, 700, 730],
    ])
    expect(visits.every((v) => v.late === 0)).toBe(true)
  })

  it('reports how late a fixed stop is reached', () => {
    const visits = schedule([0, 1], stopsFor(2, { 1: 560 }), line([0, 10]), 540)
    expect(visits[1]).toMatchObject({ arrive: 580, begin: 580, late: 20 })
  })
})

describe('optimise', () => {
  it('visits stops on a line in sequence', () => {
    const travel = line([30, 0, 20, 10])
    const { order, exact, unmet } = optimise(stopsFor(4), travel, 540)
    expect(totalTravel(order, travel)).toBe(30)
    expect(exact).toBe(true)
    expect(unmet).toEqual([])
  })

  it('accepts extra travel to meet a fixed arrival', () => {
    // Shortest path is 0 -> 1 -> 2, but stop 2 must be reached before stop 1 fits in.
    const travel = line([0, 10, 20])
    const stops = stopsFor(3, { 2: 575 })
    const { order, unmet } = optimise(stops, travel, 540)
    expect(unmet).toEqual([])
    expect(schedule(order, stops, travel, 540).every((v) => v.late === 0)).toBe(true)
    expect(order.indexOf(2)).toBeLessThan(order.indexOf(1))
  })

  it('matches brute force on random days with fixed times', () => {
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let round = 0; round < 40; round++) {
      const n = 6
      const travel = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0 : 5 + Math.floor(random() * 40))),
      )
      const fixed: Record<number, number> = {}
      if (random() < 0.8) fixed[Math.floor(random() * n)] = 540 + Math.floor(random() * 400)
      if (random() < 0.4) fixed[Math.floor(random() * n)] = 540 + Math.floor(random() * 400)
      const stops = stopsFor(n, fixed)

      const feasible = permutations([0, 1, 2, 3, 4, 5]).filter((p) =>
        schedule(p, stops, travel, 540).every((v) => v.late === 0),
      )
      const result = optimise(stops, travel, 540)
      // null stands for "no order meets every fixed time".
      const expected = feasible.length ? Math.min(...feasible.map((p) => totalTravel(p, travel))) : null
      const actual = result.unmet.length ? null : totalTravel(result.order, travel)
      expect(actual).toBe(expected)
    }
  })

  it('names the fixed stop that cannot be met', () => {
    const stops = stopsFor(3, { 1: 500 })
    const { order, unmet } = optimise(stops, line([0, 10, 20]), 540)
    expect(unmet).toEqual(['s1'])
    expect([...order].sort()).toEqual([0, 1, 2])
  })

  it('names one stop when two fixed times conflict with each other', () => {
    const stops = stopsFor(2, { 0: 600, 1: 605 })
    const { unmet } = optimise(stops, line([0, 60]), 540)
    expect(unmet).toHaveLength(1)
  })

  it('falls back to a heuristic for long days and still meets fixed times', () => {
    const n = EXACT_LIMIT + 3
    const positions = Array.from({ length: n }, (_, i) => (i * 37) % 101)
    const travel = line(positions)
    const stops = stopsFor(n, { 4: 900 }, 20)
    const { order, exact, unmet } = optimise(stops, travel, 540)
    expect(exact).toBe(false)
    expect(unmet).toEqual([])
    expect([...order].sort((a, b) => a - b)).toEqual(positions.map((_, i) => i))
  })

  it('handles an empty day', () => {
    expect(optimise([], [], 540)).toEqual({ order: [], exact: true, unmet: [] })
  })
})
