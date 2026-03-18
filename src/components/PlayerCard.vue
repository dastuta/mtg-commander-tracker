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
    
    <PlayerView 
      :player="player"
      :players="players"
      :commander-damage="commanderDamage"
    />

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
import PlayerView from './PlayerView.vue'

export default {
  name: 'PlayerCard',
  components: { PlayerView },
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
      cardElement: null
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

.player-header {
  margin-bottom: 0.8rem;
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
