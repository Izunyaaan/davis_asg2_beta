import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'Normal Map. Updates every 30 seconds',
    component: HomeView
  },
  {
    path: '/speed',
    name: 'Speed Tracking. Updates every 30 seconds.',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/SpeedTrackingView.vue')
  },
  {
    path: '/heatmap',
    name: 'Heatmap of the last 5 minutes',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/HeatMap.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
