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
│   │   ├── PlayerCard.vue     # Spieler-Karte mit Name, Commander, Stats
│   │   ├── PlayerView.vue     # Tab-System für Life/Poison/CommanderDMG
│   │   └── SetupScreen.vue    # Spiel-Einrichtung (Spieler hinzufügen)
│   ├── App.vue                # Hauptkomponente, State-Management
│   └── main.js
├── public/
│   └── favicon.svg
└── index.html
```

## Design Pattern: PlayerView Tab-System

### Konzept
Jede Spieler-Karte hat eine fokusierte Hauptanzeige für **Leben** mit seitlichen Buttons für **Gift** und **Commander-Damage**. Durch Klick auf die Buttons oder die Hauptanzeige wechselt der View.

### Implementierung (PlayerView.vue)

```vue
<template>
  <div class="player-view">
    <!-- Linker Button: Gift -->
    <button class="view-btn left" @click="showPoison">
      <span class="btn-label">Gift</span>
      <span class="btn-value">{{ player.poison }}</span>
    </button>
    
    <!-- Hauptanzeige (klickbar für Life-View) -->
    <div class="main-display" @click="showLife">
      <!-- View wechselt basierend auf currentView -->
      <div v-if="currentView === 'life'" class="life-display">...</div>
      <div v-else-if="currentView === 'poison'" class="poison-display">...</div>
      <div v-else-if="currentView === 'commander'" class="commander-display">...</div>
    </div>
    
    <!-- Rechter Button: CommanderDMG -->
    <button class="view-btn right" @click="showCommander">
      <span class="btn-label">CMD</span>
      <span class="btn-value">{{ totalCommanderDamage }}</span>
    </button>
  </div>
</template>

<script>
export default {
  data() {
    return { currentView: 'life' }
  },
  methods: {
    showLife() { this.currentView = 'life' },
    showPoison() { this.currentView = 'poison' },
    showCommander() { this.currentView = 'commander' }
  }
}
</script>
```

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
- **CommanderDMG pro Spieler** - Detaillierte Ansicht aller Commander-Schaden-Quellen
- **Schadenshistorie** - Letzte X Aktionen
- **Mana/Resources** - Falls implementiert
- **Commander-Schaden von spezifischem Spieler** - Detailansicht

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
