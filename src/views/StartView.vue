<script setup lang="ts">
import { useRouter } from 'vue-router'
import { gameStore } from '@/composables/useGameState'

const router = useRouter()

function startNewGame() {
  gameStore.resetGame()
  router.push('/setup')
}

function openStats() {
  router.push('/stats')
}
</script>

<template>
  <div class="start-screen">
    <div class="content">
      <div class="logo">
        <h1>MTG Commander</h1>
        <h2>Life Tracker</h2>
      </div>

      <div class="actions">
        <button 
          class="btn btn-primary"
          @click="startNewGame"
        >
          <span class="btn-icon">🎮</span>
          <span>Neues Spiel</span>
        </button>

        <button 
          class="btn btn-secondary"
          @click="openStats"
        >
          <span class="btn-icon">📊</span>
          <span>Statistiken</span>
        </button>
      </div>
    </div>

    <footer class="footer">
      <span>v1.0.0</span>
    </footer>
  </div>
</template>

<style scoped>
.start-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-primary);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  gap: var(--space-2xl);
}

.logo {
  text-align: center;
}

.logo h1 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.logo h2 {
  font-size: var(--font-size-lg);
  font-weight: 400;
  color: var(--color-commander);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  max-width: 280px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--color-commander);
  color: white;
}

.btn-primary:hover {
  background: #a855f7;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(192, 132, 252, 0.4);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-text-muted);
}

.btn-icon {
  font-size: var(--font-size-xl);
}

.footer {
  padding: var(--space-md);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  border-top: 1px solid var(--color-border);
}
</style>
