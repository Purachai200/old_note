<template>
  <aside class="sidebar" :class="{ 'hidden-mobile': isMobileDetailActive }">
    <div class="sidebar-header">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search notes or tasks..."
          class="sidebar-search"
        />
      </div>

      <div class="sidebar-actions">
        <button
          class="btn btn-primary btn-block"
          :disabled="isCreating"
          @click="$emit('create-note')"
        >
          <svg style="width: 16px; height: 16px; margin-right: 6px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span v-if="isCreating">Creating...</span>
          <span v-else>New Note / Script</span>
        </button>
      </div>

      <!-- Quick Filter Pills -->
      <div class="filter-pills">
        <button
          class="filter-pill"
          :class="{ active: filterMode === 'all' }"
          @click="filterMode = 'all'"
        >
          All ({{ notes.length }})
        </button>
        <button
          class="filter-pill"
          :class="{ active: filterMode === 'pinned' }"
          @click="filterMode = 'pinned'"
        >
          <svg class="inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 3l1 7 4 3v2l-7-1-4 6-1-1 2-5-7-1v-2l4-3 1-7z"></path>
          </svg>
          Pinned ({{ pinnedCount }})
        </button>
        <button
          class="filter-pill"
          :class="{ active: filterMode === 'pending' }"
          @click="filterMode = 'pending'"
        >
          <svg class="inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Pending ({{ pendingCount }})
        </button>
      </div>
    </div>

    <div class="notes-list-scroll">
      <div v-if="filteredNotes.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg style="width: 42px; height: 42px; stroke: #9ca3af;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <p style="font-size: 14px; font-weight: 600;">No notes found</p>
        <p style="font-size: 12px; margin-top: 4px; color: #9ca3af;">Tap "+ New Note" above to begin.</p>
      </div>

      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-item-card"
        :class="{ active: selectedNoteId === note.id, pinned: note.is_pinned === 1 }"
        @click="$emit('select-note', note.id)"
      >
        <div style="display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-pack: justify; -webkit-justify-content: space-between; -webkit-box-align: center; -webkit-align-items: center; align-items: center;">
          <div class="note-card-title">
            <svg v-if="note.is_pinned === 1" class="pin-icon-badge" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" stroke-width="1.5">
              <path d="M16 3l1 7 4 3v2l-7-1-4 6-1-1 2-5-7-1v-2l4-3 1-7z"></path>
            </svg>
            {{ note.title || 'Untitled Note' }}
          </div>
          <!-- Quick Pin button -->
          <button
            class="pin-btn"
            :class="{ active: note.is_pinned === 1 }"
            title="Pin / Unpin Note"
            @click.stop="$emit('toggle-pin', note.id)"
          >
            <svg class="star-icon" viewBox="0 0 24 24" :fill="note.is_pinned === 1 ? '#f59e0b' : 'none'" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>

        <div v-if="note.content" class="note-card-preview">
          {{ note.content }}
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
    },
    isCreating: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select-note', 'create-note', 'toggle-pin'],
  data() {
    return {
      searchQuery: '',
      filterMode: 'all' // 'all' | 'pinned' | 'pending'
    };
  },
  computed: {
    pinnedCount() {
      return this.notes.filter(n => n.is_pinned === 1).length;
    },
    pendingCount() {
      return this.notes.filter(n => n.total_items > 0 && n.completed_items < n.total_items).length;
    },
    filteredNotes() {
      let list = this.notes;

      if (this.filterMode === 'pinned') {
        list = list.filter(n => n.is_pinned === 1);
      } else if (this.filterMode === 'pending') {
        list = list.filter(n => n.total_items > 0 && n.completed_items < n.total_items);
      }

      if (!this.searchQuery.trim()) {
        return list;
      }

      const q = this.searchQuery.toLowerCase();
      return list.filter(note => {
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
