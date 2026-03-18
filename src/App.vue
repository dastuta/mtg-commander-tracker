<template>
  <div class="app">
    <header class="header">
      <h1>MTG Commander Tracker</h1>
      <button v-if="gameState === 'setup'" class="btn btn-secondary" @click="loadSavedGame" :disabled="savedGames.length === 0">
        Fortsetzen
      </button>
    </header>

    <main class="main">
      <SetupScreen v-if="gameState === 'setup'" @start-game="startGame" :saved-games="savedGames" />
      <GameTable v-else-if="gameState === 'playing'" :players="players" :current-player-index="currentPlayerIndex" :turn-duration="turnDuration" :turn-history="turnHistory" @next-turn="nextTurn" @update-life="updateLife" @update-poison="updatePoison" @end-game="endGame" />
      <GameEnd v-else-if="gameState === 'ended'" :players="players" :turn-history="turnHistory" @new-game="resetGame" @save-game="saveGame" />
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SetupScreen from './components/SetupScreen.vue'
import GameTable from './components/GameTable.vue'
import GameEnd from './components/GameEnd.vue'

export default {
  name: 'App',
  components: { SetupScreen, GameTable, GameEnd },
  setup() {
    const gameState = ref('setup')
    const players = ref([])
    const currentPlayerIndex = ref(0)
    const turnStartTime = ref(Date.now())
    const turnDuration = ref(0)
    const turnHistory = ref([])
    const savedGames = ref([])

    let timerInterval = null

    const currentPlayer = computed(() => players.value[currentPlayerIndex.value])

    const startGame = (playerList) => {
      players.value = playerList.map((p, index) => ({
        id: Date.now() + index,
        name: p.name,
        commander: p.commander,
        life: 40,
        poison: 0,
        turnCount: 0
      }))
      currentPlayerIndex.value = 0
      turnStartTime.value = Date.now()
      turnHistory.value = [{
        turnNumber: 1,
        playerId: players.value[0].id,
        playerName: players.value[0].name,
        startTime: Date.now(),
        duration: 0,
        actions: []
      }]
      gameState.value = 'playing'
      startTimer()
      saveToStorage()
    }

    const startTimer = () => {
      timerInterval = setInterval(() => {
        turnDuration.value = Math.floor((Date.now() - turnStartTime.value) / 1000)
      }, 1000)
    }

    const stopTimer = () => {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    }

    const nextTurn = (actionLog = []) => {
      const currentTurn = turnHistory.value[turnHistory.value.length - 1]
      currentTurn.duration = turnDuration.value
      currentTurn.actions = actionLog

      players.value[currentPlayerIndex.value].turnCount++

      currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length
      
      if (currentPlayerIndex.value === 0) {
        turnHistory.value.push({
          turnNumber: turnHistory.value.length + 1,
          playerId: players.value[0].id,
          playerName: players.value[0].name,
          startTime: Date.now(),
          duration: 0,
          actions: []
        })
      }

      turnStartTime.value = Date.now()
      turnDuration.value = 0
      saveToStorage()
    }

    const updateLife = (playerId, delta) => {
      const player = players.value.find(p => p.id === playerId)
      if (player) {
        player.life += delta
        const currentTurn = turnHistory.value[turnHistory.value.length - 1]
        currentTurn.actions.push({
          type: 'life',
          playerId,
          playerName: player.name,
          delta,
          newValue: player.life,
          timestamp: Date.now()
        })
        saveToStorage()
      }
    }

    const updatePoison = (playerId, delta) => {
      const player = players.value.find(p => p.id === playerId)
      if (player) {
        player.poison += delta
        const currentTurn = turnHistory.value[turnHistory.value.length - 1]
        currentTurn.actions.push({
          type: 'poison',
          playerId,
          playerName: player.name,
          delta,
          newValue: player.poison,
          timestamp: Date.now()
        })
        saveToStorage()
      }
    }

    const endGame = () => {
      stopTimer()
      gameState.value = 'ended'
      saveToStorage()
    }

    const resetGame = () => {
      stopTimer()
      players.value = []
      currentPlayerIndex.value = 0
      turnDuration.value = 0
      turnHistory.value = []
      gameState.value = 'setup'
      localStorage.removeItem('mtg-commander-game')
    }

    const saveGame = (name) => {
      const games = JSON.parse(localStorage.getItem('mtg-commander-saved') || '[]')
      games.push({
        name,
        timestamp: Date.now(),
        data: {
          players: players.value,
          turnHistory: turnHistory.value
        }
      })
      localStorage.setItem('mtg-commander-saved', JSON.stringify(games))
      savedGames.value = games
    }

    const loadSavedGame = (gameData) => {
      players.value = gameData.data.players
      turnHistory.value = gameData.data.turnHistory
      currentPlayerIndex.value = 0
      turnStartTime.value = Date.now()
      turnDuration.value = 0
      gameState.value = 'playing'
      startTimer()
    }

    const saveToStorage = () => {
      localStorage.setItem('mtg-commander-game', JSON.stringify({
        players: players.value,
        turnHistory: turnHistory.value,
        currentPlayerIndex: currentPlayerIndex.value
      }))
    }

    const loadFromStorage = () => {
      const saved = localStorage.getItem('mtg-commander-saved')
      if (saved) {
        savedGames.value = JSON.parse(saved)
      }
      
      const game = localStorage.getItem('mtg-commander-game')
      if (game) {
        const data = JSON.parse(game)
        if (data.players && data.players.length > 0) {
          players.value = data.players
          turnHistory.value = data.turnHistory || []
          currentPlayerIndex.value = data.currentPlayerIndex || 0
          turnStartTime.value = Date.now()
          gameState.value = 'playing'
          startTimer()
        }
      }
    }

    onMounted(() => {
      loadFromStorage()
    })

    onUnmounted(() => {
      stopTimer()
    })

    return {
      gameState,
      players,
      currentPlayerIndex,
      turnDuration,
      turnHistory,
      savedGames,
      startGame,
      nextTurn,
      updateLife,
      updatePoison,
      endGame,
      resetGame,
      saveGame,
      loadSavedGame
    }
  }
}
</script>

<style>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.3);
  border-bottom: 2px solid #c41e3a;
}

.header h1 {
  font-size: 1.2rem;
  color: #fff;
}

.main {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:active {
  transform: scale(0.95);
}

.btn-primary {
  background: #c41e3a;
  color: #fff;
}

.btn-primary:hover {
  background: #a01830;
}

.btn-secondary {
  background: #3a3a5a;
  color: #fff;
}

.btn-secondary:hover {
  background: #4a4a6a;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
