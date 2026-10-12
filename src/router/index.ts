import { createRouter, createWebHashHistory } from 'vue-router'
import PlannerView from '../views/PlannerView.vue'

// Hash history: GitHub Pages has no server-side fallback for deep links.
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'planner',
      component: PlannerView,
    },
  ],
})

export default router
