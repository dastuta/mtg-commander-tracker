import express from 'express'
import { query, getPool } from '../db/init.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT g.*, 
             json_agg(
               json_build_object(
                 'playerName', gp.player_name,
                 'commanderName', gp.commander_name,
                 'finalLife', gp.final_life,
                 'finalPoison', gp.final_poison,
                 'defeated', gp.defeated,
                 'defeatReason', gp.defeat_reason,
                 'placement', gp.placement
               )
             ) as players
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
        gameData.duration || 0,
        gameData.total_turns || gameData.totalTurns || 0,
        gameData.total_actions || gameData.totalActions || 0,
        gameData.winner_name || gameData.winnerName || null,
        gameData.winner_reason || gameData.winningReason || null,
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
            p.player_id || p.name || `Player ${i + 1}`,
            p.commander || p.commander_name || null,
            p.seat || i + 1,
            p.starting_life || 40,
            p.final_life || p.finalLife || 40,
            p.final_poison || 0,
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

export default router
