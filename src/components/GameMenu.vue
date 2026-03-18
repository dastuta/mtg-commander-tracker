<template>
  <div class="game-menu-overlay" @click.self="close">
    <div class="game-menu">
      <div class="menu-header">
        <span>Menü</span>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="menu-actions">
        <button class="menu-btn undo-btn" @click="undo" :disabled="undoCount === 0">
          <span class="btn-icon">↩</span>
          <span class="btn-text">Undo</span>
          <span class="btn-count">{{ undoCount }}/5</span>
        </button>

        <button class="menu-btn end-btn" @click="endGame">
          <span class="btn-icon">⏹</span>
          <span class="btn-text">Spiel beenden</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameMenu',
  props: {
    undoCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['close', 'undo', 'end-game'],
  methods: {
    close() {
      this.$emit('close')
    },
    undo() {
      this.$emit('undo')
    },
    endGame() {
      this.$emit('end-game')
    }
  }
}
</script>

<style scoped>
.game-menu-overlay {
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

.game-menu {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 350px;
  border: 2px solid #c41e3a;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #333;
}

.menu-header span {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #3a3a5a;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #c41e3a;
}

.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  background: #2a2a4a;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-btn:hover:not(:disabled) {
  background: #3a3a5a;
  transform: scale(1.02);
}

.menu-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.menu-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.5rem;
  width: 40px;
  text-align: center;
}

.btn-text {
  flex: 1;
  text-align: left;
  font-weight: 600;
}

.btn-count {
  font-size: 0.8rem;
  color: #888;
  background: rgba(0,0,0,0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.end-btn {
  background: #7f1d1d;
}

.end-btn:hover {
  background: #991b1b;
}
</style>
