<template>
  <aside class="sidebar" :class="{ 'hidden-mobile': isMobileDetailActive }">
    <div class="sidebar-header">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search notes..."
        class="sidebar-search"
      />
      <div class="sidebar-actions">
        <button
          class="btn btn-primary btn-block"
          @click="$emit('create-note')"
        >
          + New Note / Script
        </button>
      </div>
    </div>

    <div class="notes-list-scroll">
      <div v-if="filteredNotes.length === 0" class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p style="font-size: 14px;">No notes found</p>
        <p style="font-size: 12px; margin-top: 4px;">Tap "+ New Note" above to begin.</p>
      </div>

      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-item-card"
        :class="{ active: selectedNoteId === note.id }"
        @click="$emit('select-note', note.id)"
      >
        <div class="note-card-title">
          {{ note.title || 'Untitled Note' }}
        </div>
        <div class="note-card-meta">
          <span>{{ formatDate(note.updated_at) }}</span>
          <span
            v-if="note.total_items > 0"
            class="checklist-pill"
            :class="{ 'all-done': note.completed_items === note.total_items }"
          >
            {{ note.completed_items }}/{{ note.total_items }} done
          </span>
          <span v-else class="checklist-pill">
            Notes only
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'NoteList',
  props: {
    notes: {
      type: Array,
      default: () => []
    },
    selectedNoteId: {
      type: [Number, String],
      default: null
    },
    isMobileDetailActive: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select-note', 'create-note'],
  data() {
    return {
      searchQuery: ''
    };
  },
  computed: {
    filteredNotes() {
      if (!this.searchQuery.trim()) {
        return this.notes;
      }
      const q = this.searchQuery.toLowerCase();
      return this.notes.filter(note => {
        const titleMatch = (note.title || '').toLowerCase().indexOf(q) !== -1;
        const contentMatch = (note.content || '').toLowerCase().indexOf(q) !== -1;
        return titleMatch || contentMatch;
      });
    }
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        // Format cleanly for older iOS Safari without Intl dependencies
        const hours = ('0' + d.getHours()).slice(-2);
        const mins = ('0' + d.getMinutes()).slice(-2);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        return month + '/' + day + ' ' + hours + ':' + mins;
      } catch (e) {
        return '';
      }
    }
  }
};
</script>
