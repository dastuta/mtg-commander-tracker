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
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        games_played INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
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
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        total_duration INTEGER DEFAULT 0,
        total_actions INTEGER DEFAULT 0,
        winner_id UUID REFERENCES players(id),
        winner_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        player_id UUID REFERENCES players(id) ON DELETE SET NULL,
        player_name VARCHAR(255) NOT NULL,
        commander_name VARCHAR(255),
        final_life INTEGER DEFAULT 40,
        final_poison INTEGER DEFAULT 0,
        defeated BOOLEAN DEFAULT FALSE,
        defeat_reason VARCHAR(255),
        defeated_by VARCHAR(255),
        turn_count INTEGER DEFAULT 0
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_turns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        turn_number INTEGER NOT NULL,
        player_id UUID,
        player_name VARCHAR(255),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 0
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        turn_id UUID REFERENCES game_turns(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        source_id UUID,
        source_name VARCHAR(255),
        target_id UUID,
        target_name VARCHAR(255),
        value INTEGER DEFAULT 0,
        previous_value INTEGER DEFAULT 0,
        new_value INTEGER DEFAULT 0,
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS commander_damage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        source_player_id UUID,
        source_player_name VARCHAR(255),
        target_player_id UUID,
        target_player_name VARCHAR(255),
        damage INTEGER DEFAULT 0
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_actions_game_id ON game_actions(game_id)
    `)

    console.log('All tables created successfully')
  } finally {
    client.release()
  }
}
