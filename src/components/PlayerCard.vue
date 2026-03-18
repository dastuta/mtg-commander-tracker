<template>
  <div class="player-card" :class="{ current: isCurrent, 'is-target': isTarget }">
    <div class="player-header">
      <span class="player-name">{{ player.name }}</span>
      <span class="player-commander">{{ player.commander }}</span>
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

    <div class="turn-count" v-if="player.turnCount > 0">
      Züge: {{ player.turnCount }}
    </div>

    <div class="swipe-indicator">
      <span v-if="isCurrent">↔ Wischen für Aktionen</span>
      <span v-else>← Empfangen</span>
    </div>

    <div 
      class="touch-target"
      :class="{ active: isCurrent }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div class="swipe-line" :style="{ transform: `translateX(${swipeOffset}px)` }">
        <span v-if="swipeDirection === 'left'">→ {{ targetPlayer?.name }}</span>
        <span v-else-if="swipeDirection === 'right'">← {{ targetPlayer?.name }}</span>
        <span v-else>↔</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'PlayerCard',
  props: {
    player: Object,
    isCurrent: Boolean,
    isActivePlayer: Boolean,
    players: Array,
    currentPlayerIndex: Number
  },
  emits: ['open-action-menu', 'close-action-menu'],
  setup(props, { emit }) {
    const touchStartX = ref(0)
    const touchStartY = ref(0)
    const currentX = ref(0)
    const currentY = ref(0)
    const isSwiping = ref(false)
    const swipeOffset = ref(0)
    const swipeDirection = ref('')
    const targetPlayer = ref(null)

    const swipeThreshold = 50
    const directionThreshold = 30

    const onTouchStart = (e) => {
      if (!props.isCurrent) return
      const touch = e.touches[0]
      touchStartX.value = touch.clientX
      touchStartY.value = touch.clientY
      currentX.value = touch.clientX
      currentY.value = touch.clientY
      isSwiping.value = true
    }

    const onTouchMove = (e) => {
      if (!isSwiping.value || !props.isCurrent) return
      const touch = e.touches[0]
      currentX.value = touch.clientX
      currentY.value = touch.clientY
      
      const deltaX = currentX.value - touchStartX.value
      const deltaY = currentY.value - touchStartY.value

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault()
        swipeOffset.value = deltaX
        swipeDirection.value = deltaX > 0 ? 'right' : 'left'
        
        const players = props.players.filter((_, i) => i !== props.currentPlayerIndex)
        const playerCount = players.length
        const screenWidth = window.innerWidth
        const segmentWidth = screenWidth / playerCount
        const targetIndex = Math.floor(currentX.value / segmentWidth)
        
        if (deltaX > 0 && targetIndex > 0) {
          targetPlayer.value = players[Math.min(targetIndex - 1, playerCount - 1)]
        } else if (deltaX < 0 && targetIndex < playerCount) {
          targetPlayer.value = players[Math.min(targetIndex, playerCount - 1)]
        } else {
          targetPlayer.value = players[0]
        }
      }
    }

    const onTouchEnd = () => {
      if (!isSwiping.value || !props.isCurrent) return
      
      if (Math.abs(swipeOffset.value) > swipeThreshold && targetPlayer.value) {
        emit('open-action-menu', {
          target: targetPlayer.value,
          source: props.player,
          direction: swipeDirection.value
        })
      }
      
      isSwiping.value = false
      swipeOffset.value = 0
      swipeDirection.value = ''
      targetPlayer.value = null
    }

    const onMouseDown = (e) => {
      if (!props.isCurrent) return
      touchStartX.value = e.clientX
      isSwiping.value = true
    }

    const onMouseMove = (e) => {
      if (!isSwiping.value || !props.isCurrent) return
      
      const deltaX = e.clientX - touchStartX.value
      
      if (Math.abs(deltaX) > 10) {
        e.preventDefault()
        swipeOffset.value = deltaX
        swipeDirection.value = deltaX > 0 ? 'right' : 'left'
        
        const players = props.players.filter((_, i) => i !== props.currentPlayerIndex)
        const playerCount = players.length
        const screenWidth = window.innerWidth
        const segmentWidth = screenWidth / playerCount
        const targetIndex = Math.floor(e.clientX / segmentWidth)
        
        if (deltaX > 0 && targetIndex > 0) {
          targetPlayer.value = players[Math.min(targetIndex - 1, playerCount - 1)]
        } else if (deltaX < 0) {
          targetPlayer.value = players[Math.min(targetIndex, playerCount - 1)]
        } else {
          targetPlayer.value = players[0]
        }
      }
    }

    const onMouseUp = () => {
      if (!isSwiping.value) return
      
      if (Math.abs(swipeOffset.value) > swipeThreshold && targetPlayer.value) {
        emit('open-action-menu', {
          target: targetPlayer.value,
          source: props.player,
          direction: swipeDirection.value
        })
      }
      
      isSwiping.value = false
      swipeOffset.value = 0
      swipeDirection.value = ''
      targetPlayer.value = null
    }

    return {
      swipeOffset,
      swipeDirection,
      targetPlayer,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp
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
  transition: all 0.3s;
  user-select: none;
}

.player-card.current {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.1);
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.3);
}

.player-card.is-target {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
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

.swipe-indicator {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: #555;
  height: 1rem;
}

.player-card.current .swipe-indicator {
  color: #c41e3a;
}

.touch-target {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  overflow: hidden;
}

.touch-target.active {
  background: rgba(196, 30, 58, 0.1);
  border: 2px dashed #c41e3a;
  cursor: ew-resize;
}

.swipe-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  transition: transform 0.1s ease-out;
  padding: 0.5rem;
}

.swipe-line span {
  background: rgba(0,0,0,0.3);
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
}
</style>
