// ============================================
// APP CONSTANTS - Alle festen Werte
// ============================================

export const APP_CONFIG = {
  name: 'MTG Commander Tracker',
  version: '1.0.0',
  description: 'Progressive Web App für MTG Commander',
} as const

export const GAME_CONFIG = {
  startingLife: 40,
  maxPoison: 10,
  maxCommanderDamage: 21,
  minPlayers: 2,
  maxPlayers: 6,
} as const

export const UI_CONFIG = {
  buttonStepSingle: 1,
  buttonStepLong: 5,
  longPressDelay: 500,
  longPressInterval: 100,
  swipeThreshold: 50,
  swipeLifePerPixel: 0.1,
} as const

export const STORAGE_KEYS = {
  gameCurrent: 'mtg_game_current',
  gameHistory: 'mtg_game_history',
  players: 'mtg_players',
  settings: 'mtg_settings',
  debugEnabled: 'mtg_debug_enabled',
} as const

export const DEBUG_CONFIG = {
  enabled: import.meta.env.DEV,
  maxLogEntries: 1000,
  logLevel: 'debug' as const,
}
