import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import playerRoutes from './routes/players.js'
import gameRoutes from './routes/games.js'
import { initDatabase } from './db/init.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/players', playerRoutes)
app.use('/api/games', gameRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

async function start() {
  try {
    await initDatabase()
    console.log('Database initialized')
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
