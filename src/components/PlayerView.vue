<template>
  <div class="player-view" :class="currentView">
    <button class="view-btn left" @click="showPoison">
      <span class="btn-label">Gift</span>
      <span class="btn-value">{{ player.poison }}</span>
    </button>
    
    <div class="main-display" @click="showLife">
      <div v-if="currentView === 'life'" class="life-display">
        <div class="stat-label">Leben</div>
        <div class="stat-value" :class="{ low: player.life <= 10, critical: player.life <= 5 }">
          {{ player.life }}
        </div>
      </div>
      
      <div v-else-if="currentView === 'poison'" class="poison-display">
        <div class="stat-label">Gift</div>
        <div class="stat-value" :class="{ warning: player.poison >= 7, critical: player.poison >= 10 }">
          {{ player.poison }}
        </div>
      </div>
      
      <div v-else-if="currentView === 'commander'" class="commander-display">
        <div class="stat-label">Commander Schaden</div>
        <div class="commander-grid">
          <div v-for="cd in commanderDamageList" :key="cd.source" class="commander-item">
            <span class="cd-source">{{ cd.source }}</span>
            <div class="cd-bar">
              <div class="cd-fill" :style="{ width: Math.min(100, (cd.damage / 20) * 100) + '%' }"></div>
            </div>
            <span class="cd-value">{{ cd.damage }}/20</span>
          </div>
          <div v-if="commanderDamageList.length === 0" class="no-damage">
            Kein Commander Schaden
          </div>
        </div>
      </div>
    </div>
    
    <button class="view-btn right" @click="showCommander">
      <span class="btn-label">CMD</span>
      <span class="btn-value">{{ totalCommanderDamage }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'PlayerView',
  props: {
    player: Object,
    players: Array,
    commanderDamage: Object
  },
  data() {
    return {
      currentView: 'life'
    }
  },
  computed: {
    commanderDamageList() {
      if (!this.commanderDamage) return []
      
      const list = []
      for (const [key, damage] of Object.entries(this.commanderDamage)) {
        const [sourceId, targetId] = key.split('-').map(Number)
        if (targetId === this.player.id && damage > 0) {
          const sourcePlayer = this.players?.find(p => p.id === sourceId)
          if (sourcePlayer) {
            list.push({
              source: sourcePlayer.name,
              damage
            })
          }
        }
      }
      return list.sort((a, b) => b.damage - a.damage)
    },
    totalCommanderDamage() {
      return this.commanderDamageList.reduce((sum, cd) => sum + cd.damage, 0)
    }
  },
  methods: {
    showLife() {
      this.currentView = 'life'
    },
    showPoison() {
      this.currentView = 'poison'
    },
    showCommander() {
      this.currentView = 'commander'
    }
  }
}
</script>

<style scoped>
.player-view {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
}

.view-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 60px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.view-btn.left {
  background: #581c87;
  color: #d8b4fe;
}

.view-btn.right {
  background: #7c3aed;
  color: #e9d5ff;
}

.view-btn:hover {
  transform: scale(1.05);
}

.view-btn:active {
  transform: scale(0.95);
}

.btn-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  opacity: 0.8;
}

.btn-value {
  font-size: 1rem;
  font-weight: bold;
}

.main-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.main-display:hover {
  background: rgba(255,255,255,0.05);
}

.life-display,
.poison-display,
.commander-display {
  text-align: center;
  width: 100%;
}

.stat-label {
  font-size: 0.7rem;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 0.3rem;
}

.stat-value {
  font-size: 3rem;
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

.poison-display .stat-value {
  color: #a855f7;
}

.poison-display .stat-value.warning {
  color: #fbbf24;
}

.poison-display .stat-value.critical {
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.commander-grid {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 100px;
  overflow-y: auto;
}

.commander-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.cd-source {
  width: 50px;
  text-align: left;
  color: #d8b4fe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-bar {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.cd-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #9333ea);
  border-radius: 4px;
  transition: width 0.3s;
}

.cd-value {
  width: 45px;
  text-align: right;
  color: #888;
}

.no-damage {
  color: #666;
  font-size: 0.8rem;
  text-align: center;
  padding: 0.5rem;
}
</style>
