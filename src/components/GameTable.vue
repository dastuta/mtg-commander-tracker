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
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drag-end="onDragEnd"
        :ref="el => playerCards[index] = el"
      />
    </div>

    <div class="instructions">
      <p v-if="isDragging">Ziehe zu einem Spieler und lasse los</p>
      <p v-else>Ziehe vom aktiven Spieler zu einem anderen für Aktionen</p>
    </div>

    <svg v-if="isDragging && dragLine" class="drag-line-svg">
      <line 
        :x1="dragLine.x1" 
        :y1="dragLine.y1" 
        :x2="dragLine.x2" 
        :y2="dragLine.y2"
        stroke="#c41e3a"
        stroke-width="3"
        stroke-dasharray="5,5"
      />
      <circle :cx="dragLine.x2" :cy="dragLine.y2" r="10" fill="#c41e3a" />
    </svg>

    <ActionMenu 
      v-if="actionMenu.open"
      :target-player="actionMenu.target"
      :source-player="actionMenu.source"
      @close="closeActionMenu"
      @action="handleAction"
    />

    <button class="btn btn-next" @click="endTurn">
      Zug beenden → {{ nextPlayerName }}
    </button>

    <button class="btn btn-end" @click="$emit('end-game')">
      Spiel beenden
    </button>
  </div>
</template>

<script>
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
  data() {
    return {
      isDragging: false,
      dragSource: null,
      dragLine: null,
      playerCards: [],
      actionMenu: {
        open: false,
        target: null,
        source: null
      }
    }
  },
  computed: {
    currentPlayer() {
      return this.players[this.currentPlayerIndex]
    },
    currentTurnNumber() {
      return this.turnHistory.length
    },
    formattedTime() {
      const minutes = Math.floor(this.turnDuration / 60)
      const seconds = this.turnDuration % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    },
    nextPlayerName() {
      const nextIndex = (this.currentPlayerIndex + 1) % this.players.length
      return this.players[nextIndex]?.name || 'Nächster'
    }
  },
  mounted() {
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
    document.addEventListener('touchmove', this.onTouchMove, { passive: false })
    document.addEventListener('touchend', this.onTouchEnd)
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
    document.removeEventListener('touchmove', this.onTouchMove)
    document.removeEventListener('touchend', this.onTouchEnd)
  },
  methods: {
    onDragStart({ player, element }) {
      this.isDragging = true
      this.dragSource = player
      
      const rect = element.getBoundingClientRect()
      this.dragLine = {
        x1: rect.left + rect.width / 2,
        y1: rect.top + rect.height / 2,
        x2: rect.left + rect.width / 2,
        y2: rect.top + rect.height / 2
      }
    },
    
    onMouseMove(e) {
      if (!this.isDragging || !this.dragLine) return
      
      this.dragLine = {
        ...this.dragLine,
        x2: e.clientX,
        y2: e.clientY
      }
      
      this.updateTargetHighlight(e.clientX, e.clientY)
    },
    
    onTouchMove(e) {
      if (!this.isDragging || !this.dragLine) return
      e.preventDefault()
      
      const touch = e.touches[0]
      this.dragLine = {
        ...this.dragLine,
        x2: touch.clientX,
        y2: touch.clientY
      }
      
      this.updateTargetHighlight(touch.clientX, touch.clientY)
    },
    
    updateTargetHighlight(clientX, clientY) {
      this.playerCards.forEach((card, index) => {
        if (!card) return
        
        const cardEl = card.$el || card
        const rect = cardEl.getBoundingClientRect()
        
        const isOver = clientX >= rect.left && clientX <= rect.right &&
                       clientY >= rect.top && clientY <= rect.bottom
        
        if (isOver) {
          cardEl.classList.add('validTarget')
        } else {
          cardEl.classList.remove('validTarget')
        }
      })
    },
    
    onMouseUp(e) {
      if (!this.isDragging) return
      
      const target = this.findTargetAtPoint(e.clientX, e.clientY)
      this.handleDrop(target)
    },
    
    onTouchEnd(e) {
      if (!this.isDragging) return
      
      const touch = e.changedTouches[0]
      const target = this.findTargetAtPoint(touch.clientX, touch.clientY)
      this.handleDrop(target)
    },
    
    findTargetAtPoint(clientX, clientY) {
      for (let i = 0; i < this.playerCards.length; i++) {
        const card = this.playerCards[i]
        if (!card) continue
        
        const cardEl = card.$el || card
        const rect = cardEl.getBoundingClientRect()
        
        if (clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom) {
          return { player: this.players[i], card }
        }
      }
      return null
    },
    
    handleDrop(target) {
      if (target) {
        this.openActionMenu(target.player)
      }
      
      this.resetDrag()
    },
    
    openActionMenu(targetPlayer) {
      this.actionMenu.open = true
      this.actionMenu.target = targetPlayer
      this.actionMenu.source = this.currentPlayer
    },
    
    closeActionMenu() {
      this.actionMenu.open = false
      this.actionMenu.target = null
      this.actionMenu.source = null
    },
    
    resetDrag() {
      this.isDragging = false
      this.dragSource = null
      this.dragLine = null
      
      this.playerCards.forEach(card => {
        if (card) {
          const cardEl = card.$el || card
          cardEl.classList.remove('validTarget')
        }
      })
    },
    
    handleAction(action) {
      this.$emit('log-action', action)
      
      if (action.type === 'damage' || action.type === 'heal') {
        this.$emit('update-life', action.targetId, action.delta)
      } else if (action.type === 'poison') {
        this.$emit('update-poison', action.targetId, action.delta)
      }
      
      this.closeActionMenu()
    },
    
    endTurn() {
      this.$emit('next-turn', [])
    }
  }
}
</script>

<style scoped>
.game-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
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

.drag-line-svg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 999;
}

.btn {
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:active {
  transform: scale(0.98);
}

.btn-next {
  margin-top: 0.5rem;
  background: #c41e3a;
  color: #fff;
  width: 100%;
}

.btn-next:hover {
  background: #a01830;
}

.btn-end {
  margin-top: 0.5rem;
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
