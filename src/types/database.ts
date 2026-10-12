export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      days: {
        Row: {
          date: string
          end_place_id: string | null
          id: string
          start_place_id: string | null
          start_time: string
          start_travel_mode: string | null
          trip_id: string
        }
        Insert: {
          date: string
          end_place_id?: string | null
          id?: string
          start_place_id?: string | null
          start_time?: string
          start_travel_mode?: string | null
          trip_id: string
        }
        Update: {
          date?: string
          end_place_id?: string | null
          id?: string
          start_place_id?: string | null
          start_time?: string
          start_travel_mode?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "days_end_place_id_fkey"
            columns: ["end_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
          {
            foreignKeyName: "days_start_place_id_fkey"
            columns: ["start_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
          {
            foreignKeyName: "days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          created_at: string
          guide: string | null
          lat: number
          lng: number
          name: string
          place_id: string
          suggested_minutes: number | null
          types: string[]
          utc_offset_minutes: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          guide?: string | null
          lat: number
          lng: number
          name: string
          place_id: string
          suggested_minutes?: number | null
          types?: string[]
          utc_offset_minutes?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          guide?: string | null
          lat?: number
          lng?: number
          name?: string
          place_id?: string
          suggested_minutes?: number | null
          types?: string[]
          utc_offset_minutes?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean
        }
        Insert: {
          approved?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean
        }
        Update: {
          approved?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      stops: {
        Row: {
          created_at: string
          day_id: string
          duration_minutes: number
          fixed_arrival: string | null
          id: string
          notes: string | null
          place_id: string
          position: number
          travel_mode: string | null
        }
        Insert: {
          created_at?: string
          day_id: string
          duration_minutes?: number
          fixed_arrival?: string | null
          id?: string
          notes?: string | null
          place_id: string
          position: number
          travel_mode?: string | null
        }
        Update: {
          created_at?: string
          day_id?: string
          duration_minutes?: number
          fixed_arrival?: string | null
          id?: string
          notes?: string | null
          place_id?: string
          position?: number
          travel_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stops_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stops_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_day: {
        Args: { p_date: string; p_day: string; p_swap?: boolean }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
