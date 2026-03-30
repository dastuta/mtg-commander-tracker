import type { Player } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || 'https://mtg-api.die-sons.cloud/api'

interface ApiPlayer {
  id: string
  name: string
  games_played: number
  commanders: { id: string; name: string }[]
  created_at: string
}

interface ApiGame {
  id: string
  external_id: string
  start_time: string
  end_time: string
  total_duration: number
  total_turns: number
  total_actions: number
  winner_name: string
  winner_reason: string
}

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<unknown> {
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
    async getAll(): Promise<ApiPlayer[]> {
      const data = await fetchAPI('/players') as ApiPlayer[]
      return data
    },

    async createOrUpdate(name: string, commander: string | null): Promise<ApiPlayer> {
      const data = await fetchAPI('/players', {
        method: 'POST',
        body: JSON.stringify({ name, commander }),
      }) as ApiPlayer
      return data
    },

    async sync(players: { name: string; games: number; commanders: string[] }[]): Promise<ApiPlayer[]> {
      const data = await fetchAPI('/players/sync', {
        method: 'POST',
        body: JSON.stringify({ players }),
      }) as ApiPlayer[]
      return data
    },
  },

  games: {
    async getAll(): Promise<ApiGame[]> {
      const data = await fetchAPI('/games') as ApiGame[]
      return data
    },

    async save(gameData: Record<string, unknown>): Promise<ApiGame> {
      const data = await fetchAPI('/games', {
        method: 'POST',
        body: JSON.stringify(gameData),
      }) as ApiGame
      return data
    },
  },

  healthCheck(): Promise<boolean> {
    return fetch(`${API_BASE}/health`)
      .then(() => true)
      .catch(() => false)
  },
}

export { API_BASE }
export type { ApiPlayer, ApiGame }
