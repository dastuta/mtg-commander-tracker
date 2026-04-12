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

---

### GET /data/{table}
Alle Einträge einer Tabelle abrufen (max 100).

```bash
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games"
```

**Beispiele:**
```bash
# Alle Spieler
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/players"

# Alle Decks
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/decks"

# Alle Deck-Karten
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/deck_cards"
```

---

### GET /data/{table}/{id}
Einzelne Zeile abrufen.

```bash
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games/22d71602-a754-4374-8003-51825d4ca0c7"
```

---

### POST /data/{table}
Neue Zeile einfügen.

```bash
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "SpielerName", "games_played": 0}' \
  "https://mtg-tracker.die-sons.cloud/api/data/players"
```

**Beispiele:**
```bash
# Neuen Spieler erstellen
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Max", "games_played": 0}' \
  "https://mtg-tracker.die-sons.cloud/api/data/players"

# Neues Spiel erstellen
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"start_time": "2026-04-03", "total_turns": 10}' \
  "https://mtg-tracker.die-sons.cloud/api/data/games"

# Neues Deck erstellen
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mein Deck", "format": "commander", "commander_name": "Ur-Dragon"}' \
  "https://mtg-tracker.die-sons.cloud/api/data/decks"
```

---

### DELETE /data/{table}/{id}
Einzelne Zeile löschen.

```bash
curl -X DELETE -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games/22d71602-a754-4374-8003-51825d4ca0c7"
```

**Response:**
```json
{ "message": "Deleted successfully", "id": "UUID" }
```

---

### DELETE /data/{table}
Alle Zeilen einer Tabelle löschen.

```bash
curl -X DELETE -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games"
```

**Hinweis:** Geschützte Tabellen (`players`, `commanders`, `game_players`, `deck_cards`) können nicht geleert werden.

---

### POST /data/{table}/upsert
Datenbank-Operation für **INSERT oder UPDATE** in einem Aufruf.

**Verhalten:**
1. Suche nach der übergebenen `id`
2. **Wenn ID existiert** → UPDATE (nur übergebene Felder ändern, andere bleiben unberührt)
3. **Wenn ID nicht existiert** → INSERT (neue Zeile erstellen)

**Wichtig:**
- `id` ist **Pflicht** im Request-Body
- `created_at` kann nicht geändert werden

**URL-Format:**
```
POST /api/data/{tabelle}/upsert
```

**Request-Body:**
```json
{
  "id": "UUID-DER-ZEILE",
  "feld1": "NeuerWert",
  "feld2": 123
}
```

**Beispiel: Spiel aktualisieren**
```bash
# 1. Zuerst ID herausfinden
curl -H "Authorization: Bearer API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/games"

# 2. Spiel aktualisieren (z.B. external_id setzen)
curl -X POST -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "22d71602-a754-4374-8003-51825d4ca0c7",
    "external_id": "123456"
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/games/upsert"

# 3. Mehrere Felder auf einmal aktualisieren
curl -X POST -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "22d71602-a754-4374-8003-51825d4ca0c7",
    "winner_name": "Max",
    "winner_reason": "last_standing",
    "total_turns": 15
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/games/upsert"
```

**Beispiel: Spieler aktualisieren**
```bash
curl -X POST -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UUID-DES-SPIELERS",
    "games_played": 10,
    "pin_hash": "hashwert123"
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/players/upsert"
```

**Beispiel: Deck aktualisieren**
```bash
curl -X POST -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UUID-DES-DECKS",
    "description": "Aggro Deck mit vielen Kreaturen"
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/decks/upsert"
```

**Beispiel: Neue Commander erstellen**
```bash
curl -X POST -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "NEUE-UUID",
    "player_id": "UUID-DES-SPIELERS",
    "name": "Ur-Dragon"
  }' \
  "https://mtg-tracker.die-sons.cloud/api/data/commanders/upsert"
```

**Response-Möglichkeiten:**
```json
{ "action": "updated", "data": { ... } }
```
```json
{ "action": "inserted", "data": { ... } }
```
```json
{ "action": "unchanged", "data": { ... } }
```

---

## Spezifische Tabellen-Beispiele

### commanders
```bash
# Alle Commander abrufen
curl -H "Authorization: Bearer DEIN_API_KEY" \
  "https://mtg-tracker.die-sons.cloud/api/data/commanders"

# Commander erstellen (ohne Spieler-Verknüpfung)
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ur-Dragon"}' \
  "https://mtg-tracker.die-sons.cloud/api/data/commanders"

# Commander mit Spieler-Verknüpfung
curl -X POST -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"player_id": "UUID-DES-SPIELERS", "name": "Edgar Markov"}' \
  "https://mtg-tracker.die-sons.cloud/api/data/commanders"
```

---

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

# === LESEN ===
curl $AUTH "$BASE/data/games"              # Alle Spiele
curl $AUTH "$BASE/data/players"            # Alle Spieler
curl $AUTH "$BASE/data/decks"              # Alle Decks
curl $AUTH "$BASE/data/game_players"       # Alle Game-Player
curl $AUTH "$BASE/data/UUID-DES-SPIELS"   # Einzelnes Spiel

# === NEU ERSTELLEN ===
curl -X POST $AUTH -H "Content-Type: application/json" \
  -d '{"name":"NeuerSpieler"}' "$BASE/data/players"

curl -X POST $AUTH -H "Content-Type: application/json" \
  -d '{"name":"Mein Deck","format":"commander","commander_name":"Ur-Dragon"}' "$BASE/data/decks"

# === AKTUALISIEREN (Upsert) ===
curl -X POST $AUTH -H "Content-Type: application/json" \
  -d '{"id":"UUID","winner_name":"Max"}' "$BASE/data/games/upsert"

# === LÖSCHEN ===
curl -X DELETE $AUTH "$BASE/data/games/UUID"     # Einzelne Zeile
curl -X DELETE $AUTH "$BASE/data/games"          # Alle Spiele leeren

# === SQL DIREKT ===
docker exec mtg-commander-tracker-db-1 psql -U mtg -d mtg_tracker -c "SELECT * FROM games LIMIT 5;"
```
