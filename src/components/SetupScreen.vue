<template>
  <div class="setup">
    <div class="player-count">
      <label>Spieleranzahl: {{ playerCount }}</label>
      <div class="count-controls">
        <button class="btn-count" @click="decreaseCount" :disabled="playerCount <= 2">-</button>
        <button class="btn-count" @click="increaseCount" :disabled="playerCount >= 6">+</button>
      </div>
    </div>

    <div class="players-list">
      <div v-for="(player, index) in players" :key="index" class="player-input">
        <div class="player-number">{{ index + 1 }}</div>
        <div class="input-group">
          <input 
            type="text" 
            v-model="player.name" 
            placeholder="Spielername"
            class="input"
          />
          <input 
            type="text" 
            v-model="player.commander" 
            placeholder="Commander"
            class="input"
          />
        </div>
        <button v-if="playerCount > 2" class="btn-remove" @click="removePlayer(index)">×</button>
      </div>
    </div>

    <button 
      v-if="playerCount < 6" 
      class="btn btn-add" 
      @click="addPlayer"
    >
      + Spieler hinzufügen
    </button>

    <button 
      class="btn btn-primary btn-start" 
      @click="startGame"
      :disabled="!canStart"
    >
      Spiel starten
    </button>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'SetupScreen',
  props: {
    savedGames: {
      type: Array,
      default: () => []
    }
  },
  emits: ['start-game'],
  setup(props, { emit }) {
    const playerCount = ref(4)
    const players = ref([
      { name: '', commander: '' },
      { name: '', commander: '' },
      { name: '', commander: '' },
      { name: '', commander: '' }
    ])

    const canStart = computed(() => {
      return players.value.slice(0, playerCount.value).every(p => p.name.trim() !== '')
    })

    const decreaseCount = () => {
      if (playerCount.value > 2) {
        playerCount.value--
      }
    }

    const increaseCount = () => {
      if (playerCount.value < 6) {
        playerCount.value++
      }
    }

    const addPlayer = () => {
      if (playerCount.value < 6) {
        playerCount.value++
      }
    }

    const removePlayer = (index) => {
      if (playerCount.value > 2) {
        playerCount.value--
        players.value.splice(index, 1)
      }
    }

    const startGame = () => {
      if (canStart.value) {
        emit('start-game', players.value.slice(0, playerCount.value))
      }
    }

    return {
      playerCount,
      players,
      canStart,
      decreaseCount,
      increaseCount,
      addPlayer,
      removePlayer,
      startGame
    }
  }
}
</script>

<style scoped>
.setup {
  max-width: 600px;
  margin: 0 auto;
}

.player-count {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.player-count label {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  color: #aaa;
}

.count-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.btn-count {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #c41e3a;
  background: transparent;
  color: #c41e3a;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-count:hover:not(:disabled) {
  background: #c41e3a;
  color: #fff;
}

.btn-count:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.player-input {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
}

.player-number {
  width: 36px;
  height: 36px;
  background: #c41e3a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input {
  padding: 0.7rem 1rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
}

.input::placeholder {
  color: #666;
}

.input:focus {
  outline: none;
  border-color: #c41e3a;
}

.btn-remove {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #4a4a6a;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: #c41e3a;
}

.btn-add {
  width: 100%;
  margin-top: 1rem;
  background: transparent;
  border: 2px dashed #3a3a5a;
  color: #888;
}

.btn-add:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.btn-start {
  width: 100%;
  margin-top: 2rem;
  padding: 1rem;
  font-size: 1.2rem;
}
</style>
