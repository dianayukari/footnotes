// Row aliases over the generated types. Regenerate database.ts after a migration with
// `supabase gen types typescript --linked > src/types/database.ts`.
import type { Database, Tables } from './database'

export type { Database }

export type Profile = Tables<'profiles'>
export type Place = Tables<'places'>
export type Trip = Tables<'trips'>
export type Day = Tables<'days'>
export type Stop = Tables<'stops'>
