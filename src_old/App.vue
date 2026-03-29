<template>
  <div class="app">
    <AuthScreen v-if="authState === 'loading' || authState === 'unauthenticated'" @auth-success="onAuthSuccess" />
    
    <template v-else>
      <header class="header">
        <h1>MTG Commander Tracker</h1>
        <div class="header-actions">
          <button v-if="currentUser" class="btn btn-icon" @click="logout" title="Abmelden">
            🚪
          </button>
          <span v-if="currentUser" class="user-email">{{ currentUser.username }}</span>
          <button v-if="gameState === 'setup' && currentUser" class="btn btn-secondary" @click="loadSavedGame" :disabled="savedGames.length === 0">
            Fortsetzen
          </button>
        </div>
      </header>

      <main class="main">
        <SetupScreen v-if="gameState === 'setup'" @start-game="startGame" :saved-games="savedGames" @show-stats="showStatistics" />
        <GameTable v-else-if="gameState === 'playing'" 
        :players="players" 
        :current-player-index="currentPlayerIndex" 
        :turn-duration="turnDuration" 
        :game-record="gameRecord"
        @next-turn="nextTurn" 
        @update-life="updateLife" 
        @update-poison="updatePoison"
        @update-tax="updateTax"
        @log-action="logAction"
        @commander-damage="handleCommanderDamage"
        @open-menu="menuOpen = true"
        @drain="handleDrain"
        @lifelink="handleLifelink"
        @dmg-each="handleDmgEach"
        @dmg-opponent="handleDmgOpponent"
        @mass-poison="handleMassPoison"
        @lose="handleLose"
        @win="handleWin"
        @end-game="endGameWithWinner" />
      <GameEnd v-else-if="gameState === 'ended'" 
        :players="players" 
        :game-record="gameRecord"
        @new-game="resetGame" 
        @save-game="saveGame" />
      <Statistics v-else-if="gameState === 'statistics'" @close="gameState = 'setup'" />
    </main>

    <GameMenu 
      v-if="menuOpen" 
      :undo-count="undoStack.length"
      @close="menuOpen = false"
      @undo="undo"
      @end-game="endGame"
    />
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AuthScreen from './components/AuthScreen.vue'
import SetupScreen from './components/SetupScreen.vue'
import GameTable from './components/GameTable.vue'
import GameEnd from './components/GameEnd.vue'
import GameMenu from './components/GameMenu.vue'
import Statistics from './components/Statistics.vue'
import api from './services/api.js'

const API_URL = import.meta.env.VITE_API_URL || ''

const GAME_RECORDS_KEY = 'mtg-commander-game-records'
let actionIdCounter = 0

const generateActionId = () => {
  return `action_${Date.now()}_${++actionIdCounter}`
}

export default {
  name: 'App',
  components: { AuthScreen, SetupScreen, GameTable, GameEnd, GameMenu, Statistics },
  setup() {
    const authState = ref('loading')
    const currentUser = ref(null)
    const gameState = ref('setup')
    const players = ref([])
    const currentPlayerIndex = ref(0)
    const turnStartTime = ref(Date.now())
    const turnDuration = ref(0)
    const gameRecord = ref(null)
    const savedGames = ref([])
    const commanderDamage = ref({})
    const undoStack = ref([])
    const menuOpen = ref(false)

    let timerInterval = null

    const currentPlayer = computed(() => players.value[currentPlayerIndex.value])

    const onAuthSuccess = (data) => {
      currentUser.value = data.user
      authState.value = 'authenticated'
      loadFromStorage()
    }

    const logout = () => {
      localStorage.removeItem('mtg_token')
      localStorage.removeItem('mtg_user')
      currentUser.value = null
      authState.value = 'loading'
    }

    const checkAuth = async () => {
      const token = localStorage.getItem('mtg_token')
      const savedUser = localStorage.getItem('mtg_user')
      
      if (token && savedUser) {
        try {
          const res = await fetch(API_URL + '/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            currentUser.value = JSON.parse(savedUser)
            authState.value = 'authenticated'
            loadFromStorage()
            return
          }
        } catch (e) {
          console.warn('Auth check failed, trying offline mode')
        }
        localStorage.removeItem('mtg_token')
        localStorage.removeItem('mtg_user')
      }
      authState.value = 'unauthenticated'
    }

    const createEmptyGameRecord = (playerList) => {
      return {
        id: `game_${Date.now()}`,
        startTime: Date.now(),
        endTime: null,
        players: playerList.map(p => ({
          id: p.id,
          name: p.name,
          commander: p.commander
        })),
        turns: [],
        currentTurn: {
          turnNumber: 1,
          playerId: playerList[0].id,
          playerName: playerList[0].name,
          startTime: Date.now(),
          actions: []
        },
        statistics: {
          totalDuration: 0,
          totalActions: 0
        }
      }
    }

    const addActionToRecord = (action) => {
      if (!gameRecord.value) return
      
      gameRecord.value.currentTurn.actions.push(action)
      gameRecord.value.statistics.totalActions++
    }

    const finalizeTurnRecord = () => {
      if (!gameRecord.value) return
      
      const currentTurn = gameRecord.value.currentTurn
      currentTurn.endTime = Date.now()
      currentTurn.duration = Math.floor((currentTurn.endTime - currentTurn.startTime) / 1000)
      
      gameRecord.value.turns.push({ ...currentTurn })
      gameRecord.value.statistics.totalDuration += currentTurn.duration
      
      gameRecord.value.currentTurn = {
        turnNumber: currentTurn.turnNumber + 1,
        playerId: players.value[currentPlayerIndex.value]?.id,
        playerName: players.value[currentPlayerIndex.value]?.name,
        startTime: Date.now(),
        actions: []
      }
    }

    const startGame = (playerList) => {
      const gamePlayers = playerList.map((p, index) => ({
        id: Date.now() + index,
        name: p.name,
        commander: p.commander,
        life: 40,
        poison: 0,
        tax1: 0,
        tax2: 0,
        turnCount: 0,
        defeated: false,
        defeatReason: null,
        defeatedBy: null
      }))

      players.value = gamePlayers
      commanderDamage.value = {}
      undoStack.value = []
      currentPlayerIndex.value = 0
      turnStartTime.value = Date.now()
      turnDuration.value = 0
      gameRecord.value = createEmptyGameRecord(gamePlayers)
      
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

    const nextTurn = () => {
      finalizeTurnRecord()

      players.value[currentPlayerIndex.value].turnCount++
      currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length

      if (gameRecord.value) {
        gameRecord.value.currentTurn.playerId = players.value[currentPlayerIndex.value].id
        gameRecord.value.currentTurn.playerName = players.value[currentPlayerIndex.value].name
      }

      turnStartTime.value = Date.now()
      turnDuration.value = 0
      saveToStorage()
    }

    const updateLife = (playerId, delta, sourceId = null) => {
      const player = players.value.find(p => p.id === playerId)
      const source = sourceId ? players.value.find(p => p.id === sourceId) : null
      
      if (player) {
        const previousValue = player.life
        const newValue = player.life + delta
        
        const action = {
          id: generateActionId(),
          timestamp: Date.now(),
          type: delta < 0 ? 'damage' : 'heal',
          category: 'life',
          source: source ? { id: source.id, name: source.name } : null,
          target: { id: player.id, name: player.name },
          value: delta,
          previousValue,
          newValue
        }
        
        undoStack.value.push({
          type: 'life',
          playerId,
          previousValue,
          newValue,
          actionId: action.id
        })
        
        if (undoStack.value.length > 20) {
          undoStack.value.shift()
        }
        
        addActionToRecord(action)
        
        player.life += delta
        if (player.life <= 0) {
          player.life = 0
          if (!player.defeated) {
            player.defeated = true
            player.defeatReason = 'life'
            
            addActionToRecord({
              id: generateActionId(),
              timestamp: Date.now(),
              type: 'defeat',
              category: 'system',
              source: source ? { id: source.id, name: source.name } : null,
              target: { id: player.id, name: player.name },
              value: 0,
              previousValue: 0,
              newValue: 0,
              metadata: { reason: 'life' }
            })
          }
        }
        saveToStorage()
      }
    }

    const updatePoison = (playerId, delta, sourceId = null) => {
      const player = players.value.find(p => p.id === playerId)
      const source = sourceId ? players.value.find(p => p.id === sourceId) : null
      
      if (player) {
        const previousValue = player.poison
        const newValue = Math.max(0, player.poison + delta)
        
        const action = {
          id: generateActionId(),
          timestamp: Date.now(),
          type: 'poison',
          category: 'poison',
          source: source ? { id: source.id, name: source.name } : null,
          target: { id: player.id, name: player.name },
          value: delta,
          previousValue,
          newValue
        }
        
        undoStack.value.push({
          type: 'poison',
          playerId,
          previousValue,
          newValue,
          actionId: action.id
        })
        
        if (undoStack.value.length > 20) {
          undoStack.value.shift()
        }
        
        addActionToRecord(action)
        
        player.poison = Math.max(0, player.poison + delta)
        if (player.poison >= 10) {
          player.defeated = true
          player.defeatReason = 'poison'
          
          addActionToRecord({
            id: generateActionId(),
            timestamp: Date.now(),
            type: 'defeat',
            category: 'system',
            source: source ? { id: source.id, name: source.name } : null,
            target: { id: player.id, name: player.name },
            value: 0,
            previousValue: 0,
            newValue: 0,
            metadata: { reason: 'poison' }
          })
        }
        saveToStorage()
      }
    }

    const handleCommanderDamage = ({ sourceId, targetId, damage }) => {
      const key = `${String(sourceId)}-${String(targetId)}`
      const source = players.value.find(p => String(p.id) === String(sourceId))
      const target = players.value.find(p => String(p.id) === String(targetId))
      
      const newDamage = (commanderDamage.value[key] || 0) + damage
      commanderDamage.value = { ...commanderDamage.value, [key]: newDamage }
      
      const previousValue = newDamage - damage
      
      const action = {
        id: generateActionId(),
        timestamp: Date.now(),
        type: 'commander_damage',
        category: 'commander',
        source: { id: sourceId, name: source?.name || 'Unknown' },
        target: { id: targetId, name: target?.name || 'Unknown' },
        value: damage,
        previousValue,
        newValue: newDamage,
        metadata: { threshold: 20 }
      }
      
      undoStack.value.push({
        type: 'commander',
        key,
        previousValue,
        newValue: newDamage,
        actionId: action.id
      })
      
      if (undoStack.value.length > 20) {
        undoStack.value.shift()
      }
      
      addActionToRecord(action)
      
      if (newDamage > 20) {
        if (target && !target.defeated) {
          target.defeated = true
          target.defeatReason = 'commander'
          target.defeatedBy = source?.name || 'Commander'
          
          addActionToRecord({
            id: generateActionId(),
            timestamp: Date.now(),
            type: 'defeat',
            category: 'system',
            source: { id: sourceId, name: source?.name || 'Commander' },
            target: { id: targetId, name: target?.name || 'Unknown' },
            value: 0,
            previousValue: 0,
            newValue: 0,
            metadata: { reason: 'commander' }
          })
        }
      }
      
      saveToStorage()
    }

    const updateTax = (playerId, taxNumber, delta) => {
      const player = players.value.find(p => p.id === playerId)
      if (player) {
        const taxProp = taxNumber === 1 ? 'tax1' : 'tax2'
        player[taxProp] = Math.max(0, player[taxProp] + delta)
        saveToStorage()
      }
    }

    const handleDrain = ({ sourceId, value, opponentCount, totalDamage, targets }) => {
      const source = players.value.find(p => p.id === sourceId)
      
      targets.forEach(target => {
        updateLife(target.id, -value, sourceId)
      })
      
      const action = {
        id: generateActionId(),
        timestamp: Date.now(),
        type: 'drain_heal',
        category: 'drain',
        source: { id: sourceId, name: source?.name || 'Unknown' },
        target: { id: sourceId, name: source?.name || 'Unknown' },
        value: totalDamage,
        previousValue: 0,
        newValue: totalDamage,
        metadata: { damagePerTarget: value, targetCount: opponentCount, totalDamage }
      }
      addActionToRecord(action)
    }

    const handleLifelink = ({ sourceId, value, targets }) => {
      targets.forEach(target => {
        updateLife(target.id, -value, sourceId)
      })
      
      const source = players.value.find(p => p.id === sourceId)
      const action = {
        id: generateActionId(),
        timestamp: Date.now(),
        type: 'lifelink_heal',
        category: 'lifelink',
        source: { id: sourceId, name: source?.name || 'Unknown' },
        target: { id: sourceId, name: source?.name || 'Unknown' },
        value: value,
        previousValue: 0,
        newValue: value,
        metadata: { damageDealt: value, targetCount: targets.length }
      }
      addActionToRecord(action)
    }

    const handleDmgEach = ({ sourceId, value, targets }) => {
      targets.forEach(target => {
        updateLife(target.id, -value, sourceId)
      })
      
      updateLife(sourceId, -value, sourceId)
    }

    const handleDmgOpponent = ({ sourceId, value, targets }) => {
      targets.forEach(target => {
        updateLife(target.id, -value, sourceId)
      })
    }

    const handleMassPoison = ({ sourceId, value, targets }) => {
      targets.forEach(target => {
        updatePoison(target.id, value, sourceId)
      })
    }

    const handleLose = ({ playerId, playerName, reason }) => {
      const player = players.value.find(p => p.id === playerId)
      if (player && !player.defeated) {
        player.defeated = true
        player.defeatReason = reason || 'manual'
        
        addActionToRecord({
          id: generateActionId(),
          timestamp: Date.now(),
          type: 'defeat',
          category: 'system',
          source: null,
          target: { id: player.id, name: player.name },
          value: 0,
          previousValue: 0,
          newValue: 0,
          metadata: { reason }
        })
        
        saveToStorage()
      }
    }

    const handleWin = ({ playerId, playerName, reason }) => {
      addActionToRecord({
        id: generateActionId(),
        timestamp: Date.now(),
        type: 'victory',
        category: 'system',
        source: null,
        target: { id: playerId, name: playerName },
        value: 0,
        previousValue: 0,
        newValue: 0,
        metadata: { reason }
      })
      
      saveToStorage()
    }

    const endGameWithWinner = ({ winner, reason }) => {
      if (gameRecord.value) {
        gameRecord.value.winner = {
          id: winner.id,
          name: winner.name,
          reason
        }
      }
      endGame()
    }

    const undo = () => {
      if (undoStack.value.length === 0) return
      
      const lastAction = undoStack.value.pop()
      
      if (lastAction.type === 'life') {
        const player = players.value.find(p => p.id === lastAction.playerId)
        if (player) {
          player.life = lastAction.previousValue
          if (lastAction.previousValue > 0) {
            player.defeated = false
            player.defeatReason = null
          }
        }
      } else if (lastAction.type === 'poison') {
        const player = players.value.find(p => p.id === lastAction.playerId)
        if (player) {
          player.poison = lastAction.previousValue
          if (lastAction.previousValue < 10) {
            player.defeated = false
            player.defeatReason = null
          }
        }
      } else if (lastAction.type === 'commander') {
        commanderDamage.value[lastAction.key] = lastAction.previousValue
      }
      
      saveToStorage()
    }

    const logAction = (action) => {
      addActionToRecord(action)
      saveToStorage()
    }

    const endGame = () => {
      stopTimer()
      finalizeTurnRecord()
      
      if (gameRecord.value) {
        gameRecord.value.endTime = Date.now()
        gameRecord.value.finalState = {
          life: players.value.reduce((acc, p) => ({ ...acc, [p.id]: p.life }), {}),
          poison: players.value.reduce((acc, p) => ({ ...acc, [p.id]: p.poison }), {}),
          commanderDamage: { ...commanderDamage.value },
          defeated: players.value.filter(p => p.defeated).map(p => ({
            id: p.id,
            name: p.name,
            reason: p.defeatReason,
            defeatedBy: p.defeatedBy
          }))
        }
      }
      
      gameState.value = 'ended'
      saveToStorage()
    }

    const resetGame = () => {
      stopTimer()
      players.value = []
      currentPlayerIndex.value = 0
      turnDuration.value = 0
      gameRecord.value = null
      commanderDamage.value = {}
      undoStack.value = []
      gameState.value = 'setup'
      localStorage.removeItem('mtg-commander-game')
    }

    const saveGame = async (name) => {
      if (!gameRecord.value) return
      
      const recordToSave = {
        ...gameRecord.value,
        name,
        savedAt: Date.now()
      }
      
      const records = JSON.parse(localStorage.getItem(GAME_RECORDS_KEY) || '[]')
      records.push(recordToSave)
      localStorage.setItem(GAME_RECORDS_KEY, JSON.stringify(records))
      
      if (currentUser.value) {
        try {
          const gamePlayers = players.value.map(p => ({
            name: p.name,
            commander: p.commander
          }))
          const result = await api.games.create(name, gamePlayers)
          
          const turns = [...(gameRecord.value.turns || []), gameRecord.value.currentTurn].filter(Boolean)
          await api.games.update(result.game.id, {
            endTime: Date.now(),
            totalDuration: gameRecord.value.statistics.totalDuration,
            totalActions: gameRecord.value.statistics.totalActions,
            winnerId: gameRecord.value.winner?.id,
            winnerReason: gameRecord.value.winner?.reason,
            players: players.value.map(p => ({
              player_name: p.name,
              commander_name: p.commander,
              final_life: p.life,
              final_poison: p.poison,
              defeated: p.defeated,
              defeat_reason: p.defeatReason,
              defeated_by: p.defeatedBy,
              turn_count: p.turnCount
            })),
            turns: turns.map((t, i) => ({
              turnNumber: t.turnNumber,
              playerId: t.playerId,
              playerName: t.playerName,
              startTime: t.startTime,
              endTime: t.endTime || Date.now(),
              duration: t.duration || 0
            })),
            actions: turns.flatMap(t => t.actions || []),
            commanderDamage: Object.entries(commanderDamage.value).map(([key, damage]) => {
              const [sourceId, targetId] = key.split('-')
              const source = players.value.find(p => String(p.id) === String(sourceId))
              const target = players.value.find(p => String(p.id) === String(targetId))
              return {
                sourcePlayerId: sourceId,
                sourcePlayerName: source?.name || 'Unknown',
                targetPlayerId: targetId,
                targetPlayerName: target?.name || 'Unknown',
                damage
              }
            })
          })
          
          recordToSave.id = result.game.id
          const idx = records.length - 1
          records[idx] = recordToSave
          localStorage.setItem(GAME_RECORDS_KEY, JSON.stringify(records))
        } catch (e) {
          console.warn('Failed to sync game to API:', e.message)
        }
      }
      
      savedGames.value = records
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
        gameRecord: gameRecord.value,
        currentPlayerIndex: currentPlayerIndex.value,
        commanderDamage: commanderDamage.value
      }))
    }

    const loadFromStorage = () => {
      const saved = localStorage.getItem(GAME_RECORDS_KEY)
      if (saved) {
        savedGames.value = JSON.parse(saved)
      }
      
      const game = localStorage.getItem('mtg-commander-game')
      if (game) {
        const data = JSON.parse(game)
        if (data.players && data.players.length > 0) {
          players.value = data.players
          gameRecord.value = data.gameRecord
          currentPlayerIndex.value = data.currentPlayerIndex || 0
          commanderDamage.value = data.commanderDamage || {}
          turnStartTime.value = Date.now()
          gameState.value = 'playing'
          startTimer()
        }
      }
    }

    onMounted(() => {
      checkAuth()
    })

    onUnmounted(() => {
      stopTimer()
    })

    const showStatistics = () => {
      gameState.value = 'statistics'
    }

    return {
      authState,
      currentUser,
      gameState,
      players,
      currentPlayerIndex,
      turnDuration,
      gameRecord,
      savedGames,
      commanderDamage,
      undoStack,
      menuOpen,
      startGame,
      nextTurn,
      updateLife,
      updatePoison,
      logAction,
      handleCommanderDamage,
      updateTax,
      handleDrain,
      handleLifelink,
      handleDmgEach,
      handleDmgOpponent,
      handleMassPoison,
      handleLose,
      handleWin,
      endGameWithWinner,
      undo,
      endGame,
      resetGame,
      showStatistics,
      saveGame,
      loadSavedGame,
      onAuthSuccess,
      logout
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
html, body {
  height: 100%;
  overflow: hidden;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #eee;
}
#app {
  height: 100%;
}
</style>

<style scoped>
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
