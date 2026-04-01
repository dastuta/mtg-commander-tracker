import pg from 'pg'
const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }
  return pool
}

export async function query(text, params) {
  const client = await getPool().connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function initDatabase() {
  const client = await getPool().connect()
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        games_played INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS commanders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES players(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, name)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_id VARCHAR(255),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        total_duration INTEGER DEFAULT 0,
        total_turns INTEGER DEFAULT 0,
        total_actions INTEGER DEFAULT 0,
        winner_name VARCHAR(255),
        winner_reason VARCHAR(255),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        player_name VARCHAR(255) NOT NULL,
        commander_name VARCHAR(255),
        seat INTEGER DEFAULT 1,
        starting_life INTEGER DEFAULT 40,
        final_life INTEGER DEFAULT 40,
        final_poison INTEGER DEFAULT 0,
        placement INTEGER,
        defeated BOOLEAN DEFAULT FALSE,
        defeat_reason VARCHAR(255),
        defeated_by VARCHAR(255)
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time DESC)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        format VARCHAR(50) DEFAULT 'commander',
        commander_id UUID,
        commander_name VARCHAR(255),
        is_public BOOLEAN DEFAULT FALSE,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS deck_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
        card_id VARCHAR(100) NOT NULL,
        card_name VARCHAR(255) NOT NULL,
        scryfall_id UUID,
        oracle_id UUID,
        multiverse_ids INTEGER[],
        mtgo_id INTEGER,
        tcgplayer_id INTEGER,
        cardmarket_id INTEGER,
        set_code VARCHAR(20),
        set_name VARCHAR(255),
        collector_number VARCHAR(50),
        rarity VARCHAR(20),
        is_foil BOOLEAN DEFAULT FALSE,
        is_full_art BOOLEAN DEFAULT FALSE,
        card_type VARCHAR(100),
        mana_cost VARCHAR(50),
        cmc DECIMAL(4,1),
        quantity INTEGER DEFAULT 1,
        slot INTEGER NOT NULL,
        zone VARCHAR(50) DEFAULT 'mainboard',
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(deck_id, card_id, slot)
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deck_cards_card_name ON deck_cards(card_name)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deck_cards_scryfall_id ON deck_cards(scryfall_id)
    `)

    console.log('Database tables created successfully')
  } finally {
    client.release()
  }
}
