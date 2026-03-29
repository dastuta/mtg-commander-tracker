<template>
  <div class="statistics">
    <div class="header">
      <button class="btn-back" @click="$emit('close')">← Zurück</button>
      <h2>Statistiken</h2>
    </div>

    <div class="export-section">
      <h3>Daten exportieren</h3>
      <div class="export-buttons">
        <button class="btn btn-export" @click="exportPlayers">
          📥 Spieler exportieren
        </button>
        <button class="btn btn-export" @click="exportGames">
          📥 Spiele exportieren
        </button>
        <button class="btn btn-import" @click="showImportDialog = true">
          📤 Importieren
        </button>
      </div>
    </div>

    <div v-if="savedGames.length === 0" class="empty-state">
      <p>Noch keine Spiele gespeichert.</p>
      <p>Spiele ein Spiel und speichere es, um Statistiken zu sehen.</p>
    </div>

    <div v-else class="stats-content">
      <!-- Overview -->
      <div class="stats-section">
        <h3>Übersicht</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ savedGames.length }}</span>
            <span class="stat-label">Gespielte Spiele</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalPlaytime }}</span>
            <span class="stat-label">Gesamtspielzeit</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalActions }}</span>
            <span class="stat-label">Gesamte Aktionen</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ uniquePlayers.length }}</span>
            <span class="stat-label">Spieler</span>
          </div>
        </div>
      </div>

      <!-- Saved Games List -->
      <div class="stats-section">
        <h3>Gespeicherte Spiele</h3>
        <div class="games-list">
          <div 
            v-for="game in savedGames" 
            :key="game.id" 
            class="game-item"
            @click="selectedGame = selectedGame?.id === game.id ? null : game"
          >
            <div class="game-header">
              <span class="game-name">{{ game.name }}</span>
              <span class="game-date">{{ formatDate(game.savedAt) }}</span>
            </div>
            <div class="game-meta">
              <span>{{ game.players?.length || 0 }} Spieler</span>
              <span>{{ game.turns?.length || 0 }} Züge</span>
              <span>{{ formatDuration(game.statistics?.totalDuration || 0) }}</span>
            </div>
            
            <!-- Expanded view -->
            <div v-if="selectedGame?.id === game.id" class="game-details">
              <div class="players-result">
                <div 
                  v-for="player in game.players" 
                  :key="player.id" 
                  class="player-result"
                >
                  <span class="player-name">{{ player.name }}</span>
                  <span class="player-commander">{{ player.commander }}</span>
                  <span v-if="game.winner?.id === player.id" class="winner-badge">
                    {{ getWinReasonLabel(game.winner?.reason) }}
                  </span>
                </div>
              </div>
              <div class="game-actions">
                <button class="btn btn-danger btn-sm" @click.stop="deleteGame(game.id)">
                  🗑️ Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Player Statistics -->
      <div class="stats-section">
        <h3>Spieler-Statistiken</h3>
        <div class="player-stats-list">
          <div 
            v-for="stat in playerStatistics" 
            :key="stat.name" 
            class="player-stat-item"
          >
            <div class="player-stat-header">
              <span class="player-name">{{ stat.name }}</span>
              <span class="player-games">{{ stat.games }} Spiele</span>
            </div>
            <div class="player-stat-details">
              <div class="stat-row">
                <span class="label">Siege:</span>
                <span class="value wins">{{ stat.wins }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Niederlagen:</span>
                <span class="value losses">{{ stat.losses }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Siegrate:</span>
                <span class="value">{{ stat.winRate }}%</span>
              </div>
              <div class="stat-row">
                <span class="label">Schaden verursacht:</span>
                <span class="value damage">{{ stat.damageDealt }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Schaden erhalten:</span>
                <span class="value damage-taken">{{ stat.damageReceived }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="showDeleteConfirm = false">
      <div class="confirm-menu">
        <h3>Spiel wirklich löschen?</h3>
        <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">Abbrechen</button>
          <button class="btn btn-danger" @click="confirmDelete">Löschen</button>
        </div>
      </div>
    </div>

    <!-- Import Dialog -->
    <div v-if="showImportDialog" class="confirm-overlay" @click.self="closeImportDialog">
      <div class="confirm-menu import-menu">
        <h3>Daten importieren</h3>
        <p class="import-info">Füge JSON-Daten ein, die zuvor exportiert wurden.</p>
        <textarea 
          v-model="importData" 
          class="import-textarea"
          placeholder='{"players": [...], "games": [...]}'
          rows="10"
        ></textarea>
        <div class="import-type">
          <label>
            <input type="radio" v-model="importType" value="players" /> Spieler
          </label>
          <label>
            <input type="radio" v-model="importType" value="games" /> Spiele
          </label>
          <label>
            <input type="radio" v-model="importType" value="both" /> Beide
          </label>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="closeImportDialog">Abbrechen</button>
          <button class="btn btn-primary" @click="performImport" :disabled="!importData.trim()">Importieren</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.js'

const GAME_RECORDS_KEY = 'mtg-commander-game-records'
const PLAYER_DB_KEY = 'mtg-commander-players'

export default {
  name: 'Statistics',
  emits: ['close'],
  setup() {
    const savedGames = ref([])
    const selectedGame = ref(null)
    const showDeleteConfirm = ref(false)
    const gameToDelete = ref(null)
    const showImportDialog = ref(false)
    const importData = ref('')
    const importType = ref('both')
    const isOnline = ref(false)

    const loadSavedGames = async () => {
      try {
        const { games } = await api.games.getAll()
        savedGames.value = games.map(g => ({
          id: g.id,
          name: g.name,
          savedAt: new Date(g.created_at).getTime(),
          players: g.game_players || [],
          turns: [],
          statistics: {
            totalDuration: g.total_duration || 0,
            totalActions: g.total_actions || 0
          },
          winner: g.winner_id ? { id: g.winner_id, reason: g.winner_reason } : null
        }))
        isOnline.value = true
      } catch (e) {
        console.warn('API unavailable, using localStorage:', e.message)
        const saved = localStorage.getItem(GAME_RECORDS_KEY)
        if (saved) {
          savedGames.value = JSON.parse(saved)
        }
        isOnline.value = false
      }
    }

    onMounted(() => {
      loadSavedGames()
    })

    const totalPlaytime = computed(() => {
      const total = savedGames.value.reduce((sum, game) => sum + (game.statistics?.totalDuration || 0), 0)
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    })

    const totalActions = computed(() => {
      return savedGames.value.reduce((sum, game) => sum + (game.statistics?.totalActions || 0), 0)
    })

    const uniquePlayers = computed(() => {
      const players = new Set()
      savedGames.value.forEach(game => {
        game.players?.forEach(p => players.add(p.name))
      })
      return Array.from(players)
    })

    const playerStatistics = computed(() => {
      const stats = {}

      savedGames.value.forEach(game => {
        game.players?.forEach(player => {
          if (!stats[player.name]) {
            stats[player.name] = {
              name: player.name,
              games: 0,
              wins: 0,
              losses: 0,
              damageDealt: 0,
              damageReceived: 0
            }
          }
          stats[player.name].games++
        })

        const winner = game.winner
        game.players?.forEach(player => {
          if (winner?.id === player.id) {
            stats[player.name].wins++
          } else {
            stats[player.name].losses++
          }
        })

        game.turns?.forEach(turn => {
          turn.actions?.forEach(action => {
            if (action.type === 'damage') {
              if (action.source?.name) {
                if (stats[action.source.name]) {
                  stats[action.source.name].damageDealt += Math.abs(action.value)
                }
              }
              if (action.target?.name && stats[action.target.name]) {
                stats[action.target.name].damageReceived += Math.abs(action.value)
              }
            }
          })
        })
      })

      return Object.values(stats)
        .map(s => ({
          ...s,
          winRate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0
        }))
        .sort((a, b) => b.games - a.games)
    })

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const formatDuration = (seconds) => {
      if (!seconds) return '0:00'
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getWinReasonLabel = (reason) => {
      const labels = {
        'last_standing': 'Sieger',
        'special_effect': 'Sieg (Spezial)',
        'agreed': 'Sieg (Einigung)'
      }
      return labels[reason] || 'Sieger'
    }

    const deleteGame = (gameId) => {
      gameToDelete.value = gameId
      showDeleteConfirm.value = true
    }

    const confirmDelete = async () => {
      if (gameToDelete.value) {
        const gameId = gameToDelete.value
        savedGames.value = savedGames.value.filter(g => g.id !== gameId)
        
        if (isOnline.value) {
          try {
            await api.games.delete(gameId)
          } catch (e) {
            console.warn('Failed to delete from API:', e.message)
          }
        }
        localStorage.setItem(GAME_RECORDS_KEY, JSON.stringify(savedGames.value))
        gameToDelete.value = null
        showDeleteConfirm.value = false
        selectedGame.value = null
      }
    }

    const exportPlayers = () => {
      const players = JSON.parse(localStorage.getItem(PLAYER_DB_KEY) || '[]')
      const data = {
        type: 'mtg-commander-players',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        players
      }
      downloadJson(data, 'mtg-players-export.json')
    }

    const exportGames = () => {
      const games = JSON.parse(localStorage.getItem(GAME_RECORDS_KEY) || '[]')
      const data = {
        type: 'mtg-commander-games',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        games
      }
      downloadJson(data, 'mtg-games-export.json')
    }

    const downloadJson = (data, filename) => {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const closeImportDialog = () => {
      showImportDialog.value = false
      importData.value = ''
      importType.value = 'both'
    }

    const performImport = () => {
      try {
        const data = JSON.parse(importData.value)
        
        if (importType.value === 'players' || importType.value === 'both') {
          if (data.players || data.type === 'mtg-commander-players') {
            const players = data.players || data
            const existing = JSON.parse(localStorage.getItem(PLAYER_DB_KEY) || '[]')
            const merged = mergeById(existing, players)
            localStorage.setItem(PLAYER_DB_KEY, JSON.stringify(merged))
          }
        }
        
        if (importType.value === 'games' || importType.value === 'both') {
          if (data.games || data.type === 'mtg-commander-games') {
            const games = data.games || data
            const existing = JSON.parse(localStorage.getItem(GAME_RECORDS_KEY) || '[]')
            const merged = mergeById(existing, games)
            localStorage.setItem(GAME_RECORDS_KEY, JSON.stringify(merged))
            savedGames.value = merged
          }
        }
        
        closeImportDialog()
        alert('Import erfolgreich!')
      } catch (e) {
        alert('Fehler beim Importieren: Ungültiges JSON-Format')
      }
    }

    const mergeById = (existing, incoming) => {
      const ids = new Set(existing.map(item => item.id))
      const newItems = incoming.filter(item => !ids.has(item.id))
      return [...existing, ...newItems]
    }

    return {
      savedGames,
      selectedGame,
      showDeleteConfirm,
      totalPlaytime,
      totalActions,
      uniquePlayers,
      playerStatistics,
      formatDate,
      formatDuration,
      getWinReasonLabel,
      deleteGame,
      confirmDelete,
      exportPlayers,
      exportGames,
      showImportDialog,
      importData,
      importType,
      closeImportDialog,
      performImport
    }
  }
}
</script>

<style scoped>
.statistics {
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.header h2 {
  color: #fff;
  font-size: 1.5rem;
}

.btn-back {
  background: none;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
}

.btn-back:hover {
  color: #c41e3a;
}

.export-section {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.export-section h3 {
  color: #888;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.export-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-export,
.btn-import {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: #16a34a;
  color: #fff;
}

.btn-export:hover {
  background: #15803d;
}

.btn-import {
  background: #3b82f6;
  color: #fff;
}

.btn-import:hover {
  background: #2563eb;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state p {
  margin-bottom: 0.5rem;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-section {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
}

.stats-section h3 {
  color: #888;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-card {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #4ade80;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.25rem;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.game-item {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.game-item:hover {
  background: rgba(255,255,255,0.1);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-name {
  font-weight: bold;
  color: #fff;
}

.game-date {
  font-size: 0.75rem;
  color: #888;
}

.game-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
}

.game-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #333;
}

.players-result {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.player-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
}

.player-result .player-name {
  font-weight: bold;
  color: #fff;
  flex: 1;
}

.player-result .player-commander {
  font-size: 0.8rem;
  color: #666;
}

.player-result .winner-badge {
  background: #14532d;
  color: #86efac;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.game-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

.player-stats-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.player-stat-item {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 0.75rem;
}

.player-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.player-stat-header .player-name {
  font-weight: bold;
  color: #fff;
}

.player-stat-header .player-games {
  font-size: 0.8rem;
  color: #888;
}

.player-stat-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.stat-row .label {
  color: #888;
}

.stat-row .value {
  font-weight: bold;
}

.stat-row .value.wins {
  color: #4ade80;
}

.stat-row .value.losses {
  color: #ef4444;
}

.stat-row .value.damage {
  color: #f97316;
}

.stat-row .value.damage-taken {
  color: #fbbf24;
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.confirm-menu {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 350px;
  border: 2px solid #c41e3a;
}

.confirm-menu h3 {
  color: #fff;
  margin-bottom: 0.5rem;
}

.confirm-menu p {
  color: #888;
  margin-bottom: 1rem;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
}

.confirm-actions .btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
}

.btn-secondary {
  background: #3a3a5a;
  color: #fff;
}

.import-menu {
  max-width: 450px;
}

.import-info {
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.import-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
  margin-bottom: 1rem;
}

.import-textarea::placeholder {
  color: #666;
}

.import-type {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.import-type label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #ccc;
  font-size: 0.9rem;
  cursor: pointer;
}

.import-type input[type="radio"] {
  cursor: pointer;
}

.btn-primary {
  background: #c41e3a;
  color: #fff;
}
</style>
