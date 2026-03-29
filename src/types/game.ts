// ============================================
// GAME TYPES - Basistypen für das Spiel
// ============================================

export type GameStatus = 'setup' | 'active' | 'ended'

export type ActionType =
  | 'damage'
  | 'damage_all'
  | 'damage_each'
  | 'poison_all'
  | 'commander_dmg'
  | 'infect'
  | 'heal'
  | 'drain'
  | 'lifelink'
  | 'pay_life'
  | 'board_wipe'
  | 'commander_cast'
  | 'elimination'
  | 'defeat'
  | 'victory'
  | 'undo'
  | 'pass_turn'

export interface Player {
  id: string
  playerId: string
  name: string
  commander: string | null
  seat: number
  life: number
  poison: number
  isDefeated: boolean
  defeatReason: string | null
  defeatedBy: string | null
  defeatedAtTurn: number | null
  isWinner: boolean
  placement: number
  commanderCasts: number
}

export interface Action {
  id: string
  seq: number
  turn: number
  timestamp: string
  type: ActionType
  actor: string | null
  targets: string[]
  value: number | null
  previousLife: number | null
  newLife: number | null
  previousPoison: number | null
  newPoison: number | null
  previousStates: Record<string, { life: number; poison: number }> | null
  cardName: string | null
  reason: string | null
  eliminatedBy: string | null
  castNumber: number | null
}

export interface LongestTurn {
  playerId: string
  turn: number
  durationSeconds: number
}

export interface GameState {
  id: string
  version: string
  createdAt: string
  updatedAt: string
  status: GameStatus
  players: Player[]
  currentPlayerIndex: number
  currentTurnNumber: number
  playerCount: number
  startTime: string | null
  endTime: string | null
  winnerId: string | null
  winningReason: string | null
  actions: Action[]
  turnsPerPlayer: Record<string, number>
  longestTurn: LongestTurn | null
  commanderDamage: Record<string, number>
}

export interface GameSettings {
  showPoison: boolean
  showCommander: boolean
  showActionLog: boolean
}

export interface ActionModalData {
  sourcePlayerId: string
  targetPlayerId: string
  actionType: ActionType
  value: number
}
