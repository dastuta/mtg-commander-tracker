<template>
  <div 
    class="player-card" 
    :class="{ 
      current: isCurrent, 
      dragging: isDragging,
      validTarget: isValidTarget,
      defeated: player.defeated
    }"
    data-player-id="player.id"
    @mousedown="onDragStart"
    @touchstart.prevent="onDragStart"
  >
    <div class="player-header">
      <span class="player-name">{{ player.name }}</span>
      <span class="player-commander">{{ player.commander }}</span>
      <span v-if="player.defeated" class="defeat-badge">
        DEFEATED
        <span class="defeat-reason">({{ player.defeatReason }})</span>
      </span>
    </div>
    
    <div class="player-stats">
      <div class="stat life" :class="{ low: player.life <= 10, critical: player.life <= 5 }">
        <span class="stat-label">Leben</span>
        <span class="stat-value">{{ player.life }}</span>
      </div>

      <div class="stat poison" :class="{ warning: player.poison >= 7, critical: player.poison >= 10 }">
        <span class="stat-label">Gift</span>
        <span class="stat-value">{{ player.poison }}</span>
      </div>
    </div>

    <div class="commander-damage-list" v-if="commanderDamageList.length > 0">
      <div v-for="cd in commanderDamageList" :key="cd.source" class="commander-damage-item">
        {{ cd.source }}: {{ cd.damage }}/20
      </div>
    </div>

    <div class="turn-count" v-if="player.turnCount > 0 && !player.defeated">
      {{ player.turnCount }} Züge
    </div>

    <div class="drag-hint" v-if="isCurrent && !player.defeated">
      Dein Zug
    </div>
    <div class="drag-hint opponent" v-else-if="!player.defeated">
      Ziehe für Aktionen
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
    commanderDamage: Object
  },
  emits: ['drag-start'],
  data() {
    return {
      isDragging: false,
      isValidTarget: false,
      cardElement: null
    }
  },
  computed: {
    commanderDamageList() {
      if (!this.commanderDamage) return []
      
      const list = []
      for (const [key, damage] of Object.entries(this.commanderDamage)) {
        const [sourceId, targetId] = key.split('-').map(Number)
        if (targetId === this.player.id) {
          const sourcePlayer = this.players?.find(p => p.id === sourceId)
          if (sourcePlayer) {
            list.push({
              source: sourcePlayer.name,
              damage
            })
          }
        }
      }
      return list
    }
  },
  mounted() {
    this.cardElement = this.$el
  },
  methods: {
    onDragStart(e) {
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
  padding: 1rem;
  border: 3px solid transparent;
  transition: all 0.2s;
  cursor: default;
  user-select: none;
}

.player-card.current {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.1);
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.3);
}

.player-card.current,
.player-card:not(.current) {
  cursor: grab;
}

.player-card.current:active,
.player-card:not(.current):active {
  cursor: grabbing;
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

.player-card.defeated .stat-value {
  text-decoration: line-through;
}

.defeat-badge {
  display: block;
  margin-top: 0.5rem;
  padding: 0.3rem 0.6rem;
  background: #dc2626;
  color: #fff;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
}

.defeat-reason {
  font-weight: normal;
  opacity: 0.8;
}

.commander-damage-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
  justify-content: center;
}

.commander-damage-item {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  background: rgba(147, 51, 234, 0.3);
  color: #d8b4fe;
  border-radius: 4px;
}

.player-header {
  margin-bottom: 1rem;
  text-align: center;
}

.player-name {
  display: block;
  font-size: 1.3rem;
  font-weight: bold;
  color: #fff;
}

.player-commander {
  display: block;
  font-size: 0.9rem;
  color: #888;
  margin-top: 0.3rem;
}

.player-stats {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.stat {
  flex: 1;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 0.8rem;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 0.3rem;
}

.stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: bold;
  color: #fff;
}

.stat.life .stat-value { color: #4ade80; }
.stat.life.low .stat-value { color: #fbbf24; }
.stat.life.critical .stat-value { color: #ef4444; animation: pulse 1s infinite; }

.stat.poison .stat-value { color: #a855f7; }
.stat.poison.warning .stat-value { color: #fbbf24; }
.stat.poison.critical .stat-value { color: #ef4444; animation: pulse 1s infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.turn-count {
  text-align: center;
  margin-top: 0.8rem;
  font-size: 0.8rem;
  color: #666;
}

.drag-hint {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: #c41e3a;
  opacity: 0.7;
}

.drag-hint.opponent {
  color: #888;
}
</style>
