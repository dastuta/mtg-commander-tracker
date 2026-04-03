const API_KEY = process.env.API_KEY || 'mtg-api-key-2024'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No API key provided' })
  }

  const apiKey = authHeader.substring(7)

  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  next()
}
