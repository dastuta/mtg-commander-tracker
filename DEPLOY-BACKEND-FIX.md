# Backend-Fix deployen: LIMIT 100 → 10000

## Kontext

- **Problem:** `GET /api/games` und `GET /api/data/games` lieferten nur die neuesten **100** Spiele (`LIMIT 100`, sortiert neueste zuerst). Alle älteren Spiele (z. B. 101–104) wurden abgeschnitten und automatisch wieder sichtbar, sobald das Limit angehoben ist. In der DB sind alle Spiele vorhanden — nichts wird gelöscht.
- **Fix:** Commit `9a3ee61` erhöht das Limit auf `10000` in `backend/src/routes/games.js` und `backend/src/routes/data.js`.
- Der Fix liegt auf `main`. GitHub Actions hat automatisch ein Backend-Image gebaut — **das wird aber NICHT automatisch auf der VPS ausgerollt.**

## Warum GitHub Actions allein nicht reicht

Die Backend-VPS nutzt `docker-compose.backend.yml` mit `build: ./backend`. Dort wird das Backend **aus dem lokalen Git-Checkout auf der VPS** gebaut (`/opt/mtg-commander-tracker`) — nicht aus dem GitHub-Image gepullt. Ohne `git pull` + Rebuild bleibt der alte Code aktiv.

## Schritte auf der Backend-VPS (SSH)

```bash
cd /opt/mtg-commander-tracker

# 1. Neuen Fix-Commit holen
git pull origin main

# 2. Backend aus dem neuen Code neu bauen und starten
#    --build ist PFLICHT — ohne das wird das alte Image wiederverwendet und nichts ändert sich!
docker compose -f docker-compose.backend.yml up -d --build

# 3. Status prüfen
docker ps
docker logs mtg-commander-backend --tail 30
```

## Verifizieren

### a) API liefert jetzt mehr als 100 Spiele

```bash
curl -s -H "Authorization: Bearer <API_KEY>" \
  https://mtg-tracker.die-sons.cloud/api/data/games \
  | python3 -c "import sys, json; print(len(json.load(sys.stdin)))"
```

Erwartet: die vollständige Anzahl (z. B. `104`).
`<API_KEY>` — Wert des `API_KEY` aus `docker-compose.yml` (steht auch im Frontend-Bundle, ist also kein Geheimnis).

### b) Echte Anzahl in der DB (optional, Backend muss dafür nichts tun)

```bash
docker exec -it mtg-commander-db psql -U mtg -d mtg_tracker -c "SELECT count(*) FROM games;"
docker exec -it mtg-commander-db psql -U mtg -d mtg_tracker -c "SELECT count(DISTINCT raw_data->>'game_id') FROM games;"
```

Die zweite Zahl zählt eindeutige Spiele — das Backend verhindert keine Duplikate, die Zahlen können also abweichen.

## Rollback (falls nötig)

```bash
cd /opt/mtg-commander-tracker
git checkout b76bee6
docker compose -f docker-compose.backend.yml up -d --build
```

## Hinweis

`LIMIT 10000` ist eine Obergrenze. Erst ab mehr als 10.000 Spielen würde das Problem erneut auftreten. Saubere Langzeitlösung wäre "kein Limit" oder echtes Paging.