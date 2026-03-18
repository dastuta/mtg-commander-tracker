# MTG Commander Tracker

## Projektübersicht

Eine Progressive Web App (PWA) zum Tracking von Magic: The Gathering Commander Spielen.

## Tech Stack

- Vue.js 3 (Composition API)
- Vite
- PWA (vite-plugin-pwa)
- Vanilla CSS (kein Framework)

## Projektstruktur

```
mtg-commander-tracker/
├── src/
│   ├── components/
│   │   ├── ActionMenu.vue      # Overlay für Schadens-/Heilungsaktionen
│   │   ├── GameEnd.vue        # Spielfinale mit Statistiken
│   │   ├── GameMenu.vue       # Hauptmenü mit Undo und Spiel beenden
│   │   ├── GameTable.vue      # Haupt-Spielfeld mit Spielern
│   │   ├── PlayerCard.vue     # Spieler-Karte mit Tab-System für Views
│   │   ├── SetupScreen.vue    # Spiel-Einrichtung (Spielerauswahl)
│   │   └── Statistics.vue     # Statistiken und Spielhistorie
│   ├── App.vue                # Hauptkomponente, State-Management
│   └── main.js
├── public/
│   └── favicon.svg
└── index.html
```

## Design Pattern: PlayerCard Inline-View-System

### Konzept
Jede Spieler-Karte hat:
- **Linker Edge-Button**: Gift (lila)
- **Rechter Edge-Button**: Commander Damage (lila)
- **Mitte**: Hauptanzeige (Leben standardmäßig)

Die Buttons sind AUSSERHALB des Wisch-Bereichs platziert, sodass sie die Wischgesten nicht triggern.

### PlayerCard Layout
```
┌─────────────────────────────────────────────────────┐
│         [Spieler Name]                                │
│        [Commander Name]                               │
├────┬─────┬─────────────────────────┬──────┬────────┤
│Gift│Steuer│                        │  CMD │        │
│ 3  │  5  │      40 Leben          │  14  │        │
│    │     │   (Wisch-Bereich)      │      │        │
├────┴─────┴─────────────────────────┴──────┴────────┤
│          "Ziehe für Aktionen" / Doppel-Tap          │
└─────────────────────────────────────────────────────┘
```

### View-Zustände
1. **life** (Standard): Leben anzeigen, Wisch aktiv
2. **poison**: Gift anzeigen, nur Zurück-Button, Wisch deaktiviert
3. **commander**: Commander-Schaden pro Spieler, nur Zurück-Button, Wisch deaktiviert
4. **tax**: Zwei Steuer-Zähler mit +/- Buttons, Wisch deaktiviert

### Implementierung (PlayerCard.vue)

```vue
<template>
  <div class="player-card" :class="{ 'view-mode': currentView !== 'life' }">
    <!-- Header -->
    <div class="player-header">...</div>

    <div class="card-body">
      <!-- Gift Button (außen links) -->
      <button class="edge-btn poison-btn" @click.stop="switchToPoison">
        <span>Gift</span>
        <span>{{ player.poison }}</span>
      </button>

      <!-- Hauptbereich mit Views -->
      <div 
        class="main-area"
        :class="{ 'no-drag': currentView !== 'life' }"
        @mousedown="onDragStart"
      >
        <!-- Life View -->
        <div v-if="currentView === 'life'" class="life-view">
          <div class="stat-value">{{ player.life }}</div>
        </div>

        <!-- Poison View -->
        <div v-else-if="currentView === 'poison'" class="poison-view">
          <div class="stat-value">{{ player.poison }}</div>
          <button class="back-btn" @click.stop="switchToLife">← Zurück</button>
        </div>

        <!-- Commander View -->
        <div v-else-if="currentView === 'commander'" class="commander-view">
          <!-- Liste pro Quelle -->
          <div v-for="cd in commanderDamageList" :key="cd.sourceId" class="cmd-item">
            {{ cd.sourceName }}: {{ cd.damage }}/20
          </div>
          <button class="back-btn" @click.stop="switchToLife">← Zurück</button>
        </div>
      </div>

      <!-- CMD Button (außen rechts) -->
      <button class="edge-btn cmd-btn" @click.stop="switchToCommander">
        <span>CMD</span>
        <span>{{ totalCommanderDamage }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { currentView: 'life' }
  },
  methods: {
    switchToLife() { this.currentView = 'life' },
    switchToPoison() { this.currentView = 'poison' },
    switchToCommander() { this.currentView = 'commander' },
    onDragStart(e) {
      if (this.currentView !== 'life') return
      // Wisch-Logik...
    }
  }
}
</script>
```

### Wichtige Punkte
- `@click.stop` auf allen Buttons verhindert Event-Bubbling
- `.no-drag` Klasse verhindert Wisch-Logik
- Buttons sind `:disabled` wenn nicht im Life-View
- Commander-Damage zeigt Schaden pro QUELLE, nicht Summe

### Erweiterung für neue Views

Um einen neuen View-Typ hinzuzufügen:

1. **Button hinzufügen** in `.player-view`:
   ```html
   <button class="view-btn extra" @click="showNewView">
     <span class="btn-label">NEU</span>
   </button>
   ```

2. **View-Case hinzufügen** in `.main-display`:
   ```html
   <div v-else-if="currentView === 'new'" class="new-display">...</div>
   ```

3. **Methode hinzufügen**:
   ```js
   showNewView() { this.currentView = 'new' }
   ```

4. **CSS für neuen Display-Typ**:
   ```css
   .new-display { /* Styles */ }
   ```

### Mögliche zukünftige Views
- **Schadenshistorie** - Letzte X Aktionen
- **Mana/Resources** - Falls implementiert

## SourceMenu (Multi-Target Aktionen)

### Auslösen
- **Doppel-Tap** auf eine Spieler-Karte öffnet das SourceMenu
- Der getappte Spieler wird als Quelle für Multi-Target-Aktionen festgelegt

### Aktionen
| Aktion | Effekt |
|--------|--------|
| **Drain** | Gegner -X Leben, Selbst +X Leben pro Gegner |
| **Lifelink** | Gegner -X Leben, Selbst +X Leben |
| **DMG Each** | Alle (inkl. Selbst) -X Leben |
| **DMG Opp** | Nur Gegner -X Leben |
| **Massen-Gift** | Alle Gegner +X Gift |

### Value Input
- +/- Buttons mit Long-Press Beschleunigung (500ms → +5 pro 500ms)
- Live-Vorschau aller Ziele antes Anwenden

## Spielerdatenbank

### Konzept
Spieler werden in einer persistenten Datenbank gespeichert:
- Dropdown-Auswahl statt Freitext beim Spielstart
- "Neuen Spieler erstellen" Option
- Spieler-Verwaltung (Löschen)
- Spielzähler pro Spieler

### localStorage Key
```
mtg-commander-players
```

### Datenstruktur
```js
{
  id: number,
  name: string,
  games: number,           // Anzahl gespielter Spiele
  commanders: string[]      // Persönliche Commander-Liste
}
```

### Spieler-Verwaltung
- Klick auf Spieler öffnet Detailansicht
- Commander hinzufügen/entfernen
- Spieler löschen

## Spielregeln

### Niederlage-Bedingungen
1. **Leben ≤ 0** → Besiegt (Grund: "life")
2. **Gift ≥ 10** → Besiegt (Grund: "poison")
3. **Commander-Schaden ≥ 20 von同一 Spieler** → Besiegt (Grund: "commander")

### Commander-Schaden Tracking
- Gespeichert als Map: `{sourceId-targetId: schaden}`
- Pro Spieler-Paar einzeln getrackt
- Nur der originale Verursacher zählt für 20er-Regel

## Game Record (Spielaufzeichnung)

Jedes Spiel wird als umfassende Aufzeichnung gespeichert für Statistiken und Analyse.

### Datenstruktur
```js
gameRecord = {
  id: string,                    // Eindeutige Spiel-ID
  startTime: timestamp,
  endTime: timestamp,
  players: [
    { id, name, commander }
  ],
  turns: [
    {
      turnNumber: number,
      playerId: number,
      playerName: string,
      startTime: timestamp,
      endTime: timestamp,
      duration: number,           // Sekunden
      actions: [Action]
    }
  ],
  currentTurn: { ... },          // Aktueller Zug (während des Spiels)
  statistics: {
    totalDuration: number,
    totalActions: number
  },
  winner: {
    id: number,
    name: string,
    reason: string
  },
  finalState: {
    life: { playerId: value },
    poison: { playerId: value },
    commanderDamage: { key: value },
    defeated: [{ id, name, reason, defeatedBy }]
  }
}
```

## Statistiken

Die App speichert alle gespielten Spiele für spätere Analyse.

### Statistik-Komponente
Zugriff über den "📊 Statistiken" Button im Startbildschirm.

### Angezeigte Statistiken
- **Übersicht**: Gesamtzahl Spiele, Spielzeit, Aktionen, Spieler
- **Gespeicherte Spiele**: Liste mit Datum, Spielern, Zügen
- **Spieler-Statistiken**: Siege, Niederlagen, Siegrate, Schaden

### localStorage Keys
```
mtg-commander-game-records   # Gespeicherte Spielaufzeichnungen
mtg-commander-players         # Spieler-Datenbank
mtg-custom-win-reasons       # Custom Sieg-Gründe
mtg-custom-lose-reasons      # Custom Niederlage-Gründe
```

### Export/Import

Daten können als JSON exportiert und importiert werden:
- **Spieler exportieren**: Lädt `mtg-players-export.json` herunter
- **Spiele exportieren**: Lädt `mtg-games-export.json` herunter
- **Importieren**: Fügt exportierte Daten zusammen (Deduplizierung nach ID)

### Action (Aktion)
```js
Action = {
  id: string,                   // Eindeutige Aktions-ID
  timestamp: timestamp,
  type: 'damage' | 'heal' | 'poison' | 'commander_damage' | 'defeat' | 'victory' | 'drain_heal' | 'lifelink_heal',
  category: 'life' | 'poison' | 'commander' | 'drain' | 'lifelink' | 'system',
  source: { id, name } | null,
  target: { id, name },
  value: number,
  previousValue: number,
  newValue: number,
  metadata: {}                  // Zusätzliche Daten (z.B. reason, targetCount)
}
```

### Defeat Reasons (Niederlage-Gründe)
- `life`: Leben auf 0
- `poison`: Gift ≥ 10
- `commander`: Commander Schaden ≥ 20
- `surrender`: Aufgabe
- `other`: Anderer Grund (freier Text)
- `manual`: Manuell via UI
- Custom Reasons: Werden in localStorage gespeichert

### Victory Reasons (Sieg-Gründe)
- `last_standing`: Letzter Verbleibender
- `special_effect`: Spezial Effekt
- `agreed`: Einvernehmlich
- Custom Reasons: Werden in localStorage gespeichert (`mtg-custom-win-reasons`, `mtg-custom-lose-reasons`)

### Gespeicherte Spiele
```js
localStorage: 'mtg-commander-game-records'
```

### Niederlage-Bedingungen
1. **Leben ≤ 0** → Besiegt (Grund: "life")
2. **Gift ≥ 10** → Besiegt (Grund: "poison")
3. **Commander-Schaden ≥ 20 von同一 Spieler** → Besiegt (Grund: "commander")

### Commander-Schaden Tracking
- Gespeichert als Map: `{sourceId-targetId: schaden}`
- Pro Spieler-Paar einzeln getrackt
- Nur der originale Verursacher zählt für 20er-Regel

## Action Types

| Typ | Effekt | Kategorie |
|-----|--------|-----------|
| damage | -Leben | life |
| heal | +Leben | life |
| poison | +Gift | poison |
| commander_damage | Commander-Schaden | commander |
| defeat | Spieler eliminiert | system |
| victory | Spieler gewinnt | system |
| drain_heal | Gesamtschaden als Heilung | drain |
| lifelink_heal | X Schaden = X Heilung | lifelink |

### Farben
- damage: Rot
- heal: Grün
- poison: Violett
- commander_damage: Lila
- defeat: Grau
- victory: Gold

## Datenstrukturen

### Player
```js
{
  id: number,
  name: string,
  commander: string,
  life: number,       // Start: 40
  poison: number,    // Start: 0
  turnCount: number,
  defeated: boolean,
  defeatReason: string | null,
  defeatedBy: string | null
}
```

### CommanderDamage (Map)
```js
{
  "sourceId-targetId": schadenBetrag
  // Beispiel: "1-2": 14 bedeutet:
  // Spieler mit ID 1 hat Spieler mit ID 2 14 Commander-Schaden zugefügt
}
```

### Action
```js
{
  type: 'damage' | 'combat' | 'commander' | 'heal' | 'poison' | 'lifegain_damage' | 'lifegain_heal',
  targetId: number,
  targetName: string,
  sourceId: number,
  sourceName: string,
  delta: number,
  timestamp: number
}
```

## Installation & Entwicklung

```bash
npm install
npm run dev      # Development Server
npm run build    # Production Build
npm run preview  # Preview Production Build
```

## Deployment

Siehe [DEPLOY.md](./DEPLOY.md) für vollständige Deploy-Anleitung.

### Schnellstart

```bash
# Build erstellen
npm run build

# Docker nutzen
docker-compose -f deploy/docker-compose.yml up -d
```

### Projektstruktur Deploy

```
deploy/
├── nginx.conf       # nginx Konfiguration
├── Dockerfile       # Docker Image
├── docker-compose.yml
└── .dockerignore
```

## PWA Installation

Die App kann als PWA auf dem Homescreen installiert werden:
- Offline-fähig
- Kein App-Store nötig
- Funktioniert auf iOS, Android, Desktop
