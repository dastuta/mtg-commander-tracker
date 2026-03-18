<template>
  <div class="action-menu-overlay" @click.self="close">
    <div class="action-menu" :class="{ entering: isEntering }">
      <div class="menu-header">
        <span class="source">{{ sourcePlayer?.name }}</span>
        <span class="arrow">→</span>
        <span class="target">{{ targetPlayer?.name }}</span>
      </div>

      <div class="menu-section">
        <div class="section-label">Leben</div>
        <div class="damage-controls">
          <button class="action-btn damage" @click="doDamage(1)">-1</button>
          <button class="action-btn damage" @click="doDamage(5)">-5</button>
          <button class="action-btn damage" @click="doDamage(10)">-10</button>
          <button class="action-btn heal" @click="doHeal(1)">+1</button>
          <button class="action-btn heal" @click="doHeal(5)">+5</button>
        </div>
        <div class="custom-input">
          <button @click="adjustCustom(-5)">-5</button>
          <button @click="adjustCustom(-1)">-1</button>
          <input type="number" v-model.number="customValue" placeholder="0" />
          <button @click="adjustCustom(1)">+1</button>
          <button @click="adjustCustom(5)">+5</button>
          <button class="btn-confirm" @click="applyCustom">OK</button>
        </div>
      </div>

      <div class="menu-section">
        <div class="section-label">Gift</div>
        <div class="damage-controls">
          <button class="action-btn damage" @click="doPoison(1)">+1</button>
          <button class="action-btn damage" @click="doPoison(2)">+2</button>
          <button class="action-btn damage" @click="doPoison(5)">+5</button>
          <button class="action-btn heal" @click="doPoison(-1)" :disabled="targetPlayer?.poison <= 0">-1</button>
        </div>
      </div>

      <div class="menu-section">
        <div class="section-label">Spezial</div>
        <div class="damage-controls">
          <button class="action-btn special" @click="doCommanderDamage">Commander-Schaden</button>
          <button class="action-btn special" @click="doToxicDamage">Toxisch</button>
        </div>
      </div>

      <div class="menu-section">
        <div class="section-label">Custom Aktionen</div>
        <div class="damage-controls">
          <button class="action-btn custom" @click="openCustomAction">+ Custom</button>
        </div>
        <div v-if="customActions.length > 0" class="custom-actions-list">
          <button 
            v-for="(action, index) in customActions" 
            :key="index"
            class="action-btn custom"
            @click="executeCustomAction(action)"
          >
            {{ action.name }}
          </button>
        </div>
      </div>

      <button class="btn-close" @click="close">Schließen</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'ActionMenu',
  props: {
    targetPlayer: Object,
    sourcePlayer: Object
  },
  emits: ['close', 'action'],
  setup(props, { emit }) {
    const customValue = ref(0)
    const isEntering = ref(false)
    const customActions = ref([])

    onMounted(() => {
      const saved = localStorage.getItem('mtg-commander-custom-actions')
      if (saved) {
        customActions.value = JSON.parse(saved)
      }
      setTimeout(() => {
        isEntering.value = true
      }, 10)
    })

    const close = () => {
      isEntering.value = false
      setTimeout(() => emit('close'), 200)
    }

    const emitAction = (type, delta) => {
      emit('action', {
        type,
        targetId: props.targetPlayer.id,
        targetName: props.targetPlayer.name,
        sourceId: props.sourcePlayer.id,
        sourceName: props.sourcePlayer.name,
        delta,
        timestamp: Date.now()
      })
    }

    const doDamage = (amount) => {
      emitAction('life', -amount)
      close()
    }

    const doHeal = (amount) => {
      emitAction('life', amount)
      close()
    }

    const doPoison = (amount) => {
      emitAction('poison', amount)
      close()
    }

    const doCommanderDamage = () => {
      emitAction('commander', -7)
      close()
    }

    const doToxicDamage = () => {
      emitAction('toxic', -1)
      close()
    }

    const adjustCustom = (delta) => {
      customValue.value += delta
    }

    const applyCustom = () => {
      if (customValue.value !== 0) {
        const isDamage = customValue.value < 0
        emitAction(isDamage ? 'life' : 'life', customValue.value)
        close()
      }
    }

    const openCustomAction = () => {
      const name = prompt('Name der Custom-Aktion:')
      if (name) {
        const action = { name, value: parseInt(prompt('Wert (negativ für Schaden):') || '0') }
        customActions.value.push(action)
        localStorage.setItem('mtg-commander-custom-actions', JSON.stringify(customActions.value))
      }
    }

    const executeCustomAction = (action) => {
      emitAction('custom', action.value)
      close()
    }

    return {
      customValue,
      isEntering,
      customActions,
      close,
      doDamage,
      doHeal,
      doPoison,
      doCommanderDamage,
      doToxicDamage,
      adjustCustom,
      applyCustom,
      openCustomAction,
      executeCustomAction
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
  max-height: 80vh;
  overflow-y: auto;
  border: 2px solid #c41e3a;
  transform: scale(0.9) translateY(20px);
  opacity: 0;
  transition: all 0.2s ease-out;
}

.action-menu.entering {
  transform: scale(1) translateY(0);
  opacity: 1;
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
  color: #3b82f6;
}

.menu-section {
  margin-bottom: 1.5rem;
}

.section-label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 0.8rem;
  text-align: center;
}

.damage-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.action-btn {
  flex: 1;
  min-width: 60px;
  padding: 0.8rem 1rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn.damage {
  background: #7f1d1d;
  color: #fca5a5;
}

.action-btn.damage:hover {
  background: #991b1b;
}

.action-btn.heal {
  background: #14532d;
  color: #86efac;
}

.action-btn.heal:hover {
  background: #166534;
}

.action-btn.special {
  background: #1e3a5f;
  color: #93c5fd;
}

.action-btn.custom {
  background: #3a3a5a;
  color: #fff;
}

.action-btn.custom:hover {
  background: #4a4a6a;
}

.custom-input {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.8rem;
  justify-content: center;
}

.custom-input button {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #3a3a5a;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.custom-input button:hover {
  background: #4a4a6a;
}

.custom-input button.btn-confirm {
  background: #c41e3a;
  width: auto;
  padding: 0 1rem;
}

.custom-input input {
  width: 80px;
  height: 44px;
  text-align: center;
  font-size: 1.2rem;
  background: #0a0a15;
  border: 2px solid #3a3a5a;
  border-radius: 8px;
  color: #fff;
}

.custom-input input:focus {
  outline: none;
  border-color: #c41e3a;
}

.custom-actions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.8rem;
  justify-content: center;
}

.btn-close {
  width: 100%;
  padding: 1rem;
  background: transparent;
  border: 2px solid #444;
  border-radius: 10px;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-close:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
