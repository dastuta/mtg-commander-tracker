# MTG Commander Tracker API

**Base URL:** `https://mtg-tracker.die-sons.cloud/api`

---

## Authentifizierung

Alle API-Requests (außer `/health`) benötigen einen API-Key im Header:

```
Authorization: Bearer DEIN_API_KEY
```

### API-Key

Der API-Key wird in der `.env` Datei oder als Environment-Variable gesetzt:

```bash
export API_KEY="dein-geheimer-key"
```

Oder in `docker-compose.yml`:
```yaml
environment:
  - API_KEY=${API_KEY}
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

### POST /data/{table}/upsert
Spalte einfügen oder aktualisieren (Insert-or-Update).

**Verhalten:**
- Wenn die ID **nicht existiert** → INSERT (neue Zeile)
- Wenn die ID **bereits existiert** → UPDATE (nur übergebene Spalten ändern, andere bleiben unberührt)

```bash
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UUID-DER-ZEILE",
    "feld1": "NeuerWert",
    "feld2": "NochEinWert"
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/games/upsert"
```

**Beispiel: Spiel aktualisieren**
```bash
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "22d71602-a754-4374-8003-51825d4ca0c7",
    "external_id": "123456",
    "winner_name": "Max"
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/games/upsert"
```

**Response:**
```json
{
  "action": "updated",
  "data": { ... }
}
```

Oder:
```json
{
  "action": "inserted",
  "data": { ... }
}
```

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
# Health Check (ohne Auth)
curl https://mtg-tracker.die-sons.cloud/api/health

# Alle Spieler
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/players"

# Neuen Spieler erstellen
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Max", "commander": "Ur-Dragon"}' \
  "https://mtg-tracker.die-sons.cloud/api/players"

# Alle Spiele
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/games"

# Spiel speichern
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d @game-export.json \
  "https://mtg-tracker.die-sons.cloud/api/games"

# Direkter Tabellenzugriff - alle Spieler
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/players"

# Neue Spalte zu players hinzufügen (SQL direkt)
docker exec mtg-commander-tracker-db-1 psql -U mtg -d mtg_tracker -c \
  "ALTER TABLE players ADD COLUMN IF NOT EXISTS notes TEXT;"
```

### JavaScript

```javascript
const API_KEY = 'DEIN_API_KEY'
const API_BASE = 'https://mtg-tracker.die-sons.cloud/api'

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
}

// Spieler laden
const players = await fetch(`${API_BASE}/players`, { headers }).then(r => r.json())

// Spiel speichern
await fetch(`${API_BASE}/games`, {
  method: 'POST',
  headers,
  body: JSON.stringify(gameData)
})

// Direkter Tabellenzugriff
const games = await fetch(`${API_BASE}/data/games`, { headers }).then(r => r.json())
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
| seat | INTEGER | Sitzplatz (Startreihenfolge) |
| final_life | INTEGER | End-Lebenspunkte |
| final_poison | INTEGER | End-Gift |
| placement | INTEGER | Platzierung (1=Gewinner) |
| defeated | BOOLEAN | Wurde besiegt |
| defeat_reason | VARCHAR | Grund für Niederlage |
| defeated_by | VARCHAR | Wer hat besiegt |

### decks
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| name | VARCHAR | Deckname |
| description | TEXT | Beschreibung |
| format | VARCHAR | Format (default: commander) |
| commander_name | VARCHAR | Commander des Decks |
| is_public | BOOLEAN | Öffentlich sichtbar |
| tags | TEXT[] | Tags für Kategorisierung |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letztes Update |

### deck_cards
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| deck_id | UUID | Fremdschlüssel zu decks |
| card_id | VARCHAR | Scryfall Card ID |
| card_name | VARCHAR | Kartenname |
| scryfall_id | UUID | Scryfall UUID |
| oracle_id | UUID | Oracle ID (gleiche Karte über Versionen) |
| multiverse_ids | INTEGER[] | Multiverse IDs |
| set_code | VARCHAR | Set-Kürzel (z.B. "MKM") |
| set_name | VARCHAR | Voller Set-Name |
| collector_number | VARCHAR | Sammlerkartennummer |
| rarity | VARCHAR | Seltenheit |
| is_foil | BOOLEAN | Foil-Version |
| cmc | DECIMAL | Converted Mana Cost |
| quantity | INTEGER | Anzahl (default: 1) |
| slot | INTEGER | Sortierung |
| zone | VARCHAR | Zone (mainboard/sideboard) |
| image_url | TEXT | Bild-URL |

### invites
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primärschlüssel |
| code | VARCHAR | Einladungscode |
| used | BOOLEAN | Wurde verwendet |
| used_by | UUID | User der registriert hat |
| created_at | TIMESTAMP | Erstellungsdatum |
| used_at | TIMESTAMP | Wann verwendet |

---

## Fehlerbehandlung

**401 Unauthorized** - Kein oder ungültiger API-Key
```json
{ "error": "No API key provided" }
```
```json
{ "error": "Invalid API key" }
```

**400 Bad Request** - Ungültige Eingabedaten
```json
{ "error": "Name is required" }
```

**404 Not Found** - Ressource nicht gefunden
```json
{ "error": "Row not found" }
```

**500 Internal Server Error** - Serverfehler
```json
{ "error": "Failed to fetch players" }
```

---

## Quick Reference

```bash
# API-Key setzen
export API_KEY="dein-key"

# Basis-Commands
BASE="https://mtg-tracker.die-sons.cloud/api"
AUTH="-H \"Authorization: Bearer $API_KEY\""

# Tabellenzugriff
curl $AUTH "$BASE/data/games"           # Alle Spiele
curl $AUTH "$BASE/data/players"         # Alle Spieler
curl $AUTH "$BASE/data/decks"           # Alle Decks
curl $AUTH "$BASE/data/deck_cards"      # Alle Deck-Karten

# Einzelne Zeilen
curl $AUTH "$BASE/data/players/UUID"
curl $AUTH -X POST -H "Content-Type: application/json" \
  -d '{"name":"NeuerSpieler"}' "$BASE/data/players"
curl $AUTH -X PUT -H "Content-Type: application/json" \
  -d '{"name":"GeänderterName"}' "$BASE/data/players/UUID"
```
