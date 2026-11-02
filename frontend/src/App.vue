<template>
  <div id="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-brand">
        <div class="app-logo-icon">✓</div>
        <h1 class="app-title">RealSync Notes</h1>
      </div>

      <div class="header-actions">
        <!-- Live Real-Time Connection Indicator -->
        <div
          v-if="user"
          class="sync-badge"
          :class="syncStatus"
        >
          <span class="status-dot"></span>
          <span>{{ syncStatusLabel }}</span>
        </div>

        <div v-if="user" style="display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center;">
          <span class="user-tag">{{ user.username }}</span>
          <button
            class="btn btn-secondary"
            style="padding: 6px 10px; font-size: 13px;"
            @click="logout"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <!-- Main Workspace Layout -->
    <div v-if="user" class="main-content">
      <!-- Left Dashboard / Notes Sidebar -->
      <NoteList
        :notes="notes"
        :selected-note-id="selectedNote ? selectedNote.id : null"
        :is-mobile-detail-active="isMobileDetailActive"
        :is-creating="isCreating"
        @select-note="selectNote"
        @create-note="handleCreateNote"
        @toggle-pin="handleTogglePin"
      />

      <!-- Right Editor Pane -->
      <NoteEditor
        :note="selectedNote"
        :items="checklistItems"
        :is-mobile-detail-active="isMobileDetailActive"
        @update-note="handleUpdateNote"
        @delete-note="handleDeleteNote"
        @toggle-pin="handleTogglePin"
        @toggle-item="handleToggleItem"
        @toggle-all-items="handleToggleAllItems"
        @clear-completed-items="handleClearCompletedItems"
        @add-item="handleAddItem"
        @update-item="handleUpdateItem"
        @delete-item="handleDeleteItem"
        @back-to-list="isMobileDetailActive = false"
      />
    </div>

    <!-- Login / Register Modal -->
    <LoginModal
      v-if="!user"
      @authenticated="onAuthenticated"
    />
  </div>
</template>

<script>
import axios from 'axios';
import { initSocket, getSocket, disconnectSocket } from './socket';
import LoginModal from './components/LoginModal.vue';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';

export default {
  name: 'App',
  components: {
    LoginModal,
    NoteList,
    NoteEditor
  },
  data() {
    return {
      user: null,
      token: null,
      notes: [],
      selectedNote: null,
      checklistItems: [],
      syncStatus: 'connecting', // 'connected' | 'connecting' | 'disconnected'
      isMobileDetailActive: false,
      isCreating: false
    };
  },
  computed: {
    syncStatusLabel() {
      if (this.syncStatus === 'connected') return 'Live Synced';
      if (this.syncStatus === 'connecting') return 'Connecting...';
      return 'Offline';
    }
  },
  created() {
    this.checkSession();
  },
  methods: {
    async checkSession() {
      const savedToken = localStorage.getItem('auth_token');
      if (!savedToken) {
        this.user = null;
        return;
      }

      this.token = savedToken;
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + savedToken;

      try {
        const res = await axios.get('/api/auth/me');
        this.user = res.data.user;
        this.connectSocket();
        await this.loadNotes();
      } catch (err) {
        console.error('Session expired or invalid', err);
        this.logout();
      }
    },
    onAuthenticated({ token, user }) {
      this.token = token;
      this.user = user;
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      this.connectSocket();
      this.loadNotes();
    },
    logout() {
      disconnectSocket();
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      this.user = null;
      this.token = null;
      this.notes = [];
      this.selectedNote = null;
      this.checklistItems = [];
      this.syncStatus = 'disconnected';
    },
    connectSocket() {
      const socket = initSocket(this.token);

      socket.on('connect', () => {
        this.syncStatus = 'connected';
        if (socket.id) {
          axios.defaults.headers.common['X-Socket-Id'] = socket.id;
        }
        if (this.selectedNote) {
          socket.emit('join_note', { noteId: this.selectedNote.id });
        }
      });

      socket.on('disconnect', () => {
        this.syncStatus = 'disconnected';
      });

      socket.on('connect_error', () => {
        this.syncStatus = 'connecting';
      });

      // Real-time synchronization events
      socket.on('note_updated', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          if (data.title !== undefined) this.selectedNote.title = data.title;
          if (data.content !== undefined) this.selectedNote.content = data.content;
          if (data.updated_at !== undefined) this.selectedNote.updated_at = data.updated_at;
        }
      });

      socket.on('note_pinned_toggled', (data) => {
        const found = this.notes.find(n => n.id === data.noteId);
        if (found) {
          found.is_pinned = data.is_pinned;
          this.sortNotes();
        }
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          this.selectedNote.is_pinned = data.is_pinned;
        }
      });

      socket.on('dashboard_note_updated', (data) => {
        const found = this.notes.find(n => n.id === data.noteId);
        if (found) {
          if (data.title !== undefined) found.title = data.title;
          if (data.updated_at !== undefined) found.updated_at = data.updated_at;
          this.sortNotes();
        }
      });

      socket.on('dashboard_stats_updated', (data) => {
        const found = this.notes.find(n => n.id === data.noteId);
        if (found && data.stats) {
          found.total_items = data.stats.total_items;
          found.completed_items = data.stats.completed_items;
        }
      });

      // Dashboard note creation with strict deduplication
      socket.on('dashboard_note_created', (data) => {
        if (!data || !data.note) return;
        const exists = this.notes.some(n => n.id === data.note.id);
        if (!exists) {
          this.notes.unshift(data.note);
          this.sortNotes();
        }
      });

      socket.on('dashboard_note_deleted', (data) => {
        this.notes = this.notes.filter(n => n.id !== data.noteId);
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          this.selectedNote = null;
          this.checklistItems = [];
          this.isMobileDetailActive = false;
        }
      });

      socket.on('item_toggled', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          const item = this.checklistItems.find(i => i.id === data.itemId);
          if (item) {
            item.is_completed = data.is_completed;
          }
        }
      });

      socket.on('items_all_toggled', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          this.checklistItems.forEach(i => {
            i.is_completed = data.is_completed;
          });
        }
      });

      socket.on('items_completed_cleared', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          this.checklistItems = this.checklistItems.filter(i => i.is_completed !== 1);
        }
      });

      socket.on('item_added', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          if (!this.checklistItems.some(i => i.id === data.item.id)) {
            this.checklistItems.push(data.item);
          }
        }
      });

      socket.on('item_updated', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          const item = this.checklistItems.find(i => i.id === data.itemId);
          if (item) {
            item.text = data.text;
          }
        }
      });

      socket.on('item_deleted', (data) => {
        if (this.selectedNote && this.selectedNote.id === data.noteId) {
          this.checklistItems = this.checklistItems.filter(i => i.id !== data.itemId);
        }
      });
    },
    sortNotes() {
      this.notes.sort((a, b) => {
        const pinA = a.is_pinned === 1 ? 1 : 0;
        const pinB = b.is_pinned === 1 ? 0 : 0;
        if (pinA !== pinB) return pinB - pinA;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
    },
    async loadNotes() {
      try {
        const res = await axios.get('/api/notes');
        this.notes = res.data.notes || [];
        this.sortNotes();
        if (this.notes.length > 0 && !this.selectedNote) {
          this.selectNote(this.notes[0].id);
        }
      } catch (err) {
        console.error('Failed to load notes', err);
      }
    },
    async selectNote(noteId) {
      const socket = getSocket();
      if (this.selectedNote && socket) {
        socket.emit('leave_note', { noteId: this.selectedNote.id });
      }

      try {
        const res = await axios.get('/api/notes/' + noteId);
        this.selectedNote = res.data.note;
        this.checklistItems = res.data.items || [];
        this.isMobileDetailActive = true;

        if (socket) {
          socket.emit('join_note', { noteId });
        }
      } catch (err) {
        console.error('Failed to get note details', err);
      }
    },
    async handleCreateNote() {
      if (this.isCreating) return;
      this.isCreating = true;

      try {
        const res = await axios.post('/api/notes', {
          title: 'Untitled Note',
          content: ''
        });
        const newNote = res.data.note;

        // Add only if not already added by socket
        if (!this.notes.some(n => n.id === newNote.id)) {
          this.notes.unshift(newNote);
          this.sortNotes();
        }

        this.selectNote(newNote.id);
      } catch (err) {
        console.error('Failed to create note', err);
      } finally {
        setTimeout(() => {
          this.isCreating = false;
        }, 500);
      }
    },
    async handleTogglePin(noteId) {
      try {
        const res = await axios.patch(`/api/notes/${noteId}/pin`);
        const { is_pinned } = res.data;
        const found = this.notes.find(n => n.id === noteId);
        if (found) {
          found.is_pinned = is_pinned;
          this.sortNotes();
        }
        if (this.selectedNote && this.selectedNote.id === noteId) {
          this.selectedNote.is_pinned = is_pinned;
        }
      } catch (err) {
        console.error('Failed to toggle pin', err);
      }
    },
    handleUpdateNote(payload) {
      if (!this.selectedNote) return;

      if (payload.title !== undefined) {
        this.selectedNote.title = payload.title;
        const inList = this.notes.find(n => n.id === this.selectedNote.id);
        if (inList) inList.title = payload.title;
      }
      if (payload.content !== undefined) {
        this.selectedNote.content = payload.content;
      }

      const socket = getSocket();
      if (socket) {
        socket.emit('note_update', {
          noteId: this.selectedNote.id,
          title: payload.title,
          content: payload.content
        });
      }
    },
    async handleDeleteNote(noteId) {
      try {
        await axios.delete('/api/notes/' + noteId);
        this.notes = this.notes.filter(n => n.id !== noteId);
        this.selectedNote = null;
        this.checklistItems = [];
        this.isMobileDetailActive = false;

        if (this.notes.length > 0) {
          this.selectNote(this.notes[0].id);
        }
      } catch (err) {
        console.error('Failed to delete note', err);
      }
    },
    handleToggleItem({ itemId, is_completed }) {
      const item = this.checklistItems.find(i => i.id === itemId);
      if (item) {
        item.is_completed = is_completed;
      }

      if (this.selectedNote) {
        const inList = this.notes.find(n => n.id === this.selectedNote.id);
        if (inList) {
          inList.completed_items = this.checklistItems.filter(i => i.is_completed === 1).length;
        }

        const socket = getSocket();
        if (socket) {
          socket.emit('item_toggle', {
            noteId: this.selectedNote.id,
            itemId,
            is_completed
          });
        }
      }
    },
    handleToggleAllItems(is_completed) {
      if (!this.selectedNote) return;
      const val = is_completed ? 1 : 0;
      this.checklistItems.forEach(i => {
        i.is_completed = val;
      });

      const inList = this.notes.find(n => n.id === this.selectedNote.id);
      if (inList) {
        inList.completed_items = is_completed ? this.checklistItems.length : 0;
      }

      const socket = getSocket();
      if (socket) {
        socket.emit('items_toggle_all', {
          noteId: this.selectedNote.id,
          is_completed: val
        });
      }
    },
    handleClearCompletedItems() {
      if (!this.selectedNote) return;
      this.checklistItems = this.checklistItems.filter(i => i.is_completed !== 1);

      const inList = this.notes.find(n => n.id === this.selectedNote.id);
      if (inList) {
        inList.completed_items = 0;
        inList.total_items = this.checklistItems.length;
      }

      const socket = getSocket();
      if (socket) {
        socket.emit('items_clear_completed', {
          noteId: this.selectedNote.id
        });
      }
    },
    handleAddItem({ text, position }) {
      if (!this.selectedNote) return;
      const socket = getSocket();
      if (socket) {
        socket.emit('item_add', {
          noteId: this.selectedNote.id,
          text,
          position
        });
      }
    },
    handleUpdateItem({ itemId, text }) {
      if (!this.selectedNote) return;
      const item = this.checklistItems.find(i => i.id === itemId);
      if (item) {
        item.text = text;
      }
      const socket = getSocket();
      if (socket) {
        socket.emit('item_update', {
          noteId: this.selectedNote.id,
          itemId,
          text
        });
      }
    },
    handleDeleteItem(itemId) {
      if (!this.selectedNote) return;
      this.checklistItems = this.checklistItems.filter(i => i.id !== itemId);
      const socket = getSocket();
      if (socket) {
        socket.emit('item_delete', {
          noteId: this.selectedNote.id,
          itemId
        });
      }
    }
  }
};
</script>
