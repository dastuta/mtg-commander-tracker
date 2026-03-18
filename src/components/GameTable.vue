<template>
  <div class="game-table">
    <div class="game-info">
      <div class="turn-info">
        <span class="turn-number">Zug {{ currentTurnNumber }}</span>
        <span class="turn-timer">{{ formattedTime }}</span>
      </div>
      <div class="current-player-info">
        <span class="label">Aktiver Spieler:</span>
        <span class="name">{{ currentPlayer?.name }}</span>
      </div>
    </div>

    <div class="players-grid" :class="`players-${players.length}`">
      <PlayerCard 
        v-for="(player, index) in players" 
        :key="player.id"
        :player="player"
        :is-current="index === currentPlayerIndex"
        :is-active-player="index === currentPlayerIndex"
        @update-life="(delta) => $emit('update-life', player.id, delta)"
        @update-poison="(delta) => $emit('update-poison', player.id, delta)"
      />
    </div>

    <div class="action-panel">
      <ActionPanel 
        :current-player="currentPlayer"
        :current-player-index="currentPlayerIndex"
        :players="players"
        @next-turn="$emit('next-turn', $event)"
      />
    </div>

    <button class="btn btn-end" @click="$emit('end-game')">
      Spiel beenden
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import PlayerCard from './PlayerCard.vue'
import ActionPanel from './ActionPanel.vue'

export default {
  name: 'GameTable',
  components: { PlayerCard, ActionPanel },
  props: {
    players: Array,
    currentPlayerIndex: Number,
    turnDuration: Number,
    turnHistory: Array
  },
  emits: ['next-turn', 'update-life', 'update-poison', 'end-game'],
  setup(props) {
    const currentPlayer = computed(() => props.players[props.currentPlayerIndex])
    
    const currentTurnNumber = computed(() => {
      return props.turnHistory.length
    })

    const formattedTime = computed(() => {
      const minutes = Math.floor(props.turnDuration / 60)
      const seconds = props.turnDuration % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    })

    return {
      currentPlayer,
      currentTurnNumber,
      formattedTime
    }
  }
}
</script>

<style scoped>
.game-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-info {
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.turn-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.turn-number {
  font-size: 1.2rem;
  font-weight: bold;
  color: #c41e3a;
}

.turn-timer {
  font-size: 1.5rem;
  font-family: monospace;
  color: #4ade80;
}

.current-player-info {
  text-align: right;
}

.current-player-info .label {
  font-size: 0.8rem;
  color: #888;
  display: block;
}

.current-player-info .name {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.players-grid {
  flex: 1;
  display: grid;
  gap: 1rem;
  overflow-y: auto;
}

.players-grid.players-2 { grid-template-columns: repeat(2, 1fr); }
.players-grid.players-3 { grid-template-columns: repeat(2, 1fr); }
.players-grid.players-4 { grid-template-columns: repeat(2, 1fr); }
.players-grid.players-5 { grid-template-columns: repeat(2, 1fr); }
.players-grid.players-6 { grid-template-columns: repeat(2, 1fr); }

@media (max-width: 600px) {
  .players-grid.players-2,
  .players-grid.players-3,
  .players-grid.players-4,
  .players-grid.players-5,
  .players-grid.players-6 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 900px) and (max-height: 700px) {
  .players-grid.players-4,
  .players-grid.players-5,
  .players-grid.players-6 {
    grid-template-columns: repeat(3, 1fr);
  }
}

.action-panel {
  margin-top: 1rem;
}

.btn-end {
  margin-top: 1rem;
  background: transparent;
  border: 2px solid #666;
  color: #888;
  width: 100%;
}

.btn-end:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}
</style>
