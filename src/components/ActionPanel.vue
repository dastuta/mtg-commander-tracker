<template>
  <div class="action-panel">
    <div class="panel-header">
      <span>Aktionen</span>
    </div>

    <div class="action-groups">
      <div class="action-group">
        <div class="group-label">Eigene Punkte</div>
        <div class="action-buttons">
          <button class="action-btn damage" @click="quickAction('life', -1)">Schaden -1</button>
          <button class="action-btn damage" @click="quickAction('life', -5)">Schaden -5</button>
          <button class="action-btn heal" @click="quickAction('life', 1)">Heilen +1</button>
          <button class="action-btn heal" @click="quickAction('life', 5)">Heilen +5</button>
          <button class="action-btn poison" @click="quickAction('poison', 1)">Gift +1</button>
        </div>
      </div>

      <div class="action-group">
        <div class="group-label">Gegner angreifen</div>
        <div class="enemy-buttons">
          <button 
            v-for="enemy in enemies" 
            :key="enemy.id" 
            class="action-btn attack"
            @click="showDamageInput(enemy)"
          >
            {{ enemy.name }}
          </button>
        </div>
      </div>

      <div class="action-group">
        <div class="group-label">Spezial</div>
        <div class="action-buttons">
          <button class="action-btn special" @click="showCustomInput">+ Custom</button>
        </div>
      </div>
    </div>

    <div v-if="showInput" class="custom-input-overlay" @click.self="closeInput">
      <div class="custom-input-modal">
        <h3>{{ inputTitle }}</h3>
        <p>{{ inputTarget?.name }}</p>
        <div class="input-row">
          <button @click="adjustInput(-5)">-5</button>
          <button @click="adjustInput(-1)">-1</button>
          <input type="number" v-model.number="inputValue" @input="inputValue = Math.abs(inputValue)" />
          <button @click="adjustInput(1)">+1</button>
          <button @click="adjustInput(5)">+5</button>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="closeInput">Abbrechen</button>
          <button class="btn btn-primary" @click="confirmInput">Bestätigen</button>
        </div>
      </div>
    </div>

    <button class="btn btn-next" @click="endTurn">
      Zug beenden → {{ nextPlayerName }}
    </button>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'ActionPanel',
  props: {
    currentPlayer: Object,
    currentPlayerIndex: Number,
    players: Array
  },
  emits: ['next-turn'],
  setup(props, { emit }) {
    const actionLog = ref([])
    const showInput = ref(false)
    const inputTitle = ref('')
    const inputTarget = ref(null)
    const inputValue = ref(0)
    const inputType = ref('')

    const enemies = computed(() => {
      return props.players.filter((_, index) => index !== props.currentPlayerIndex)
    })

    const nextPlayerName = computed(() => {
      const nextIndex = (props.currentPlayerIndex + 1) % props.players.length
      return props.players[nextIndex]?.name || 'Nächster'
    })

    const quickAction = (type, delta) => {
      actionLog.value.push({
        type,
        playerId: props.currentPlayer?.id,
        delta,
        timestamp: Date.now()
      })
    }

    const showDamageInput = (enemy) => {
      inputTitle.value = 'Schaden an'
      inputTarget.value = enemy
      inputType.value = 'life'
      inputValue.value = 1
      showInput.value = true
    }

    const showCustomInput = () => {
      inputTitle.value = 'Punkte ändern'
      inputTarget.value = props.currentPlayer
      inputType.value = 'custom'
      inputValue.value = 0
      showInput.value = true
    }

    const adjustInput = (delta) => {
      inputValue.value += delta
    }

    const confirmInput = () => {
      if (inputType.value === 'life') {
        actionLog.value.push({
          type: 'life',
          playerId: inputTarget.value.id,
          playerName: inputTarget.value.name,
          delta: -inputValue.value,
          timestamp: Date.now()
        })
      } else if (inputType.value === 'poison') {
        actionLog.value.push({
          type: 'poison',
          playerId: inputTarget.value.id,
          playerName: inputTarget.value.name,
          delta: inputValue.value,
          timestamp: Date.now()
        })
      } else {
        actionLog.value.push({
          type: 'custom',
          playerId: inputTarget.value.id,
          playerName: inputTarget.value.name,
          delta: inputValue.value,
          timestamp: Date.now()
        })
      }
      closeInput()
    }

    const closeInput = () => {
      showInput.value = false
      inputValue.value = 0
      inputTarget.value = null
    }

    const endTurn = () => {
      emit('next-turn', [...actionLog.value])
      actionLog.value = []
    }

    return {
      enemies,
      nextPlayerName,
      actionLog,
      showInput,
      inputTitle,
      inputTarget,
      inputValue,
      inputType,
      quickAction,
      showDamageInput,
      showCustomInput,
      adjustInput,
      confirmInput,
      closeInput,
      endTurn
    }
  }
}
</script>

<style scoped>
.action-panel {
  background: rgba(0,0,0,0.4);
  border-radius: 16px;
  padding: 1rem;
}

.panel-header {
  text-align: center;
  font-size: 0.9rem;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #333;
}

.action-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-group {
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 0.8rem;
}

.group-label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.action-buttons, .enemy-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  min-width: 70px;
  padding: 0.6rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
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

.action-btn.heal {
  background: #14532d;
  color: #86efac;
}

.action-btn.poison {
  background: #581c87;
  color: #d8b4fe;
}

.action-btn.attack {
  background: #1e3a5f;
  color: #93c5fd;
}

.action-btn.special {
  background: #3a3a5a;
  color: #fff;
}

.btn-next {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  font-size: 1.1rem;
  background: #c41e3a;
}

.btn-next:hover {
  background: #a01830;
}

.custom-input-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.custom-input-modal {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 1.5rem;
  width: 90%;
  max-width: 320px;
  text-align: center;
}

.custom-input-modal h3 {
  margin-bottom: 0.5rem;
  color: #fff;
}

.custom-input-modal p {
  color: #888;
  margin-bottom: 1rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.input-row button {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #3a3a5a;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.input-row button:hover {
  background: #4a4a6a;
}

.input-row input {
  width: 80px;
  height: 44px;
  text-align: center;
  font-size: 1.5rem;
  background: #0a0a15;
  border: 2px solid #3a3a5a;
  border-radius: 8px;
  color: #fff;
}

.modal-buttons {
  display: flex;
  gap: 0.5rem;
}

.modal-buttons .btn {
  flex: 1;
}
</style>
