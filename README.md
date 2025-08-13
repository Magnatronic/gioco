# Gioco – Directional Skills Practice Game

Gioco is a lightweight, browser‑based game for practicing directional control skills. Sessions are fully configurable and reproducible via replay codes, making it easy to compare performance over time or share identical challenges with others.

Focus: timed target collection + consistent repetition + clear feedback.

Run it locally or host as static files (e.g. GitHub Pages) – no servers, builds, or accounts.

## ✨ Key Features

### Accessibility & Inclusiveness
- ARIA live regions for status + alerts
- Keyboard-first design (skip link, logical focus order)
- Multiple input styles: discrete, continuous, mouse click‑to‑move
- Optional universal input bridge (experimental) for abstracted methods (keyboard / switch / eye‑gaze / touch)
- High contrast & reduced motion toggles (attribute hooks present; styling can be extended)

### Core Gameplay / Learning Hooks
- Reproducible sessions via deterministic Replay Codes (seeded target layout + player start)
- Multiple target types: static, moving, fleeing, bonus, hazard
- Time adjustments (bonus reduction / hazard penalty) tracked separately for transparency
- Configurable counts, sizes, movement mode, speed, boundaries & feedback
- Live timer + progress + session history (stores recent runs locally)
- Consistent layout regeneration enables fair comparisons between attempts

### Technical Characteristics
- Pure HTML / CSS / Vanilla JS (no build toolchain)
- Modular architecture (announcer, targets, timing, input, collision, UI, resize)
- Deterministic pseudo‑random seeding (LCG) derived from text replay codes
- Runs entirely client‑side; localStorage used for settings & recent sessions only
- Basic browser caching (no service worker) – assets remain available after first load while cached

## 🎮 How to Play

### Basic Controls
- **Arrow Keys** or **WASD**: Move your character
- **Space**: Start/Pause/Resume game
- **Enter**: Confirm selections
- **Escape**: Access pause menu
- **Tab**: Navigate interface elements

### Game Sessions
- Configure target counts (static / moving / flee / bonus / hazard)
- Select target size, movement style, speed, input method
- Generate or paste a Replay Code to reproduce a session
- Timer starts on first movement input (encourages deliberate readiness)
- View results + history after completion (time, targets collected, replay code)

### Additional Inputs / Shortcuts
- Mouse: click target location in mouse mode
- (Experimental) Universal Input Bridge: `?input=keyboard|switch|eyeGaze|touch`
- Ctrl + H: Context help
- M: Toggle sound
- ESC: Pause / safe state


### Gameplay Loop
1. Configure session (or accept defaults)
2. (Optional) Enter a known Replay Code to reproduce a prior layout
3. Start – timer begins on first movement
4. Collect all core targets (bonus/hazard adjust time but do not count toward completion)
5. Review results & copy code for repetition

## 🛠 Technical Setup

### Quick Start
1. **Clone or download** this repository
2. **Open `index.html`** in a web browser
3. **Start playing** - no additional setup required!

### Hosting / Sharing
1. Host the repository on GitHub Pages (or any static host)
2. Share a Replay Code + your chosen configuration notes
3. Others paste the code to run the identical session

### Browser Requirements
- **Modern web browser** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **JavaScript enabled**
- **HTML5 Canvas support**
- **Web Audio API** for sound effects (optional)

## 📊 Tracking & Privacy
Automatically captured locally:
- Completion time (raw + adjustments)
- Targets collected vs. total
- Replay Code (seed)
- Recent configuration snapshot

NOT captured / transmitted:
- Personal data, identifiers, analytics

Data Scope: last 10 sessions (older entries dropped). Clear storage by using browser site data clearing.

## 🔧 Customization

### Session Configuration Options
- Target counts by type
- Target size (small → extra‑large)
- Player speed & input mode (discrete, continuous, mouse)
- Boundaries (none / visual / hard)
- Feedback: audio / visual toggles
- Replay Code (auto generated or user supplied)

### Accessibility / UX Options
- Reduced motion
- High contrast
- Input buffering interval
- Alternative input selection via query parameter

## 🔍 Replay Codes Explained
Replay Codes are human‑readable text seeds (e.g. `bright-circle`).

How they work:
1. Text → numeric seed via hash
2. Deterministic RNG (LCG) drives player spawn + target placement
3. Same code + same configuration → identical layout

Use cases:
- Timing improvement comparisons
- Sharing identical challenges
- Regression testing after code changes

## 🧪 Testing and Quality Assurance

### Accessibility / QA
- Screen reader live regions (status + alerts)
- Keyboard traversal verified for menus & modals
- Attribute flags for high contrast / reduced motion (CSS theming minimal by default)

### Compatibility
- Modern evergreen browsers (Chrome / Edge / Firefox / Safari)
- Works on typical college / lab hardware (no WebGL dependency)

## 📂 Project Structure

```
gioco/
├── index.html                # Entry point / script ordering (modules then game.js)
├── styles.css                # Styling + high contrast / motion preferences
├── game.js                   # Orchestrator (delegates to modules)
├── core/
│   └── modules/              # Extracted functional modules
│       ├── target-generation.js
│       ├── session-timing.js
│       ├── input-handling.js
│       ├── collision-effects.js
│       ├── ui-session.js
│       └── resize-handling.js
├── a11y/
│   └── announcer.js          # Screen reader announcements
├── scenes/                   # Scene classes (menu, session, results, etc.)
├── README.md
└── copilot-instructions/     # Development guidelines & accessibility requirements
```

## 🤝 Contributing

Contributions welcome (accessibility refinements, performance tweaks, new target behaviors, improved input abstractions). Please keep:
- Accessibility intact (no regressions in keyboard / SR support)
- Deterministic generation stable (avoid changing seeding logic without version notes)
- Replay Code format backward compatible where possible
- Minimal footprint (avoid adding heavy dependencies)

## 📜 License

Released under MIT – free to use, modify, and share.

## 🆘 Support

### Technical Help
1. Open dev tools console for errors
2. Confirm scripts load order (modules before game.js)
3. Test with `?debug=1` to enable internal logging
4. Clear localStorage (key: `giocoSessionHistory`) if corrupted

## 🌟 Acknowledgments

Special thanks to early users who stress‑tested replay determinism and interaction flows.

---

Made with a focus on clarity, reproducibility, and inclusive interaction.
