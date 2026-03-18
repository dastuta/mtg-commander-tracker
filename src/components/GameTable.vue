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
        :players="players"
        :current-player-index="currentPlayerIndex"
        @open-action-menu="openActionMenu"
        @close-action-menu="closeActionMenu"
      />
    </div>

    <div class="instructions">
      <p>Wische auf dem aktiven Spieler nach links/rechts auf einen Gegner für Schadensmenü</p>
    </div>

    <ActionMenu 
      v-if="actionMenu.open"
      :target-player="actionMenu.target"
      :source-player="actionMenu.source"
      @close="closeActionMenu"
      @action="handleAction"
    />

    <button class="btn btn-end" @click="$emit('end-game')">
      Spiel beenden
    </button>
  </div>
</template>

<script>
import { computed, reactive } from 'vue'
import PlayerCard from './PlayerCard.vue'
import ActionMenu from './ActionMenu.vue'

export default {
  name: 'GameTable',
  components: { PlayerCard, ActionMenu },
  props: {
    players: Array,
    currentPlayerIndex: Number,
    turnDuration: Number,
    turnHistory: Array
  },
  emits: ['next-turn', 'update-life', 'update-poison', 'end-game', 'log-action'],
  setup(props, { emit }) {
    const currentPlayer = computed(() => props.players[props.currentPlayerIndex])
    
    const currentTurnNumber = computed(() => {
      return props.turnHistory.length
    })

    const formattedTime = computed(() => {
      const minutes = Math.floor(props.turnDuration / 60)
      const seconds = props.turnDuration % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    })

    const actionMenu = reactive({
      open: false,
      target: null,
      source: null
    })

    const openActionMenu = ({ target, source }) => {
      actionMenu.open = true
      actionMenu.target = target
      actionMenu.source = source
    }

    const closeActionMenu = () => {
      actionMenu.open = false
      actionMenu.target = null
      actionMenu.source = null
    }

    const handleAction = (action) => {
      emit('log-action', action)
      
      if (action.type === 'life' || action.type === 'commander' || action.type === 'toxic') {
        emit('update-life', action.targetId, action.delta)
      } else if (action.type === 'poison') {
        emit('update-poison', action.targetId, action.delta)
      } else if (action.type === 'custom') {
        emit('update-life', action.targetId, action.delta)
      }
      
      closeActionMenu()
    }

    return {
      currentPlayer,
      currentTurnNumber,
      formattedTime,
      actionMenu,
      openActionMenu,
      closeActionMenu,
      handleAction
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

.instructions {
  text-align: center;
  padding: 0.8rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  margin: 1rem 0;
}

.instructions p {
  font-size: 0.8rem;
  color: #666;
}

.btn-end {
  margin-top: auto;
  background: transparent;
  border: 2px solid #666;
  color: #888;
  width: 100%;
  padding: 1rem;
}

.btn-end:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}
</style>
