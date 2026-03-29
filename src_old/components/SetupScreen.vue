<template>
  <div class="setup">
    <div class="header-actions">
      <button class="btn btn-secondary" @click="showStats">
        📊 Statistiken
      </button>
      <button class="btn btn-secondary" @click="showPlayerManager = true">
        ⚙️ Spieler verwalten
      </button>
    </div>

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
          <div class="select-wrapper">
            <select 
              v-model="player.name" 
              class="select"
              @change="handlePlayerSelect(index)"
            >
              <option value="">Spieler wählen...</option>
              <option 
                v-for="p in availablePlayers(index)" 
                :key="p.id" 
                :value="p.name"
              >
                {{ p.name }}
              </option>
              <option value="__new__">+ Neuen Spieler erstellen</option>
            </select>
          </div>
          <div class="select-wrapper" v-if="player.name && player.name !== '__new__'">
            <select 
              v-model="player.commander" 
              class="select commander-select"
              placeholder="Commander wählen..."
              @change="handleCommanderSelect(index)"
            >
              <option value="">Commander wählen...</option>
              <option 
                v-for="cmd in getPlayerCommanders(player.name)" 
                :key="cmd" 
                :value="cmd"
              >
                {{ cmd }}
              </option>
              <option value="__new__">+ Neuen Commander erstellen</option>
            </select>
          </div>
          <input 
            v-else
            type="text" 
            v-model="player.commander" 
            placeholder="Commander eingeben..."
            class="input commander-input"
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

    <!-- New Player Modal -->
    <div v-if="showNewPlayerModal" class="modal-overlay" @click.self="showNewPlayerModal = false">
      <div class="modal">
        <h3>Neuen Spieler erstellen</h3>
        <input 
          type="text" 
          v-model="newPlayerName" 
          placeholder="Spielername"
          class="input"
          @keyup.enter="createPlayer"
          ref="newPlayerInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewPlayerModal = false">
            Abbrechen
          </button>
          <button class="btn btn-primary" @click="createPlayer" :disabled="!newPlayerName.trim()">
            Erstellen
          </button>
        </div>
      </div>
    </div>

    <!-- New Commander Modal -->
    <div v-if="showNewCommanderModal" class="modal-overlay" @click.self="showNewCommanderModal = false">
      <div class="modal">
        <h3>Neuen Commander erstellen</h3>
        <input 
          type="text" 
          v-model="newCommanderName" 
          placeholder="Commander Name"
          class="input"
          @keyup.enter="createCommanderForPlayer"
          ref="newCommanderInput"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewCommanderModal = false">
            Abbrechen
          </button>
          <button class="btn btn-primary" @click="createCommanderForPlayer" :disabled="!newCommanderName.trim()">
            Erstellen
          </button>
        </div>
      </div>
    </div>

    <!-- Player Manager Modal -->
    <div v-if="showPlayerManager" class="modal-overlay" @click.self="closePlayerManager">
      <div class="modal manager-modal">
        <h3>Spieler verwalten</h3>
        
        <!-- Player List -->
        <div v-if="!selectedPlayerDetail" class="player-list">
          <div 
            v-for="player in playerDatabase" 
            :key="player.id" 
            class="player-item clickable"
            @click="openPlayerDetail(player)"
          >
            <div class="player-info">
              <span class="player-name">{{ player.name }}</span>
              <span class="player-games">{{ player.games }} Spiele</span>
            </div>
            <span class="arrow">→</span>
          </div>
          <div v-if="playerDatabase.length === 0" class="empty-message">
            Noch keine Spieler erstellt
          </div>
        </div>

        <!-- Player Detail with Commander List -->
        <div v-else class="player-detail">
          <button class="btn-back-detail" @click="selectedPlayerDetail = null">
            ← Zurück
          </button>
          <div class="player-detail-header">
            <h4>{{ selectedPlayerDetail.name }}</h4>
            <span class="player-games">{{ selectedPlayerDetail.games }} Spiele</span>
          </div>
          
          <div class="commander-section">
            <div class="commander-header">
              <h5>Commander</h5>
              <button class="btn-add-commander" @click="showAddCommanderInput = !showAddCommanderInput">
                + Commander hinzufügen
              </button>
            </div>
            
            <div v-if="showAddCommanderInput" class="add-commander">
              <input 
                type="text" 
                v-model="newCommanderName" 
                placeholder="Neuer Commander..."
                class="input"
                @keyup.enter="addCommander"
                ref="commanderInput"
              />
              <button class="btn btn-primary btn-add-cmd" @click="addCommander" :disabled="!newCommanderName.trim()">
                +
              </button>
            </div>
            
            <div class="commander-list">
              <div 
                v-for="(cmd, index) in selectedPlayerDetail.commanders" 
                :key="index" 
                class="commander-item"
              >
                <span class="commander-name">{{ cmd }}</span>
                <button class="btn-remove-cmd" @click="removeCommander(index)">×</button>
              </div>
              <div v-if="!selectedPlayerDetail.commanders || selectedPlayerDetail.commanders.length === 0" class="empty-commander">
                Keine Commander gespeichert
              </div>
            </div>
          </div>

          <button class="btn btn-danger" @click="confirmDeletePlayer">
            🗑️ Spieler löschen
          </button>
        </div>

        <button v-if="!selectedPlayerDetail" class="btn btn-primary" @click="showPlayerManager = false">
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted } from 'vue'
import api from '../services/api.js'

const PLAYER_DB_KEY = 'mtg-commander-players'
const GAME_RECORDS_KEY = 'mtg-commander-game-records'

const playerDatabase = ref([])
const savedGameRecords = ref([])
const isOnline = ref(false)

const loadPlayerDatabase = async () => {
  try {
    const { players } = await api.players.getAll()
    playerDatabase.value = players.map(p => ({
      id: p.id,
      name: p.name,
      games: p.games_played || 0,
      commanders: p.commanders || []
    }))
    localStorage.setItem(PLAYER_DB_KEY, JSON.stringify(playerDatabase.value))
    isOnline.value = true
  } catch (e) {
    console.warn('API unavailable, using localStorage:', e.message)
    const saved = localStorage.getItem(PLAYER_DB_KEY)
    if (saved) {
      playerDatabase.value = JSON.parse(saved)
    }
    isOnline.value = false
  }
}

const loadSavedGameRecords = () => {
  const saved = localStorage.getItem(GAME_RECORDS_KEY)
  if (saved) {
    savedGameRecords.value = JSON.parse(saved)
  }
}

const savePlayerDatabase = () => {
  localStorage.setItem(PLAYER_DB_KEY, JSON.stringify(playerDatabase.value))
}

const addPlayerToDb = async (name) => {
  const existing = playerDatabase.value.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!existing) {
    const newPlayer = {
      id: Date.now(),
      name: name.trim(),
      games: 0,
      commanders: []
    }
    playerDatabase.value.push(newPlayer)
    
    if (isOnline.value) {
      try {
        const result = await api.players.create(name.trim())
        newPlayer.id = result.player.id
      } catch (e) {
        console.warn('Failed to sync player to API:', e.message)
      }
    }
    savePlayerDatabase()
  }
}

const addCommanderToPlayer = async (playerName, commander) => {
  const player = playerDatabase.value.find(p => p.name.toLowerCase() === playerName.toLowerCase())
  if (player && commander.trim()) {
    if (!player.commanders) {
      player.commanders = []
    }
    if (!player.commanders.includes(commander.trim())) {
      player.commanders.unshift(commander.trim())
      if (player.commanders.length > 10) {
        player.commanders.pop()
      }
    }
    
    if (isOnline.value && player.id && !String(player.id).startsWith('1')) {
      try {
        await api.players.addCommander(player.id, commander.trim())
      } catch (e) {
        console.warn('Failed to sync commander to API:', e.message)
      }
    }
    savePlayerDatabase()
  }
}

const incrementPlayerGames = (name) => {
  const player = playerDatabase.value.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (player) {
    player.games++
    savePlayerDatabase()
  }
}

const removePlayerFromDb = async (id) => {
  playerDatabase.value = playerDatabase.value.filter(p => p.id !== id)
  if (isOnline.value && id && !String(id).startsWith('1')) {
    try {
      await api.players.delete(id)
    } catch (e) {
      console.warn('Failed to delete player from API:', e.message)
    }
  }
  savePlayerDatabase()
}

const openPlayerDetail = (player) => {
  selectedPlayerDetail.value = player
  newCommanderName.value = ''
}

const closePlayerManager = () => {
  showPlayerManager.value = false
  selectedPlayerDetail.value = null
}

const addCommander = () => {
  if (selectedPlayerDetail.value && newCommanderName.value.trim()) {
    if (!selectedPlayerDetail.value.commanders) {
      selectedPlayerDetail.value.commanders = []
    }
    selectedPlayerDetail.value.commanders.unshift(newCommanderName.value.trim())
    savePlayerDatabase()
    newCommanderName.value = ''
  }
}

const removeCommander = (playerId, index) => {
  const player = playerDatabase.value.find(p => p.id === playerId)
  if (player && player.commanders) {
    player.commanders.splice(index, 1)
    if (selectedPlayerDetail.value && selectedPlayerDetail.value.id === playerId) {
      selectedPlayerDetail.value.commanders = [...player.commanders]
    }
    savePlayerDatabase()
  }
}

const deletePlayer = () => {
  if (selectedPlayerDetail.value) {
    removePlayerFromDb(selectedPlayerDetail.value.id)
    selectedPlayerDetail.value = null
  }
}

export default {
  name: 'SetupScreen',
  props: {
    savedGames: {
      type: Array,
      default: () => []
    }
  },
  emits: ['start-game', 'show-stats'],
  setup(props, { emit }) {
    const playerCount = ref(4)
    const players = ref([
      { name: '', commander: '' },
      { name: '', commander: '' },
      { name: '', commander: '' },
      { name: '', commander: '' }
    ])

    const showNewPlayerModal = ref(false)
    const showNewCommanderModal = ref(false)
    const showPlayerManager = ref(false)
    const selectedPlayerDetail = ref(null)
    const showAddCommanderInput = ref(false)
    const newPlayerName = ref('')
    const newPlayerInput = ref(null)
    const pendingPlayerIndex = ref(null)
    const newCommanderName = ref('')
    const newCommanderInput = ref(null)
    const pendingCommanderIndex = ref(null)

    onMounted(() => {
      loadPlayerDatabase()
      loadSavedGameRecords()
    })

    const canStart = computed(() => {
      return players.value.slice(0, playerCount.value).every(p => p.name.trim() !== '' && p.name !== '__new__')
    })

    const availablePlayers = (currentIndex) => {
      const selectedNames = players.value
        .filter((p, i) => i !== currentIndex)
        .map(p => p.name)
        .filter(n => n && n !== '__new__')
      
      return playerDatabase.value.filter(p => !selectedNames.includes(p.name))
    }

    const recentCommanders = computed(() => {
      const commandSet = new Set()
      playerDatabase.value.forEach(p => {
        if (p.commanders && p.commanders.length > 0) {
          p.commanders.forEach(c => commandSet.add(c))
        }
      })
      return Array.from(commandSet).slice(0, 10)
    })

    const getPlayerCommanders = (playerName) => {
      const player = playerDatabase.value.find(p => p.name.toLowerCase() === playerName.toLowerCase())
      return player?.commanders || []
    }

    const handlePlayerSelect = (index) => {
      const player = players.value[index]
      if (player.name === '__new__') {
        player.name = ''
        showNewPlayerModal.value = true
        newPlayerName.value = ''
        pendingPlayerIndex.value = index
        nextTick(() => {
          newPlayerInput.value?.focus()
        })
      }
    }

    const handleCommanderSelect = (index) => {
      const player = players.value[index]
      if (player.commander === '__new__') {
        player.commander = ''
        showNewCommanderModal.value = true
        newCommanderName.value = ''
        pendingCommanderIndex.value = index
        nextTick(() => {
          newCommanderInput.value?.focus()
        })
      }
    }

    const createCommanderForPlayer = () => {
      if (newCommanderName.value.trim() && pendingCommanderIndex.value !== null) {
        const player = players.value[pendingCommanderIndex.value]
        player.commander = newCommanderName.value.trim()
        
        const dbPlayer = playerDatabase.value.find(p => p.name.toLowerCase() === player.name.toLowerCase())
        if (dbPlayer) {
          if (!dbPlayer.commanders) {
            dbPlayer.commanders = []
          }
          if (!dbPlayer.commanders.includes(newCommanderName.value.trim())) {
            dbPlayer.commanders.unshift(newCommanderName.value.trim())
          }
          savePlayerDatabase()
        }
        
        showNewCommanderModal.value = false
        newCommanderName.value = ''
        pendingCommanderIndex.value = null
      }
    }

    const createPlayer = () => {
      if (newPlayerName.value.trim()) {
        addPlayerToDb(newPlayerName.value.trim())
        if (pendingPlayerIndex.value !== null) {
          players.value[pendingPlayerIndex.value].name = newPlayerName.value.trim()
        }
        showNewPlayerModal.value = false
        newPlayerName.value = ''
        pendingPlayerIndex.value = null
      }
    }

    const decreaseCount = () => {
      if (playerCount.value > 2) {
        playerCount.value--
        players.value.pop()
      }
    }

    const increaseCount = () => {
      if (playerCount.value < 6) {
        players.value.push({ name: '', commander: '' })
        playerCount.value++
      }
    }

    const addPlayer = () => {
      if (playerCount.value < 6) {
        players.value.push({ name: '', commander: '' })
        playerCount.value++
      }
    }

    const removePlayer = (index) => {
      if (playerCount.value > 2) {
        players.value.splice(index, 1)
        playerCount.value--
      }
    }

    const openPlayerDetail = (player) => {
      selectedPlayerDetail.value = { ...player }
      newCommanderName.value = ''
    }

    const closePlayerManager = () => {
      showPlayerManager.value = false
      selectedPlayerDetail.value = null
    }

    const addCommander = () => {
      if (selectedPlayerDetail.value && newCommanderName.value.trim()) {
        const dbPlayer = playerDatabase.value.find(p => p.id === selectedPlayerDetail.value.id)
        if (dbPlayer) {
          if (!dbPlayer.commanders) {
            dbPlayer.commanders = []
          }
          if (!dbPlayer.commanders.includes(newCommanderName.value.trim())) {
            dbPlayer.commanders.unshift(newCommanderName.value.trim())
          }
          selectedPlayerDetail.value.commanders = [...dbPlayer.commanders]
          savePlayerDatabase()
        }
        newCommanderName.value = ''
      }
    }

    const removeCommander = (index) => {
      if (selectedPlayerDetail.value) {
        const dbPlayer = playerDatabase.value.find(p => p.id === selectedPlayerDetail.value.id)
        if (dbPlayer && dbPlayer.commanders) {
          dbPlayer.commanders.splice(index, 1)
          selectedPlayerDetail.value.commanders = [...dbPlayer.commanders]
          savePlayerDatabase()
        }
      }
    }

    const deletePlayer = () => {
      if (selectedPlayerDetail.value) {
        playerDatabase.value = playerDatabase.value.filter(p => p.id !== selectedPlayerDetail.value.id)
        savePlayerDatabase()
        selectedPlayerDetail.value = null
      }
    }

    const confirmDeletePlayer = () => {
      if (confirm(`${selectedPlayerDetail.value.name} wirklich löschen?`)) {
        deletePlayer()
      }
    }

    const startGame = () => {
      if (canStart.value) {
        const gamePlayers = players.value.slice(0, playerCount.value).map(p => {
          addPlayerToDb(p.name)
          addCommanderToPlayer(p.name, p.commander)
          return { name: p.name, commander: p.commander }
        })
        
        gamePlayers.forEach(p => incrementPlayerGames(p.name))
        
        emit('start-game', gamePlayers)
      }
    }

    const showStats = () => {
      emit('show-stats')
    }

    return {
      playerCount,
      players,
      canStart,
      showNewPlayerModal,
      showPlayerManager,
      newPlayerName,
      newPlayerInput,
      pendingPlayerIndex,
      newCommanderName,
      newCommanderInput,
      pendingCommanderIndex,
      playerDatabase,
      selectedPlayerDetail,
      showAddCommanderInput,
      showNewCommanderModal,
      availablePlayers,
      recentCommanders,
      getPlayerCommanders,
      handlePlayerSelect,
      handleCommanderSelect,
      createCommanderForPlayer,
      createPlayer,
      decreaseCount,
      increaseCount,
      addPlayer,
      removePlayer,
      removePlayerFromDb,
      openPlayerDetail,
      closePlayerManager,
      addCommander,
      removeCommander,
      confirmDeletePlayer,
      deletePlayer,
      showStats,
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

.header-actions {
  margin-bottom: 1rem;
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

.select-wrapper {
  position: relative;
}

.select {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  appearance: none;
}

.select:focus {
  outline: none;
  border-color: #c41e3a;
}

.select option {
  background: #1a1a2e;
  color: #fff;
}

.input {
  padding: 0.7rem 1rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
}

.commander-select {
  background: rgba(124, 58, 237, 0.1);
  border-color: #7c3aed;
}

.commander-input {
  margin-top: 0;
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

.modal-overlay {
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

.modal {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 350px;
  border: 2px solid #c41e3a;
}

.modal h3 {
  margin-bottom: 1rem;
  color: #fff;
  text-align: center;
}

.modal .input {
  width: 100%;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
}

.modal-actions .btn {
  flex: 1;
}

.manager-modal {
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.player-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  max-height: 300px;
}

.player-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-name {
  color: #fff;
  font-weight: bold;
}

.player-games {
  font-size: 0.75rem;
  color: #888;
}

.player-commanders {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.commander-tag {
  font-size: 0.6rem;
  padding: 0.1rem 0.4rem;
  background: rgba(124, 58, 237, 0.3);
  border-radius: 4px;
  color: #d8b4fe;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.empty-message {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.empty-commander {
  text-align: center;
  color: #666;
  padding: 1rem;
  font-size: 0.85rem;
}

.player-item.clickable {
  cursor: pointer;
  transition: background 0.2s;
}

.player-item.clickable:hover {
  background: rgba(255,255,255,0.1);
}

.player-item.clickable .arrow {
  color: #888;
  font-size: 1.2rem;
}

.player-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-back-detail {
  background: none;
  border: none;
  color: #888;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  padding: 0;
  margin-bottom: 0.5rem;
}

.btn-back-detail:hover {
  color: #c41e3a;
}

.player-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #333;
}

.player-detail-header h4 {
  color: #fff;
  font-size: 1.2rem;
}

.commander-section {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 1rem;
}

.commander-section h5 {
  color: #7c3aed;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
}

.commander-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.btn-add-commander {
  background: #7c3aed;
  border: none;
  color: #fff;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add-commander:hover {
  background: #6d28d9;
}

.add-commander {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.commander-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 0.75rem;
}

.commander-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(124, 58, 237, 0.1);
  border-radius: 6px;
  margin-bottom: 0.4rem;
}

.commander-name {
  color: #d8b4fe;
  font-size: 0.9rem;
}

.btn-remove-cmd {
  background: none;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-remove-cmd:hover {
  opacity: 1;
  color: #c41e3a;
}

.add-commander {
  display: flex;
  gap: 0.5rem;
}

.add-commander .input {
  flex: 1;
  margin-bottom: 0;
}

.btn-add-cmd {
  padding: 0.5rem 0.75rem;
  font-size: 1.2rem;
}

.add-commander {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.add-commander .input {
  flex: 1;
  margin-bottom: 0;
}

.btn-danger {
  background: #7f1d1d;
  color: #fca5a5;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-danger:hover {
  background: #991b1b;
}
</style>
