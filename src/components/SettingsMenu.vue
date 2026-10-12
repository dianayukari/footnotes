<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Settings, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const open = ref(false)

async function signOut() {
  await auth.signOut()
  router.replace({ name: 'sign-in' })
}
</script>

<template>
  <div class="settings">
    <button class="control" aria-label="Settings" :aria-expanded="open" @click="open = !open">
      <Settings :size="22" />
    </button>
    <div v-if="open" class="backdrop" @click="open = false" />
    <div v-if="open" class="menu" role="menu">
      <div class="account">{{ auth.session?.user.email }}</div>
      <RouterLink v-if="auth.isAdmin" :to="{ name: 'admin' }" class="item" role="menuitem">
        <Users :size="18" /> Approve users
      </RouterLink>
      <button class="item" role="menuitem" @click="signOut"><LogOut :size="18" /> Sign out</button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  position: relative;
}

.backdrop {
  position: fixed;
  inset: 0;
}

.menu {
  position: absolute;
  top: 0;
  left: 56px;
  min-width: 220px;
  padding: 6px;
  border-radius: 18px;
  background: #fafaf7;
  box-shadow: var(--shadow);
}

.account {
  padding: 8px 12px 10px;
  font-size: 13px;
  color: var(--text-muted);
}

.item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 15px;
  text-align: left;
  text-decoration: none;
  color: inherit;
}

.item:hover {
  background: var(--control);
}
</style>
