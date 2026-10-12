import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

export const supabaseConfigured = Boolean(url && key)

// PKCE returns the auth code in the query string, leaving the URL hash to the router.
export const supabase = createClient<Database>(url || 'http://localhost', key || 'missing', {
  auth: { flowType: 'pkce' },
})
