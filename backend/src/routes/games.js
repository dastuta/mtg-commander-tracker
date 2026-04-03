import express from 'express'
import { query, getPool } from '../db/init.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT g.*, 
             COALESCE(json_agg(
               json_build_object(
                 'playerId', gp.player_id,
                 'playerName', gp.player_name,
                 'commanderName', gp.commander_name,
                 'seat', gp.seat,
                 'finalLife', gp.final_life,
                 'finalPoison', gp.final_poison,
                 'defeated', gp.defeated,
                 'defeatReason', gp.defeat_reason,
                 'defeatedBy', gp.defeated_by,
                 'placement', gp.placement
               ) ORDER BY gp.seat
             ) FILTER (WHERE gp.id IS NOT NULL), '[]') as players
      FROM games g
      LEFT JOIN game_players gp ON gp.game_id = g.id
      GROUP BY g.id
      ORDER BY g.start_time DESC
      LIMIT 100
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({ error: 'Failed to get games' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const gameResult = await query('SELECT * FROM games WHERE id = $1', [id])

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' })
    }

    const game = gameResult.rows[0]

    const playersResult = await query(
      'SELECT * FROM game_players WHERE game_id = $1',
      [id]
    )

    res.json({
      ...game,
      players: playersResult.rows
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

    const gameData = req.body

    const gameResult = await client.query(
      `INSERT INTO games (external_id, start_time, end_time, total_duration, total_turns, total_actions, winner_name, winner_reason, raw_data) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        gameData.id || null,
        gameData.startTime || new Date().toISOString(),
        gameData.endTime || null,
        gameData.totalDuration || gameData.duration || 0,
        gameData.totalTurns || gameData.total_turns || 0,
        gameData.totalActions || gameData.total_actions || 0,
        gameData.winner?.name || gameData.winner_name || gameData.winnerName || null,
        gameData.winner?.reason || gameData.winner_reason || gameData.winnerReason || null,
        JSON.stringify(gameData)
      ]
    )

    const game = gameResult.rows[0]

    if (gameData.players && Array.isArray(gameData.players)) {
      for (let i = 0; i < gameData.players.length; i++) {
        const p = gameData.players[i]
        await client.query(
          `INSERT INTO game_players 
           (game_id, player_name, commander_name, seat, starting_life, final_life, final_poison, placement, defeated, defeat_reason, defeated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            game.id,
            p.name || p.playerName || `Player ${i + 1}`,
            p.commander || p.commanderName || null,
            p.seat || i + 1,
            p.startingLife || p.starting_life || 40,
            p.finalLife || p.final_life || 40,
            p.finalPoison || p.final_poison || 0,
            p.placement || null,
            p.defeated || false,
            p.defeatReason || p.defeat_reason || null,
            p.defeatedBy || p.defeated_by || null
          ]
        )
      }
    }

    await client.query('COMMIT')

    res.status(201).json(game)
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
    const gameData = req.body

    await client.query(
      `UPDATE games SET 
        end_time = COALESCE($1, end_time),
        total_duration = COALESCE($2, total_duration),
        total_turns = COALESCE($3, total_turns),
        total_actions = COALESCE($4, total_actions),
        winner_name = COALESCE($5, winner_name),
        winner_reason = COALESCE($6, winner_reason),
        raw_data = $7
       WHERE id = $8`,
      [
        gameData.endTime || gameData.end_time || null,
        gameData.totalDuration || gameData.total_duration || null,
        gameData.totalTurns || gameData.total_turns || null,
        gameData.totalActions || gameData.total_actions || null,
        gameData.winner?.name || gameData.winner_name || null,
        gameData.winner?.reason || gameData.winner_reason || null,
        JSON.stringify(gameData),
        id
      ]
    )

    if (gameData.players && Array.isArray(gameData.players)) {
      for (let i = 0; i < gameData.players.length; i++) {
        const p = gameData.players[i]
        await client.query(
          `UPDATE game_players SET
            final_life = $1,
            final_poison = $2,
            placement = $3,
            defeated = $4,
            defeat_reason = $5,
            defeated_by = $6
           WHERE game_id = $7 AND seat = $8`,
          [
            p.finalLife || p.final_life || 40,
            p.finalPoison || p.final_poison || 0,
            p.placement || null,
            p.defeated || false,
            p.defeatReason || p.defeat_reason || null,
            p.defeatedBy || p.defeated_by || null,
            id,
            p.seat || i + 1
          ]
        )
      }
    }

    await client.query('COMMIT')

    const result = await query('SELECT * FROM games WHERE id = $1', [id])
    res.json(result.rows[0])
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
    const result = await query(
      'DELETE FROM games WHERE id = $1 RETURNING id',
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' })
    }
    
    res.json({ message: 'Game deleted successfully' })
  } catch (error) {
    console.error('Delete game error:', error)
    res.status(500).json({ error: 'Failed to delete game' })
  }
})

export default router
