import { describe, expect, it } from 'vitest'
import { weekdayOf, windowsFor, type OpeningPeriod } from '../hours'

const period = (day: number, open: [number, number], close: [number, number], closeDay = day): OpeningPeriod => ({
  open: { day, hour: open[0], minute: open[1] },
  close: { day: closeDay, hour: close[0], minute: close[1] },
})

describe('weekdayOf', () => {
  it('reads the weekday of a date regardless of the browser timezone', () => {
    expect(weekdayOf('2026-11-07')).toBe(6)
    expect(weekdayOf('2026-11-08')).toBe(0)
  })
})

describe('windowsFor', () => {
  it('has no restriction when hours are unknown or not listed', () => {
    expect(windowsFor(null, 1)).toBeUndefined()
    expect(windowsFor([], 1)).toBeUndefined()
  })

  it('has no restriction for a place that never closes', () => {
    expect(windowsFor([{ open: { day: 0, hour: 0, minute: 0 }, close: null }], 3)).toBeUndefined()
  })

  it('returns the windows of the weekday, in order', () => {
    const lunchAndDinner = [period(2, [19, 0], [23, 0]), period(2, [12, 0], [15, 30]), period(3, [12, 0], [15, 0])]
    expect(windowsFor(lunchAndDinner, 2)).toEqual([
      [720, 930],
      [1140, 1380],
    ])
  })

  it('is closed all day when no period covers the weekday', () => {
    expect(windowsFor([period(2, [9, 0], [17, 0])], 1)).toEqual([])
  })

  it('carries a late-night period across midnight in both directions', () => {
    const bar = [period(5, [18, 0], [2, 0], 6)]
    expect(windowsFor(bar, 5)).toEqual([[1080, 1560]])
    expect(windowsFor(bar, 6)).toEqual([[-360, 120]])
  })

  it('wraps from Saturday into Sunday', () => {
    expect(windowsFor([period(6, [22, 0], [1, 0], 0)], 0)).toEqual([[-120, 60]])
  })
})
