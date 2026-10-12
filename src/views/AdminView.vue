<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Profile } from '@/types/db'

const auth = useAuthStore()
const profiles = ref<Profile[]>([])
const error = ref('')
const loading = ref(true)

const pending = computed(() => profiles.value.filter((p) => !p.approved))
const approved = computed(() => profiles.value.filter((p) => p.approved))

async function load() {
  const { data, error: e } = await supabase.from('profiles').select('*').order('created_at')
  error.value = e?.message ?? ''
  profiles.value = data ?? []
  loading.value = false
}

async function setApproved(profile: Profile, value: boolean) {
  const { error: e } = await supabase.from('profiles').update({ approved: value }).eq('id', profile.id)
  error.value = e?.message ?? ''
  await load()
}

onMounted(load)
</script>

<template>
  <main class="admin">
    <header>
      <RouterLink :to="{ name: 'planner' }" class="back" aria-label="Back to planner">
        <ChevronLeft :size="22" />
      </RouterLink>
      <h1>Users</h1>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="empty">Loading…</p>

    <template v-else>
      <h2>Pending</h2>
      <p v-if="pending.length === 0" class="empty">Nobody is waiting.</p>
      <ul>
        <li v-for="p in pending" :key="p.id">
          <div class="who">
            <strong>{{ p.display_name || p.email }}</strong>
            <span>{{ p.email }}</span>
          </div>
          <button class="approve" @click="setApproved(p, true)">Approve</button>
        </li>
      </ul>

      <h2>Approved</h2>
      <ul>
        <li v-for="p in approved" :key="p.id">
          <div class="who">
            <strong>{{ p.display_name || p.email }}<template v-if="p.is_admin"> · admin</template></strong>
            <span>{{ p.email }}</span>
          </div>
          <!-- Revoking yourself would lock you out of this screen. -->
          <button v-if="p.id !== auth.profile?.id" class="revoke" @click="setApproved(p, false)">Revoke</button>
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.admin {
  max-width: 560px;
  height: 100%;
  margin: 0 auto;
  padding: 20px 20px 40px;
  overflow-y: auto;
}

header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.back {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: inherit;
  background: var(--control);
}

h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
}

h2 {
  margin: 28px 0 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fafaf7;
}

.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.who span {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  color: var(--text-muted);
}

.approve,
.revoke {
  flex: none;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.approve {
  color: #fff;
  background: var(--accent);
}

.revoke {
  color: var(--danger);
  background: var(--control);
}

.empty {
  color: var(--text-muted);
}

.error {
  color: var(--danger);
}
</style>
