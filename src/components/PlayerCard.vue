<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Player } from '@/types'
import { gameStore } from '@/composables/useGameState'
import { GAME_CONFIG } from '@/utils/constants'

const props = defineProps<{
  player: Player
  isActive: boolean
  isFlipped?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-source', playerId: string): void
  (e: 'select-source-all', playerId: string): void
}>()

function selectSource() {
  if (!props.player.isDefeated) {
    emit('select-source', props.player.id)
  }
}

function selectSourceAll() {
  if (!props.player.isDefeated) {
    emit('select-source-all', props.player.id)
  }
}

const lifeColor = computed(() => {
  if (props.player.isDefeated) return 'var(--color-elimination)'
  if (props.player.life <= 10) return 'var(--color-life-damage)'
  return 'var(--color-life)'
})

const poisonDisplay = computed(() => {
  if (props.player.poison === 0) return null
  return `${props.player.poison}/${GAME_CONFIG.maxPoison}`
})

const commanderDamage = computed(() => {
  return gameStore.getCommanderDamageDisplay(props.player.id)
})

const commanderDamageList = computed(() => {
  const damage = gameStore.getCommanderDamageDisplay(props.player.id)
  return Object.entries(damage).map(([sourceId, dmg]) => {
    const sourcePlayer = gameStore.getPlayerById(sourceId)
    return {
      sourceId,
      sourceName: sourcePlayer?.name || 'Unbekannt',
      damage: dmg,
      maxDamage: GAME_CONFIG.maxCommanderDamage
    }
  })
})

const hasCommanderDamage = computed(() => {
  return commanderDamageList.value.length > 0
})
</script>

<template>
  <div
    class="player-card"
    :class="{ 
      'is-active': isActive,
      'is-defeated': player.isDefeated,
      'is-flipped': isFlipped
    }"
  >
    <div class="player-header">
      <span class="player-name">{{ player.name }}</span>
      <span v-if="player.commander" class="commander-name">{{ player.commander }}</span>
    </div>
    
    <div class="life-display">
      <span class="life-value" :style="{ color: lifeColor }">
        {{ player.life }}
      </span>
      <span class="life-label">LP</span>
    </div>
    
    <div class="status-row">
      <div v-if="poisonDisplay" class="status-badge poison">
        <span class="badge-icon">☠️</span>
        <span class="badge-value">{{ poisonDisplay }}</span>
      </div>
      
      <div v-if="hasCommanderDamage" class="cmd-damages">
        <div 
          v-for="cmd in commanderDamageList" 
          :key="cmd.sourceId"
          class="cmd-badge"
          :class="{ 'near-limit': cmd.damage >= 18 }"
        >
          <span class="cmd-name">{{ cmd.sourceName }}</span>
          <span class="cmd-value">{{ cmd.damage }}/{{ cmd.maxDamage }}</span>
        </div>
      </div>
    </div>
    
    <div class="action-buttons">
      <button 
        class="action-btn"
        @click="selectSource"
        :disabled="player.isDefeated"
      >
        <span class="btn-arrow">→</span>
        <span class="btn-text">Aktion</span>
      </button>
      <button 
        class="action-btn action-all"
        @click="selectSourceAll"
        :disabled="player.isDefeated"
      >
        <span class="btn-arrow">⇉</span>
        <span class="btn-text">Alle</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--color-bg-card);
  border: 4px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
  user-select: none;
  position: relative;
}

.player-card.is-active {
  border-color: var(--color-commander);
  box-shadow: 0 0 30px rgba(192, 132, 252, 0.4);
}

.player-card.is-defeated {
  opacity: 0.4;
}

.player-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-md);
}

.player-name {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
}

.commander-name {
  font-size: var(--font-size-sm);
  color: var(--color-commander);
  text-align: center;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.life-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-md);
}

.life-value {
  font-size: 5rem;
  font-weight: 700;
  line-height: 1;
  transition: color var(--transition-base);
}

.life-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.status-row {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  min-height: 32px;
  margin-bottom: var(--space-md);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.status-badge.poison {
  background: var(--color-poison-bg);
  color: var(--color-poison);
}

.badge-icon {
  font-size: var(--font-size-base);
}

.badge-value {
  font-family: monospace;
}

.cmd-damages {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: center;
}

.cmd-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-commander-bg);
  color: var(--color-commander);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
}

.cmd-badge.near-limit {
  background: rgba(239, 68, 68, 0.3);
  color: var(--color-life-damage);
}

.cmd-name {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.cmd-badge.near-limit .cmd-name {
  color: var(--color-text-secondary);
}

.cmd-value {
  font-weight: 700;
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: var(--space-sm);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--color-commander);
  border-color: var(--color-commander);
}

.action-btn:hover:not(:disabled) .btn-arrow,
.action-btn:hover:not(:disabled) .btn-text {
  color: white;
}

.action-btn.action-all {
  background: var(--color-bg-tertiary);
}

.action-btn.action-all:hover:not(:disabled) {
  background: var(--color-damage);
  border-color: var(--color-damage);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-arrow {
  font-size: var(--font-size-lg);
  color: var(--color-commander);
  transition: color var(--transition-fast);
}

.btn-text {
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}
</style>
