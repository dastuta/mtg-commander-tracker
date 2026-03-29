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
        <span class="value">{{ turnCount }}</span>
      </div>
      <div class="stat-item">
        <span>Gesamte Aktionen:</span>
        <span class="value">{{ totalActions }}</span>
      </div>
    </div>

    <div class="players-summary">
      <h3>Spieler</h3>
      <div v-for="player in players" :key="player.id" class="player-summary">
        <div class="player-info">
          <span class="name">{{ player.name }}</span>
          <span class="commander">{{ player.commander }}</span>
          <span v-if="isWinner(player.id)" class="winner-badge">
            GEWONNEN{{ getWinnerReason(player.id) ? ` (${getWinnerReason(player.id)})` : '' }}
          </span>
          <span v-else-if="player.defeated" class="defeated-badge">
            Eliminiert ({{ player.defeatReason }})
          </span>
        </div>
        <div class="player-stats">
          <div class="stat-row">
            <span class="label">LP:</span>
            <span class="value life">{{ player.life }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Gift:</span>
            <span class="value poison">{{ player.poison }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Züge:</span>
            <span class="value">{{ player.turnCount }}</span>
          </div>
        </div>
        <div class="player-actions">
          <div class="action-stat">
            <span class="label">Schaden:</span>
            <span class="damage">-{{ getPlayerStats(player.id).damageDealt }}</span>
          </div>
          <div class="action-stat">
            <span class="label">Erhalten:</span>
            <span class="damage-taken">-{{ getPlayerStats(player.id).damageReceived }}</span>
          </div>
          <div class="action-stat">
            <span class="label">Heilung:</span>
            <span class="heal">+{{ getPlayerStats(player.id).healingDone }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="turn-history">
      <h3>Zughistorie</h3>
      <div class="history-list">
        <div v-for="turn in turns" :key="turn.turnNumber" class="history-item">
          <span class="turn-num">Z {{ turn.turnNumber }}</span>
          <span class="turn-player">{{ turn.playerName }}</span>
          <span class="turn-duration">{{ formatDuration(turn.duration) }}</span>
          <span class="turn-actions">{{ turn.actions.length }} Aktionen</span>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" @click="showSaveDialog = true">
        💾 Speichern
      </button>
      <button class="btn btn-primary" @click="$emit('new-game')">
        Neues Spiel
      </button>
    </div>

    <!-- Save Dialog -->
    <div v-if="showSaveDialog" class="modal-overlay" @click.self="showSaveDialog = false">
      <div class="modal">
        <h3>Spiel speichern</h3>
        <input 
          type="text" 
          v-model="gameName" 
          placeholder="Spielname"
          class="input"
          @keyup.enter="saveGame"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showSaveDialog = false">
            Abbrechen
          </button>
          <button class="btn btn-primary" @click="saveGame" :disabled="!gameName.trim()">
            Speichern
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'GameEnd',
  props: {
    players: Array,
    gameRecord: Object
  },
  emits: ['new-game', 'save-game'],
  setup(props, { emit }) {
    const showSaveDialog = ref(false)
    const gameName = ref('')

    const turns = computed(() => {
      return props.gameRecord?.turns || []
    })

    const turnCount = computed(() => {
      return props.gameRecord?.turns?.length || 0
    })

    const totalActions = computed(() => {
      return props.gameRecord?.statistics?.totalActions || 0
    })

    const totalGameTime = computed(() => {
      const total = props.gameRecord?.statistics?.totalDuration || 0
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

    const isWinner = (playerId) => {
      return props.gameRecord?.winner?.id === playerId
    }

    const getWinnerReason = (playerId) => {
      if (props.gameRecord?.winner?.id === playerId && props.gameRecord?.winner?.reason) {
        const reasonMap = {
          'last_standing': 'Letzter Verbleibender',
          'special_effect': 'Spezial Effekt',
          'agreed': 'Einvernehmlich'
        }
        return reasonMap[props.gameRecord.winner.reason] || props.gameRecord.winner.reason
      }
      return null
    }

    const getPlayerStats = (playerId) => {
      if (!props.gameRecord?.turns) {
        return { damageDealt: 0, damageReceived: 0, healingDone: 0, poisonDealt: 0 }
      }

      let damageDealt = 0
      let damageReceived = 0
      let healingDone = 0
      let poisonDealt = 0

      props.gameRecord.turns.forEach(turn => {
        turn.actions?.forEach(action => {
          if (action.type === 'damage') {
            if (action.source?.id === playerId) {
              damageDealt += Math.abs(action.value)
            }
            if (action.target?.id === playerId) {
              damageReceived += Math.abs(action.value)
            }
          }
          if (action.type === 'heal') {
            if (action.source?.id === playerId) {
              healingDone += action.value
            }
          }
          if (action.type === 'poison') {
            if (action.source?.id === playerId) {
              poisonDealt += action.value
            }
          }
        })
      })

      return { damageDealt, damageReceived, healingDone, poisonDealt }
    }

    const saveGame = () => {
      if (gameName.value.trim()) {
        emit('save-game', gameName.value.trim())
        showSaveDialog.value = false
        gameName.value = ''
      }
    }

    return {
      turns,
      turnCount,
      totalActions,
      totalGameTime,
      formatDuration,
      getPlayerStats,
      isWinner,
      getWinnerReason,
      showSaveDialog,
      gameName,
      saveGame
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
  padding: 1rem 0;
  border-bottom: 1px solid #333;
}

.player-summary:last-child {
  border-bottom: none;
}

.player-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.player-info .name {
  font-weight: bold;
  color: #fff;
  font-size: 1.1rem;
}

.player-info .commander {
  font-size: 0.8rem;
  color: #666;
}

.defeated-badge {
  background: #7f1d1d;
  color: #fca5a5;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.winner-badge {
  background: #14532d;
  color: #86efac;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.player-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.stat-row .label {
  color: #888;
  font-size: 0.8rem;
}

.stat-row .value {
  font-weight: bold;
}

.stat-row .value.life {
  color: #4ade80;
}

.stat-row .value.poison {
  color: #a855f7;
}

.player-actions {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
}

.action-stat {
  display: flex;
  gap: 0.3rem;
}

.action-stat .label {
  color: #888;
}

.action-stat .damage {
  color: #ef4444;
  font-weight: bold;
}

.action-stat .damage-taken {
  color: #f97316;
  font-weight: bold;
}

.action-stat .heal {
  color: #4ade80;
  font-weight: bold;
}

.turn-history {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.history-list {
  max-height: 200px;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 350px;
  border: 2px solid #c41e3a;
}

.modal h3 {
  margin-bottom: 1rem;
  color: #fff;
  text-align: center;
}

.modal .input {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.7rem 1rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
}

.modal-actions .btn {
  flex: 1;
}
</style>
