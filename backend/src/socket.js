const { Server } = require('socket.io');
const { verifyToken } = require('./auth');
const db = require('./db');

function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    // CRITICAL for iOS 9 / Safari 9 compatibility:
    // Allow long-polling fallback first, then upgrade to websocket if supported
    transports: ['polling', 'websocket'],
    allowUpgrades: true,
    pingTimeout: 20000,
    pingInterval: 10000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    socket.user = decoded;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRoom = `user_${userId}`;
    socket.join(userRoom);

    // Join a specific note room
    socket.on('join_note', ({ noteId }) => {
      if (!noteId) return;
      // Verify note ownership
      const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
      if (note) {
        const noteRoom = `note_${noteId}`;
        socket.join(noteRoom);
      }
    });

    // Leave a specific note room
    socket.on('leave_note', ({ noteId }) => {
      if (!noteId) return;
      socket.leave(`note_${noteId}`);
    });

    // Real-time note content/title editing sync
    socket.on('note_update', ({ noteId, title, content }) => {
      if (!noteId) return;
      const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
      if (!note) return;

      const now = new Date().toISOString();
      if (title !== undefined && content !== undefined) {
        db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(title, content, now, noteId);
      } else if (title !== undefined) {
        db.prepare('UPDATE notes SET title = ?, updated_at = ? WHERE id = ?').run(title, now, noteId);
      } else if (content !== undefined) {
        db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, noteId);
      }

      // Broadcast update to all other devices viewing this note
      socket.to(`note_${noteId}`).emit('note_updated', {
        noteId,
        title,
        content,
        updated_at: now
      });

      // Broadcast title/timestamp change to user's dashboard on other tabs/devices
      io.to(userRoom).emit('dashboard_note_updated', {
        noteId,
        title,
        updated_at: now
      });
    });

    // Real-time checklist toggle sync
    socket.on('item_toggle', ({ noteId, itemId, is_completed }) => {
      if (!noteId || !itemId) return;
      const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
      if (!note) return;

      const completedVal = is_completed ? 1 : 0;
      db.prepare('UPDATE checklist_items SET is_completed = ? WHERE id = ? AND note_id = ?').run(completedVal, itemId, noteId);
      db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), noteId);

      // Broadcast toggle to all other clients currently viewing this note
      socket.to(`note_${noteId}`).emit('item_toggled', {
        noteId,
        itemId,
        is_completed: completedVal
      });

      // Update dashboard stats
      const stats = getNoteStats(noteId);
      io.to(userRoom).emit('dashboard_stats_updated', { noteId, stats });
    });

    // Real-time checklist item add
    socket.on('item_add', ({ noteId, text, position }) => {
      if (!noteId || !text) return;
      const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
      if (!note) return;

      const pos = position || 0;
      const result = db.prepare('INSERT INTO checklist_items (note_id, text, is_completed, position) VALUES (?, ?, 0, ?)').run(noteId, text.trim(), pos);
      const newItem = {
        id: Number(result.lastInsertRowid),
        note_id: noteId,
        text: text.trim(),
        is_completed: 0,
        position: pos
      };

      db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), noteId);

      // Broadcast new item to all clients in the note room (including sender confirmation if needed)
      io.to(`note_${noteId}`).emit('item_added', { noteId, item: newItem });

      // Update dashboard stats
      const stats = getNoteStats(noteId);
      io.to(userRoom).emit('dashboard_stats_updated', { noteId, stats });
    });

    // Real-time checklist item text update
    socket.on('item_update', ({ noteId, itemId, text }) => {
      if (!noteId || !itemId || !text) return;
      const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
      if (!note) return;

      db.prepare('UPDATE checklist_items SET text = ? WHERE id = ? AND note_id = ?').run(text.trim(), itemId, noteId);
      db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), noteId);

      socket.to(`note_${noteId}`).emit('item_updated', { noteId, itemId, text: text.trim() });
    });

    // Real-time checklist item delete
    socket.on('item_delete', ({ noteId, itemId }) => {
      if (!noteId || !itemId) return;
      const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
      if (!note) return;

      db.prepare('DELETE FROM checklist_items WHERE id = ? AND note_id = ?').run(itemId, noteId);
      db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), noteId);

      io.to(`note_${noteId}`).emit('item_deleted', { noteId, itemId });

      // Update dashboard stats
      const stats = getNoteStats(noteId);
      io.to(userRoom).emit('dashboard_stats_updated', { noteId, stats });
    });
  });

  return io;
}

function getNoteStats(noteId) {
  const row = db.prepare(`
    SELECT 
      COUNT(*) AS total_items,
      SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed_items
    FROM checklist_items
    WHERE note_id = ?
  `).get(noteId);

  return {
    total_items: row ? row.total_items : 0,
    completed_items: row ? (row.completed_items || 0) : 0
  };
}

module.exports = { setupSocketIO };
