<template>
  <div class="player-card" :class="{ current: isCurrent }">
    <div class="player-header">
      <span class="player-name">{{ player.name }}</span>
      <span class="player-commander">{{ player.commander }}</span>
    </div>
    
    <div class="player-stats">
      <div class="stat life" :class="{ low: player.life <= 10, critical: player.life <= 5 }">
        <span class="stat-label">Leben</span>
        <span class="stat-value">{{ player.life }}</span>
        <div class="stat-controls" v-if="isCurrent">
          <button class="stat-btn minus" @click="$emit('update-life', -1)">-1</button>
          <button class="stat-btn minus" @click="$emit('update-life', -5)">-5</button>
          <button class="stat-btn plus" @click="$emit('update-life', 1)">+1</button>
          <button class="stat-btn plus" @click="$emit('update-life', 5)">+5</button>
        </div>
        <div class="stat-controls" v-else>
          <button class="stat-btn minus" @click="$emit('update-life', -1)">-1</button>
          <button class="stat-btn minus" @click="$emit('update-life', -5)">-5</button>
          <button class="stat-btn minus" @click="$emit('update-life', -10)">-10</button>
        </div>
      </div>

      <div class="stat poison" :class="{ warning: player.poison >= 7, critical: player.poison >= 10 }">
        <span class="stat-label">Gift</span>
        <span class="stat-value">{{ player.poison }}</span>
        <div class="stat-controls" v-if="isCurrent">
          <button class="stat-btn minus" @click="$emit('update-poison', -1)">-1</button>
          <button class="stat-btn plus" @click="$emit('update-poison', 1)">+1</button>
        </div>
        <div class="stat-controls" v-else>
          <button class="stat-btn plus" @click="$emit('update-poison', 1)">+1</button>
          <button class="stat-btn plus" @click="$emit('update-poison', 2)">+2</button>
        </div>
      </div>
    </div>

    <div class="turn-count" v-if="player.turnCount > 0">
      Züge: {{ player.turnCount }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerCard',
  props: {
    player: Object,
    isCurrent: Boolean,
    isActivePlayer: Boolean
  },
  emits: ['update-life', 'update-poison']
}
</script>

<style scoped>
.player-card {
  background: rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 1rem;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.player-card.current {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.1);
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.3);
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

.stat-controls {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.stat-btn:active {
  transform: scale(0.9);
}

.stat-btn.minus {
  background: #ef4444;
  color: #fff;
}

.stat-btn.minus:hover {
  background: #dc2626;
}

.stat-btn.plus {
  background: #22c55e;
  color: #fff;
}

.stat-btn.plus:hover {
  background: #16a34a;
}

.turn-count {
  text-align: center;
  margin-top: 0.8rem;
  font-size: 0.8rem;
  color: #666;
}
</style>
