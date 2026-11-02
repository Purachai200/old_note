const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const { hashPassword, comparePassword, generateToken, authMiddleware } = require('./auth');
const { setupSocketIO } = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = setupSocketIO(server);

app.use(cors());
app.use(express.json());

// Attach io to req for endpoints that need to broadcast events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ----------------------------------------------------
// AUTHENTICATION API
// ----------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.trim().length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Username (min 3 chars) and password (min 4 chars) are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const passwordHash = hashPassword(password);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(cleanUsername, passwordHash);
    const user = { id: Number(result.lastInsertRowid), username: cleanUsername };
    const token = generateToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  try {
    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(cleanUsername);
    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken(user);
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ user });
});

// ----------------------------------------------------
// NOTES API
// ----------------------------------------------------

// List all notes for authenticated user with checklist summary
app.get('/api/notes', authMiddleware, (req, res) => {
  try {
    const notes = db.prepare(`
      SELECT 
        n.id,
        n.title,
        n.content,
        n.is_pinned,
        n.created_at,
        n.updated_at,
        COUNT(c.id) AS total_items,
        SUM(CASE WHEN c.is_completed = 1 THEN 1 ELSE 0 END) AS completed_items
      FROM notes n
      LEFT JOIN checklist_items c ON n.id = c.note_id
      WHERE n.user_id = ?
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `).all(req.user.id);

    return res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({ error: 'Failed to retrieve notes.' });
  }
});

// Create note
app.post('/api/notes', authMiddleware, (req, res) => {
  const { title, content } = req.body;
  const cleanTitle = (title && title.trim()) ? title.trim() : 'Untitled Note';
  const cleanContent = content || '';

  try {
    const result = db.prepare(`
      INSERT INTO notes (user_id, title, content)
      VALUES (?, ?, ?)
    `).run(req.user.id, cleanTitle, cleanContent);

    const note = db.prepare(`
      SELECT id, title, content, created_at, updated_at, 0 AS total_items, 0 AS completed_items
      FROM notes WHERE id = ?
    `).get(result.lastInsertRowid);

    // Broadcast only to other sockets of this user (excluding sender if socket-id header provided)
    // or frontend will de-duplicate by note.id
    const senderSocketId = req.headers['x-socket-id'];
    if (senderSocketId && req.io.sockets.sockets.get(senderSocketId)) {
      req.io.sockets.sockets.get(senderSocketId).to(`user_${req.user.id}`).emit('dashboard_note_created', { note });
    } else {
      req.io.to(`user_${req.user.id}`).emit('dashboard_note_created', { note });
    }

    return res.status(201).json({ note });
  } catch (err) {
    console.error('Error creating note:', err);
    return res.status(500).json({ error: 'Failed to create note.' });
  }
});

// Get single note with its checklist items
app.get('/api/notes/:id', authMiddleware, (req, res) => {
  const noteId = req.params.id;
  try {
    const note = db.prepare(`
      SELECT id, user_id, title, content, is_pinned, created_at, updated_at
      FROM notes
      WHERE id = ? AND user_id = ?
    `).get(noteId, req.user.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const items = db.prepare(`
      SELECT id, note_id, text, is_completed, position, created_at
      FROM checklist_items
      WHERE note_id = ?
      ORDER BY position ASC, id ASC
    `).all(noteId);

    return res.json({ note, items });
  } catch (err) {
    console.error('Error fetching note details:', err);
    return res.status(500).json({ error: 'Failed to retrieve note.' });
  }
});

// Toggle Pin status
app.patch('/api/notes/:id/pin', authMiddleware, (req, res) => {
  const noteId = req.params.id;
  try {
    const note = db.prepare('SELECT id, is_pinned FROM notes WHERE id = ? AND user_id = ?').get(noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const newPinned = note.is_pinned === 1 ? 0 : 1;
    db.prepare('UPDATE notes SET is_pinned = ? WHERE id = ?').run(newPinned, noteId);

    req.io.to(`user_${req.user.id}`).emit('note_pinned_toggled', { noteId: Number(noteId), is_pinned: newPinned });

    return res.json({ id: Number(noteId), is_pinned: newPinned });
  } catch (err) {
    console.error('Error toggling pin:', err);
    return res.status(500).json({ error: 'Failed to toggle pin.' });
  }
});

// Update note title or content
app.put('/api/notes/:id', authMiddleware, (req, res) => {
  const noteId = req.params.id;
  const { title, content } = req.body;

  try {
    const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const now = new Date().toISOString();
    if (title !== undefined && content !== undefined) {
      db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(title.trim(), content, now, noteId);
    } else if (title !== undefined) {
      db.prepare('UPDATE notes SET title = ?, updated_at = ? WHERE id = ?').run(title.trim(), now, noteId);
    } else if (content !== undefined) {
      db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, noteId);
    }

    const updated = db.prepare('SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?').get(noteId);
    return res.json({ note: updated });
  } catch (err) {
    console.error('Error updating note:', err);
    return res.status(500).json({ error: 'Failed to update note.' });
  }
});

// Delete note
app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  const noteId = req.params.id;

  try {
    const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);

    // Broadcast deletion to all rooms
    req.io.to(`note_${noteId}`).emit('note_deleted', { noteId: Number(noteId) });
    req.io.to(`user_${req.user.id}`).emit('dashboard_note_deleted', { noteId: Number(noteId) });

    return res.json({ success: true, message: 'Note deleted successfully.' });
  } catch (err) {
    console.error('Error deleting note:', err);
    return res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// ----------------------------------------------------
// STATIC FRONTEND SERVING (Production & Docker)
// ----------------------------------------------------
const frontendDistPath = process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Serve index.html for SPA routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(frontendDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Frontend not built yet. Run npm run build in frontend directory.');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
