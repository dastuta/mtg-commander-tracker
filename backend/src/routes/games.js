import express from 'express'
import { query, getPool } from '../db/init.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.*, 
              gp.player_name,
              gp.commander_name,
              gp.defeated,
              gp.final_life
       FROM games g
       LEFT JOIN game_players gp ON gp.game_id = g.id
       WHERE g.user_id = $1
       ORDER BY g.created_at DESC
       LIMIT 50`,
      [req.userId]
    )

    res.json({ games: result.rows })
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({ error: 'Failed to get games' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const gameResult = await query(
      'SELECT * FROM games WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' })
    }

    const game = gameResult.rows[0]

    const playersResult = await query(
      'SELECT * FROM game_players WHERE game_id = $1',
      [id]
    )

    const turnsResult = await query(
      'SELECT * FROM game_turns WHERE game_id = $1 ORDER BY turn_number',
      [id]
    )

    const actionsResult = await query(
      'SELECT * FROM game_actions WHERE game_id = $1 ORDER BY timestamp',
      [id]
    )

    const damageResult = await query(
      'SELECT * FROM commander_damage WHERE game_id = $1',
      [id]
    )

    res.json({
      game: {
        ...game,
        gamePlayers: playersResult.rows,
        turns: turnsResult.rows,
        actions: actionsResult.rows,
        commanderDamage: damageResult.rows
      }
    })
  } catch (error) {
    console.error('Get game error:', error)
    res.status(500).json({ error: 'Failed to get game' })
  }
})

router.post('/', async (req, res) => {
  const client = await getPool().connect()
  
  try {
    await client.query('BEGIN')

    const { name, players: gamePlayers } = req.body

    const gameResult = await client.query(
      `INSERT INTO games (user_id, name, start_time) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [req.userId, name || `Game ${new Date().toLocaleDateString()}`]
    )

    const game = gameResult.rows[0]

    const savedPlayers = []
    for (const player of gamePlayers) {
      let playerId = null
      
      if (player.name) {
        const existingPlayer = await client.query(
          'SELECT id FROM players WHERE user_id = $1 AND name = $2',
          [req.userId, player.name]
        )

        if (existingPlayer.rows.length > 0) {
          playerId = existingPlayer.rows[0].id
          await client.query(
            'UPDATE players SET games_played = games_played + 1 WHERE id = $1',
            [playerId]
          )
        } else {
          const newPlayer = await client.query(
            'INSERT INTO players (user_id, name, games_played) VALUES ($1, $2, 1) RETURNING id',
            [req.userId, player.name]
          )
          playerId = newPlayer.rows[0].id
        }

        if (player.commander) {
          await client.query(
            `INSERT INTO commanders (player_id, name) 
             VALUES ($1, $2) 
             ON CONFLICT (player_id, name) DO NOTHING`,
            [playerId, player.commander]
          )
        }
      }

      const gpResult = await client.query(
        `INSERT INTO game_players (game_id, player_id, player_name, commander_name, final_life, turn_count)
         VALUES ($1, $2, $3, $4, 40, 0) RETURNING *`,
        [game.id, playerId, player.name, player.commander]
      )

      savedPlayers.push(gpResult.rows[0])
    }

    await client.query('COMMIT')

    res.status(201).json({
      game: {
        ...game,
        gamePlayers: savedPlayers
      }
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Create game error:', error)
    res.status(500).json({ error: 'Failed to create game' })
  } finally {
    client.release()
  }
})

router.put('/:id', async (req, res) => {
  const client = await getPool().connect()
  
  try {
    await client.query('BEGIN')

    const { id } = req.params
    const { 
      endTime, 
      totalDuration, 
      totalActions, 
      winnerId, 
      winnerReason,
      players: gamePlayers,
      turns,
      actions,
      commanderDamage
    } = req.body

    await client.query(
      `UPDATE games SET 
        end_time = $1, 
        total_duration = $2, 
        total_actions = $3,
        winner_id = $4,
        winner_reason = $5
       WHERE id = $6 AND user_id = $7`,
      [endTime, totalDuration, totalActions, winnerId, winnerReason, id, req.userId]
    )

    if (gamePlayers) {
      await client.query('DELETE FROM game_players WHERE game_id = $1', [id])
      for (const gp of gamePlayers) {
        await client.query(
          `INSERT INTO game_players (game_id, player_id, player_name, commander_name, final_life, final_poison, defeated, defeat_reason, defeated_by, turn_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [id, gp.player_id, gp.player_name, gp.commander_name, gp.final_life, gp.final_poison, gp.defeated, gp.defeat_reason, gp.defeated_by, gp.turn_count]
        )
      }
    }

    if (turns) {
      await client.query('DELETE FROM game_turns WHERE game_id = $1', [id])
      for (const turn of turns) {
        await client.query(
          `INSERT INTO game_turns (game_id, turn_number, player_id, player_name, start_time, end_time, duration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, turn.turnNumber, turn.playerId, turn.playerName, turn.startTime, turn.endTime, turn.duration]
        )
      }
    }

    if (actions) {
      await client.query('DELETE FROM game_actions WHERE game_id = $1', [id])
      for (const action of actions) {
        await client.query(
          `INSERT INTO game_actions (game_id, turn_id, action_type, category, source_id, source_name, target_id, target_name, value, previous_value, new_value, metadata, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [id, action.turnId, action.type, action.category, action.source?.id, action.source?.name, action.target?.id, action.target?.name, action.value, action.previousValue, action.newValue, JSON.stringify(action.metadata), action.timestamp]
        )
      }
    }

    if (commanderDamage) {
      await client.query('DELETE FROM commander_damage WHERE game_id = $1', [id])
      for (const dmg of commanderDamage) {
        await client.query(
          `INSERT INTO commander_damage (game_id, source_player_id, source_player_name, target_player_id, target_player_name, damage)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, dmg.sourcePlayerId, dmg.sourcePlayerName, dmg.targetPlayerId, dmg.targetPlayerName, dmg.damage]
        )
      }
    }

    await client.query('COMMIT')

    const updatedGame = await query('SELECT * FROM games WHERE id = $1', [id])

    res.json({ game: updatedGame.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Update game error:', error)
    res.status(500).json({ error: 'Failed to update game' })
  } finally {
    client.release()
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await query(
      'DELETE FROM games WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Delete game error:', error)
    res.status(500).json({ error: 'Failed to delete game' })
  }
})

export default router
