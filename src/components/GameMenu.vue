<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { gameStore } from '@/composables/useGameState'
import type { Player } from '@/types'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()

const showWinnerSelection = ref(false)
const activePlayersForSelection = ref<Player[]>([])

function close() {
  emit('close')
}

function undoLastAction() {
  gameStore.undoLastAction()
  close()
}

function resetGame() {
  if (confirm('Spiel wirklich zurücksetzen?')) {
    gameStore.resetGame()
    router.push('/')
  }
}

function surrender() {
  if (confirm('Aufgeben und Spiel beenden?')) {
    const currentPlayer = gameStore.currentPlayer.value
    if (currentPlayer) {
      gameStore.endGame(currentPlayer.id, 'surrender')
      router.push('/game/end')
    }
  }
}

function goHome() {
  gameStore.resetGame()
  router.push('/')
}

function endGameManually() {
  const activePlayers = gameStore.gameState.value.players.filter(p => !p.isDefeated)
  if (activePlayers.length === 1) {
    gameStore.endGame(activePlayers[0].id, 'last_standing')
    router.push('/game/end')
    close()
  } else if (activePlayers.length > 1) {
    activePlayersForSelection.value = activePlayers
    showWinnerSelection.value = true
  }
}

function selectWinner(playerId: string) {
  gameStore.endGame(playerId, 'agreed')
  showWinnerSelection.value = false
  router.push('/game/end')
  close()
}

function cancelWinnerSelection() {
  showWinnerSelection.value = false
}

function exportCurrentGame() {
  const durationSeconds = gameStore.gameState.value.startTime && gameStore.gameState.value.endTime
    ? Math.floor((new Date(gameStore.gameState.value.endTime).getTime() - new Date(gameStore.gameState.value.startTime).getTime()) / 1000)
    : 0
  const totalTurns = gameStore.gameState.value.currentTurnNumber || 1
  
  const turnsPerPlayer: Record<string, number> = {}
  for (const player of gameStore.gameState.value.players) {
    if (gameStore.gameState.value.turnsPerPlayer[player.id]) {
      turnsPerPlayer[player.playerId] = gameStore.gameState.value.turnsPerPlayer[player.id]
    }
  }
  
  const exportData = {
    schema_version: '1.0',
    game_id: gameStore.gameState.value.id,
    date: gameStore.gameState.value.startTime,
    duration_minutes: Math.floor(durationSeconds / 60),
    total_turns: totalTurns,
    avg_turn_duration_seconds: Math.floor(durationSeconds / totalTurns) || 0,
    turns_per_player: turnsPerPlayer,
    longest_turn: null,
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

  downloadJSON(exportData, `game_${gameStore.gameState.value.id}.json`)
  close()
}

function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  
  // Create download link
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.display = 'none'
  
  // Append to body, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the object URL
  setTimeout(() => URL.revokeObjectURL(link.href), 100)
}
</script>

<template>
  <div class="menu-overlay" @click.self="close">
    <div class="menu-panel">
      <header class="menu-header">
        <h2>Menü</h2>
        <button class="btn-close" @click="close">✕</button>
      </header>

      <div class="menu-content">
        <section class="menu-section">
          <button class="menu-item" @click="undoLastAction">
            <span class="icon">↩</span>
            <span>Letzte Aktion rückgängig</span>
          </button>
        </section>

        <section class="menu-section">
          <button class="menu-item" @click="endGameManually">
            <span class="icon">🏆</span>
            <span>Spiel beenden</span>
          </button>
          
          <button class="menu-item" @click="surrender">
            <span class="icon">🏳</span>
            <span>Aufgeben</span>
          </button>
          
          <button class="menu-item" @click="exportCurrentGame">
            <span class="icon">📤</span>
            <span>Spiel exportieren</span>
          </button>
          
          <button class="menu-item" @click="resetGame">
            <span class="icon">🔄</span>
            <span>Spiel zurücksetzen</span>
          </button>
        </section>

        <section class="menu-section">
          <button class="menu-item" @click="goHome">
            <span class="icon">🏠</span>
            <span>Zurück zum Start</span>
          </button>
        </section>
      </div>
    </div>

    <!-- Winner Selection Modal -->
    <div v-if="showWinnerSelection" class="winner-modal-overlay">
      <div class="winner-modal">
        <header class="winner-header">
          <h2>Wer hat gewonnen?</h2>
          <button class="btn-close" @click="cancelWinnerSelection">✕</button>
        </header>
        <div class="winner-content">
          <p class="winner-hint">{{ activePlayersForSelection.length }} Spieler sind noch aktiv</p>
          <div class="winner-list">
            <button
              v-for="player in activePlayersForSelection"
              :key="player.id"
              class="winner-btn"
              @click="selectWinner(player.id)"
            >
              <span class="winner-name">{{ player.name }}</span>
              <span v-if="player.commander" class="winner-commander">{{ player.commander }}</span>
            </button>
          </div>
        </div>
        <footer class="winner-footer">
          <button class="btn btn-secondary" @click="cancelWinnerSelection">
            Abbrechen
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: var(--z-modal);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.menu-panel {
  width: 100%;
  max-width: 500px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.menu-header h2 {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.btn-close {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  cursor: pointer;
}

.menu-content {
  padding: var(--space-md);
}

.menu-section {
  margin-bottom: var(--space-md);
}

.menu-section:last-child {
  margin-bottom: 0;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.menu-item:hover {
  background: var(--color-bg-tertiary);
}

.icon {
  width: 32px;
  font-size: var(--font-size-lg);
}

/* Winner Selection Modal */
.winner-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-modal) + 1);
  padding: var(--space-lg);
  animation: fadeIn 0.2s ease;
}

.winner-modal {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  animation: modalIn 0.2s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.winner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.winner-header h2 {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.winner-content {
  padding: var(--space-lg);
}

.winner-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-md);
  text-align: center;
}

.winner-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.winner-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-lg);
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.winner-btn:hover {
  border-color: var(--color-victory);
  background: rgba(251, 191, 36, 0.1);
}

.winner-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.winner-commander {
  font-size: var(--font-size-sm);
  color: var(--color-commander);
}

.winner-footer {
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-tertiary);
  border-top: 1px solid var(--color-border);
}

.winner-footer .btn {
  width: 100%;
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-secondary);
}
</style>
