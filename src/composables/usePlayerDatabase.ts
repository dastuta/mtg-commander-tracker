import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '@/utils/constants'
import { api } from '@/services/api'

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

const playersDB = ref<Record<string, Player>>({})
const isLoaded = ref(false)

export function usePlayerDatabase() {
  async function loadFromAPI() {
    try {
      const apiPlayers = await api.players.getAll()
      const localPlayers = loadPlayers()
      
      for (const p of apiPlayers) {
        const id = generatePlayerId(p.name)
        const local = localPlayers[id]
        
        playersDB.value[id] = {
          id,
          name: p.name,
          commanders: p.commanders?.map(c => c.name) || [],
          games: Math.max(p.games_played || 0, local?.games || 0),
          createdAt: p.created_at || new Date().toISOString()
        }
      }
      
      for (const [id, p] of Object.entries(localPlayers)) {
        if (!playersDB.value[id]) {
          playersDB.value[id] = p
        }
      }
      
      savePlayers(playersDB.value)
      isLoaded.value = true
    } catch (error) {
      console.warn('API unavailable, using localStorage:', error)
      playersDB.value = loadPlayers()
      isLoaded.value = true
    }
  }

  const players = computed(() => {
    return Object.values(playersDB.value).sort((a, b) => b.games - a.games)
  })

  function getPlayer(name: string): Player | undefined {
    const id = generatePlayerId(name)
    return playersDB.value[id]
  }

  async function addPlayer(name: string, commander: string | null = null): Promise<Player> {
    const id = generatePlayerId(name)
    const existing = playersDB.value[id]
    
    if (existing) {
      existing.games++
      if (commander && !existing.commanders.includes(commander)) {
        existing.commanders.push(commander)
      }
      savePlayers(playersDB.value)
      
      try {
        await api.players.createOrUpdate(name, commander)
      } catch (e) {
        console.warn('Could not sync to API')
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
    
    try {
      await api.players.createOrUpdate(name, commander)
    } catch (e) {
      console.warn('Could not sync to API')
    }
    
    return newPlayer
  }

  function getCommandersForPlayer(name: string): string[] {
    const player = getPlayer(name)
    return player?.commanders || []
  }

  function exportPlayers() {
    return Object.values(playersDB.value)
  }

  return {
    players,
    isLoaded,
    loadFromAPI,
    getPlayer,
    addPlayer,
    getCommandersForPlayer,
    exportPlayers
  }
}

export const playerDatabase = usePlayerDatabase()
