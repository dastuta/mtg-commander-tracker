<template>
  <div class="auth-screen">
    <div class="auth-card">
      <h1>MTG Commander Tracker</h1>
      
      <div class="tabs">
        <button 
          :class="{ active: mode === 'login' }" 
          @click="mode = 'login'"
        >
          Anmelden
        </button>
        <button 
          :class="{ active: mode === 'register' }" 
          @click="mode = 'register'"
        >
          Registrieren
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <input 
            type="text" 
            v-model="username" 
            placeholder="Benutzername"
            required
            :disabled="loading"
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <input 
            type="password" 
            v-model="password" 
            placeholder="Passwort"
            required
            minlength="6"
            :disabled="loading"
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="success" class="success">{{ success }}</div>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? '...' : (mode === 'login' ? 'Anmelden' : 'Registrieren') }}
        </button>
      </form>

      <div class="offline-notice" v-if="offlineMode">
        <p>⚠️ Offline-Modus: Daten werden lokal gespeichert</p>
        <button class="btn-offline" @click="tryOnline">
          Online-Modus versuchen
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || ''

export default {
  name: 'AuthScreen',
  emits: ['auth-success'],
  setup(props, { emit }) {
    const mode = ref('login')
    const username = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')
    const success = ref('')
    const offlineMode = ref(false)

    const handleSubmit = async () => {
      error.value = ''
      success.value = ''
      loading.value = true

      try {
        const endpoint = mode.value === 'login' ? '/api/auth/login' : '/api/auth/register'
        
        const res = await fetch(API_URL + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.value, password: password.value })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Auth failed')
        }

        localStorage.setItem('mtg_token', data.token)
        localStorage.setItem('mtg_user', JSON.stringify(data.user))
        
        offlineMode.value = false
        emit('auth-success', data)
      } catch (err) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          offlineMode.value = true
          error.value = 'Server nicht erreichbar. Offline-Modus aktiv.'
        } else {
          error.value = err.message
        }
      } finally {
        loading.value = false
      }
    }

    const tryOnline = () => {
      offlineMode.value = false
    }

    return {
      mode,
      username,
      password,
      loading,
      error,
      success,
      offlineMode,
      handleSubmit,
      tryOnline
    }
  }
}
</script>

<style scoped>
.auth-screen {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 1rem;
}

.auth-card {
  background: rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  border: 2px solid #c41e3a;
}

.auth-card h1 {
  text-align: center;
  color: #fff;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tabs button {
  flex: 1;
  padding: 0.75rem;
  background: transparent;
  border: 1px solid #3a3a5a;
  color: #888;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tabs button.active {
  background: #c41e3a;
  border-color: #c41e3a;
  color: #fff;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #c41e3a;
}

.btn-submit {
  width: 100%;
  padding: 0.75rem;
  background: #c41e3a;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: #a01830;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid #dc2626;
  color: #fca5a5;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
}

.success {
  background: rgba(22, 163, 74, 0.2);
  border: 1px solid #16a34a;
  color: #86efac;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
}

.offline-notice {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #333;
  text-align: center;
}

.offline-notice p {
  color: #fbbf24;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.btn-offline {
  background: transparent;
  border: 1px solid #fbbf24;
  color: #fbbf24;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-offline:hover {
  background: rgba(251, 191, 36, 0.1);
}
</style>
