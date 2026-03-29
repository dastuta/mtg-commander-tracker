<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gameStore } from '@/composables/useGameState'
import type { GameState } from '@/types'

const router = useRouter()
const games = ref<GameState[]>([])

onMounted(() => {
  games.value = gameStore.getGameHistory()
})

function goBack() {
  router.push('/')
}

function exportAll() {
  const exportData = games.value.map(game => ({
    schema_version: '1.0',
    game_id: game.id,
    date: game.startTime,
    duration_minutes: game.endTime && game.startTime
      ? Math.floor((new Date(game.endTime).getTime() - new Date(game.startTime).getTime()) / 60000)
      : 0,
    total_turns: game.currentTurnNumber,
    players: game.players.map(p => ({
      seat: p.seat,
      player_id: p.playerId,
      deck_id: null,
      commander: p.commander,
      starting_life: 40,
      final_life: p.life,
      placement: p.placement,
      commander_casts: p.commanderCasts,
    })),
    actions: game.actions.map(a => ({
      seq: a.seq,
      turn: a.turn,
      actor: game.players.find(p => p.id === a.actor)?.playerId || null,
      type: a.type,
      targets: a.targets.map(t => game.players.find(p => p.id === t)?.playerId || ''),
      value: a.value,
    })),
  }))

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mtg_games_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getWinnerName(game: GameState): string {
  const winner = game.players.find(p => p.isWinner)
  return winner?.name || '-'
}

function getPlayerCount(game: GameState): number {
  return game.players.length
}

function exportSingleGame(game: GameState) {
  const exportData = [{
    schema_version: '1.0',
    game_id: game.id,
    date: game.startTime,
    duration_minutes: game.endTime && game.startTime
      ? Math.floor((new Date(game.endTime).getTime() - new Date(game.startTime).getTime()) / 60000)
      : 0,
    total_turns: game.currentTurnNumber,
    players: game.players.map(p => ({
      seat: p.seat,
      player_id: p.playerId,
      deck_id: null,
      commander: p.commander,
      starting_life: 40,
      final_life: p.life,
      placement: p.placement,
      commander_casts: p.commanderCasts,
    })),
    actions: game.actions.map(a => ({
      seq: a.seq,
      turn: a.turn,
      actor: game.players.find(p => p.id === a.actor)?.playerId || null,
      type: a.type,
      targets: a.targets.map(t => game.players.find(p => p.id === t)?.playerId || ''),
      value: a.value,
    })),
  }]

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `game_${game.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="stats-screen">
    <header class="header">
      <button class="btn-back" @click="goBack">←</button>
      <h1>Statistiken</h1>
    </header>

    <main class="content">
      <section class="overview">
        <div class="stat-card">
          <span class="stat-value">{{ games.length }}</span>
          <span class="stat-label">Gespielte Spiele</span>
        </div>
      </section>

      <section class="games-section">
        <h2>Letzte Spiele</h2>
        
        <div v-if="games.length === 0" class="empty-state">
          <p>Noch keine Spiele gespielt</p>
        </div>

        <div v-else class="games-list">
          <div 
            v-for="game in games.slice(0, 20)" 
            :key="game.id"
            class="game-item"
          >
            <div class="game-date">{{ formatDate(game.startTime) }}</div>
            <div class="game-info">
              <span class="winner">{{ getWinnerName(game) }} gewinnt</span>
              <span class="meta">{{ getPlayerCount(game) }} Spieler</span>
            </div>
            <button class="export-btn" @click="exportSingleGame(game)" title="Spiel exportieren">
              📤
            </button>
          </div>
        </div>
      </section>

      <section v-if="games.length > 0" class="export-section">
        <button class="btn btn-secondary" @click="exportAll">
          Alle Spiele exportieren
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.stats-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-primary);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.btn-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  cursor: pointer;
}

.header h1 {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.overview {
  margin-bottom: var(--space-xl);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xl);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-commander);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.games-section h2 {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-md);
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-muted);
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.game-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.export-btn {
  padding: var(--space-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-lg);
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.export-btn:hover {
  opacity: 1;
}

.game-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 80px;
}

.game-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.winner {
  font-weight: 500;
}

.meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.export-section {
  margin-top: var(--space-xl);
}

.btn {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary);
}
</style>
