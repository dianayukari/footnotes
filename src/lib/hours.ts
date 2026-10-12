// Opening hours as stored on a place: Google's weekly periods, with day 0 being Sunday.
import { formatTime, minutesToTime } from './format'

export interface HoursPoint {
  day: number
  hour: number
  minute: number
}

export interface OpeningPeriod {
  open: HoursPoint
  /** Null for a place that never closes. */
  close: HoursPoint | null
}

/** A stretch of a day when a place is open, in minutes from that day's midnight. */
export type Window = [open: number, close: number]

const DAY = 1440

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay()
}

/**
 * When a place is open on a weekday. Undefined means there is no restriction (hours unknown, none
 * listed, or open around the clock); an empty list means it is closed that whole day.
 * Windows can start before 0 or end after 1440 when a period spans midnight.
 */
export function windowsFor(periods: OpeningPeriod[] | null | undefined, weekday: number): Window[] | undefined {
  if (!periods || periods.length === 0) return undefined
  if (periods.some((p) => !p.close)) return undefined

  const windows: Window[] = []
  for (const { open, close } of periods) {
    const start = open.hour * 60 + open.minute
    // How long the period lasts, allowing it to close on a later weekday than it opened.
    const length = ((close!.day - open.day + 7) % 7) * DAY + close!.hour * 60 + close!.minute - start
    if (open.day === weekday) windows.push([start, start + length])
    // A period that opened yesterday may still be running after midnight.
    else if (open.day === (weekday + 6) % 7 && start + length > DAY) windows.push([start - DAY, start + length - DAY])
  }
  return windows.sort((a, b) => a[0] - b[0])
}

/** "Open 9:00 AM – 5:00 PM", "Closed this day", or undefined when there is no restriction. */
export function describeWindows(windows: Window[] | undefined): string | undefined {
  if (!windows) return undefined
  if (windows.length === 0) return 'Closed this day'
  const clock = (minutes: number) => formatTime(minutesToTime(Math.min(Math.max(minutes, 0), DAY)))
  return `Open ${windows.map(([open, close]) => `${clock(open)} – ${clock(close)}`).join(', ')}`
}
