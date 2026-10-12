<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CenteredCard from '@/components/CenteredCard.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const checking = ref(false)

async function checkAgain() {
  checking.value = true
  await auth.loadProfile()
  checking.value = false
  if (auth.isApproved) router.replace({ name: 'planner' })
}

async function signOut() {
  await auth.signOut()
  router.replace({ name: 'sign-in' })
}
</script>

<template>
  <CenteredCard>
    <h1>Waiting for approval</h1>
    <p>
      You are signed in as {{ auth.session?.user.email }}. An admin needs to approve your account
      before you can use Footnotes.
    </p>
    <button class="primary" :disabled="checking" @click="checkAgain">Check again</button>
    <button class="secondary" @click="signOut">Sign out</button>
    <p v-if="auth.error" class="error">{{ auth.error }}</p>
  </CenteredCard>
</template>
