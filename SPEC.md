# MTG Commander Tracker - Spezifikation

> **Version**: 1.0.0  
> **Status**: Spezifikation  
> **Zuletzt aktualisiert**: 2026-03-29

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Reifegrad-Modell](#reifegrad-modell)
3. [Datenmodell](#datenmodell)
4. [Variablen-Referenz](#variablen-referenz)
5. [Menüstruktur & Navigation](#menüstruktur--navigation)
6. [Komponenten-Struktur](#komponenten-struktur)
7. [API-Endpunkte](#api-endpunkte)
8. [Debugging & Logging](#debugging--logging)
9. [Tech Stack](#tech-stack)
10. [Konfiguration](#konfiguration)

---

## Überblick

**Zweck**: Progressive Web App (PWA) zum Tracking von Magic: The Gathering Commander Spielen mit Fokus auf Life-Tracking, Action-Logging und JSON-Export.

> **PWA (Progressive Web App)**: Eine Webanwendung, die wie eine native App auf dem Gerät installiert werden kann. Bietet Offline-Funktionalität, Homescreen-Icon und optimierte Darstellung. Alternativen wären native Apps (Flutter, React Native) oder Electron - diese erfordern jedoch mehr Aufwand und sind nicht rein browserbasiert.

**Reifegrad-Phase**: Grad 1 (Prototyp/MVP)

### Kernziele

1. **Einfachheit**: Casual-Spieler können sofort starten
2. **Zuverlässigkeit**: Keine Datenverluste, konsistentes Verhalten
3. **Export**: JSON-Export für Statistik-Tools
4. **Debugging**: Eingebaute Debug-Tools für Entwicklung

---

## Reifegrad-Modell

```
┌─────────────────────────────────────────────────────────────┐
│                      REIFEGRAD-MODELL                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Grad 1: MVP          Grad 2: Core         Grad 3: Full      │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐     │
│   │ Leben    │        │ + Poison │        │ + Sync   │     │
│   │ ±X       │   ──►  │ + CMD    │   ──►  │ + Backend│     │
│   │ JSON Exp │        │ + Log    │        │ + Auth   │     │
│   │ Offline  │        │ + Undo   │        │ + Multi  │     │
│   └──────────┘        └──────────┘        └──────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Grad 1 Features (MVP - diese Spezifikation)

| Feature | Beschreibung | Priorität |
|---------|--------------|-----------|
| Lebenstracker | 2-6 Spieler, Start bei 40 | Must Have |
| Leben ±X | Buttons (+/−) mit Long-Press für 5er-Schritte | Must Have |
| Swipe-Gesten | Wischen für schnelle Eingabe | Must Have |
| JSON Export | Spiel exportieren | Must Have |
| localStorage | Offline-Persistenz | Must Have |
| PWA | Installierbar | Should Have |
| Action Log | Chronologische Historie | Should Have |
| Undo | Letzte Aktion rückgängig | Should Have |

---

## Datenmodell

### Spielstand (GameState)

```typescript
interface GameState {
  // Metadaten
  id: string;                    // UUID
  version: string;               // App-Version (z.B. "1.0.0")
  createdAt: string;             // ISO 8601
  updatedAt: string;              // ISO 8601
  
  // Spielstatus
  status: GameStatus;            // 'setup' | 'active' | 'ended'
  
  // Spieler
  players: Player[];
  currentPlayerIndex: number;     // Index des aktuellen Spielers
  playerCount: number;           // Anzahl Spieler (2-6)
  
  // Zeit
  startTime: string | null;      // ISO 8601
  endTime: string | null;        // ISO 8601
  
  // Ergebnis
  winnerId: string | null;       // Spieler-ID des Gewinners
  winningReason: string | null; // 'life' | 'poison' | 'commander' | 'surrender' | null
  
  // Historie
  actions: Action[];             // Alle Aktionen
  undoStack: Action[];           // Für Undo-Funktion
  
  // Finale Werte
  finalLife: Record<string, number>;  // playerId -> life (bei Spielende)
}

type GameStatus = 'setup' | 'active' | 'ended';
```

### Spieler (Player)

```typescript
interface Player {
  id: string;                    // UUID (intern)
  playerId: string;              // Export-ID (lowercase, stabil über Spiele)
  name: string;                  // Anzeigename
  commander: string | null;       // Commander-Name
  seat: number;                  // Sitzplatz (1-6)
  life: number;                  // Aktuelles Leben (Start: 40)
  poison: number;                // Giftzähler (Start: 0)
  isDefeated: boolean;           // Besiegt?
  defeatReason: string | null;  // 'life' | 'poison' | 'commander' | null
  defeatedBy: string | null;    // Spieler-ID der Quelle
  defeatedAtTurn: number | null; // Zugnummer der Niederlage
  isWinner: boolean;             // Gewinner?
  placement: number;             // Platzierung (1 = Gewinner)
  commanderCasts: number;        // Anzahl Commander-Casts
}
```

### Aktion (Action)

```typescript
interface Action {
  id: string;                    // UUID
  seq: number;                   // Sequenznummer (fortlaufend)
  turn: number;                  // Zugnummer (Runde)
  timestamp: string;             // ISO 8601
  
  type: ActionType;
  actor: string | null;         // Wer löst die Aktion aus (Spieler-ID)
  targets: string[];             // Wen betrifft es (Array von Spieler-IDs)
  
  value: number | null;          // Betrag (null bei board_wipe, elimination)
  previousLife: number | null;   // Leben VOR der Aktion (falls relevant)
  newLife: number | null;         // Leben NACH der Aktion (falls relevant)
  
  // Optionale Metadaten
  cardName: string | null;       // Kartenname bei Commander-Schaden
  reason: string | null;         // Grund bei defeat/victory
  eliminatedBy: string | null;   // Wer hat eliminiert (bei elimination)
  castNumber: number | null;    // Wievielter Commander-Cast
}

type ActionType = 
  | 'damage'         // Leben -X (einzelnes Ziel)
  | 'damage_all'     // Voller Wert an ALLE Spieler
  | 'damage_each'    // Voller Wert an alle GEGNER
  | 'commander_dmg'  // Commander-Schaden
  | 'infect'         // Giftmarken
  | 'heal'           // Leben +X
  | 'drain'          // Schaden + Heilung
  | 'pay_life'       // Eigenschaden
  | 'board_wipe'     // Board wipe
  | 'commander_cast' // Commander gespielt
  | 'elimination'    // Spieler eliminiert
  | 'defeat'         // Spieler besiegt (intern)
  | 'victory'        // Spiel beendet (intern)
  | 'undo';          // Undo-Operation (Meta)
```

---

## Variablen-Referenz

### GameState Variablen

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `gameState.id` | string | UUID | Eindeutige Spiel-ID |
| `gameState.version` | string | "1.0.0" | App-Version |
| `gameState.status` | GameStatus | 'setup' | Aktueller Spielstatus |
| `gameState.currentPlayerIndex` | number | 0 | Index des aktuellen Spielers |
| `gameState.currentTurnNumber` | number | 1 | Aktuelle Zugnummer (Runde) |
| `gameState.playerCount` | number | 0 | Anzahl aktiver Spieler |
| `gameState.winnerId` | string \| null | null | ID des Gewinners |
| `gameState.winningReason` | string \| null | null | Grund für Sieg |
| `gameState.startTime` | string \| null | null | Startzeitpunkt |
| `gameState.endTime` | string \| null | null | Endzeitpunkt |
| `gameState.turnsPerPlayer` | Record<string, number> | {} | Züge pro Spieler |
| `gameState.longestTurn` | { playerId, turn, duration } | null | Längster Zug |

### Player Variablen

| Variable | Typ | Standard | Min | Max | Beschreibung |
|----------|-----|----------|-----|-----|--------------|
| `player.id` | string | UUID | - | - | Eindeutige ID |
| `player.playerId` | string | "" | - | - | Export-ID (lowercase, stabil) |
| `player.name` | string | "" | 1 | 20 | Anzeigename |
| `player.commander` | string \| null | null | - | 50 | Commander-Name |
| `player.seat` | number | 1-6 | 1 | 6 | Sitzplatz |
| `player.life` | number | 40 | -999 | 9999 | Aktuelles Leben |
| `player.finalLife` | number | - | - | - | Leben bei Spielende (Export) |
| `player.poison` | number | 0 | 0 | 99 | Giftzähler |
| `player.isDefeated` | boolean | false | - | - | Besiegt-Status |
| `player.defeatReason` | string \| null | null | - | - | Niederlagegrund |
| `player.defeatedBy` | string \| null | null | - | - | Besieger |
| `player.defeatedAtTurn` | number \| null | null | - | - | Zug der Niederlage |
| `player.isWinner` | boolean | false | - | - | Gewinner-Status |
| `player.placement` | number | - | 1 | 6 | Platzierung (1 = Gewinner) |
| `player.commanderCasts` | number | 0 | 0 | - | Commander-Casts (Grad 2+) |

### Action Variablen

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `action.id` | string | UUID der Aktion |
| `action.seq` | number | Sequenznummer (fortlaufend pro Spiel) |
| `action.turn` | number | Zugnummer (Runde) |
| `action.timestamp` | string | ISO 8601 Zeitstempel |
| `action.type` | ActionType | Art der Aktion |
| `action.actor` | string | Spieler-ID des Ausführenden |
| `action.targets` | string[] | Array von Spieler-IDs |
| `action.value` | number \| null | Betrag |
| `action.previousLife` | number | Leben vorher |
| `action.newLife` | number | Leben nachher |
| `action.eliminatedBy` | string \| null | Wer hat eliminiert (bei elimination) |
| `action.castNumber` | number \| null | Wievielter Commander-Cast |

### localStorage Keys

| Key | Typ | Beschreibung |
|-----|-----|--------------|
| `mtg_game_current` | GameState | Aktuelles Spiel |
| `mtg_game_history` | GameState[] | Vergangene Spiele |
| `mtg_settings` | Settings | App-Einstellungen |
| `mtg_debug_log` | LogEntry[] | Debug-Log (dev only) |

### Constants

```typescript
const CONSTANTS = {
  // Leben
  STARTING_LIFE: 40,
  MIN_LIFE: -999,
  MAX_LIFE: 9999,
  
  // Gift
  MAX_POISON: 10,               // Niederlage bei 10
  STARTING_POISON: 0,
  
  // Commander
  MAX_COMMANDER_DAMAGE: 21,    // Niederlage bei 21
  
  // Spieler
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  
  // UI
  BUTTON_STEP_SINGLE: 1,        // Tap: ±1
  BUTTON_STEP_LONG: 5,          // Long-Press: ±5
  LONG_PRESS_DELAY: 500,        // ms bis Long-Press aktiviert
  LONG_PRESS_INTERVAL: 100,     // ms zwischen Wiederholungen
  SWIPE_THRESHOLD: 50,          // Pixel für Wisch-Erkennung
  SWIPE_LIFE_PER_PIXEL: 0.1,    // Leben pro Pixel
  
  // Version
  APP_VERSION: '1.0.0',
  DATA_VERSION: '1.0.0',
};
```

---

## Menüstruktur & Navigation

### Screen-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    APP STRUKTUR                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐                                       │
│  │  Start       │ ◄── Erster Screen nach App-Start      │
│  │  Screen      │                                       │
│  └──────┬───────┘                                       │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │  Setup       │ ◄─ │ Statistiken   │                    │
│  │  Screen      │    │              │                    │
│  └──────┬───────┘    └──────────────┘                    │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  Game        │ ◄── Haupt-Spiel-Screen                │
│  │  Screen      │                                       │
│  └──────┬───────┘                                       │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │  Game End    │                                       │
│  │  Screen      │                                       │
│  └──────────────┘                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Screen-Details

#### 1. Start Screen

**Route**: `/` (default)

**Elemente**:
- App-Logo/Titel
- "Neues Spiel" Button → Setup Screen
- "Statistiken" Button → Statistiken Screen
- Version-Anzeige (Debug-Modus)
- Debug-Button (Debug-Modus)

**Variablen**: Keine (nur Navigation)

---

#### 2. Setup Screen

**Route**: `/setup`

**Elemente**:

```
┌─────────────────────────────────────────────────────────┐
│  SETUP SCREEN                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Titel: "Neues Spiel erstellen"                         │
│                                                          │
│  ─── Spieleranzahl ───                                  │
│  [2] [3] [4] [5] [6]  (Radio-Buttons)                 │
│                                                          │
│  ─── Spieler ───                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Spieler 1: [___________] Commander: [___________]│   │
│  │ Spieler 2: [___________] Commander: [___________]│   │
│  │ Spieler 3: [___________] Commander: [___________]│   │
│  │ ...                                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ─── Optionen ───                                      │
│  [ ] Commander Damage Tracking                         │
│  [ ] Poison Counters                                  │
│                                                          │
│  [Abbrechen]                    [Spiel starten →]      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Variablen dieses Screens**:
| Variable | Typ | Default | Validierung |
|----------|-----|---------|-------------|
| `setup.playerCount` | number | 4 | 2-6 |
| `setup.players[].name` | string | "" | 1-20 Zeichen |
| `setup.players[].commander` | string | "" | 0-50 Zeichen |
| `setup.options.commanderDamage` | boolean | true | - |
| `setup.options.poison` | boolean | false | - |

**Buttons**:
- `btn_start_game` → Validation → Game Screen
- `btn_cancel` → Start Screen

---

#### 3. Game Screen

**Route**: `/game`

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  [☰ Menu]        ZUG 5          [Timer 12:34]          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Alice (Edgar Markov)                            │   │
│  │                                                 │   │
│  │  [-5]      40 LEBEN       [+5]                │   │
│  │  [-1]                     [+1]                │   │
│  │                                                 │   │
│  │ Gift: 0/10                    CMD: 0/21       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Bob (Kaalia)                                    │   │
│  │                                                 │   │
│  │  [-5]      38 LEBEN       [+5]                │   │
│  │  [-1]                     [+1]                │   │
│  │                                                 │   │
│  │ Gift: 2/10                    CMD: 7/21       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Charlie (Atraxa)                                 │   │
│  │                                                 │   │
│  │  [-5]      25 LEBEN       [+5]                │   │
│  │  [-1]                     [+1]                │   │
│  │                                                 │   │
│  │ Gift: 0/10                    CMD: 2/21       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Dave (Winota)                                   │   │
│  │                                                 │   │
│  │  [-5]      12 LEBEN       [+5]                │   │
│  │  [-1]                     [+1]                │   │
│  │                                                 │   │
│  │ Gift: 0/10                    CMD: 14/21      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [◀ Undo]                    [Spiel beenden ▶]         │
└─────────────────────────────────────────────────────────┘
```

**Game Menu (Overlay)**:
```
┌─────────────────────────────────────────────────────────┐
│  GAME MENU                                    [✕]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ─── Zug ───                                            │
│  [Nächster Zug]                                         │
│  [Vorheriger Zug] (Debug)                               │
│                                                          │
│  ─── Aktionen ───                                       │
│  [Undo letzte Aktion]                                    │
│  [Action Log anzeigen]                                  │
│                                                          │
│  ─── Spiel ───                                          │
│  [Spiel speichern]                                      │
│  [Spiel exportieren]                                    │
│  [Spiel beenden]                                         │
│                                                          │
│  ─── Debug (nur Dev) ───                                │
│  [Debug Log anzeigen]                                   │
│  [State inspizieren]                                    │
│  [Reset Game]                                           │
│                                                          │
│  ─── System ───                                         │
│  [Abbrechen & zurück]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Variablen dieses Screens**: Alle aus GameState und Player (siehe oben)

**Buttons & Aktionen**:

| Button ID | Aktion | Ziel |
|-----------|--------|------|
| `btn_life_minus_1` | `life -= 1` | Player |
| `btn_life_minus_5` | `life -= 5` | Player |
| `btn_life_plus_1` | `life += 1` | Player |
| `btn_life_plus_5` | `life += 5` | Player |
| `btn_poison_minus` | `poison -= 1` | Player |
| `btn_poison_plus` | `poison += 1` | Player |
| `btn_cmd_damage` | Open CMD dialog | Player |
| `btn_next_turn` | `currentPlayerIndex++` | Global |
| `btn_undo` | Undo last action | Global |
| `btn_end_game` | Open Game End dialog | Global |
| `btn_menu` | Open Game Menu overlay | Global |

---

#### 4. Game End Screen

**Route**: `/game/end`

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│                    SPIEL BEENDET                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🏆 GEWINNER: Alice                                     │
│     Grund: Letzter Verbleibender                        │
│                                                          │
│  ─── Finales Ranking ───                               │
│  1. Alice      - 45 Leben                              │
│  2. Bob        - 38 Leben (Besiegt: Leben)             │
│  3. Charlie    - 25 Leben (Besiegt: CMD von Alice)     │
│  4. Dave       - 12 Leben (Besiegt: Leben)             │
│                                                          │
│  ─── Spielstatistik ───                                │
│  Gesamtdauer: 45:32                                    │
│  Züge: 12                                              │
│  Aktionen: 47                                           │
│                                                          │
│  [Erneut spielen]  [Start]  [Exportieren]              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Variablen**:
| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `gameEnd.winner` | Player | Gewinner-Objekt |
| `gameEnd.reason` | string | Sieggrund |
| `gameEnd.ranking` | Player[] | Sortiert nach Leben |
| `gameEnd.duration` | number | Sekunden |
| `gameEnd.totalTurns` | number | Anzahl Züge |
| `gameEnd.totalActions` | number | Anzahl Aktionen |

---

#### 5. Statistiken Screen

**Route**: `/stats`

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  STATISTIKEN                                [← Zurück]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ─── Übersicht ───                                     │
│  Gespielte Spiele: 23                                   │
│  Gesamtspielzeit: 18:45:32                             │
│  Durchschnittliche Spieldauer: 48:54                   │
│                                                          │
│  ─── Letzte Spiele ───                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 23.03.26 - Alice gewinnt - 45min - 4 Spieler   │   │
│  │ 22.03.26 - Bob gewinnt   - 52min - 4 Spieler   │   │
│  │ 21.03.26 - Charlie gewinnt - 38min - 3 Spieler  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ─── Export ───                                        │
│  [Alle Spiele exportieren]                             │
│  [Importieren]                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Komponenten-Struktur

### Vue Komponenten

```
src/
├── App.vue                    # Root-Komponente, Router
├── views/
│   ├── StartView.vue          # Start Screen
│   ├── SetupView.vue          # Setup Screen
│   ├── GameView.vue           # Game Screen
│   ├── GameEndView.vue        # Game End Screen
│   └── StatsView.vue          # Statistiken Screen
│
├── components/
│   ├── PlayerCard.vue         # Spieler-Karte mit Leben/Gift/CMD
│   ├── LifeButtons.vue        # ±1, ±5 Buttons
│   ├── PoisonCounter.vue      # Giftzähler
│   ├── CommanderDamage.vue    # CMD-Schaden Anzeige
│   ├── GameMenu.vue           # Overlay-Menü
│   ├── ActionLog.vue          # Aktions-Historie
│   ├── Timer.vue              # Spielzeit-Timer
│   ├── TurnIndicator.vue      # Zug-Anzeige
│   ├── PlayerSetupRow.vue     # Setup-Zeile pro Spieler
│   └── DebugPanel.vue         # Debug-Overlay (dev only)
│
├── composables/
│   ├── useGameState.ts        # Zentraler Game-State
│   ├── useActions.ts          # Action-Logik
│   ├── useUndo.ts             # Undo/Redo
│   ├── useTimer.ts            # Spielzeit-Tracking
│   ├── useStorage.ts          # localStorage-Logik
│   ├── useExport.ts           # JSON Export
│   └── useDebug.ts            # Debug-Tools
│
├── stores/
│   └── gameStore.ts           # Pinia Store (optional)
│
├── services/
│   ├── storage.ts             # localStorage Service
│   ├── export.ts              # Export Service
│   └── debug.ts               # Debug Service
│
├── types/
│   ├── game.ts                # Game, Player, Action Types
│   ├── ui.ts                  # UI-relevante Types
│   └── index.ts               # Re-Exports
│
└── utils/
    ├── constants.ts           # APP_VERSION, STARTING_LIFE, etc.
    ├── validators.ts          # Input-Validierung
    ├── formatters.ts          # Zeit-, Zahlenformatierung
    └── idGenerator.ts         # UUID-Generierung
```

### Komponenten-Details

#### PlayerCard.vue

**Props**:
```typescript
interface PlayerCardProps {
  player: Player;
  isActive: boolean;      // Ist dieser Spieler am Zug?
  showPoison: boolean;   // Poison anzeigen?
  showCommander: boolean; // Commander Damage anzeigen?
}
```

**Emits**:
```typescript
interface PlayerCardEmits {
  (e: 'life-change', value: number): void;
  (e: 'poison-change', value: number): void;
  (e: 'commander-damage', sourceId: string): void;
}
```

**Interne Variablen**:
| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `localLife` | Ref\<number\> | Lokales Leben für Animation |
| `isAnimating` | Ref\<boolean\> | Leben-Animation aktiv? |
| `swipeStartX` | number | Start-X für Wisch |
| `swipeCurrentX` | number | Aktuell-X für Wisch |

---

## API-Endpunkte

> **Hinweis**: Grad 1 arbeitet komplett offline. API ist für Grad 3 geplant.
> Diese Dokumentation dient als Referenz für zukünftige Erweiterung.

### Auth

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | `/api/auth/register` | Registrieren |
| POST | `/api/auth/login` | Anmelden |
| GET | `/api/auth/me` | Aktueller User |

### Spieler

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/players` | Alle Spieler des Users |
| POST | `/api/players` | Spieler erstellen |
| PUT | `/api/players/:id` | Spieler aktualisieren |
| DELETE | `/api/players/:id` | Spieler löschen |

### Spiele

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/games` | Alle Spiele des Users |
| POST | `/api/games` | Spiel speichern |
| GET | `/api/games/:id` | Einzelnes Spiel |
| PUT | `/api/games/:id` | Spiel aktualisieren |

### Statistik

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/stats` | Allgemeine Statistiken |
| GET | `/api/stats/players` | Spieler-Statistiken |

---

## JSON Export Format

Das Export-Format folgt dem MTG Commander Ecosystem Standard.

### Vollständige Export-Struktur

```typescript
interface GameExport {
  // Header
  schema_version: string;           // "1.0"
  
  // Spiel-Metadaten
  game_id: string;                  // Format: "YYYY-MM-DD_NNN"
  date: string;                   // ISO 8601
  
  // Zeit-Statistiken
  duration_minutes: number;        // Gesamtdauer in Minuten
  total_turns: number;            // Anzahl Runden
  avg_turn_duration_seconds: number; // duration_minutes * 60 / total_turns
  
  // Individuelle Zug-Statistiken
  turns_per_player: Record<string, number>;  // player_id -> anzahl Züge
  longest_turn: {
    player_id: string;
    turn: number;
    duration_seconds: number;
  } | null;
  
  // Spieler
  players: PlayerExport[];
  
  // Action Log
  actions: ActionExport[];
}

interface PlayerExport {
  seat: number;                    // 1-6
  player_id: string;              // lowercase, stabil über Spiele
  deck_id: string | null;         // Grad 3: Referenz auf Deck Registry
  commander: string | null;        // Commander Name
  starting_life: number;           // 40
  final_life: number;              // Leben bei Spielende
  placement: number;               // 1 = Gewinner, 2+ = Platzierung
  commander_casts: number;        // Anzahl Commander-Casts
}

interface ActionExport {
  seq: number;                     // Sequenznummer (fortlaufend)
  turn: number;                   // Rundennummer
  actor: string;                  // Spieler-ID
  
  type: ActionType;
  targets: string[];              // Array von Spieler-IDs
  value: number | null;           // Betrag oder null
  
  // Optionale Felder
  eliminated_by?: string;          // Bei elimination: Wer hat eliminiert
  cast_number?: number;           // Bei commander_cast: Wievielter Cast
}
```

### Action Types (Grad 1-3)

| Type | Beschreibung | Grad | targets | value |
|------|-------------|------|---------|-------|
| `damage` | Schaden an einzelnes Ziel | 1 | 1 Ziel | Zahl |
| `damage_all` | Voller Wert an ALLE | 2 | [] | Zahl |
| `damage_each` | Voller Wert an alle GEGNER | 2 | alle außer Selbst | Zahl |
| `commander_dmg` | Commander-Schaden | 2 | 1 Ziel | Zahl |
| `infect` | Giftmarken | 2 | 1 Ziel | Zahl |
| `heal` | Leben gewinnen | 1 | 1 Ziel | Zahl |
| `drain` | Schaden + Heilung | 2 | 1 Ziel | Zahl |
| `pay_life` | Eigenschaden (Fetch, Necro) | 2 | Selbst | Zahl |
| `board_wipe` | Board wipe | 3 | [] | null |
| `commander_cast` | Commander gespielt | 2 | [] | Steuer-Betrag |
| `elimination` | Spieler ausgeschieden | 2 | 1 Ziel | null |

### Grad-Zuordnung

Die App unterstützt je nach Reifegrad unterschiedlich viele Felder:

| Grad | Pflicht-Felder | Optionale Felder |
|------|----------------|------------------|
| **1** | game_id, date, players[], actions (nur damage/heal) | duration, turns, placement |
| **2** | + alle Action-Typen, commander, commander_dmg | deck_id, commander_casts, turns_per_player |
| **3** | + alle Felder | - |

### Beispiel Export (Grad 1)

```json
{
  "schema_version": "1.0",
  "game_id": "2026-03-29_001",
  "date": "2026-03-29T19:30:00Z",
  "duration_minutes": 45,
  "total_turns": 8,
  "avg_turn_duration_seconds": 338,
  "turns_per_player": {
    "alex": 7,
    "ben": 8,
    "clara": 5,
    "dave": 8
  },
  "longest_turn": null,
  "players": [
    { "seat": 1, "player_id": "alex", "deck_id": null, "commander": "Atraxa", "starting_life": 40, "final_life": 0, "placement": 3, "commander_casts": 0 },
    { "seat": 2, "player_id": "ben", "deck_id": null, "commander": "Krenko", "starting_life": 40, "final_life": 22, "placement": 1, "commander_casts": 0 },
    { "seat": 3, "player_id": "clara", "deck_id": null, "commander": null, "starting_life": 40, "final_life": 0, "placement": 4, "commander_casts": 0 },
    { "seat": 4, "player_id": "dave", "deck_id": null, "commander": "Meren", "starting_life": 40, "final_life": 0, "placement": 2, "commander_casts": 0 }
  ],
  "actions": [
    { "seq": 1, "turn": 2, "actor": "alex", "type": "damage", "targets": ["ben"], "value": 5 },
    { "seq": 2, "turn": 3, "actor": "clara", "type": "heal", "targets": ["clara"], "value": 3 },
    { "seq": 3, "turn": 5, "actor": "dave", "type": "damage", "targets": ["alex"], "value": 7 }
  ]
}
```

---

## Debugging & Logging

### Debug-Modus

```typescript
interface DebugConfig {
  enabled: boolean;              // DEBUG flag
  showDebugPanel: boolean;       // Debug-Overlay anzeigen
  logLevel: 'off' | 'error' | 'warn' | 'info' | 'debug';
  saveLogToStorage: boolean;     // Log in localStorage speichern
}
```

### Log-Level

| Level | Farbe | Verwendung |
|-------|-------|------------|
| `error` | 🔴 Rot | Kritische Fehler |
| `warn` | 🟡 Gelb | Warnungen |
| `info` | 🔵 Blau | Allgemeine Info |
| `debug` | 🟢 Grün | Detaillierte Debug-Info |

### Log-Format

```typescript
interface LogEntry {
  id: string;                    // UUID
  timestamp: string;            // ISO 8601
  level: 'error' | 'warn' | 'info' | 'debug';
  category: string;              // 'game' | 'action' | 'storage' | 'ui' | 'system'
  message: string;              // Beschreibender Text
  context?: Record<string, any>; // Zusätzliche Daten
  stack?: string;               // Stack trace bei Fehlern
}
```

### Debug-Panel

**Aktivierung**: URL-Parameter `?debug=true` oder localStorage `debug_enabled = true`

**Funktionen**:
1. **State Inspector**: Vollständigen GameState anzeigen
2. **Action Log**: Alle Actions mit Details
3. **Console**: Echtzeit-Log der App
4. **Force State**: Game-State manipulieren
5. **Export Debug**: Export mit Metadaten

### Performance-Monitoring

```typescript
interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

// Verwendbar für:
// - Render-Zeiten
// - Action-Ausführung
// - Speicher-Operationen
// - Export-Prozess
```

### Error Boundary

Alle Komponenten von Error Boundary wrappen:

```vue
<ErrorBoundary :componentName="'PlayerCard'">
  <PlayerCard ... />
</ErrorBoundary>
```

**Bei Error**:
1. Error loggen
2. Fallback-UI anzeigen
3. App nicht zum Absturz bringen

---

## Tech Stack

### Frontend

| Technologie | Version | Verwendung |
|-------------|---------|------------|
| Vue.js | 3.4+ | Framework |
| Vite | 5+ | Build-Tool |
| Vue Router | 4+ | Navigation |
| TypeScript | 5+ | Typisierung |
| vite-plugin-pwa | 0.19+ | PWA-Support |

### Backend (Grad 3)

| Technologie | Version | Verwendung |
|-------------|---------|------------|
| Node.js | 20+ | Runtime |
| Express | 4+ | API-Framework |
| PostgreSQL | 16+ | Datenbank |
| JWT | - | Authentifizierung |

### Entwicklungstools

| Tool | Verwendung |
|------|------------|
| ESLint | Code-Linting |
| Prettier | Code-Formatierung |
| Vitest | Unit-Tests |

---

## Konfiguration

### App-Konfiguration

```typescript
// src/config/app.ts
export const APP_CONFIG = {
  name: 'MTG Commander Tracker',
  version: '1.0.0',
  description: 'Progressive Web App für MTG Commander',

  // Feature Flags
  features: {
    poisonCounters: true,       // Grad 2
    commanderDamage: true,     // Grad 2
    actionLog: true,           // Grad 2
    undoRedo: true,            // Grad 2
    timer: true,                // Grad 2
    playerDatabase: false,     // Grad 3
    multiDeviceSync: false,    // Grad 3
  },

  // Validierung
  validation: {
    playerNameMinLength: 1,
    playerNameMaxLength: 20,
    commanderNameMaxLength: 50,
    minPlayers: 2,
    maxPlayers: 6,
  },

  // Zahlen
  game: {
    startingLife: 40,
    maxPoison: 10,
    maxCommanderDamage: 21,
  },

  // Debug
  debug: {
    enabled: import.meta.env.DEV,  // Nur in Dev aktiv
    logLevel: 'debug',
    saveLogToStorage: true,
    maxLogEntries: 1000,
  },
} as const;
```

### Environment Variables

```bash
# .env
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://api.example.com  # Grad 3
VITE_DEBUG_MODE=false
```

### Build-Konfiguration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MTG Commander Tracker',
        short_name: 'MTG Tracker',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
      },
    }),
  ],
});
```

---

## Implementierungs-Reihenfolge

### Phase 1: Grundgerüst

1. [ ] Projekt-Setup (Vite, Vue, TypeScript)
2. [ ] Routing einrichten
3. [ ] Basis-Layout erstellen
4. [ ] Design-System (CSS-Variablen)

### Phase 2: MVP Features

1. [ ] Setup Screen implementieren
2. [ ] Game Screen mit PlayerCard
3. [ ] Leben ±X Buttons
4. [ ] Swipe-Gesten
5. [ ] localStorage Persistenz

### Phase 3: Logging & Undo

1. [ ] Action-Log Komponente
2. [ ] Undo-Funktion
3. [ ] Game End Screen
4. [ ] JSON Export

### Phase 4: Debugging

1. [ ] Debug-Config
2. [ ] Log-Service
3. [ ] Debug-Panel
4. [ ] Error Boundary

### Phase 5: PWA & Polish

1. [ ] PWA-Konfiguration
2. [ ] Manifest & Icons
3. [ ] Offline-Support testen
4. [ ] Performance-Optimierung

---

## Appendix

### Glossar

| Begriff | Definition |
|---------|------------|
| Commander | Legendäre Kreatur als Deck-Zentrum |
| Life/leben | Lebenspunkte (Start: 40) |
| Poison | Gift-Zähler (Niederlage bei 10) |
| Commander Damage | Schaden durch Commander (Niederlage bei 21) |
| Zug/Turn | Ein Spieler-Zug |
| Action | Eine Spielaktion (Schaden, Heilung, etc.) |

### Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0.0 | 2026-03-29 | Initiale Spezifikation |
