const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Allow custom data directory via environment variable (default: backend/data)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'notes.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_checklist_note_id ON checklist_items(note_id);
`);

// Auto-migrate column is_pinned if table already existed without it
try {
  const columns = db.prepare("PRAGMA table_info(notes)").all();
  const hasPinned = columns.some(c => c.name === 'is_pinned');
  if (!hasPinned) {
    db.prepare("ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0").run();
  }
} catch (e) {
  // column already exists or table freshly created
}

module.exports = db;
