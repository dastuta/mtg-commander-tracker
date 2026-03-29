<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { gameStore } from '@/composables/useGameState'
import PlayerCard from '@/components/PlayerCard.vue'
import TargetSelector from '@/components/TargetSelector.vue'
import ActionModal from '@/components/ActionModal.vue'
import GameMenu from '@/components/GameMenu.vue'
import { formatDuration } from '@/utils/formatters'
import type { ActionType, ActionModalData } from '@/types'

const router = useRouter()
const showMenu = ref(false)

// Target Selector State
const showTargetSelector = ref(false)
const sourcePlayerId = ref('')

// Action Modal State
const showActionModal = ref(false)
const actionData = ref<ActionModalData>({
  sourcePlayerId: '',
  targetPlayerId: '',
  actionType: 'damage',
  value: 1,
})

const elapsedSeconds = ref(0)

// Timer
let timerInterval: number | null = null

// Start timer when game begins
if (gameStore.isGameActive.value && gameStore.gameState.value.startTime) {
  const startTime = new Date(gameStore.gameState.value.startTime).getTime()
  timerInterval = window.setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime) / 1000)
  }, 1000)
}

const currentPlayerName = computed(() => {
  return gameStore.currentPlayer.value?.name || ''
})

const players = computed(() => {
  return gameStore.gameState.value.players
})

const sourcePlayer = computed(() => {
  return gameStore.getPlayerById(sourcePlayerId.value)
})

const sourceName = computed(() => {
  return sourcePlayer.value?.name || ''
})

const isMultiTarget = computed(() => {
  return ['damage_all', 'damage_each', 'poison_all', 'drain', 'lifelink'].includes(actionData.value.actionType)
})

const targetName = computed(() => {
  if (isMultiTarget.value) {
    switch (actionData.value.actionType) {
      case 'damage_all': return 'Alle'
      case 'damage_each': return 'Alle Gegner'
      case 'poison_all': return 'Alle Gegner'
      case 'drain': return 'Alle + Heilung'
      case 'lifelink': return 'Alle + Heilung'
    }
  }
  return gameStore.getPlayerById(actionData.value.targetPlayerId)?.name || ''
})

const currentCommanderDamage = computed(() => {
  if (actionData.value.actionType !== 'commander_dmg') return 0
  return gameStore.getCommanderDamage(actionData.value.sourcePlayerId, actionData.value.targetPlayerId)
})

const playerCount = computed(() => gameStore.gameState.value.players.length)

const gridClass = computed(() => {
  const count = playerCount.value
  if (count <= 2) return 'grid-2'
  if (count === 3) return 'grid-3'
  if (count === 4) return 'grid-4'
  if (count === 5) return 'grid-5'
  return 'grid-6'
})

function isCardFlipped(index: number): boolean {
  const count = playerCount.value
  // Cards in the bottom row should be flipped (180 degrees)
  // Index is 0-based
  if (count === 2) return false
  if (count === 3) return false // Bottom center card not flipped
  if (count === 4) return index >= 2 // Bottom 2 cards (indices 2, 3)
  if (count === 5) return index >= 3 // Bottom 2 cards (indices 3, 4)
  if (count === 6) return index >= 3 // Bottom 3 cards (indices 3, 4, 5)
  return false
}

function onSelectSource(playerId: string) {
  sourcePlayerId.value = playerId
  showTargetSelector.value = true
}

function onSelectTarget(targetId: string) {
  showTargetSelector.value = false
  actionData.value.sourcePlayerId = sourcePlayerId.value
  actionData.value.targetPlayerId = targetId
  actionData.value.actionType = 'damage'
  actionData.value.value = 1
  showActionModal.value = true
}

function onTargetSelectorClose() {
  showTargetSelector.value = false
}

function onSelectSourceAll(playerId: string) {
  sourcePlayerId.value = playerId
  actionData.value.sourcePlayerId = playerId
  actionData.value.targetPlayerId = ''
  actionData.value.actionType = 'damage_all'
  actionData.value.value = 1
  showActionModal.value = true
}

function onModalConfirm(actionType: ActionType, value: number, lifelink: boolean = false) {
  const isMultiTarget = ['damage_all', 'damage_each', 'poison_all', 'drain', 'lifelink'].includes(actionType)
  
  if (isMultiTarget) {
    const targetMode = actionType === 'damage_all' ? 'all' : 'opponents'
    gameStore.performMultiTargetAction(
      actionData.value.sourcePlayerId,
      actionType,
      value,
      targetMode
    )
  } else {
    gameStore.performAction(
      actionData.value.sourcePlayerId,
      actionData.value.targetPlayerId,
      actionType,
      value,
      lifelink
    )
  }
  closeActionModal()
}

function closeActionModal() {
  showActionModal.value = false
  actionData.value.sourcePlayerId = ''
  actionData.value.targetPlayerId = ''
  sourcePlayerId.value = ''
}

function nextTurn() {
  gameStore.nextTurn()
}

function endGame() {
  router.push('/game/end')
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function goHome() {
  gameStore.resetGame()
  router.push('/')
}
</script>

<template>
  <div class="game-screen">
    <header class="header">
      <button class="btn-icon" @click="toggleMenu">☰</button>
      <div class="turn-info">
        <span class="turn-label">Zug {{ gameStore.gameState.value.currentTurnNumber }}</span>
        <span class="current-player">{{ currentPlayerName }}</span>
      </div>
      <div class="timer">
        {{ formatDuration(elapsedSeconds) }}
      </div>
    </header>

    <main class="game-table">
      <div class="player-grid" :class="gridClass">
        <PlayerCard
          v-for="(player, index) in players"
          :key="player.id"
          :player="player"
          :is-active="player.id === gameStore.currentPlayer.value?.id"
          :is-flipped="isCardFlipped(index)"
          @select-source="onSelectSource"
          @select-source-all="onSelectSourceAll"
        />
      </div>
    </main>

    <footer class="footer">
      <button class="btn btn-outline" @click="goHome">
        ← Zurück
      </button>
      <button class="btn btn-secondary" @click="gameStore.undoLastAction()">
        Undo
      </button>
      <button class="btn btn-primary" @click="nextTurn">
        Zug →
      </button>
    </footer>

    <GameMenu 
      v-if="showMenu"
      @close="showMenu = false"
    />

    <TargetSelector
      v-if="showTargetSelector && sourcePlayer"
      :source-player="sourcePlayer"
      :players="players"
      @select-target="onSelectTarget"
      @close="onTargetSelectorClose"
    />

    <ActionModal
      v-if="showActionModal"
      :source-name="sourceName"
      :target-name="targetName"
      :source-is-defeated="sourcePlayer?.isDefeated || false"
      :target-is-defeated="false"
      :current-commander-damage="currentCommanderDamage"
      :is-multi-target="isMultiTarget"
      @confirm="onModalConfirm"
      @cancel="closeActionModal"
    />
  </div>
</template>

<style scoped>
.game-screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--color-bg-primary);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.btn-icon {
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

.turn-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.turn-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.current-player {
  font-size: var(--font-size-base);
  font-weight: 600;
}

.timer {
  font-family: monospace;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  min-width: 60px;
  text-align: right;
}

.game-table {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background: linear-gradient(135deg, #1a472a 0%, #2d5a3f 50%, #1a472a 100%);
}

.player-grid {
  display: grid;
  gap: var(--space-md);
  width: 100%;
  height: 100%;
  max-width: 1000px;
  max-height: 700px;
}

/* 2 Spieler: 1 Reihe */
.player-grid.grid-2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr;
}

/* 3 Spieler: Oben 2, Unten 1 */
.player-grid.grid-3 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr 1fr;
}
.player-grid.grid-3 > :nth-child(3) {
  grid-column: 1 / -1;
}

/* 4 Spieler: 2x2 */
.player-grid.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

/* 5 Spieler: Oben 3, Unten 2 */
.player-grid.grid-5 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
}
.player-grid.grid-5 > :nth-child(4),
.player-grid.grid-5 > :nth-child(5) {
  grid-column: span 1;
}
.player-grid.grid-5 > :nth-child(4) {
  grid-column: 2 / 3;
}

/* 6 Spieler: 2x3 */
.player-grid.grid-6 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--color-commander);
  color: white;
}

.btn-primary:hover {
  background: #a855f7;
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary);
}

.btn-outline {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-outline:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}
</style>
