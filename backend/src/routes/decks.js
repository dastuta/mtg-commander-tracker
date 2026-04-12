import express from 'express'
import { query } from '../db/init.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM deck_cards WHERE deck_id = d.id) as card_count,
        (SELECT COUNT(*) FROM deck_cards WHERE deck_id = d.id AND zone = 'mainboard') as mainboard_count,
        (SELECT COUNT(*) FROM deck_cards WHERE deck_id = d.id AND zone = 'sideboard') as sideboard_count
       FROM decks d 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching decks:', err)
    res.status(500).json({ error: 'Failed to fetch decks' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const deckResult = await query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' })
    }

    const cardsResult = await query(
      'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY slot, zone',
      [req.params.id]
    )

    res.json({
      ...deckResult.rows[0],
      cards: cardsResult.rows
    })
  } catch (err) {
    console.error('Error fetching deck:', err)
    res.status(500).json({ error: 'Failed to fetch deck' })
  }
})

router.get('/by-commander/:playerId/:commanderName', async (req, res) => {
  try {
    const { playerId, commanderName } = req.params
    const deckResult = await query(
      'SELECT * FROM decks WHERE player_id = $1 AND commander_name = $2',
      [playerId, commanderName]
    )

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' })
    }

    const cardsResult = await query(
      'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY slot, zone',
      [deckResult.rows[0].id]
    )

    res.json({
      ...deckResult.rows[0],
      cards: cardsResult.rows
    })
  } catch (err) {
    console.error('Error fetching deck by commander:', err)
    res.status(500).json({ error: 'Failed to fetch deck' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, format, commander_id, commander_name, is_public, tags, cards } = req.body
    
    const deckResult = await query(
      `INSERT INTO decks (user_id, name, description, format, commander_id, commander_name, is_public, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.userId, name, description || null, format || 'commander', commander_id || null, commander_name || null, is_public || false, tags || []]
    )
    
    const deck = deckResult.rows[0]
    
    if (cards && cards.length > 0) {
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        await query(
          `INSERT INTO deck_cards (deck_id, card_id, card_name, scryfall_id, oracle_id, multiverse_ids, mtgo_id, tcgplayer_id, cardmarket_id, set_code, set_name, collector_number, rarity, is_foil, is_full_art, card_type, mana_cost, cmc, quantity, slot, zone, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
          [
            deck.id, card.card_id, card.card_name, card.scryfall_id || null, card.oracle_id || null,
            card.multiverse_ids || null, card.mtgo_id || null, card.tcgplayer_id || null,
            card.cardmarket_id || null, card.set_code || null, card.set_name || null,
            card.collector_number || null, card.rarity || null, card.is_foil || false,
            card.is_full_art || false, card.card_type || null, card.mana_cost || null,
            card.cmc || null, card.quantity || 1, i, card.zone || 'mainboard', card.image_url || null
          ]
        )
      }
    }
    
    res.status(201).json(deck)
  } catch (err) {
    console.error('Error creating deck:', err)
    res.status(500).json({ error: 'Failed to create deck' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, description, format, commander_id, commander_name, is_public, tags, cards } = req.body
    
    const deckResult = await query(
      `UPDATE decks SET name = $1, description = $2, format = $3, commander_id = $4, commander_name = $5, is_public = $6, tags = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [name, description, format, commander_id, commander_name, is_public, tags, req.params.id, req.userId]
    )
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' })
    }
    
    if (cards !== undefined) {
      await query('DELETE FROM deck_cards WHERE deck_id = $1', [req.params.id])
      
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        await query(
          `INSERT INTO deck_cards (deck_id, card_id, card_name, scryfall_id, oracle_id, multiverse_ids, mtgo_id, tcgplayer_id, cardmarket_id, set_code, set_name, collector_number, rarity, is_foil, is_full_art, card_type, mana_cost, cmc, quantity, slot, zone, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
          [
            req.params.id, card.card_id, card.card_name, card.scryfall_id || null, card.oracle_id || null,
            card.multiverse_ids || null, card.mtgo_id || null, card.tcgplayer_id || null,
            card.cardmarket_id || null, card.set_code || null, card.set_name || null,
            card.collector_number || null, card.rarity || null, card.is_foil || false,
            card.is_full_art || false, card.card_type || null, card.mana_cost || null,
            card.cmc || null, card.quantity || 1, i, card.zone || 'mainboard', card.image_url || null
          ]
        )
      }
    }
    
    res.json(deckResult.rows[0])
  } catch (err) {
    console.error('Error updating deck:', err)
    res.status(500).json({ error: 'Failed to update deck' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' })
    }
    
    res.json({ message: 'Deck deleted successfully' })
  } catch (err) {
    console.error('Error deleting deck:', err)
    res.status(500).json({ error: 'Failed to delete deck' })
  }
})

router.post('/:id/import', async (req, res) => {
  try {
    const { cards, commander_name } = req.body
    
    const deckResult = await query(
      `INSERT INTO decks (user_id, name, commander_name, format, tags)
       VALUES ($1, $2, $3, 'commander', ARRAY['imported'])
       RETURNING *`,
      [req.userId, `Imported Deck ${new Date().toISOString().split('T')[0]}`, commander_name || 'Unknown Commander']
    )
    
    const deck = deckResult.rows[0]
    
    if (cards && cards.length > 0) {
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        await query(
          `INSERT INTO deck_cards (deck_id, card_id, card_name, scryfall_id, oracle_id, multiverse_ids, set_code, set_name, collector_number, rarity, card_type, mana_cost, cmc, quantity, slot, zone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            deck.id, card.id || card.card_id || `import_${i}`, card.name, card.id || null,
            card.oracle_id || null, card.multiverse_ids || null, card.set || card.set_code || null,
            card.set_name || null, card.collector_number || null, card.rarity || null,
            card.type_line || card.card_type || null, card.mana_cost || null, card.cmc || null,
            card.quantity || 1, i, card.zone || 'mainboard'
          ]
        )
      }
    }
    
    res.status(201).json(deck)
  } catch (err) {
    console.error('Error importing deck:', err)
    res.status(500).json({ error: 'Failed to import deck' })
  }
})

router.post('/:id/export', async (req, res) => {
  try {
    const cardsResult = await query(
      'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY slot, zone',
      [req.params.id]
    )
    
    const deckResult = await query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' })
    }
    
    const exportFormat = req.query.format || 'text'
    
    if (exportFormat === 'text') {
      let text = `${deckResult.rows[0].name}\n`
      text += `Commander: ${deckResult.rows[0].commander_name}\n\n`
      
      const mainboard = cardsResult.rows.filter(c => c.zone === 'mainboard')
      const sideboard = cardsResult.rows.filter(c => c.zone === 'sideboard')
      
      mainboard.forEach(card => {
        text += `${card.quantity} ${card.card_name}\n`
      })
      
      if (sideboard.length > 0) {
        text += '\nSideboard:\n'
        sideboard.forEach(card => {
          text += `${card.quantity} ${card.card_name}\n`
        })
      }
      
      res.type('text/plain').send(text)
    } else {
      res.json({
        ...deckResult.rows[0],
        cards: cardsResult.rows
      })
    }
  } catch (err) {
    console.error('Error exporting deck:', err)
    res.status(500).json({ error: 'Failed to export deck' })
  }
})

export default router
