import { createRouter, createWebHistory } from 'vue-router'
import StartView from '@/views/StartView.vue'
import SetupView from '@/views/SetupView.vue'
import GameView from '@/views/GameView.vue'
import GameEndView from '@/views/GameEndView.vue'
import StatsView from '@/views/StatsView.vue'

const routes = [
  {
    path: '/',
    name: 'start',
    component: StartView,
  },
  {
    path: '/setup',
    name: 'setup',
    component: SetupView,
  },
  {
    path: '/game',
    name: 'game',
    component: GameView,
  },
  {
    path: '/game/end',
    name: 'game-end',
    component: GameEndView,
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
