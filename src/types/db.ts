// Mirrors supabase/migrations. Keep in sync by hand, or regenerate with
// `supabase gen types typescript` once the CLI is linked to the project.

type Table<Row, Insert = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Partial<Row>
  Relationships: []
}

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  approved: boolean
  is_admin: boolean
  created_at: string
}

export interface Place {
  place_id: string
  name: string
  lat: number
  lng: number
  address: string | null
  types: string[]
  guide: string | null
  suggested_minutes: number | null
  created_at: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Day {
  id: string
  trip_id: string
  date: string
  start_time: string
  start_place_id: string | null
  end_place_id: string | null
}

export interface Stop {
  id: string
  day_id: string
  place_id: string
  position: number
  duration_minutes: number
  fixed_arrival: string | null
  notes: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>
      places: Table<Place, Pick<Place, 'place_id' | 'name' | 'lat' | 'lng'> & Partial<Place>>
      trips: Table<Trip, Pick<Trip, 'name'> & Partial<Trip>>
      days: Table<Day, Pick<Day, 'trip_id' | 'date'> & Partial<Day>>
      stops: Table<Stop, Pick<Stop, 'day_id' | 'place_id' | 'position'> & Partial<Stop>>
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
