<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gameStore } from '@/composables/useGameState'
import { api } from '@/services/api'
import { formatDuration } from '@/utils/formatters'

const router = useRouter()
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

const winner = computed(() => {
  return gameStore.gameState.value.players.find(p => p.isWinner)
})

const ranking = computed(() => {
  return [...gameStore.gameState.value.players].sort((a, b) => {
    if (a.isWinner) return -1
    if (b.isWinner) return 1
    if (a.placement && b.placement) return a.placement - b.placement
    return b.life - a.life
  })
})

const duration = computed(() => {
  if (gameStore.gameState.value.startTime && gameStore.gameState.value.endTime) {
    const start = new Date(gameStore.gameState.value.startTime).getTime()
    const end = new Date(gameStore.gameState.value.endTime).getTime()
    return Math.floor((end - start) / 1000)
  }
  return 0
})

const totalTurns = computed(() => gameStore.gameState.value.currentTurnNumber)
const totalActions = computed(() => gameStore.gameState.value.actions.length)

function playAgain() {
  gameStore.resetGame()
  router.push('/setup')
}

function goHome() {
  gameStore.resetGame()
  router.push('/')
}

function getExportData() {
  const durationSeconds = duration.value
  const totalTurnsVal = totalTurns.value || 1
  
  const turnsPerPlayer: Record<string, number> = {}
  
  for (const player of gameStore.gameState.value.players) {
    const playerActions = gameStore.gameState.value.actions.filter(a => a.actor === player.id)
    if (playerActions.length > 0) {
      turnsPerPlayer[player.playerId] = playerActions.length
    }
  }
  
  const longestTurn = gameStore.gameState.value.longestTurn
    ? {
        player_id: gameStore.gameState.value.longestTurn.playerId,
        turn: gameStore.gameState.value.longestTurn.turn,
        duration_seconds: gameStore.gameState.value.longestTurn.durationSeconds
      }
    : null

  return {
    schema_version: '1.0',
    game_id: gameStore.gameState.value.id,
    date: gameStore.gameState.value.startTime,
    duration_minutes: Math.floor(durationSeconds / 60),
    total_turns: totalTurnsVal,
    avg_turn_duration_seconds: Math.floor(durationSeconds / totalTurnsVal) || 0,
    turns_per_player: turnsPerPlayer,
    longest_turn: longestTurn,
    players: gameStore.gameState.value.players.map(p => ({
      seat: p.seat,
      player_id: p.playerId,
      deck_id: null,
      commander: p.commander,
      starting_life: 40,
      final_life: p.life,
      placement: p.placement || 0,
      commander_casts: p.commanderCasts,
    })),
    actions: gameStore.gameState.value.actions.map(a => ({
      seq: a.seq,
      turn: a.turn,
      actor: gameStore.gameState.value.players.find(p => p.id === a.actor)?.playerId || null,
      type: a.type,
      targets: a.targets.map(t => gameStore.gameState.value.players.find(p => p.id === t)?.playerId || ''),
      value: a.value,
      eliminated_by: a.eliminatedBy 
        ? gameStore.gameState.value.players.find(p => p.id === a.eliminatedBy)?.playerId 
        : undefined,
    })),
  }
}

function exportGame() {
  const exportData = getExportData()
  downloadJSON(exportData, `game_${gameStore.gameState.value.id}.json`)
}

async function saveToBackend() {
  saveStatus.value = 'saving'
  const exportData = getExportData()
  
  try {
    await api.games.save(exportData)
    saveStatus.value = 'saved'
    setTimeout(() => { saveStatus.value = 'idle' }, 2000)
  } catch (error) {
    console.error('Failed to save game:', error)
    saveStatus.value = 'error'
    setTimeout(() => { saveStatus.value = 'idle' }, 3000)
  }
}

function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  setTimeout(() => URL.revokeObjectURL(link.href), 100)
}
</script>

<template>
  <div class="game-end-screen">
    <header class="header">
      <h1>Spiel beendet</h1>
    </header>

    <main class="content">
      <section v-if="winner" class="winner-section">
        <div class="trophy">🏆</div>
        <h2>{{ winner.name }}</h2>
        <p v-if="winner.commander" class="commander">({{ winner.commander }})</p>
        <p class="reason">{{ gameStore.gameState.value.winningReason }}</p>
      </section>

      <section class="ranking-section">
        <h3>Ranking</h3>
        <div class="ranking-list">
          <div 
            v-for="(player, index) in ranking" 
            :key="player.id"
            class="ranking-item"
            :class="{ winner: player.isWinner }"
          >
            <span class="placement">{{ index + 1 }}</span>
            <div class="player-info">
              <span class="name">{{ player.name }}</span>
              <span v-if="player.commander" class="commander">{{ player.commander }}</span>
            </div>
            <span class="life">{{ player.life }} LP</span>
          </div>
        </div>
      </section>

      <section class="stats-section">
        <h3>Statistik</h3>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">{{ formatDuration(duration) }}</span>
            <span class="stat-label">Dauer</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalTurns }}</span>
            <span class="stat-label">Züge</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalActions }}</span>
            <span class="stat-label">Aktionen</span>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <button class="btn btn-secondary" @click="goHome">
        Start
      </button>
      <button 
        class="btn btn-outline" 
        :class="{ 'btn-success': saveStatus === 'saved', 'btn-error': saveStatus === 'error' }"
        :disabled="saveStatus === 'saving'"
        @click="saveToBackend"
      >
        <span v-if="saveStatus === 'idle'">💾 Speichern</span>
        <span v-else-if="saveStatus === 'saving'">⏳...</span>
        <span v-else-if="saveStatus === 'saved'">✓ Gespeichert</span>
        <span v-else-if="saveStatus === 'error'">✗ Fehler</span>
      </button>
      <button class="btn btn-outline" @click="exportGame">
        Export
      </button>
      <button class="btn btn-primary" @click="playAgain">
        Erneut
      </button>
    </footer>
  </div>
</template>

<style scoped>
.game-end-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-primary);
}

.header {
  padding: var(--space-lg);
  text-align: center;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.header h1 {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.winner-section {
  text-align: center;
  padding: var(--space-xl) 0;
}

.trophy {
  font-size: 4rem;
  margin-bottom: var(--space-md);
}

.winner-section h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-victory);
}

.winner-section .commander {
  color: var(--color-commander);
  margin-top: var(--space-xs);
}

.reason {
  color: var(--color-text-secondary);
  margin-top: var(--space-sm);
  text-transform: capitalize;
}

.ranking-section,
.stats-section {
  margin-bottom: var(--space-xl);
}

.ranking-section h3,
.stats-section h3 {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-md);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.ranking-item.winner {
  background: rgba(251, 191, 36, 0.1);
  border-color: var(--color-victory);
}

.placement {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  font-weight: 700;
  color: var(--color-text-secondary);
}

.ranking-item.winner .placement {
  background: var(--color-victory);
  color: black;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 500;
}

.commander {
  font-size: var(--font-size-xs);
  color: var(--color-commander);
}

.life {
  font-family: monospace;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-life);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.stat {
  text-align: center;
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-value {
  display: block;
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-lg);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--color-commander);
  color: white;
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-outline {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-outline:hover {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
}

.btn-success {
  background: var(--color-heal) !important;
  color: white !important;
  border-color: var(--color-heal) !important;
}

.btn-error {
  background: var(--color-damage) !important;
  color: white !important;
  border-color: var(--color-damage) !important;
}
</style>
