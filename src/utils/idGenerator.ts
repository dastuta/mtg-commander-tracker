// ============================================
// UUID GENERATOR
// ============================================

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateGameId(): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0')
  return `${dateStr}_${random}`
}

export function toPlayerId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_')
}
