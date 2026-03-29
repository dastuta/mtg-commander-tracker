<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ActionType } from '@/types'
import { GAME_CONFIG } from '@/utils/constants'

const props = defineProps<{
  sourceName: string
  targetName: string
  sourceIsDefeated: boolean
  targetIsDefeated: boolean
  currentCommanderDamage: number
  isMultiTarget?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm', actionType: ActionType, value: number, lifelink: boolean): void
  (e: 'cancel'): void
}>()

const actionType = ref<ActionType>('damage')
const value = ref(1)
const lifelink = ref(false)

const singleTargetTypes: { type: ActionType; label: string; icon: string; color: string }[] = [
  { type: 'damage', label: 'Damage', icon: '⚔️', color: 'var(--color-damage)' },
  { type: 'infect', label: 'Poison', icon: '☠️', color: 'var(--color-poison)' },
  { type: 'commander_dmg', label: 'CMD', icon: '👑', color: 'var(--color-commander)' },
]

const multiTargetTypes: { type: ActionType; label: string; icon: string; color: string }[] = [
  { type: 'damage_all', label: 'All', icon: '💥', color: 'var(--color-damage)' },
  { type: 'damage_each', label: 'Opp', icon: '⚔️', color: 'var(--color-damage)' },
  { type: 'poison_all', label: 'Poison', icon: '☠️', color: 'var(--color-poison)' },
  { type: 'drain', label: 'Drain', icon: '🌿', color: 'var(--color-heal)' },
  { type: 'lifelink', label: 'LL', icon: '💚', color: 'var(--color-heal)' },
]

const actionTypes = computed(() => {
  return props.isMultiTarget ? multiTargetTypes : singleTargetTypes
})

const showLifelinkToggle = computed(() => {
  return ['damage', 'commander_dmg'].includes(actionType.value)
})

const maxCommanderDamage = GAME_CONFIG.maxCommanderDamage

const commanderDamageDisplay = computed(() => {
  if (actionType.value !== 'commander_dmg') return null
  return `${props.currentCommanderDamage}/${maxCommanderDamage}`
})

function increment() {
  value.value++
}

function decrement() {
  value.value = Math.max(0, value.value - 1)
}

function confirm() {
  emit('confirm', actionType.value, value.value, lifelink.value)
}

function cancel() {
  emit('cancel')
}
</script>

<template>
  <div class="modal-overlay" @click.self="cancel">
    <div class="action-modal">
      <header class="modal-header">
        <h2>Aktion</h2>
        <button class="btn-close" @click="cancel">✕</button>
      </header>

      <div class="modal-body">
        <div class="players-row">
          <div class="player-badge source">
            <span class="badge-icon">→</span>
            <span class="badge-name">{{ sourceName }}</span>
          </div>
          <template v-if="!isMultiTarget">
            <div class="arrow">→</div>
            <div class="player-badge target">
              <span class="badge-name">{{ targetName }}</span>
              <span class="badge-icon">←</span>
            </div>
          </template>
          <template v-else>
            <div class="arrow">→</div>
            <div class="player-badge target multi">
              <span class="badge-name">{{ targetName }}</span>
            </div>
          </template>
        </div>

        <div class="value-section">
          <button 
            class="value-btn decrement" 
            @click="decrement"
            :disabled="value <= 0"
          >
            −
          </button>
          <div class="value-display">
            <span class="value-number">{{ value }}</span>
            <span v-if="commanderDamageDisplay" class="cmd-limit">
              {{ commanderDamageDisplay }}
            </span>
          </div>
          <button 
            class="value-btn increment" 
            @click="increment"
          >
            +
          </button>
        </div>

        <div class="action-types">
          <button
            v-for="action in actionTypes"
            :key="action.type"
            class="action-btn"
            :class="{ active: actionType === action.type }"
            :style="{ '--action-color': action.color }"
            @click="actionType = action.type"
          >
            <span class="action-icon">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </button>
        </div>

        <div v-if="showLifelinkToggle" class="lifelink-toggle">
          <label class="toggle-label">
            <input type="checkbox" v-model="lifelink" class="toggle-input">
            <span class="toggle-switch"></span>
            <span class="toggle-text">
              <span class="toggle-icon">💚</span>
              <span>+ Selbst heilen</span>
            </span>
          </label>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="btn btn-secondary" @click="cancel">
          Abbrechen
        </button>
        <button 
          class="btn btn-primary" 
          @click="confirm"
          :disabled="value <= 0"
        >
          Bestätigen
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-lg);
}

.action-modal {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  animation: modalIn 0.2s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
}

.modal-body {
  padding: var(--space-lg);
}

.players-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.player-badge {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
}

.player-badge.source {
  border-color: var(--color-damage);
}

.player-badge.target {
  border-color: var(--color-heal);
}

.player-badge.target.multi {
  border-color: var(--color-commander);
  background: color-mix(in srgb, var(--color-commander) 15%, transparent);
}

.badge-icon {
  font-size: var(--font-size-lg);
}

.badge-name {
  font-weight: 600;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  font-size: var(--font-size-xl);
  color: var(--color-text-muted);
}

.value-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.value-btn {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.value-btn:hover:not(:disabled) {
  background: var(--color-bg-tertiary);
  transform: scale(1.05);
}

.value-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.value-btn.decrement:hover:not(:disabled) {
  background: var(--color-life-damage);
  border-color: var(--color-life-damage);
  color: white;
}

.value-btn.increment:hover:not(:disabled) {
  background: var(--color-life-heal);
  border-color: var(--color-life-heal);
  color: white;
}

.value-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.value-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.value-number {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  line-height: 1;
}

.cmd-limit {
  font-size: var(--font-size-sm);
  color: var(--color-commander);
  margin-top: var(--space-xs);
}

.action-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.lifelink-toggle {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  background: var(--color-bg-tertiary);
  border-radius: 14px;
  transition: background var(--transition-fast);
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-fast);
}

.toggle-input:checked + .toggle-switch {
  background: var(--color-heal);
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(24px);
}

.toggle-text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
}

.toggle-icon {
  font-size: var(--font-size-lg);
}

.toggle-input:checked ~ .toggle-text {
  color: var(--color-heal);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-bg-tertiary);
}

.action-btn.active {
  border-color: var(--action-color);
  background: color-mix(in srgb, var(--action-color) 20%, transparent);
}

.action-icon {
  font-size: var(--font-size-xl);
}

.action-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.action-btn.active .action-label {
  color: var(--action-color);
}

.modal-footer {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-tertiary);
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
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
  background: var(--color-bg-secondary);
}
</style>
