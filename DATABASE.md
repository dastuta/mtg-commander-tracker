# Database Guide - MTG Commander Tracker

## Docker Setup

### Start Backend + Database
```bash
cd /opt/mtg-commander-tracker
git pull
docker compose -f docker-compose.backend.yml up -d
```

### Stop Services
```bash
docker compose -f docker-compose.backend.yml down
```

### View Logs
```bash
docker logs mtg-commander-backend
docker logs mtg-commander-db
```

---

## Database Access

### Via Docker Exec (Terminal)
```bash
docker exec -it mtg-commander-db psql -U mtg -d mtg_tracker
```

### Useful psql Commands
```sql
-- Alle Tabellen anzeigen
\dt

-- Alle Spieler anzeigen
SELECT * FROM players;

-- Alle Commander anzeigen
SELECT * FROM commanders;

-- Alle Spiele anzeigen
SELECT * FROM games;

-- Spieler mit Commanders (join)
SELECT p.name, p.games_played, c.name as commander
FROM players p
LEFT JOIN commanders c ON c.player_id = p.id
ORDER BY p.games_played DESC;

-- Statistik: Top Spieler
SELECT name, games_played FROM players ORDER BY games_played DESC LIMIT 10;

-- Letzte Spiele
SELECT id, start_time, end_time, winner_name, winner_reason 
FROM games 
ORDER BY start_time DESC 
LIMIT 20;
```

### Quit psql
```sql
\q
```

---

## GUI Clients (Optional)

### DBeaver (Empfohlen)
Universeller Database-Client für alle DB-Typen.

```bash
# Nobara/Fedora
sudo dnf install dbeaver

# Ubuntu/Debian
sudo apt install dbeaver-ce

# Oder Flatpak
flatpak install flathub io.dbeaver.DBeaver
```

### Connection Settings
- **Host:** `DEINE_VPS_IP`
- **Port:** `5432`
- **Database:** `mtg_tracker`
- **User:** `mtg`
- **Password:** `mtg_password`

### pgAdmin (PostgreSQL only)
```bash
# Ubuntu/Debian
sudo apt install pgadmin4
```

---

## Port Forwarding (für Remote-Zugriff)

Falls der Port nicht direkt erreichbar ist, nutze SSH Tunnel:
```bash
ssh -L 5433:localhost:5432 user@DEINE_VPS_IP
```
Dann verbinde dich mit `localhost:5433`.

---

## Backup & Restore

### Backup erstellen
```bash
docker exec mtg-commander-db pg_dump -U mtg mtg_tracker > backup.sql
```

### Backup wiederherstellen
```bash
docker exec -i mtg-commander-db psql -U mtg -d mtg_tracker < backup.sql
```

---

## Troubleshooting

### Connection refused
```bash
# Prüfe ob Container läuft
docker ps

# Prüfe Logs
docker logs mtg-commander-db
docker logs mtg-commander-backend
```

### Datenbank voll
```bash
# Volume leeren und neu starten
docker compose -f docker-compose.backend.yml down -v
docker compose -f docker-compose.backend.yml up -d
```
