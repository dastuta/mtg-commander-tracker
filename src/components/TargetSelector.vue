<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/types'

const props = defineProps<{
  sourcePlayer: Player
  players: Player[]
}>()

const emit = defineEmits<{
  (e: 'select-target', targetId: string): void
  (e: 'close'): void
}>()

const availableTargets = computed(() => {
  return props.players.filter(p => 
    p.id !== props.sourcePlayer.id && !p.isDefeated
  )
})

const selfTarget = computed(() => {
  return !props.sourcePlayer.isDefeated
})

function selectTarget(targetId: string) {
  emit('select-target', targetId)
}

function selectSelf() {
  emit('select-target', props.sourcePlayer.id)
}
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="selector-panel">
      <header class="panel-header">
        <div class="source-info">
          <span class="arrow-icon">→</span>
          <span class="source-name">{{ sourcePlayer.name }}</span>
        </div>
        <span class="hint">Wähle das Ziel</span>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </header>

      <div class="targets-list">
        <button 
          v-if="selfTarget"
          class="target-btn self"
          @click="selectSelf"
        >
          <span class="target-icon">↺</span>
          <span class="target-name">{{ sourcePlayer.name }}</span>
          <span class="target-label">(Selbst)</span>
        </button>

        <button
          v-for="target in availableTargets"
          :key="target.id"
          class="target-btn"
          @click="selectTarget(target.id)"
        >
          <span class="target-icon">→</span>
          <span class="target-name">{{ target.name }}</span>
          <span v-if="target.commander" class="target-commander">{{ target.commander }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-lg);
}

.selector-panel {
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

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.source-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.arrow-icon {
  font-size: var(--font-size-xl);
  color: var(--color-commander);
}

.source-name {
  font-weight: 700;
  font-size: var(--font-size-lg);
}

.hint {
  flex: 1;
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
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

.targets-list {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.target-btn {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.target-btn:hover {
  border-color: var(--color-commander);
  background: var(--color-bg-tertiary);
}

.target-btn:hover .target-icon {
  color: var(--color-commander);
}

.target-btn.self {
  border-style: dashed;
}

.target-btn.self .target-icon {
  color: var(--color-text-muted);
}

.target-icon {
  font-size: var(--font-size-xl);
  color: var(--color-damage);
  transition: color var(--transition-fast);
}

.target-name {
  flex: 1;
  font-weight: 600;
  color: var(--color-text-primary);
}

.target-commander {
  font-size: var(--font-size-xs);
  color: var(--color-commander);
}

.target-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
