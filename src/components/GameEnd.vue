<template>
  <div class="game-end">
    <h2>Spiel beendet!</h2>
    
    <div class="stats">
      <h3>Spielstatistiken</h3>
      <div class="stat-item">
        <span>Gesamtspielzeit:</span>
        <span class="value">{{ totalGameTime }}</span>
      </div>
      <div class="stat-item">
        <span>Anzahl Züge:</span>
        <span class="value">{{ turnHistory.length }}</span>
      </div>
    </div>

    <div class="players-summary">
      <h3>Spieler</h3>
      <div v-for="player in players" :key="player.id" class="player-summary">
        <div class="player-info">
          <span class="name">{{ player.name }}</span>
          <span class="commander">{{ player.commander }}</span>
        </div>
        <div class="player-stats">
          <span class="final-life">LP: {{ player.life }}</span>
          <span class="poison">Gift: {{ player.poison }}</span>
          <span class="turns">Züge: {{ player.turnCount }}</span>
        </div>
      </div>
    </div>

    <div class="turn-history">
      <h3>Zughistorie</h3>
      <div class="history-list">
        <div v-for="turn in turnHistory" :key="turn.turnNumber" class="history-item">
          <span class="turn-num">Z {{ turn.turnNumber }}</span>
          <span class="turn-player">{{ turn.playerName }}</span>
          <span class="turn-duration">{{ formatDuration(turn.duration) }}</span>
          <span class="turn-actions">{{ turn.actions.length }} Aktionen</span>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" @click="$emit('new-game')">Neues Spiel</button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'GameEnd',
  props: {
    players: Array,
    turnHistory: Array
  },
  emits: ['new-game', 'save-game'],
  setup(props) {
    const totalGameTime = computed(() => {
      const total = props.turnHistory.reduce((sum, turn) => sum + (turn.duration || 0), 0)
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    })

    const formatDuration = (seconds) => {
      if (!seconds) return '0:00'
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return {
      totalGameTime,
      formatDuration
    }
  }
}
</script>

<style scoped>
.game-end {
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  text-align: center;
  color: #c41e3a;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}

h3 {
  color: #888;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin-bottom: 0.8rem;
}

.stats {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #333;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-item .value {
  font-weight: bold;
  color: #4ade80;
}

.players-summary {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.player-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0;
  border-bottom: 1px solid #333;
}

.player-summary:last-child {
  border-bottom: none;
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-info .name {
  font-weight: bold;
  color: #fff;
}

.player-info .commander {
  font-size: 0.8rem;
  color: #666;
}

.player-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.player-stats span {
  color: #888;
}

.turn-history {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.3rem;
}

.history-item:nth-child(odd) {
  background: rgba(255,255,255,0.03);
}

.turn-num {
  background: #c41e3a;
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.turn-player {
  flex: 1;
  color: #fff;
}

.turn-duration {
  color: #4ade80;
  font-family: monospace;
}

.turn-actions {
  color: #888;
  font-size: 0.8rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn {
  flex: 1;
  padding: 1rem;
}
</style>
