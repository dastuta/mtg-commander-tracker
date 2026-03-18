<template>
  <div 
    class="player-card" 
    :class="[
      `position-${tablePosition}`,
      { 
        current: isCurrent, 
        dragging: isDragging && currentView === 'life',
        validTarget: isValidTarget,
        defeated: player.defeated,
        'view-mode': currentView !== 'life'
      }
    ]"
    data-player-id="player.id"
  >
    <div class="card-content">
      <div class="player-header">
        <span class="player-name">{{ player.name }}</span>
        <span class="player-commander">{{ player.commander }}</span>
        <span v-if="player.defeated" class="defeat-badge">
          DEFEATED ({{ player.defeatReason }})
        </span>
      </div>

      <div class="card-body">
        <button 
          class="edge-btn poison-btn" 
          @click.stop="switchToPoison"
          :disabled="currentView !== 'life'"
        >
          <span class="edge-label">Gift</span>
          <span class="edge-value">{{ player.poison }}</span>
        </button>

        <div 
          class="main-area"
          :class="{ 'no-drag': currentView !== 'life' }"
          @mousedown="onDragStart"
          @touchstart.prevent="onDragStart"
        >
          <div v-if="currentView === 'life'" class="life-view">
            <div class="stat-label">Leben</div>
            <div class="stat-value" :class="{ low: player.life <= 10, critical: player.life <= 5 }">
              {{ player.life }}
            </div>
          </div>

          <div v-else-if="currentView === 'poison'" class="poison-view">
            <div class="stat-label">Gift</div>
            <div class="stat-value" :class="{ warning: player.poison >= 7, critical: player.poison >= 10 }">
              {{ player.poison }}
            </div>
            <button class="back-btn" @click.stop="switchToLife">
              ← Zurück
            </button>
          </div>

          <div v-else-if="currentView === 'commander'" class="commander-view">
            <div class="stat-label">Commander Schaden</div>
            <div class="commander-list">
              <div v-for="cd in commanderDamageList" :key="cd.sourceId" class="cmd-item">
                <span class="cmd-source">{{ cd.sourceName }}</span>
                <div class="cmd-bar">
                  <div class="cmd-fill" :style="{ width: Math.min(100, (cd.damage / 20) * 100) + '%' }"></div>
                </div>
                <span class="cmd-value">{{ cd.damage }}/20</span>
              </div>
            </div>
            <button class="back-btn" @click.stop="switchToLife">
              ← Zurück
            </button>
          </div>
        </div>

        <button 
          class="edge-btn cmd-btn" 
          @click.stop="switchToCommander"
          :disabled="currentView !== 'life'"
        >
          <span class="edge-label">CMD</span>
          <span class="edge-value">{{ totalCommanderDamage }}</span>
        </button>
      </div>

      <div class="card-footer">
        <div class="turn-count" v-if="player.turnCount > 0 && !player.defeated && currentView === 'life'">
          {{ player.turnCount }} Züge
        </div>
        <div class="drag-hint" v-if="isCurrent && currentView === 'life'">
          Ziehe für Aktionen
        </div>
        <div class="drag-hint" v-else-if="currentView === 'life'">
          Ziehe für Aktionen
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerCard',
  props: {
    player: Object,
    isCurrent: Boolean,
    players: Array,
    commanderDamage: Object,
    tablePosition: {
      type: String,
      default: 'bottom'
    }
  },
  emits: ['drag-start'],
  data() {
    return {
      currentView: 'life',
      isDragging: false,
      cardElement: null
    }
  },
  computed: {
    allOpponents() {
      if (!this.players || !this.player) return []
      return this.players.filter(p => p.id !== this.player.id)
    },
    commanderDamageList() {
      if (!this.players || !this.player) return []
      
      return this.allOpponents.map(opponent => {
        const key = `${opponent.id}-${this.player.id}`
        const damage = this.commanderDamage?.[key] || 0
        return {
          sourceId: opponent.id,
          sourceName: opponent.name,
          damage
        }
      }).sort((a, b) => b.damage - a.damage)
    },
    totalCommanderDamage() {
      return this.commanderDamageList.reduce((sum, cd) => sum + cd.damage, 0)
    }
  },
  mounted() {
    this.cardElement = this.$el
  },
  methods: {
    switchToLife() {
      this.currentView = 'life'
    },
    switchToPoison() {
      if (this.currentView === 'life') {
        this.currentView = 'poison'
      }
    },
    switchToCommander() {
      if (this.currentView === 'life') {
        this.currentView = 'commander'
      }
    },
    onDragStart(e) {
      if (this.currentView !== 'life') return
      
      e.preventDefault()
      this.isDragging = true
      this.$emit('drag-start', {
        player: this.player,
        element: this.cardElement,
        event: e
      })
    }
  }
}
</script>

<style scoped>
.player-card {
  background: rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 0.5rem;
  border: 3px solid transparent;
  transition: all 0.2s;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-card.position-bottom .card-content {
  transform: rotate(0deg);
}

.player-card.position-right .card-content {
  transform: rotate(90deg);
}

.player-card.position-top .card-content {
  transform: rotate(180deg);
}

.player-card.position-left .card-content {
  transform: rotate(-90deg);
}

.player-card.position-top-right .card-content {
  transform: rotate(135deg);
}

.player-card.position-top-left .card-content {
  transform: rotate(-135deg);
}

.player-card.position-bottom-right .card-content {
  transform: rotate(45deg);
}

.player-card.position-bottom-left .card-content {
  transform: rotate(-45deg);
}

.card-content {
  width: 100%;
  transition: transform 0.3s ease;
}

.player-card.current {
  border-color: #c41e3a;
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.3);
}

.player-card.current .card-content {
  background: rgba(196, 30, 58, 0.1);
  border-radius: 12px;
  padding: 0.8rem;
}

.player-card.view-mode {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.player-card.dragging {
  transform: scale(1.02);
  box-shadow: 0 0 30px rgba(196, 30, 58, 0.5);
}

.player-card.validTarget {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

.player-card.defeated {
  opacity: 0.5;
  filter: grayscale(0.8);
}

.player-header {
  margin-bottom: 0.6rem;
  text-align: center;
}

.player-name {
  display: block;
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.player-commander {
  display: block;
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.2rem;
}

.defeat-badge {
  display: inline-block;
  margin-top: 0.3rem;
  padding: 0.2rem 0.5rem;
  background: #dc2626;
  color: #fff;
  font-size: 0.7rem;
  font-weight: bold;
  border-radius: 4px;
}

.card-body {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
  min-height: 80px;
}

.edge-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.edge-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.edge-btn:not(:disabled):hover {
  transform: scale(1.05);
}

.edge-btn:not(:disabled):active {
  transform: scale(0.95);
}

.poison-btn {
  background: #581c87;
  color: #d8b4fe;
}

.cmd-btn {
  background: #7c3aed;
  color: #e9d5ff;
}

.edge-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  opacity: 0.8;
}

.edge-value {
  font-size: 1.1rem;
  font-weight: bold;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 0.4rem;
  cursor: grab;
}

.main-area:active:not(.no-drag) {
  cursor: grabbing;
}

.main-area.no-drag {
  cursor: default;
}

.life-view,
.poison-view,
.commander-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.stat-label {
  font-size: 0.65rem;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 0.1rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #4ade80;
  line-height: 1;
}

.stat-value.low {
  color: #fbbf24;
}

.stat-value.critical {
  color: #ef4444;
  animation: pulse 1s infinite;
}

.poison-view .stat-value {
  color: #a855f7;
}

.poison-view .stat-value.warning {
  color: #fbbf24;
}

.poison-view .stat-value.critical {
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.commander-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
  max-height: 80px;
  overflow-y: auto;
  font-size: 0.75rem;
}

.cmd-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cmd-source {
  width: 45px;
  text-align: left;
  color: #d8b4fe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.7rem;
}

.cmd-bar {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.cmd-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #9333ea);
  border-radius: 4px;
  transition: width 0.3s;
}

.cmd-value {
  width: 40px;
  text-align: right;
  color: #888;
  font-size: 0.65rem;
}

.back-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: #3a3a5a;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.back-btn:hover {
  background: #4a4a6a;
}

.card-footer {
  margin-top: 0.5rem;
  text-align: center;
}

.turn-count {
  font-size: 0.75rem;
  color: #666;
}

.drag-hint {
  font-size: 0.65rem;
  color: #888;
  opacity: 0.7;
}
</style>
