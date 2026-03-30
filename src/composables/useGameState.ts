// ============================================
// useGameState - Zentraler Spielzustand
// ============================================

import { ref, computed, watch } from 'vue'
import type { GameState, Player, Action, ActionType } from '@/types'
import { generateId, generateGameId, toPlayerId } from '@/utils/idGenerator'
import { GAME_CONFIG, STORAGE_KEYS } from '@/utils/constants'

function createEmptyGame(): GameState {
  return {
    id: generateGameId(),
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'setup',
    players: [],
    currentPlayerIndex: 0,
    currentTurnNumber: 1,
    playerCount: 0,
    startTime: null,
    endTime: null,
    winnerId: null,
    winningReason: null,
    actions: [],
    turnsPerPlayer: {},
    longestTurn: null,
    commanderDamage: {},
  }
}

function createPlayer(name: string, seat: number): Player {
  const playerId = toPlayerId(name)
  return {
    id: generateId(),
    playerId,
    name,
    commander: null,
    seat,
    life: GAME_CONFIG.startingLife,
    poison: 0,
    isDefeated: false,
    defeatReason: null,
    defeatedBy: null,
    defeatedAtTurn: null,
    isWinner: false,
    placement: 0,
    commanderCasts: 0,
  }
}

// Singleton state
const gameState = ref<GameState>(createEmptyGame())

// Auto-save to localStorage
watch(
  gameState,
  (newState) => {
    if (newState.status !== 'setup') {
      localStorage.setItem(STORAGE_KEYS.gameCurrent, JSON.stringify(newState))
    }
  },
  { deep: true }
)

export function useGameState() {
  // Computed
  const currentPlayer = computed(() => {
    return gameState.value.players[gameState.value.currentPlayerIndex] || null
  })

  const activePlayers = computed(() => {
    return gameState.value.players.filter(p => !p.isDefeated)
  })

  const isGameActive = computed(() => gameState.value.status === 'active')
  const isGameEnded = computed(() => gameState.value.status === 'ended')

  // Get commander damage between two players
  function getCommanderDamage(sourceId: string, targetId: string): number {
    const key = `${sourceId}-${targetId}`
    return gameState.value.commanderDamage[key] || 0
  }

  // Actions
  function initGame(playerNames: string[], commanders: (string | null)[]) {
    gameState.value = createEmptyGame()
    gameState.value.players = playerNames.map((name, i) => ({
      ...createPlayer(name, i + 1),
      commander: commanders[i] || null,
    }))
    gameState.value.playerCount = playerNames.length
    gameState.value.status = 'active'
    gameState.value.startTime = new Date().toISOString()
  }

  function performMultiTargetAction(
    sourcePlayerId: string,
    actionType: ActionType,
    value: number,
    targetMode: 'all' | 'opponents'
  ) {
    const source = gameState.value.players.find(p => p.id === sourcePlayerId)
    if (!source) return

    // Determine targets based on mode
    let targets: Player[] = []
    if (targetMode === 'all') {
      targets = gameState.value.players.filter(p => !p.isDefeated)
    } else {
      targets = gameState.value.players.filter(p => !p.isDefeated && p.id !== sourcePlayerId)
    }

    // Store previous states for ALL affected players
    const previousStates: Record<string, { life: number; poison: number }> = {}
    
    // Calculate effects
    const effects: { targetId: string; lifeDelta: number; poisonDelta: number }[] = []

    for (const target of targets) {
      previousStates[target.id] = { life: target.life, poison: target.poison }
      
      const effect = { targetId: target.id, lifeDelta: 0, poisonDelta: 0 }

      switch (actionType) {
        case 'damage_all':
        case 'damage_each':
        case 'drain':
        case 'lifelink':
          effect.lifeDelta = -value
          break
        case 'poison_all':
          effect.poisonDelta = value
          break
      }

      if (effect.lifeDelta !== 0 || effect.poisonDelta !== 0) {
        effects.push(effect)
      }
    }

    // Add self-heal for drain and lifelink
    if ((actionType === 'drain' || actionType === 'lifelink') && !source.isDefeated) {
      previousStates[sourcePlayerId] = { life: source.life, poison: source.poison }
      
      const healAmount = actionType === 'lifelink' 
        ? value * targets.filter(t => t.id !== sourcePlayerId).length // Lifelink: heal = damage * opponents (total damage)
        : value // Drain: heal = same value as damage
      effects.push({
        targetId: sourcePlayerId,
        lifeDelta: healAmount,
        poisonDelta: 0
      })
    }

    // Record combined action
    const action: Action = {
      id: generateId(),
      seq: gameState.value.actions.length + 1,
      turn: gameState.value.currentTurnNumber,
      timestamp: new Date().toISOString(),
      type: actionType,
      actor: sourcePlayerId,
      targets: targets.map(t => t.id),
      value,
      previousLife: null,
      newLife: null,
      previousPoison: null,
      newPoison: null,
      previousStates,
      cardName: null,
      reason: null,
      eliminatedBy: null,
      castNumber: null,
    }
    gameState.value.actions.push(action)

    // Apply effects
    for (const effect of effects) {
      const target = gameState.value.players.find(p => p.id === effect.targetId)
      if (target && !target.isDefeated) {
        target.life += effect.lifeDelta
        target.poison += effect.poisonDelta
      }
    }

    // Check defeat conditions
    checkDefeatConditions()
  }

  function performAction(
    sourcePlayerId: string,
    targetPlayerId: string,
    actionType: ActionType,
    value: number,
    lifelink: boolean = false
  ) {
    const source = gameState.value.players.find(p => p.id === sourcePlayerId)
    const target = gameState.value.players.find(p => p.id === targetPlayerId)
    
    if (!source || !target || target.isDefeated) return

    const previousLife = target.life
    const previousPoison = target.poison
    const previousSourceLife = source.life

    // Build previousStates for all affected players
    const previousStates: Record<string, { life: number; poison: number }> = {
      [targetPlayerId]: { life: previousLife, poison: previousPoison }
    }
    
    // Record action
    const action: Action = {
      id: generateId(),
      seq: gameState.value.actions.length + 1,
      turn: gameState.value.currentTurnNumber,
      timestamp: new Date().toISOString(),
      type: actionType,
      actor: sourcePlayerId,
      targets: [targetPlayerId],
      value,
      previousLife,
      newLife: null,
      previousPoison,
      newPoison: null,
      previousStates,
      cardName: null,
      reason: null,
      eliminatedBy: null,
      castNumber: null,
    }
    gameState.value.actions.push(action)

    // Apply action
    switch (actionType) {
      case 'damage':
      case 'pay_life':
        target.life -= value
        break
        
      case 'heal':
        target.life += value
        break
        
      case 'infect':
        target.poison += value
        break
        
      case 'commander_dmg':
        const cmdKey = `${sourcePlayerId}-${targetPlayerId}`
        const currentCmd = gameState.value.commanderDamage[cmdKey] || 0
        const newCmd = Math.max(0, currentCmd + value)
        gameState.value.commanderDamage[cmdKey] = newCmd
        if (value > 0) {
          target.life -= value
        }
        break
    }

    // Apply lifelink heal to source
    if (lifelink && !source.isDefeated && (actionType === 'damage' || actionType === 'commander_dmg')) {
      previousStates[sourcePlayerId] = { life: previousSourceLife, poison: source.poison }
      source.life += value
    }

    // Update newLife/newPoison in action
    action.newLife = target.life
    action.newPoison = target.poison

    // Check defeat conditions
    checkDefeatConditions()
  }

  function checkDefeatConditions() {
    for (const player of gameState.value.players) {
      if (player.isDefeated) continue

      // Life check
      if (player.life <= 0) {
        eliminatePlayer(player.id, 'life')
      }
      // Poison check
      else if (player.poison >= GAME_CONFIG.maxPoison) {
        eliminatePlayer(player.id, 'poison')
      }
      // Commander damage check
      else {
        for (const source of gameState.value.players) {
          if (source.id === player.id) continue
          const cmdDmg = getCommanderDamage(source.id, player.id)
          if (cmdDmg >= GAME_CONFIG.maxCommanderDamage) {
            eliminatePlayer(player.id, 'commander')
            break
          }
        }
      }
    }

    // Check for winner
    const activePlayers = gameState.value.players.filter(p => !p.isDefeated)
    if (activePlayers.length === 1) {
      endGame(activePlayers[0].id, 'last_standing')
    }
  }

  function eliminatePlayer(playerId: string, reason: string) {
    const player = gameState.value.players.find(p => p.id === playerId)
    if (!player) return

    player.isDefeated = true
    player.defeatReason = reason
    player.defeatedAtTurn = gameState.value.currentTurnNumber

    // Find who caused it - look for last damaging action
    const relevantAction = [...gameState.value.actions]
      .reverse()
      .find(a => a.targets.includes(playerId) && 
        (a.type === 'damage' || a.type === 'commander_dmg' || a.type === 'infect'))
    
    if (relevantAction?.actor) {
      player.defeatedBy = relevantAction.actor
    }

    // Record elimination
    const action: Action = {
      id: generateId(),
      seq: gameState.value.actions.length + 1,
      turn: gameState.value.currentTurnNumber,
      timestamp: new Date().toISOString(),
      type: 'elimination',
      actor: player.defeatedBy,
      targets: [playerId],
      value: null,
      previousLife: null,
      newLife: null,
      previousPoison: null,
      newPoison: null,
      previousStates: {
        [playerId]: { life: player.life, poison: player.poison }
      },
      cardName: null,
      reason,
      eliminatedBy: player.defeatedBy,
      castNumber: null,
    }
    gameState.value.actions.push(action)
  }

  function endGame(winnerId: string, reason: string) {
    gameState.value.status = 'ended'
    gameState.value.endTime = new Date().toISOString()
    gameState.value.winnerId = winnerId
    gameState.value.winningReason = reason

    // Set winner
    const winner = gameState.value.players.find(p => p.id === winnerId)
    if (winner) {
      winner.isWinner = true
      winner.placement = 1
    }

    // Set placements
    const survivors = gameState.value.players
      .filter(p => !p.isDefeated && p.id !== winnerId)
      .sort((a, b) => b.life - a.life)
    
    survivors.forEach((p, i) => {
      p.placement = i + 2
    })

    const defeatedSorted = gameState.value.players
      .filter(p => p.isDefeated)
      .sort((a, b) => (b.defeatedAtTurn || 0) - (a.defeatedAtTurn || 0))
    
    defeatedSorted.forEach((p, i) => {
      p.placement = survivors.length + i + 2
    })

    // Save to history
    saveGameToHistory()
  }

  function nextTurn() {
    const currentId = currentPlayer.value?.id
    
    // Record pass action for current player
    const action: Action = {
      id: generateId(),
      seq: gameState.value.actions.length + 1,
      turn: gameState.value.currentTurnNumber,
      timestamp: new Date().toISOString(),
      type: 'pass_turn',
      actor: currentId,
      targets: [],
      value: null,
      previousLife: null,
      newLife: null,
      previousPoison: null,
      newPoison: null,
      previousStates: null,
      cardName: null,
      reason: null,
      eliminatedBy: null,
      castNumber: null,
    }
    gameState.value.actions.push(action)

    // Count this turn for the player
    if (currentId) {
      gameState.value.turnsPerPlayer[currentId] = 
        (gameState.value.turnsPerPlayer[currentId] || 0) + 1
    }

    // Find next active player
    let nextIndex = gameState.value.currentPlayerIndex
    let iterations = 0
    do {
      nextIndex = (nextIndex + 1) % gameState.value.playerCount
      iterations++
    } while (
      gameState.value.players[nextIndex]?.isDefeated &&
      iterations < gameState.value.playerCount
    )

    // Increment turn number when we complete a round
    if (nextIndex <= gameState.value.currentPlayerIndex) {
      gameState.value.currentTurnNumber++
    }

    gameState.value.currentPlayerIndex = nextIndex
  }

  function undoLastAction() {
    const lastAction = gameState.value.actions.pop()
    if (!lastAction) return

    // Handle pass_turn - go back to previous player
    if (lastAction.type === 'pass_turn') {
      // Decrease turn count for this player
      if (lastAction.actor) {
        gameState.value.turnsPerPlayer[lastAction.actor] = 
          Math.max(0, (gameState.value.turnsPerPlayer[lastAction.actor] || 1) - 1)
      }
      
      // Go back to previous player
      let prevIndex = gameState.value.currentPlayerIndex
      let iterations = 0
      do {
        prevIndex = (prevIndex - 1 + gameState.value.playerCount) % gameState.value.playerCount
        iterations++
      } while (
        gameState.value.players[prevIndex]?.isDefeated &&
        iterations < gameState.value.playerCount
      )
      
      // Decrease turn number if we went back past first player
      if (prevIndex > gameState.value.currentPlayerIndex) {
        gameState.value.currentTurnNumber = Math.max(1, gameState.value.currentTurnNumber - 1)
      }
      
      gameState.value.currentPlayerIndex = prevIndex
      return
    }

    // Restore ALL affected players from previousStates
    if (lastAction.previousStates) {
      for (const [playerId, state] of Object.entries(lastAction.previousStates)) {
        const player = gameState.value.players.find(p => p.id === playerId)
        if (player) {
          player.life = state.life
          player.poison = state.poison
          player.isDefeated = false
          player.defeatReason = null
          player.defeatedBy = null
          player.defeatedAtTurn = null
        }
      }
    }
    
    // Restore commander damage if it was commander damage
    if (lastAction.type === 'commander_dmg' && lastAction.actor && lastAction.value && lastAction.targets[0]) {
      const cmdKey = `${lastAction.actor}-${lastAction.targets[0]}`
      const currentCmd = gameState.value.commanderDamage[cmdKey] || 0
      gameState.value.commanderDamage[cmdKey] = Math.max(0, currentCmd - lastAction.value)
    }
  }

  function saveGameToHistory() {
    const history = getGameHistory()
    history.unshift(gameState.value)
    localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(history.slice(0, 100)))
  }

  function getGameHistory(): GameState[] {
    const stored = localStorage.getItem(STORAGE_KEYS.gameHistory)
    return stored ? JSON.parse(stored) : []
  }

  function resetGame() {
    gameState.value = createEmptyGame()
    localStorage.removeItem(STORAGE_KEYS.gameCurrent)
  }

  function getPlayerById(playerId: string): Player | undefined {
    return gameState.value.players.find(p => p.id === playerId)
  }

  function getCommanderDamageDisplay(targetId: string): Record<string, number> {
    const result: Record<string, number> = {}
    for (const source of gameState.value.players) {
      if (source.id === targetId) continue
      const dmg = getCommanderDamage(source.id, targetId)
      if (dmg > 0) {
        result[source.id] = dmg
      }
    }
    return result
  }

  return {
    // State
    gameState,
    
    // Computed
    currentPlayer,
    activePlayers,
    isGameActive,
    isGameEnded,
    
    // Actions
    initGame,
    performAction,
    performMultiTargetAction,
    eliminatePlayer,
    endGame,
    nextTurn,
    undoLastAction,
    resetGame,
    getGameHistory,
    getPlayerById,
    getCommanderDamage,
    getCommanderDamageDisplay,
  }
}

// Export singleton instance for global access
export const gameStore = useGameState()
