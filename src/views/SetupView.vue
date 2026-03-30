<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gameStore } from '@/composables/useGameState'
import { playerDatabase } from '@/composables/usePlayerDatabase'
import { GAME_CONFIG } from '@/utils/constants'

onMounted(() => {
  playerDatabase.loadFromAPI()
})

const router = useRouter()

const playerCount = ref(4)
const playerNames = ref<string[]>(['', '', '', ''])
const commanders = ref<(string | null)[]>([null, null, null, null])

const showPlayerSuggestions = ref<boolean[]>([false, false, false, false])
const showCommanderSuggestions = ref<boolean[]>([false, false, false, false])

function updatePlayerCount(count: number) {
  playerCount.value = count
  while (playerNames.value.length < count) {
    playerNames.value.push('')
    commanders.value.push(null)
    showPlayerSuggestions.value.push(false)
  }
}

function getSuggestions(name: string) {
  const players = playerDatabase.players.value
  if (!name.trim()) {
    return players.slice(0, 5)
  }
  const search = name.toLowerCase()
  return players
    .filter(p => p.name.toLowerCase().includes(search))
    .slice(0, 5)
}

function selectPlayer(index: number, player: typeof playerDatabase.players.value[0]) {
  playerNames.value[index] = player.name
  if (player.commanders.length > 0) {
    commanders.value[index] = player.commanders[0]
  }
  showPlayerSuggestions.value[index] = false
}

function onNameInput(index: number) {
  showPlayerSuggestions.value[index] = playerNames.value[index].length > 0
}

function onNameFocus(index: number) {
  showPlayerSuggestions.value[index] = true
}

function onNameBlur(index: number) {
  setTimeout(() => {
    showPlayerSuggestions.value[index] = false
  }, 200)
}

function hideCommanderSuggestions(index: number) {
  setTimeout(() => {
    showCommanderSuggestions.value[index] = false
  }, 200)
}

function selectCommander(index: number, commander: string) {
  commanders.value[index] = commander
  showCommanderSuggestions.value[index] = false
}

function getCommandersForCurrentPlayer(index: number): string[] {
  const name = playerNames.value[index]
  if (!name) return []
  return playerDatabase.getCommandersForPlayer(name)
}

function canStart(): boolean {
  return playerNames.value
    .slice(0, playerCount.value)
    .every(name => name.trim().length > 0)
}

function startGame() {
  if (!canStart()) return
  
  const names = playerNames.value.slice(0, playerCount.value)
  const cmdrs = commanders.value.slice(0, playerCount.value)
  
  for (let i = 0; i < names.length; i++) {
    playerDatabase.addPlayer(names[i].trim(), cmdrs[i])
  }
  
  gameStore.initGame(
    names.map(n => n.trim()),
    cmdrs
  )
  router.push('/game')
}

function cancel() {
  router.push('/')
}
</script>

<template>
  <div class="setup-screen">
    <header class="header">
      <button class="btn-back" @click="cancel">←</button>
      <h1>Spiel erstellen</h1>
    </header>

    <main class="content">
      <section class="section">
        <h2>Spieleranzahl</h2>
        <div class="player-count-selector">
          <button
            v-for="n in GAME_CONFIG.maxPlayers - GAME_CONFIG.minPlayers + 1"
            :key="n + GAME_CONFIG.minPlayers - 1"
            :class="['count-btn', { active: playerCount === n + GAME_CONFIG.minPlayers - 1 }]"
            @click="updatePlayerCount(n + GAME_CONFIG.minPlayers - 1)"
          >
            {{ n + GAME_CONFIG.minPlayers - 1 }}
          </button>
        </div>
      </section>

      <section class="section">
        <h2>Spieler</h2>
        <div class="players-grid">
          <div 
            v-for="i in playerCount" 
            :key="i"
            class="player-input"
          >
            <div class="player-header">
              <span class="player-number">{{ i }}</span>
              <div class="name-input-wrapper">
                <input
                  v-model="playerNames[i - 1]"
                  type="text"
                  :placeholder="`Spieler ${i}`"
                  maxlength="20"
                  class="input name-input"
                  @input="onNameInput(i - 1)"
                  @focus="onNameFocus(i - 1)"
                  @blur="onNameBlur(i - 1)"
                />
                <div v-if="showPlayerSuggestions[i - 1] && getSuggestions(playerNames[i - 1]).length > 0" class="suggestions-dropdown">
                  <button
                    v-for="player in getSuggestions(playerNames[i - 1])"
                    :key="player.id"
                    class="suggestion-item"
                    @click="selectPlayer(i - 1, player)"
                  >
                    <span class="suggestion-name">{{ player.name }}</span>
                    <span class="suggestion-games">{{ player.games }} Spiele</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="commander-row">
              <div class="commander-input-wrapper">
                <input
                  v-model="commanders[i - 1]"
                  type="text"
                  placeholder="Commander"
                  maxlength="50"
                  class="input commander-input"
                  @focus="showCommanderSuggestions[i - 1] = true"
                  @blur="hideCommanderSuggestions(i - 1)"
                />
                <div v-if="showCommanderSuggestions[i - 1] && getCommandersForCurrentPlayer(i - 1).length > 0" class="suggestions-dropdown commanders">
                  <button
                    v-for="cmd in getCommandersForCurrentPlayer(i - 1)"
                    :key="cmd"
                    class="suggestion-item"
                    @click="selectCommander(i - 1, cmd)"
                  >
                    <span class="commander-name">{{ cmd }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <button class="btn btn-secondary" @click="cancel">
        Abbrechen
      </button>
      <button 
        class="btn btn-primary"
        :disabled="!canStart()"
        @click="startGame"
      >
        Starten →
      </button>
    </footer>
  </div>
</template>

<style scoped>
.setup-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-primary);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.btn-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  cursor: pointer;
}

.header h1 {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.section {
  margin-bottom: var(--space-xl);
}

.section h2 {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-md);
}

.player-count-selector {
  display: flex;
  gap: var(--space-sm);
}

.count-btn {
  flex: 1;
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.count-btn.active {
  background: var(--color-commander);
  border-color: var(--color-commander);
  color: white;
}

.count-btn:hover:not(.active) {
  border-color: var(--color-text-muted);
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.player-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.player-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.player-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.name-input-wrapper {
  flex: 1;
  position: relative;
}

.input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.input::placeholder {
  color: var(--color-text-muted);
}

.name-input {
  font-weight: 500;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
}

.suggestion-item:hover {
  background: var(--color-bg-tertiary);
}

.suggestion-name {
  font-weight: 500;
}

.suggestion-games {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.commander-row {
  display: flex;
  gap: var(--space-sm);
}

.commander-input {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-commander);
}

.commander-input::placeholder {
  color: var(--color-text-muted);
}

.commander-input-wrapper {
  flex: 1;
  position: relative;
}

.suggestions-dropdown.commanders {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  max-height: 150px;
  overflow-y: auto;
}

.suggestions-dropdown.commanders .suggestion-item {
  padding: var(--space-sm) var(--space-md);
}

.commander-name {
  color: var(--color-commander);
  font-weight: 500;
}

.footer {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: var(--space-md) var(--space-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--color-commander);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #a855f7;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary);
}
</style>
