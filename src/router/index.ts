import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PlannerView from '../views/PlannerView.vue'

// Hash history: GitHub Pages has no server-side fallback for deep links.
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'planner', component: PlannerView },
    { path: '/sign-in', name: 'sign-in', component: () => import('../views/SignInView.vue') },
    { path: '/pending', name: 'pending', component: () => import('../views/PendingView.vue') },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue') },
  ],
})

// These guards only route people to the right screen. The database enforces access.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (!auth.isSignedIn) return to.name === 'sign-in' ? true : { name: 'sign-in' }
  if (!auth.isApproved) return to.name === 'pending' ? true : { name: 'pending' }
  if (to.name === 'sign-in' || to.name === 'pending') return { name: 'planner' }
  if (to.name === 'admin' && !auth.isAdmin) return { name: 'planner' }
  return true
})

export default router
