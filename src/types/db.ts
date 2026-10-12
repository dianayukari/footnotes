// Row aliases over the generated types. Regenerate database.ts after a migration with
// `supabase gen types typescript --linked > src/types/database.ts`.
import type { Database, Tables } from './database'
import type { OpeningPeriod } from '@/lib/hours'

export type { Database }

export type Profile = Tables<'profiles'>
// opening_hours is stored as JSON; give it its real shape (null until fetched from Google).
export type Place = Omit<Tables<'places'>, 'opening_hours'> & { opening_hours: OpeningPeriod[] | null }
export type Trip = Tables<'trips'>
export type Day = Tables<'days'>
export type Stop = Tables<'stops'>
