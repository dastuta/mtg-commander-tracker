import express from 'express'
import { query } from '../db/init.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.games_played,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as commanders
      FROM players p
      LEFT JOIN commanders c ON c.player_id = p.id
      GROUP BY p.id
      ORDER BY p.games_played DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching players:', error)
    res.status(500).json({ error: 'Failed to fetch players' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, commander } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    let player = await query(
      'SELECT * FROM players WHERE name = $1',
      [name]
    )

    if (player.rows.length === 0) {
      const result = await query(
        'INSERT INTO players (name) VALUES ($1) RETURNING *',
        [name]
      )
      player = { rows: [result.rows[0]] }
    }

    await query(
      'UPDATE players SET games_played = games_played + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [player.rows[0].id]
    )

    if (commander) {
      await query(
        `INSERT INTO commanders (player_id, name) 
         VALUES ($1, $2) 
         ON CONFLICT (player_id, name) DO NOTHING`,
        [player.rows[0].id, commander]
      )
    }

    const updated = await query(`
      SELECT 
        p.id,
        p.name,
        p.games_played,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as commanders
      FROM players p
      LEFT JOIN commanders c ON c.player_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [player.rows[0].id])

    res.json(updated.rows[0])
  } catch (error) {
    console.error('Error creating/updating player:', error)
    res.status(500).json({ error: 'Failed to create/update player' })
  }
})

router.post('/sync', async (req, res) => {
  try {
    const { players } = req.body
    
    if (!Array.isArray(players)) {
      return res.status(400).json({ error: 'Players array required' })
    }

    const results = []
    for (const player of players) {
      let existing = await query('SELECT * FROM players WHERE name = $1', [player.name])
      
      if (existing.rows.length === 0) {
        const result = await query(
          'INSERT INTO players (name, games_played) VALUES ($1, $2) RETURNING *',
          [player.name, player.games || 0]
        )
        existing = { rows: result.rows }
      }

      const playerId = existing.rows[0].id

      if (player.commanders && Array.isArray(player.commanders)) {
        for (const cmd of player.commanders) {
          await query(
            `INSERT INTO commanders (player_id, name) 
             VALUES ($1, $2) 
             ON CONFLICT (player_id, name) DO NOTHING`,
            [playerId, cmd]
          )
        }
      }

      const updated = await query(`
        SELECT 
          p.id,
          p.name,
          p.games_played,
          COALESCE(
            json_agg(
              json_build_object('id', c.id, 'name', c.name)
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'
          ) as commanders
        FROM players p
        LEFT JOIN commanders c ON c.player_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
      `, [playerId])

      results.push(updated.rows[0])
    }

    res.json(results)
  } catch (error) {
    console.error('Error syncing players:', error)
    res.status(500).json({ error: 'Failed to sync players' })
  }
})

export default router
