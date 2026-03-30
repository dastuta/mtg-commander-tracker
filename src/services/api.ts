import { STORAGE_KEYS } from '@/utils/constants'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Player {
  id: string
  name: string
  games_played: number
  commanders: { id: string; name: string }[]
  created_at: string
}

interface Game {
  id: string
  external_id: string
  start_time: string
  end_time: string
  total_duration: number
  total_turns: number
  total_actions: number
  winner_name: string
  winner_reason: string
  raw_data: Record<string, unknown>
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

export const api = {
  players: {
    async getAll(): Promise<Player[]> {
      try {
        return await fetchAPI('/players')
      } catch {
        console.warn('API unavailable, using localStorage')
        return getLocalPlayers()
      }
    },

    async sync(localPlayers: Player[]): Promise<Player[]> {
      try {
        return await fetchAPI('/players/sync', {
          method: 'POST',
          body: JSON.stringify({ players: localPlayers }),
        })
      } catch {
        console.warn('API sync failed, data saved locally')
        saveLocalPlayers(localPlayers)
        return localPlayers
      }
    },

    async updateOrCreate(name: string, commander: string | null): Promise<Player> {
      try {
        return await fetchAPI('/players', {
          method: 'POST',
          body: JSON.stringify({ name, commander }),
        })
      } catch {
        const player = createLocalPlayer(name, commander)
        return player
      }
    },
  },

  games: {
    async getAll(): Promise<Game[]> {
      try {
        return await fetchAPI('/games')
      } catch {
        return getLocalGames()
      }
    },

    async save(gameData: Record<string, unknown>): Promise<Game> {
      try {
        return await fetchAPI('/games', {
          method: 'POST',
          body: JSON.stringify(gameData),
        })
      } catch {
        saveLocalGame(gameData)
        throw new Error('Game saved locally')
      }
    },
  },

  health(): Promise<boolean> {
    return fetchAPI('/health')
      .then(() => true)
      .catch(() => false)
  },
}

function getLocalPlayers(): Player[] {
  const stored = localStorage.getItem(STORAGE_KEYS.players)
  if (stored) {
    try {
      const data = JSON.parse(stored)
      return Object.values(data).map((p: any) => ({
        id: p.id,
        name: p.name,
        games_played: p.games,
        commanders: (p.commanders || []).map((c: string) => ({ id: c, name: c })),
        created_at: p.createdAt,
      }))
    } catch {
      return []
    }
  }
  return []
}

function createLocalPlayer(name: string, commander: string | null): Player {
  const players = getLocalPlayers()
  let player = players.find(p => p.name === name)
  
  if (!player) {
    player = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      games_played: 0,
      commanders: [],
      created_at: new Date().toISOString(),
    }
    players.push(player)
  }
  
  player.games_played++
  
  if (commander && !player.commanders.find(c => c.name === commander)) {
    player.commanders.push({ id: commander, name: commander })
  }
  
  saveLocalPlayers(players.map(p => ({
    id: p.id,
    name: p.name,
    games: p.games_played,
    commanders: p.commanders.map(c => c.name),
    createdAt: p.created_at,
  })))
  
  return player
}

function saveLocalPlayers(players: Player[] | Record<string, unknown>[]) {
  const data: Record<string, unknown> = {}
  const arr = Array.isArray(players) ? players : Object.values(players)
  for (const p of arr as Player[]) {
    data[p.id] = {
      id: p.id,
      name: p.name,
      games: p.games_played,
      commanders: p.commanders?.map(c => c.name) || [],
      createdAt: p.created_at,
    }
  }
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(data))
}

function getLocalGames(): Game[] {
  const stored = localStorage.getItem(STORAGE_KEYS.gameHistory)
  if (stored) {
    try {
      const games = JSON.parse(stored)
      return games.map((g: any) => ({
        id: g.id,
        external_id: g.id,
        start_time: g.startTime,
        end_time: g.endTime,
        total_duration: g.duration || 0,
        total_turns: g.currentTurnNumber,
        total_actions: g.actions?.length || 0,
        winner_name: g.winnerId,
        winner_reason: g.winningReason,
        raw_data: g,
      }))
    } catch {
      return []
    }
  }
  return []
}

function saveLocalGame(gameData: Record<string, unknown>) {
  const stored = localStorage.getItem(STORAGE_KEYS.gameHistory)
  const games = stored ? JSON.parse(stored) : []
  games.unshift(gameData)
  localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(games.slice(0, 100)))
}

export default api
