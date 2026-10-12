<script setup lang="ts">
import CenteredCard from '@/components/CenteredCard.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <CenteredCard>
    <h1>Footnotes</h1>
    <p>Plan each day of a trip: the best order for your stops, with the story behind each place.</p>
    <button class="primary" @click="auth.signIn()">Continue with Google</button>
    <p v-if="auth.error" class="error">{{ auth.error }}</p>
  </CenteredCard>
</template>
