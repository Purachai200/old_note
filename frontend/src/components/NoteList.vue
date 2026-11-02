<template>
  <aside class="sidebar" :class="{ 'hidden-mobile': isMobileDetailActive }">
    <div class="sidebar-header">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="🔍 Search notes or tasks..."
        class="sidebar-search"
      />
      <div class="sidebar-actions">
        <button
          class="btn btn-primary btn-block"
          :disabled="isCreating"
          @click="$emit('create-note')"
        >
          <span v-if="isCreating">Creating...</span>
          <span v-else>+ New Note / Script</span>
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
          📌 Pinned ({{ pinnedCount }})
        </button>
        <button
          class="filter-pill"
          :class="{ active: filterMode === 'pending' }"
          @click="filterMode = 'pending'"
        >
          ⏳ Incomplete ({{ pendingCount }})
        </button>
      </div>
    </div>

    <div class="notes-list-scroll">
      <div v-if="filteredNotes.length === 0" class="empty-state">
        <div class="empty-state-icon">📝</div>
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
            <span v-if="note.is_pinned === 1" style="color: #f59e0b; margin-right: 4px;" title="Pinned">📌</span>
            {{ note.title || 'Untitled Note' }}
          </div>
          <!-- Quick Pin button -->
          <button
            class="pin-btn"
            :class="{ active: note.is_pinned === 1 }"
            title="Pin / Unpin Note"
            @click.stop="$emit('toggle-pin', note.id)"
          >
            ★
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
