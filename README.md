# RealSync Notes & Checklist Web Application

A lightweight, real-time notes and checklist web application specifically architected to work seamlessly on modern desktop/laptop browsers while maintaining **100% compatibility with a 1st Gen iPad Mini running iOS 9.3.5 (Safari 9)**.

---

## Key Features

1. **User Authentication**:
   - Clean, lightweight login and registration system.
   - JWT-based authentication stored in `localStorage`.
   - Passwords securely hashed with `bcryptjs`.
2. **Dashboard & Notes Manager**:
   - Fast, searchable list of notes and checklists.
   - Real-time indicator showing overall task completion count (e.g. `3/5 done`).
   - Create, edit, and delete notes.
3. **Voiceover Script & Agenda Editor**:
   - Multi-line text editor for speaking cues, voiceover scripts, or meeting agendas.
   - Interactive checklist with touch-friendly checkboxes.
   - Instant strike-through and completion states.
4. **Real-Time Cross-Device Synchronization**:
   - When open on both a laptop and an iPad Mini 1, edits (typing notes, checking items, adding/deleting items) sync **instantly** without page reloads.
   - Uses Socket.io with room-based scoping (`user_${userId}` and `note_${noteId}`).
5. **iOS 9.3.5 / Safari 9 Hardened**:
   - Dual-mode Vite build via `@vitejs/plugin-legacy` targeting `['ios >= 9', 'safari >= 9']`.
   - Generates `<script nomodule>` ES5 bundles for older WebKit engines.
   - Core-JS polyfills, `regenerator-runtime` (for `async/await`), and `proxy-polyfill`.
   - `socket.io-client` configured with `transports: ['polling', 'websocket']` so older Safari uses robust HTTP long-polling first before attempting WebSocket upgrades.
   - CSS written strictly for WebKit iOS 9: zero modern flexbox `gap` dependencies (uses margin spacing), no unsupported CSS custom properties, and touch targets sized at $\ge 44 \times 44\text{ pt}$ conforming to Apple's Human Interface Guidelines.

---

## Project Structure

```
performance-note/
├── backend/
│   ├── src/
│   │   ├── auth.js          # JWT & bcryptjs authentication helpers and middleware
│   │   ├── db.js            # SQLite database schema (users, notes, checklist_items)
│   │   ├── socket.js        # Socket.io real-time broadcast and room handlers
│   │   └── server.js        # Express HTTP server & static frontend host
│   ├── package.json         # Backend dependencies (express, better-sqlite3, socket.io, etc.)
│   └── data/                # SQLite persistent database storage (.db file)
├── frontend/
│   ├── index.html           # HTML template with mobile viewport & Apple meta tags
│   ├── vite.config.js       # Vite configuration with @vitejs/plugin-legacy for Safari 9
│   ├── package.json         # Frontend dependencies (Vue 3, @vitejs/plugin-legacy, axios, etc.)
│   └── src/
│       ├── assets/
│       │   └── style.css    # Safari 9 compatible responsive stylesheet
│       ├── components/
│       │   ├── LoginModal.vue   # Auth modal (Login / Register toggle)
│       │   ├── NoteList.vue     # Dashboard & notes list sidebar
│       │   └── NoteEditor.vue   # Real-time note content & checklist editor
│       ├── App.vue          # Root component managing live socket state
│       ├── main.js          # Polyfills import & Vue 3 initialization
│       └── socket.js        # Configured Socket.io client for legacy browsers
├── Dockerfile               # Multi-stage Docker build (compiles Vue & runs Node)
├── docker-compose.yml       # Single container compose file with SQLite volume
├── package.json             # Root helper scripts for direct local development
└── README.md                # Documentation and run instructions
```

---

## Method 1: Run via Docker & Docker Compose (Recommended)

The easiest way to run the entire application in production mode is using Docker Compose.

### 1. Build and Start the Container
```bash
docker compose up --build -d
```

### 2. Verify Container Status
```bash
docker compose ps
docker compose logs -f
```

The application will be running on `http://localhost:3000` (or `http://<YOUR_LAN_IP>:3000`).
The SQLite database is persisted in the `sqlite_data` Docker volume.

### 3. Stop the Container
```bash
docker compose down
```

---

## Method 2: Run Locally with Node.js

If you prefer to run directly without Docker:

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm run install:all
```
*(Or manually run `cd backend && npm install && cd ../frontend && npm install`)*

### 2. Option A: Production Build & Serve (Single Port 3000)
```bash
# Build the legacy-compatible frontend assets
npm run build:frontend

# Start the Node.js Express server
npm start
```
Access at: `http://localhost:3000`

### 2. Option B: Local Development (Hot-Reload)
Run the backend and frontend in separate terminals:
- **Terminal 1 (Backend)**:
  ```bash
  npm run dev:backend
  ```
  *(Runs backend on port 3000 with watch mode)*

- **Terminal 2 (Frontend)**:
  ```bash
  npm run dev:frontend
  ```
  *(Runs Vite dev server on port 5173 with proxy to backend)*

---

## How to Test on a 1st Gen iPad Mini (iOS 9.3.5)

1. **Find your computer's Local IP Address**:
   - On macOS:
     ```bash
     ipconfig getifaddr en0
     # Or check System Settings -> Wi-Fi -> Details -> IP Address (e.g. 192.168.1.120)
     ```
   - On Linux:
     ```bash
     hostname -I
     ```
   - On Windows:
     ```cmd
     ipconfig
     ```

2. **Connect the iPad Mini to the Same Wi-Fi Network**:
   - Ensure your iPad Mini 1 is connected to the same local network as your host machine.

3. **Open Safari on iPad Mini**:
   - Navigate to: `http://<YOUR_LOCAL_IP>:3000` (e.g., `http://192.168.1.120:3000`).

4. **Verify Real-Time Synchronization**:
   - Open `http://localhost:3000` on your laptop browser.
   - Open `http://<YOUR_LOCAL_IP>:3000` on your iPad Mini 1.
   - Log in with the same account on both devices.
   - **Test 1 (Checklist Toggle)**: Tap a checkbox on the iPad Mini -> Watch it instantly check off on your laptop without refreshing.
   - **Test 2 (Voiceover Script Typing)**: Type speaking cues or meeting notes on your laptop -> Watch text update live on the iPad Mini screen.
   - **Test 3 (Add / Delete Items)**: Add a new checklist item on either device -> It appears on both screens in real time.
