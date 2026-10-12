import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/db'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const error = ref('')

  const isSignedIn = computed(() => session.value !== null)
  const isApproved = computed(() => profile.value?.approved === true)
  const isAdmin = computed(() => profile.value?.is_admin === true)

  let ready: Promise<void> | undefined

  async function loadProfile() {
    const userId = session.value?.user.id
    if (!userId) {
      profile.value = null
      return
    }
    const { data, error: e } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    error.value = e?.message ?? ''
    profile.value = data
  }

  /** Resolves once the stored session and its profile are loaded. Safe to call repeatedly. */
  function init() {
    ready ??= (async () => {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      await loadProfile()

      supabase.auth.onAuthStateChange((_event, next) => {
        const userChanged = next?.user.id !== session.value?.user.id
        session.value = next
        // Supabase calls must not run inside this callback, so defer the profile fetch.
        if (userChanged) setTimeout(loadProfile)
      })
    })()
    return ready
  }

  async function signIn() {
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    error.value = e?.message ?? ''
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null
  }

  return { session, profile, error, isSignedIn, isApproved, isAdmin, init, loadProfile, signIn, signOut }
})
