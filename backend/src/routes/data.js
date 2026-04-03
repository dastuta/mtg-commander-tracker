import express from 'express'
import { query } from '../db/init.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const ALLOWED_TABLES = ['games', 'game_players', 'players', 'commanders', 'decks', 'deck_cards', 'invites']
const READONLY_COLUMNS = ['id', 'created_at']

router.get('/:table', async (req, res) => {
  try {
    const { table } = req.params
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    const result = await query(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 100`)
    res.json(result.rows)
  } catch (error) {
    console.error('Get error:', error)
    res.status(500).json({ error: 'Failed to get data' })
  }
})

router.get('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    const result = await query(`SELECT * FROM ${table} WHERE id = $1`, [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Get error:', error)
    res.status(500).json({ error: 'Failed to get data' })
  }
})

router.post('/:table', async (req, res) => {
  try {
    const { table } = req.params
    const data = req.body
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    const columns = Object.keys(data).filter(k => !READONLY_COLUMNS.includes(k))
    const values = columns.map((c, i) => `$${i + 1}`)
    const result = await query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.join(',')}) RETURNING *`,
      columns.map(c => data[c])
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Insert error:', error)
    res.status(500).json({ error: 'Failed to insert data' })
  }
})

router.put('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const data = req.body
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    const updates = Object.keys(data)
      .filter(k => !READONLY_COLUMNS.includes(k))
      .map((c, i) => `${c} = $${i + 2}`)
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable columns' })
    }
    const result = await query(
      `UPDATE ${table} SET ${updates.join(',')} WHERE id = $1 RETURNING *`,
      [id, ...Object.keys(data).filter(k => !READONLY_COLUMNS.includes(k)).map(c => data[c])]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update error:', error)
    res.status(500).json({ error: 'Failed to update data' })
  }
})

router.post('/:table/upsert', async (req, res) => {
  try {
    const { table } = req.params
    const data = req.body
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    if (!data.id) {
      return res.status(400).json({ error: 'ID required for upsert' })
    }
    const columns = Object.keys(data).filter(k => !READONLY_COLUMNS.includes(k))
    const values = columns.map((c, i) => `$${i + 1}`)
    const updateCols = columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`)
    
    let result
    if (updateCols.length > 0) {
      result = await query(
        `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.join(',')})
         ON CONFLICT (id) DO UPDATE SET ${updateCols.join(',')} RETURNING *`,
        columns.map(c => data[c])
      )
    } else {
      result = await query(
        `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.join(',')})
         ON CONFLICT (id) DO NOTHING RETURNING *`,
        columns.map(c => data[c])
      )
    }
    
    if (result.rows.length === 0) {
      result = await query(`SELECT * FROM ${table} WHERE id = $1`, [data.id])
    }
    
    res.json({ 
      action: result.rows.length > 0 && result.rows[0].id === data.id ? 'inserted' : 'updated',
      data: result.rows[0] 
    })
  } catch (error) {
    console.error('Upsert error:', error)
    res.status(500).json({ error: 'Failed to upsert data' })
  }
})

router.delete('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    const result = await query(
      `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    res.json({ message: 'Deleted successfully', id })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'Failed to delete data' })
  }
})

router.delete('/:table', async (req, res) => {
  try {
    const { table } = req.params
    if (!ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Table not allowed' })
    }
    if (!['games', 'decks', 'invites'].includes(table)) {
      return res.status(403).json({ error: 'Cannot truncate this table' })
    }
    await query(`DELETE FROM ${table}`)
    res.json({ message: `All rows deleted from ${table}` })
  } catch (error) {
    console.error('Delete all error:', error)
    res.status(500).json({ error: 'Failed to delete data' })
  }
})

export default router
