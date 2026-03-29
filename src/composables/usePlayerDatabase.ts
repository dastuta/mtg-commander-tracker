import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '@/utils/constants'

export interface Player {
  id: string
  name: string
  commanders: string[]
  games: number
  createdAt: string
}

function generatePlayerId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

function loadPlayers(): Record<string, Player> {
  const stored = localStorage.getItem(STORAGE_KEYS.players)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return {}
    }
  }
  return {}
}

function savePlayers(players: Record<string, Player>) {
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players))
}

const playersDB = ref<Record<string, Player>>(loadPlayers())

export function usePlayerDatabase() {
  const players = computed(() => {
    return Object.values(playersDB.value).sort((a, b) => b.games - a.games)
  })

  function getPlayer(name: string): Player | undefined {
    const id = generatePlayerId(name)
    return playersDB.value[id]
  }

  function addPlayer(name: string, commander: string | null = null): Player {
    const id = generatePlayerId(name)
    const existing = playersDB.value[id]
    
    if (existing) {
      if (commander && !existing.commanders.includes(commander)) {
        existing.commanders.push(commander)
        existing.games++
        savePlayers(playersDB.value)
      } else {
        existing.games++
        savePlayers(playersDB.value)
      }
      return existing
    }

    const newPlayer: Player = {
      id,
      name,
      commanders: commander ? [commander] : [],
      games: 1,
      createdAt: new Date().toISOString()
    }
    
    playersDB.value[id] = newPlayer
    savePlayers(playersDB.value)
    return newPlayer
  }

  function addCommanderToPlayer(name: string, commander: string) {
    const player = getPlayer(name)
    if (player && !player.commanders.includes(commander)) {
      player.commanders.push(commander)
      savePlayers(playersDB.value)
    }
  }

  function removePlayer(id: string) {
    delete playersDB.value[id]
    savePlayers(playersDB.value)
  }

  function updatePlayerName(oldName: string, newName: string) {
    const oldId = generatePlayerId(oldName)
    const newId = generatePlayerId(newName)
    
    if (oldId === newId) return
    
    const player = playersDB.value[oldId]
    if (player) {
      player.id = newId
      player.name = newName
      playersDB.value[newId] = player
      delete playersDB.value[oldId]
      savePlayers(playersDB.value)
    }
  }

  function getCommandersForPlayer(name: string): string[] {
    const player = getPlayer(name)
    return player?.commanders || []
  }

  function exportPlayers() {
    return Object.values(playersDB.value)
  }

  function importPlayers(players: Player[]) {
    for (const player of players) {
      if (!playersDB.value[player.id]) {
        playersDB.value[player.id] = player
      } else {
        const existing = playersDB.value[player.id]
        for (const commander of player.commanders) {
          if (!existing.commanders.includes(commander)) {
            existing.commanders.push(commander)
          }
        }
        existing.games = Math.max(existing.games, player.games)
      }
    }
    savePlayers(playersDB.value)
  }

  return {
    players,
    getPlayer,
    addPlayer,
    addCommanderToPlayer,
    removePlayer,
    updatePlayerName,
    getCommandersForPlayer,
    exportPlayers,
    importPlayers
  }
}

export const playerDatabase = usePlayerDatabase()
