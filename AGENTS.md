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
│   │   ├── ActionPanel.vue    # [DEPRECATED] Altes Aktionspanel
│   │   ├── GameEnd.vue        # Spielfinale mit Statistiken
│   │   ├── GameTable.vue      # Haupt-Spielfeld mit Spielern
│   │   ├── PlayerCard.vue     # Spieler-Karte mit Tab-System für Views
│   │   └── SetupScreen.vue    # Spiel-Einrichtung (Spieler hinzufügen)
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

### Layout
```
┌─────────────────────────────────────┐
│         [Spieler Name]              │
│        [Commander Name]             │
├────┬─────────────────────────┬──────┤
│Gift│                         │  CMD │
│ 3  │      40 Leben          │  14  │
│    │   (Wisch-Bereich)      │      │
├────┴─────────────────────────┴──────┤
│          "Ziehe für Aktionen"       │
└─────────────────────────────────────┘
```

### View-Zustände
1. **life** (Standard): Leben anzeigen, Wisch aktiv
2. **poison**: Gift anzeigen, nur Zurück-Button, Wisch deaktiviert
3. **commander**: Commander-Schaden pro Spieler, nur Zurück-Button, Wisch deaktiviert

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

## Spielregeln

### Niederlage-Bedingungen
1. **Leben ≤ 0** → Besiegt (Grund: "life")
2. **Gift ≥ 10** → Besiegt (Grund: "poison")
3. **Commander-Schaden ≥ 20 von同一 Spieler** → Besiegt (Grund: "commander")

### Commander-Schaden Tracking
- Gespeichert als Map: `{sourceId-targetId: schaden}`
- Pro Spieler-Paar einzeln getrackt
- Nur der originale Verursacher zählt für 20er-Regel

## Action Types

| Typ | Effekt | Farbe |
|-----|--------|-------|
| damage | -Leben | Rot |
| combat | -Leben (Combat) | Orange |
| commander | -Leben (Commander) | Lila |
| heal | +Leben | Grün |
| poison | +Gift | Violett |
| lifegain | -Ziel +Selbst | Türkis |

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

## PWA Installation

Die App kann als PWA auf dem Homescreen installiert werden:
- Offline-fähig
- Kein App-Store nötig
- Funktioniert auf iOS, Android, Desktop
