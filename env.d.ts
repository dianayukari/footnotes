/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_KEY?: string
  readonly VITE_GOOGLE_MAPS_KEY?: string
  readonly VITE_GOOGLE_MAP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
