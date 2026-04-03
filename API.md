# MTG Commander Tracker API

**Base URL:** `https://mtg-tracker.die-sons.cloud/api`

---

## Authentifizierung

Alle API-Requests (außer `/health`) benötigen einen API-Key im Header:

```
Authorization: Bearer DEIN_API_KEY
```

### API-Keys

| Key | Beschreibung | Einsatz |
|-----|-------------|---------|
| `mtg-secret-key-2024` | Standard API-Key | Alle API-Requests |
| *(in .env setzen)* | Eigenen Key setzen | Produktion |

Key setzen:
```bash
export API_KEY="dein-geheimer-key"
```

Oder in `docker-compose.yml`:
```yaml
environment:
  - API_KEY=${API_KEY:-mtg-secret-key-2024}
```

---

## Health Check

### GET /health
Server-Status prüfen. **Kein API-Key erforderlich.**

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-30T19:00:00.000Z"
}
```

---

## Data API (Flexible Datenzugriff)

Direkter Zugriff auf alle Tabellen mit CRUD-Operationen.

**Base:** `/api/data/{table}`

### Erlaubte Tabellen
- `games` - Spielaufzeichnungen
- `game_players` - Spieler in Spielen
- `players` - Spieler-Datenbank
- `commanders` - Commander-Liste
- `decks` - Decklisten
- `deck_cards` - Karten in Decks
- `invites` - Einladungscodes

### GET /data/{table}
Alle Einträge einer Tabelle abrufen (max 100).

```bash
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games"
```

### GET /data/{table}/{id}
Einzelne Zeile abrufen.

```bash
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games/UUID-HIER"
```

### POST /data/{table}
Neue Zeile einfügen.

```bash
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Wert", "field2": "Wert2"}' \
  "https://mtg-tracker.die-sons.cloud/api/data/players"
```

### PUT /data/{table}/{id}
Zeile aktualisieren.

```bash
curl -X PUT -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "NeuerName"}' \
  "https://mtg-tracker.die-sons.cloud/api/data/players/UUID-HIER"
```

**Hinweis:** Die Spalten `id` und `created_at` können nicht geändert werden.

---

## Players

### GET /health
Server-Status prüfen.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-30T19:00:00.000Z"
}
```

---

## Players

### GET /players
Alle Spieler mit Commandern abrufen.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Marvin",
    "games_played": 5,
    "created_at": "2026-03-30T19:00:00.000Z",
    "commanders": [
      { "id": "uuid", "name": "Ayara" },
      { "id": "uuid", "name": "Edgar Markov" }
    ]
  }
]
```

---

### POST /players
Neuen Spieler erstellen oder existierenden aktualisieren.

**Request:**
```json
{
  "name": "Marvin",
  "commander": "Ayara"
}
```

**Response:** Spieler-Objekt (siehe GET /players)

---

### POST /players/sync
Mehrere Spieler synchronisieren (für Bulk-Upload).

**Request:**
```json
{
  "players": [
    { "name": "Spieler1", "games": 10, "commanders": ["CMD1", "CMD2"] },
    { "name": "Spieler2", "games": 5, "commanders": ["CMD3"] }
  ]
}
```

**Response:** Array von Spieler-Objekten

---

## Games

### GET /games
Alle Spielexporte abrufen (neueste zuerst).

**Response:**
```json
[
  {
    "id": "uuid",
    "external_id": "uuid",
    "start_time": "2026-03-30T19:00:00.000Z",
    "end_time": "2026-03-30T19:30:00.000Z",
    "total_duration": 1800,
    "total_turns": 12,
    "total_actions": 45,
    "winner_name": "Marvin",
    "winner_reason": "last_standing",
    "raw_data": { ... }
  }
]
```

---

### GET /games/:id
Einzelnes Spiel mit Details abrufen.

**Response:** Spiel-Objekt mit Spielern und rohen Daten

---

### POST /games
Spielexport speichern.

**Request:** MTG Commander JSON Export Format

```json
{
  "schema_version": "1.0",
  "game_id": "2026-03-30_123",
  "date": "2026-03-30T19:00:00.000Z",
  "duration_minutes": 30,
  "total_turns": 12,
  "players": [
    {
      "player_id": "player1",
      "commander": "Ayara",
      "final_life": 40,
      "placement": 1
    }
  ],
  "actions": [
    {
      "seq": 1,
      "turn": 1,
      "type": "damage",
      "actor": "player1",
      "targets": ["player2"],
      "value": 5
    }
  ]
}
```

**Response:** Gespeichertes Spiel-Objekt

---

## Beispiel-Requests

### cURL

```bash
# Health Check
curl https://mtg-api.die-sons.cloud/api/health

# Alle Spieler
curl https://mtg-api.die-sons.cloud/api/players

# Neuen Spieler erstellen
curl -X POST https://mtg-api.die-sons.cloud/api/players \
  -H "Content-Type: application/json" \
  -d '{"name": "Max", "commander": "Ur-Dragon"}'

# Alle Spiele
curl https://mtg-api.die-sons.cloud/api/games

# Spiel speichern
curl -X POST https://mtg-api.die-sons.cloud/api/games \
  -H "Content-Type: application/json" \
  -d @game-export.json
```

### JavaScript

```javascript
const API_BASE = 'https://mtg-api.die-sons.cloud/api'

// Spieler laden
const players = await fetch(`${API_BASE}/players`).then(r => r.json())

// Spiel speichern
await fetch(`${API_BASE}/games`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(gameData)
})
```

---

## Datenbank-Struktur

### players
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| name | VARCHAR | Spielername (einzigartig) |
| games_played | INTEGER | Anzahl gespielter Spiele |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letztes Update |

### commanders
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| player_id | UUID | Fremdschlüssel zu players |
| name | VARCHAR | Commander-Name |
| created_at | TIMESTAMP | Erstellungsdatum |

### games
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| external_id | VARCHAR | Externe ID aus Export |
| start_time | TIMESTAMP | Spielstart |
| end_time | TIMESTAMP | Spielende |
| total_duration | INTEGER | Dauer in Sekunden |
| total_turns | INTEGER | Anzahl Züge |
| total_actions | INTEGER | Anzahl Aktionen |
| winner_name | VARCHAR | Name des Gewinners |
| winner_reason | VARCHAR | Grund für Sieg |
| raw_data | JSONB | Vollständige Export-JSON |
| created_at | TIMESTAMP | Erstellungsdatum |

### game_players
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| game_id | UUID | Fremdschlüssel zu games |
| player_name | VARCHAR | Spielername |
| commander_name | VARCHAR | Commander-Name |
| seat | INTEGER | Sitzplatz |
| final_life | INTEGER | End-Lebenspunkte |
| final_poison | INTEGER | End-Gift |
| placement | INTEGER | Platzierung |
| defeated | BOOLEAN | Wurde besiegt |
| defeat_reason | VARCHAR | Grund für Niederlage |

---

## Fehlerbehandlung

**400 Bad Request** - Ungültige Eingabedaten
```json
{ "error": "Name is required" }
```

**500 Internal Server Error** - Serverfehler
```json
{ "error": "Failed to fetch players" }
```
