<template>
  <div class="source-menu-overlay" @click.self="close">
    <div class="source-menu">
      <div class="menu-header">
        <span class="source-label">Quelle:</span>
        <span class="source-name">{{ sourcePlayer?.name }}</span>
      </div>

      <div class="menu-subtitle">
        Aktionen für alle Spieler
      </div>

      <div class="action-grid">
        <button class="action-btn drain-btn" @click="selectAction('drain')">
          <span class="action-icon">💧</span>
          <span class="action-name">Drain</span>
          <span class="action-desc">Gesamtschaden = Heilung</span>
        </button>

        <button class="action-btn lifelink-btn" @click="selectAction('lifelink')">
          <span class="action-icon">❤️‍🔥</span>
          <span class="action-name">Lifelink</span>
          <span class="action-desc">X Schaden = X Heilung</span>
        </button>

        <button class="action-btn dmg-each-btn" @click="selectAction('dmg_each')">
          <span class="action-icon">💥</span>
          <span class="action-name">DMG Each</span>
          <span class="action-desc">Alle inkl. Selbst</span>
        </button>

        <button class="action-btn dmg-opponent-btn" @click="selectAction('dmg_opponent')">
          <span class="action-icon">⚔️</span>
          <span class="action-name">DMG Opp</span>
          <span class="action-desc">Nur Gegner</span>
        </button>
      </div>

      <button class="action-btn poison-btn-wide" @click="selectAction('mass_poison')">
        <span class="action-icon">☠️</span>
        <span class="action-name">Massen-Gift</span>
        <span class="action-desc">Allen Spielern X Gift</span>
      </button>

      <div class="game-state-actions">
        <button class="action-btn lose-btn" @click="confirmLose">
          <span class="action-icon">💀</span>
          <span class="action-name">Verlieren</span>
        </button>

        <button class="action-btn win-btn" @click="confirmWin">
          <span class="action-icon">👑</span>
          <span class="action-name">Gewinnen</span>
        </button>
      </div>

      <button class="btn-close" @click="close">
        Abbrechen
      </button>
    </div>
  </div>

  <!-- Lose Confirmation -->
  <div v-if="showLoseConfirm" class="confirm-overlay" @click.self="showLoseConfirm = false">
    <div class="confirm-menu">
      <h3>{{ sourcePlayer?.name }} verliert</h3>
      <div class="reason-select">
        <label>Grund:</label>
        <select v-model="loseReason" class="select">
          <option value="life">Leben auf 0</option>
          <option value="poison">Gift ≥ 10</option>
          <option value="commander">Commander Schaden ≥ 20</option>
          <option value="surrender">Aufgabe</option>
          <option v-for="reason in customLoseReasons" :key="reason" :value="reason">{{ reason }}</option>
          <option value="other">Anderer Grund...</option>
        </select>
        <input 
          v-if="loseReason === 'other'"
          type="text" 
          v-model="customLoseReason" 
          placeholder="Grund eingeben..."
          class="input custom-reason"
        />
      </div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="showLoseConfirm = false">Abbrechen</button>
        <button class="btn btn-danger" @click="applyLose" :disabled="loseReason === 'other' && !customLoseReason.trim()">Bestätigen</button>
      </div>
    </div>
  </div>

  <!-- Win Confirmation -->
  <div v-if="showWinConfirm" class="confirm-overlay" @click.self="showWinConfirm = false">
    <div class="confirm-menu">
      <h3>{{ sourcePlayer?.name }} gewinnt!</h3>
      <div class="reason-select">
        <label>Grund:</label>
        <select v-model="winReason" class="select">
          <option value="last_standing">Letzter Verbleibender</option>
          <option value="special_effect">Spezial Effekt</option>
          <option value="agreed">Einvernehmlich</option>
          <option v-for="reason in customWinReasons" :key="reason" :value="reason">{{ reason }}</option>
          <option value="other">Anderer Grund...</option>
        </select>
        <input 
          v-if="winReason === 'other'"
          type="text" 
          v-model="customWinReason" 
          placeholder="Grund eingeben..."
          class="input custom-reason"
        />
      </div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="showWinConfirm = false">Abbrechen</button>
        <button class="btn btn-success" @click="applyWin" :disabled="winReason === 'other' && !customWinReason.trim()">Bestätigen</button>
      </div>
    </div>
  </div>

  <!-- Value input for all damage/heal actions -->
  <div v-if="subMenu && subMenu !== 'mass_poison'" class="value-overlay" @click.self="subMenu = null">
    <div class="value-menu">
      <div class="menu-header">
        <span class="action-label">{{ actionLabels[subMenu] }}</span>
        <span class="source-name">{{ sourcePlayer?.name }}</span>
      </div>

      <div class="value-input">
        <button 
          class="adjust-btn decrement" 
          @mousedown="startDecrement"
          @mouseup="stopChange"
          @mouseleave="stopChange"
          @touchstart.prevent="startDecrement"
          @touchend="stopChange"
        >-</button>
        <div class="value-display" :class="{ negative: value < 0 }">
          {{ value }}
        </div>
        <button 
          class="adjust-btn increment" 
          @mousedown="startIncrement"
          @mouseup="stopChange"
          @mouseleave="stopChange"
          @touchstart.prevent="startIncrement"
          @touchend="stopChange"
        >+</button>
      </div>

      <div class="targets-preview">
        <div class="target-item" v-for="target in allTargets" :key="target.id">
          <span class="target-name">{{ target.name }}</span>
          <span class="target-delta" :class="target.class">{{ target.delta }}</span>
        </div>
      </div>

      <button class="btn-apply" @click="applyAction" :disabled="value === 0">
        {{ actionLabels[subMenu] }} anwenden
      </button>

      <button class="btn-back" @click="subMenu = null">
        ← Zurück
      </button>
    </div>
  </div>

  <!-- Mass poison menu -->
  <div v-if="subMenu === 'mass_poison'" class="value-overlay" @click.self="subMenu = null">
    <div class="value-menu">
      <div class="menu-header">
        <span class="action-label">Massen-Gift</span>
        <span class="source-name">{{ sourcePlayer?.name }}</span>
      </div>

      <div class="value-input">
        <button 
          class="adjust-btn decrement" 
          @mousedown="startDecrement"
          @mouseup="stopChange"
          @mouseleave="stopChange"
          @touchstart.prevent="startDecrement"
          @touchend="stopChange"
        >-</button>
        <div class="value-display">
          {{ value }}
        </div>
        <button 
          class="adjust-btn increment" 
          @mousedown="startIncrement"
          @mouseup="stopChange"
          @mouseleave="stopChange"
          @touchstart.prevent="startIncrement"
          @touchend="stopChange"
        >+</button>
      </div>

      <div class="targets-preview">
        <div class="target-item" v-for="target in opponentTargets" :key="target.id">
          <span class="target-name">{{ target.name }}</span>
          <span class="target-delta poison">+{{ value }}</span>
        </div>
      </div>

      <button class="btn-apply poison" @click="applyMassPoison" :disabled="value === 0">
        Gift anwenden
      </button>

      <button class="btn-back" @click="subMenu = null">
        ← Zurück
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SourceMenu',
  props: {
    sourcePlayer: Object,
    allPlayers: Array
  },
  emits: ['close', 'drain', 'lifelink', 'dmg_each', 'dmg_opponent', 'mass_poison', 'lose', 'win', 'end-game'],
  data() {
    return {
      value: 0,
      subMenu: null,
      changeInterval: null,
      changeTimeout: null,
      isAccelerating: false,
      showLoseConfirm: false,
      showWinConfirm: false,
      loseReason: 'surrender',
      winReason: 'last_standing',
      customLoseReason: '',
      customWinReason: ''
    }
  },
  computed: {
    actionLabels() {
      return {
        drain: 'Drain',
        lifelink: 'Lifelink',
        dmg_each: 'DMG Each',
        dmg_opponent: 'DMG Opp'
      }
    },
    opponentTargets() {
      if (!this.allPlayers || !this.sourcePlayer) return []
      return this.allPlayers
        .filter(p => p.id !== this.sourcePlayer.id && !p.defeated)
        .map(p => ({ id: p.id, name: p.name }))
    },
    allTargets() {
      if (!this.allPlayers || !this.sourcePlayer) return []
      const targets = []
      
      this.opponentTargets.forEach(t => {
        targets.push({
          id: t.id,
          name: t.name,
          delta: `-${this.value}`,
          class: 'damage'
        })
      })
      
      const selfTarget = {
        id: this.sourcePlayer.id,
        name: `${this.sourcePlayer.name} (Du)`,
        class: 'self'
      }
      
      if (this.subMenu === 'drain') {
        selfTarget.delta = `+${this.value * this.opponentTargets.length}`
        selfTarget.class = 'heal'
      } else if (this.subMenu === 'lifelink') {
        selfTarget.delta = `+${this.value}`
        selfTarget.class = 'heal'
      } else if (this.subMenu === 'dmg_each') {
        selfTarget.delta = `-${this.value}`
        selfTarget.class = 'damage'
      } else if (this.subMenu === 'dmg_opponent') {
        return targets
      }
      
      targets.push(selfTarget)
      return targets
    },
    customLoseReasons() {
      const saved = localStorage.getItem('mtg-custom-lose-reasons')
      return saved ? JSON.parse(saved) : []
    },
    customWinReasons() {
      const saved = localStorage.getItem('mtg-custom-win-reasons')
      return saved ? JSON.parse(saved) : []
    }
  },
  methods: {
    selectAction(action) {
      this.value = 0
      this.subMenu = action
    },
    
    startIncrement() {
      this.value++
      this.isAccelerating = false
      
      this.changeTimeout = setTimeout(() => {
        this.isAccelerating = true
        this.changeInterval = setInterval(() => {
          this.value += 5
        }, 500)
      }, 500)
    },
    
    startDecrement() {
      this.value--
      this.isAccelerating = false
      
      this.changeTimeout = setTimeout(() => {
        this.isAccelerating = true
        this.changeInterval = setInterval(() => {
          this.value -= 5
        }, 500)
      }, 500)
    },
    
    stopChange() {
      if (this.changeTimeout) {
        clearTimeout(this.changeTimeout)
        this.changeTimeout = null
      }
      if (this.changeInterval) {
        clearInterval(this.changeInterval)
        this.changeInterval = null
      }
      this.isAccelerating = false
    },
    
    applyAction() {
      if (this.value === 0) return
      
      const opponentCount = this.opponentTargets.length
      const totalDamage = this.value * opponentCount
      
      const data = {
        sourceId: this.sourcePlayer.id,
        sourceName: this.sourcePlayer.name,
        value: this.value,
        opponentCount,
        totalDamage,
        targets: this.opponentTargets.map(p => ({ id: p.id, name: p.name }))
      }
      
      this.$emit(this.subMenu, data)
      this.close()
    },
    
    applyMassPoison() {
      if (this.value === 0) return
      
      this.$emit('mass_poison', {
        sourceId: this.sourcePlayer.id,
        sourceName: this.sourcePlayer.name,
        value: this.value,
        targets: this.opponentTargets.map(p => ({ id: p.id, name: p.name }))
      })
      
      this.close()
    },
    
    confirmLose() {
      this.showLoseConfirm = true
      this.loseReason = 'surrender'
    },
    
    applyLose() {
      const reason = this.loseReason === 'other' ? this.customLoseReason.trim() : this.loseReason
      
      if (this.loseReason === 'other' && this.customLoseReason.trim()) {
        const saved = JSON.parse(localStorage.getItem('mtg-custom-lose-reasons') || '[]')
        if (!saved.includes(this.customLoseReason.trim())) {
          saved.push(this.customLoseReason.trim())
          localStorage.setItem('mtg-custom-lose-reasons', JSON.stringify(saved))
        }
      }
      
      this.$emit('lose', {
        playerId: this.sourcePlayer.id,
        playerName: this.sourcePlayer.name,
        reason
      })
      this.showLoseConfirm = false
      this.customLoseReason = ''
      this.close()
    },
    
    confirmWin() {
      this.showWinConfirm = true
      this.winReason = 'last_standing'
    },
    
    applyWin() {
      const reason = this.winReason === 'other' ? this.customWinReason.trim() : this.winReason
      
      if (this.winReason === 'other' && this.customWinReason.trim()) {
        const saved = JSON.parse(localStorage.getItem('mtg-custom-win-reasons') || '[]')
        if (!saved.includes(this.customWinReason.trim())) {
          saved.push(this.customWinReason.trim())
          localStorage.setItem('mtg-custom-win-reasons', JSON.stringify(saved))
        }
      }
      
      this.$emit('win', {
        playerId: this.sourcePlayer.id,
        playerName: this.sourcePlayer.name,
        reason
      })
      this.showWinConfirm = false
      this.customWinReason = ''
      this.$emit('end-game', {
        winner: { id: this.sourcePlayer.id, name: this.sourcePlayer.name },
        reason
      })
      this.close()
    },
    
    close() {
      this.stopChange()
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.source-menu-overlay,
.value-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 1rem;
}

.source-menu,
.value-menu {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  border: 2px solid #7c3aed;
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.action-label {
  color: #888;
  font-size: 0.9rem;
}

.source-name {
  font-weight: bold;
  color: #7c3aed;
  font-size: 1.1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.8rem 0.5rem;
  border: none;
  border-radius: 12px;
  background: #2a2a4a;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-icon {
  font-size: 1.3rem;
}

.action-name {
  font-weight: bold;
  color: #fff;
  font-size: 0.9rem;
}

.action-desc {
  font-size: 0.6rem;
  color: #888;
}

.poison-btn-wide {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #581c87 0%, #4c1d95 100%);
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.poison-btn-wide:active {
  transform: scale(0.98);
}

.poison-btn-wide .action-icon {
  font-size: 1.5rem;
}

.poison-btn-wide .action-name {
  font-weight: bold;
  color: #fff;
  font-size: 0.9rem;
}

.poison-btn-wide .action-desc {
  font-size: 0.6rem;
  color: #d8b4fe;
}

.drain-btn {
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
}

.lifelink-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

.dmg-each-btn {
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
}

.dmg-opponent-btn {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
}

.btn-close {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 8px;
  background: #3a3a5a;
  color: #888;
  font-size: 0.9rem;
  cursor: pointer;
}

.value-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1.5rem 0;
}

.adjust-btn {
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 12px;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.adjust-btn:active {
  transform: scale(0.9);
}

.adjust-btn.decrement {
  background: #7f1d1d;
  color: #fca5a5;
}

.adjust-btn.increment {
  background: #14532d;
  color: #86efac;
}

.value-display {
  min-width: 100px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  background: #0a0a15;
  border: 2px solid #3a3a5a;
  border-radius: 12px;
  color: #4ade80;
}

.targets-preview {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 1rem;
  max-height: 150px;
  overflow-y: auto;
}

.target-item {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.8rem;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  font-size: 0.85rem;
}

.target-item.self {
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid #7c3aed;
}

.target-name {
  color: #ccc;
}

.target-delta {
  font-weight: bold;
}

.target-delta.damage {
  color: #ef4444;
}

.target-delta.heal {
  color: #4ade80;
}

.target-delta.poison {
  color: #a855f7;
}

.btn-apply {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 10px;
  background: #7c3aed;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-apply.poison {
  background: #581c87;
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-back {
  width: 100%;
  padding: 0.8rem;
  margin-top: 0.5rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #888;
  font-size: 0.9rem;
  cursor: pointer;
}

.game-state-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.lose-btn {
  background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
}

.win-btn {
  background: linear-gradient(135deg, #14532d 0%, #166534 100%);
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  padding: 1rem;
}

.confirm-menu {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 350px;
  border: 2px solid #7c3aed;
}

.confirm-menu h3 {
  text-align: center;
  color: #fff;
  margin-bottom: 1rem;
}

.reason-select {
  margin-bottom: 1rem;
}

.reason-select label {
  display: block;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.reason-select .select {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
}

.reason-select .custom-reason {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.7rem 1rem;
  border: 1px solid #7c3aed;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
}

.reason-select .custom-reason::placeholder {
  color: #666;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
}

.btn.btn-danger {
  background: #dc2626;
  color: #fff;
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn.btn-success {
  background: #16a34a;
  color: #fff;
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
