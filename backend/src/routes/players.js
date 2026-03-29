import express from 'express'
import { query } from '../db/init.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM players WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    )

    const players = await Promise.all(result.rows.map(async (player) => {
      const commanders = await query(
        'SELECT * FROM commanders WHERE player_id = $1 ORDER BY created_at DESC',
        [player.id]
      )
      return {
        ...player,
        commanders: commanders.rows.map(c => c.name)
      }
    }))

    res.json({ players })
  } catch (error) {
    console.error('Get players error:', error)
    res.status(500).json({ error: 'Failed to get players' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, commanders = [] } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Player name required' })
    }

    const result = await query(
      'INSERT INTO players (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.userId, name]
    )

    const player = result.rows[0]

    if (commanders.length > 0) {
      for (const cmd of commanders) {
        await query(
          'INSERT INTO commanders (player_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [player.id, cmd]
        )
      }
    }

    const allCommanders = await query(
      'SELECT * FROM commanders WHERE player_id = $1 ORDER BY created_at DESC',
      [player.id]
    )

    res.status(201).json({
      player: {
        ...player,
        commanders: allCommanders.rows.map(c => c.name)
      }
    })
  } catch (error) {
    console.error('Create player error:', error)
    res.status(500).json({ error: 'Failed to create player' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    const result = await query(
      'UPDATE players SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' })
    }

    res.json({ player: result.rows[0] })
  } catch (error) {
    console.error('Update player error:', error)
    res.status(500).json({ error: 'Failed to update player' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await query(
      'DELETE FROM players WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete player error:', error)
    res.status(500).json({ error: 'Failed to delete player' })
  }
})

router.post('/:id/commanders', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    const playerCheck = await query(
      'SELECT id FROM players WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )

    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' })
    }

    const result = await query(
      'INSERT INTO commanders (player_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [id, name]
    )

    res.status(201).json({ commander: result.rows[0] })
  } catch (error) {
    console.error('Add commander error:', error)
    res.status(500).json({ error: 'Failed to add commander' })
  }
})

router.delete('/:playerId/commanders/:commanderId', async (req, res) => {
  try {
    const { playerId, commanderId } = req.params

    const playerCheck = await query(
      'SELECT id FROM players WHERE id = $1 AND user_id = $2',
      [playerId, req.userId]
    )

    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' })
    }

    await query(
      'DELETE FROM commanders WHERE id = $1 AND player_id = $2',
      [commanderId, playerId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Delete commander error:', error)
    res.status(500).json({ error: 'Failed to delete commander' })
  }
})

export default router
