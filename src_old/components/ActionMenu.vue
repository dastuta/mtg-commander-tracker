<template>
  <div class="action-menu-overlay" @click.self="close">
    <div class="action-menu">
      <div class="menu-header">
        <span class="source">{{ sourcePlayer?.name }}</span>
        <span class="arrow">→</span>
        <span class="target">{{ targetPlayer?.name }}</span>
      </div>

      <div class="value-input">
        <button class="adjust-btn" @click="adjust(-10)">-10</button>
        <button class="adjust-btn" @click="adjust(-5)">-5</button>
        <button class="adjust-btn" @click="adjust(-1)">-1</button>
        <div class="value-display" :class="{ negative: value < 0 }">
          {{ value >= 0 ? '+' : '' }}{{ value }}
        </div>
        <button class="adjust-btn" @click="adjust(1)">+1</button>
        <button class="adjust-btn" @click="adjust(5)">+5</button>
        <button class="adjust-btn" @click="adjust(10)">+10</button>
      </div>

      <div class="action-type">
        <button 
          :class="{ active: actionType === 'damage' }" 
          @click="actionType = 'damage'"
        >
          Damage
        </button>
        <button 
          :class="{ active: actionType === 'combat' }" 
          @click="actionType = 'combat'"
        >
          Combat
        </button>
        <button 
          :class="{ active: actionType === 'commander' }" 
          @click="actionType = 'commander'"
        >
          Commander
        </button>
        <button 
          :class="{ active: actionType === 'heal' }" 
          @click="actionType = 'heal'"
        >
          Heal
        </button>
        <button 
          :class="{ active: actionType === 'poison' }" 
          @click="actionType = 'poison'"
        >
          Poison
        </button>
        <button 
          :class="{ active: actionType === 'lifegain' }" 
          @click="actionType = 'lifegain'"
        >
          Lifegain
        </button>
      </div>

      <div class="quick-actions">
        <button @click="applyQuick(-1)">-1</button>
        <button @click="applyQuick(-5)">-5</button>
        <button @click="applyQuick(-10)">-10</button>
        <button @click="applyQuick(1)">+1</button>
        <button @click="applyQuick(5)">+5</button>
        <button @click="applyQuick(10)">+10</button>
      </div>

      <button class="btn-apply" @click="applyValue">
        Anwenden
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActionMenu',
  props: {
    targetPlayer: Object,
    sourcePlayer: Object
  },
  emits: ['close', 'action'],
  data() {
    return {
      value: 0,
      actionType: 'damage'
    }
  },
  methods: {
    adjust(delta) {
      this.value += delta
    },
    
    applyQuick(amount) {
      const delta = this.getActionDelta()
      
      if (this.actionType === 'lifegain') {
        this.$emit('action', {
          type: 'lifegain_damage',
          targetId: this.targetPlayer.id,
          targetName: this.targetPlayer.name,
          sourceId: this.sourcePlayer.id,
          sourceName: this.sourcePlayer.name,
          delta: -Math.abs(amount),
          timestamp: Date.now()
        })
        this.$emit('action', {
          type: 'lifegain_heal',
          targetId: this.sourcePlayer.id,
          targetName: this.sourcePlayer.name,
          sourceId: this.sourcePlayer.id,
          sourceName: this.sourcePlayer.name,
          delta: Math.abs(amount),
          timestamp: Date.now()
        })
      } else {
        this.$emit('action', {
          type: this.actionType,
          targetId: this.targetPlayer.id,
          targetName: this.targetPlayer.name,
          sourceId: this.sourcePlayer?.id,
          sourceName: this.sourcePlayer?.name,
          delta,
          timestamp: Date.now()
        })
      }
      
      this.close()
    },
    
    getActionDelta() {
      const absValue = Math.abs(this.value)
      switch (this.actionType) {
        case 'damage':
        case 'combat':
        case 'commander':
        case 'lifegain':
          return -absValue
        case 'heal':
          return absValue
        case 'poison':
          return absValue
        default:
          return this.value
      }
    },
    
    applyValue() {
      if (this.value === 0) {
        this.close()
        return
      }
      
      if (this.actionType === 'lifegain') {
        const damage = -Math.abs(this.value)
        const heal = Math.abs(this.value)
        
        this.$emit('action', {
          type: 'lifegain_damage',
          targetId: this.targetPlayer.id,
          targetName: this.targetPlayer.name,
          sourceId: this.sourcePlayer.id,
          sourceName: this.sourcePlayer.name,
          delta: damage,
          timestamp: Date.now()
        })
        this.$emit('action', {
          type: 'lifegain_heal',
          targetId: this.sourcePlayer.id,
          targetName: this.sourcePlayer.name,
          sourceId: this.sourcePlayer.id,
          sourceName: this.sourcePlayer.name,
          delta: heal,
          timestamp: Date.now()
        })
      } else {
        const delta = this.getActionDelta()
        
        this.$emit('action', {
          type: this.actionType,
          targetId: this.targetPlayer.id,
          targetName: this.targetPlayer.name,
          sourceId: this.sourcePlayer?.id,
          sourceName: this.sourcePlayer?.name,
          delta,
          timestamp: Date.now()
        })
      }
      
      this.close()
    },
    
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.action-menu-overlay {
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

.action-menu {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  border: 2px solid #c41e3a;
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #333;
}

.menu-header .source {
  font-weight: bold;
  color: #c41e3a;
}

.menu-header .arrow {
  color: #888;
  font-size: 1.2rem;
}

.menu-header .target {
  font-weight: bold;
  color: #4ade80;
}

.value-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.adjust-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #3a3a5a;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}

.adjust-btn:hover {
  background: #4a4a6a;
}

.adjust-btn:active {
  transform: scale(0.95);
}

.value-display {
  min-width: 80px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  background: #0a0a15;
  border: 2px solid #3a3a5a;
  border-radius: 8px;
  color: #4ade80;
}

.value-display.negative {
  color: #ef4444;
}

.action-type {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  justify-content: center;
}

.action-type button {
  flex: 1;
  min-width: 60px;
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  background: #3a3a5a;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
}

.action-type button.active {
  background: #c41e3a;
  color: #fff;
}

.action-type button:nth-child(1).active { background: #dc2626; }
.action-type button:nth-child(2).active { background: #ea580c; }
.action-type button:nth-child(3).active { background: #9333ea; }
.action-type button:nth-child(4).active { background: #16a34a; }
.action-type button:nth-child(5).active { background: #0891b2; }
.action-type button:nth-child(6).active { background: #0891b2; }

.quick-actions {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1rem;
}

.quick-actions button {
  flex: 1;
  padding: 0.8rem 0.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  background: #2a2a4a;
  color: #fff;
}

.quick-actions button:nth-child(-n+3) {
  background: #7f1d1d;
  color: #fca5a5;
}

.quick-actions button:nth-child(n+4) {
  background: #14532d;
  color: #86efac;
}

.quick-actions button:active {
  transform: scale(0.95);
}

.btn-apply {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 10px;
  background: #c41e3a;
  color: #fff;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-apply:hover {
  background: #a01830;
}
</style>
