import type { ItineraryDay } from '@/types/itinerary'

// Stand-in data for the UI shell. Replaced by database-backed trips in a later step.
export const placeholderDay: ItineraryDay = {
  date: '2026-11-07',
  stops: [
    { id: 's1', name: 'Hotel Monti', category: 'hotel', lat: 41.8947, lng: 12.4925, arrive: '', depart: '9:00 AM', durationMinutes: 0, fixed: false },
    { id: 's2', name: 'Colosseum', category: 'landmark', lat: 41.8902, lng: 12.4922, arrive: '9:10 AM', depart: '10:40 AM', durationMinutes: 90, fixed: true },
    { id: 's3', name: 'Roman Forum', category: 'landmark', lat: 41.8925, lng: 12.4853, arrive: '10:50 AM', depart: '12:00 PM', durationMinutes: 70, fixed: false },
    { id: 's4', name: 'Pantheon', category: 'church', lat: 41.8986, lng: 12.4769, arrive: '12:20 PM', depart: '1:00 PM', durationMinutes: 40, fixed: false },
    { id: 's5', name: 'Armando al Pantheon', category: 'food', lat: 41.8991, lng: 12.4764, arrive: '1:00 PM', depart: '2:15 PM', durationMinutes: 75, fixed: true },
    { id: 's6', name: 'Vatican Museums', category: 'museum', lat: 41.9065, lng: 12.4536, arrive: '2:45 PM', depart: '5:15 PM', durationMinutes: 150, fixed: false },
  ],
  legs: [
    { mode: 'walk', minutes: 10, km: 0.7, summary: 'Walk' },
    { mode: 'walk', minutes: 10, km: 0.8, summary: 'Walk' },
    { mode: 'walk', minutes: 20, km: 1.4, summary: 'Walk' },
    { mode: 'walk', minutes: 1, km: 0.1, summary: 'Walk' },
    { mode: 'transit', minutes: 30, km: 3.1, summary: 'Bus 492' },
  ],
}
