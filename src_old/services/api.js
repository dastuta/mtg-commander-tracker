const API_URL = import.meta.env.VITE_API_URL || ''

const getAuthHeaders = () => {
  const token = localStorage.getItem('mtg_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

const handleResponse = async (res) => {
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data
}

export const api = {
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      return handleResponse(res)
    },
    register: async (email, password) => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      return handleResponse(res)
    },
    me: async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  players: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/api/players`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    create: async (name, commanders = []) => {
      const res = await fetch(`${API_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, commanders })
      })
      return handleResponse(res)
    },
    update: async (id, name) => {
      const res = await fetch(`${API_URL}/api/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name })
      })
      return handleResponse(res)
    },
    delete: async (id) => {
      const res = await fetch(`${API_URL}/api/players/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    addCommander: async (playerId, commanderName) => {
      const res = await fetch(`${API_URL}/api/players/${playerId}/commanders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: commanderName })
      })
      return handleResponse(res)
    },
    removeCommander: async (playerId, commanderId) => {
      const res = await fetch(`${API_URL}/api/players/${playerId}/commanders/${commanderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  games: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/api/games`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    getOne: async (id) => {
      const res = await fetch(`${API_URL}/api/games/${id}`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    create: async (name, players) => {
      const res = await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, players })
      })
      return handleResponse(res)
    },
    update: async (id, gameData) => {
      const res = await fetch(`${API_URL}/api/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(gameData)
      })
      return handleResponse(res)
    },
    delete: async (id) => {
      const res = await fetch(`${API_URL}/api/games/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  stats: {
    get: async () => {
      const res = await fetch(`${API_URL}/api/stats`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  }
}

export default api
