import express from 'express'
import { query } from '../db/init.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const overview = await query(
      `SELECT 
        COUNT(*) as total_games,
        COALESCE(SUM(total_duration), 0) as total_playtime,
        COALESCE(SUM(total_actions), 0) as total_actions
       FROM games WHERE user_id = $1`,
      [req.userId]
    )

    const players = await query(
      'SELECT DISTINCT player_name FROM game_players gp JOIN games g ON gp.game_id = g.id WHERE g.user_id = $1',
      [req.userId]
    )

    res.json({
      overview: overview.rows[0],
      uniquePlayers: players.rows.length
    })
  } catch (error) {
    console.error('Get stats overview error:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

router.get('/players', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        gp.player_name,
        COUNT(*) as games,
        COUNT(CASE WHEN gp.game_id = g.winner_id THEN 1 END) as wins,
        COUNT(CASE WHEN gp.defeated = true THEN 1 END) as losses,
        ROUND(
          COUNT(CASE WHEN gp.game_id = g.winner_id THEN 1 END)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 1
        ) as win_rate
       FROM game_players gp
       JOIN games g ON gp.game_id = g.id
       WHERE g.user_id = $1
       GROUP BY gp.player_name
       ORDER BY games DESC`,
      [req.userId]
    )

    res.json({ playerStats: result.rows })
  } catch (error) {
    console.error('Get player stats error:', error)
    res.status(500).json({ error: 'Failed to get player stats' })
  }
})

router.get('/damage', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        ga.source_name,
        ga.target_name,
        SUM(ABS(ga.value)) as total_damage
       FROM game_actions ga
       JOIN games g ON ga.game_id = g.id
       WHERE g.user_id = $1 AND ga.action_type = 'damage'
       GROUP BY ga.source_name, ga.target_name
       ORDER BY total_damage DESC
       LIMIT 50`,
      [req.userId]
    )

    res.json({ damageStats: result.rows })
  } catch (error) {
    console.error('Get damage stats error:', error)
    res.status(500).json({ error: 'Failed to get damage stats' })
  }
})

router.get('/recent', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count
       FROM games g
       WHERE g.user_id = $1
       ORDER BY g.created_at DESC
       LIMIT 10`,
      [req.userId]
    )

    res.json({ recentGames: result.rows })
  } catch (error) {
    console.error('Get recent games error:', error)
    res.status(500).json({ error: 'Failed to get recent games' })
  }
})

export default router
