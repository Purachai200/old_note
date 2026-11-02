<template>
  <main class="editor-pane" :class="{ 'hidden-mobile': !isMobileDetailActive }">
    <div v-if="!note" class="empty-state" style="margin-top: 100px;">
      <div class="empty-state-icon">
        <svg style="width: 48px; height: 48px; stroke: #9ca3af;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      </div>
      <h3 style="font-size: 18px; font-weight: 600; color: #4b5563;">No Note Selected</h3>
      <p style="font-size: 14px; margin-top: 6px;">Select a note from the left sidebar or create a new one.</p>
    </div>

    <div v-else class="editor-card">
      <!-- Editor Top Bar -->
      <div class="editor-header-bar">
        <div style="display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center;">
          <button
            class="btn btn-secondary mobile-back-btn"
            @click="$emit('back-to-list')"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
          <span style="font-size: 12px; color: #10b981; font-weight: 600; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center;">
            <span class="status-dot" style="background-color: #10b981;"></span>
            Real-Time Sync Active
          </span>
        </div>

        <div style="display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center;">
          <!-- Pin button -->
          <button
            class="btn btn-secondary"
            style="padding: 6px 12px; font-size: 13px; margin-right: 8px;"
            :class="{ 'btn-pinned': note.is_pinned === 1 }"
            @click="$emit('toggle-pin', note.id)"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" :fill="note.is_pinned === 1 ? '#d97706' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M16 3l1 7 4 3v2l-7-1-4 6-1-1 2-5-7-1v-2l4-3 1-7z"></path>
            </svg>
            {{ note.is_pinned === 1 ? 'Pinned' : 'Pin' }}
          </button>

          <!-- Copy text button -->
          <button
            class="btn btn-secondary"
            style="padding: 6px 12px; font-size: 13px; margin-right: 8px;"
            @click="copyFullContent"
          >
            <svg v-if="copySuccess" class="btn-icon text-success" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            {{ copySuccess ? 'Copied!' : 'Copy All' }}
          </button>

          <!-- Delete Note button -->
          <button
            class="btn btn-danger"
            style="padding: 6px 12px; font-size: 13px;"
            @click="confirmDeleteNote"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>

      <!-- Note Title -->
      <input
        v-model="localTitle"
        type="text"
        class="title-input"
        placeholder="Note Title / Meeting Subject..."
        @input="onTitleInput"
      />

      <!-- Voiceover / Agenda Script Text Notes -->
      <div style="display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-pack: justify; -webkit-justify-content: space-between; -webkit-box-align: center; -webkit-align-items: center; align-items: center; margin-bottom: 8px;">
        <div class="section-title" style="margin-bottom: 0;">
          Script & Agenda Notes
        </div>
        <div style="font-size: 12px; color: #9ca3af;">
          {{ wordCount }} words · {{ charCount }} chars
        </div>
      </div>

      <textarea
        v-model="localContent"
        class="notes-textarea"
        placeholder="Type voiceover script, meeting outline, or speaking cues here..."
        @input="onContentInput"
      ></textarea>

      <!-- Checklist Items Section -->
      <div class="checklist-section">
        <div style="display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-pack: justify; -webkit-justify-content: space-between; -webkit-box-align: center; -webkit-align-items: center; align-items: center; margin-bottom: 10px; -webkit-flex-wrap: wrap; flex-wrap: wrap;">
          <div class="section-title" style="margin-bottom: 0;">
            Interactive Checklist ({{ completedCount }} / {{ items.length }} Completed)
          </div>

          <!-- Quick Action Buttons for Checklists -->
          <div v-if="items.length > 0" class="checklist-quick-actions">
            <button
              type="button"
              class="quick-action-btn"
              @click="$emit('toggle-all-items', true)"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Check All
            </button>
            <button
              type="button"
              class="quick-action-btn"
              @click="$emit('toggle-all-items', false)"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"></circle>
              </svg>
              Uncheck All
            </button>
            <button
              v-if="completedCount > 0"
              type="button"
              class="quick-action-btn text-danger"
              @click="$emit('clear-completed-items')"
            >
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Clear Done ({{ completedCount }})
            </button>
          </div>
        </div>

        <!-- Add Item Form -->
        <form class="add-item-form" @submit.prevent="handleAddItem">
          <input
            v-model="newItemText"
            type="text"
            class="item-input"
            placeholder="Type checklist task and press Enter..."
          />
          <button
            type="submit"
            class="add-item-btn"
            :disabled="!newItemText.trim()"
          >
            <svg style="width: 16px; height: 16px; margin-right: 4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Task
          </button>
        </form>

        <!-- Checklist List -->
        <div v-if="items.length === 0" class="empty-state" style="padding: 20px 0;">
          <p style="font-size: 14px; color: #9ca3af;">No checklist items yet.</p>
        </div>

        <div
          v-for="item in items"
          :key="item.id"
          class="checklist-item"
          :class="{ completed: item.is_completed === 1 }"
        >
          <!-- Custom Touch-Friendly Checkbox -->
          <div
            class="checkbox-hit-box"
            role="checkbox"
            :aria-checked="item.is_completed === 1"
            @click="toggleItem(item)"
          >
            <div class="custom-checkbox">
              <svg v-if="item.is_completed === 1" style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>

          <!-- Item Text Input -->
          <input
            :value="item.text"
            type="text"
            class="item-text-input"
            placeholder="Item description..."
            @input="updateItemText(item, $event.target.value)"
          />

          <!-- Delete Item Button -->
          <button
            type="button"
            class="item-delete-btn"
            title="Delete item"
            @click="deleteItem(item.id)"
          >
            <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
export default {
  name: 'NoteEditor',
  props: {
    note: {
      type: Object,
      default: null
    },
    items: {
      type: Array,
      default: () => []
    },
    isMobileDetailActive: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'update-note',
    'delete-note',
    'toggle-pin',
    'toggle-item',
    'toggle-all-items',
    'clear-completed-items',
    'add-item',
    'update-item',
    'delete-item',
    'back-to-list'
  ],
  data() {
    return {
      localTitle: '',
      localContent: '',
      newItemText: '',
      titleDebounceTimer: null,
      contentDebounceTimer: null,
      copySuccess: false
    };
  },
  computed: {
    completedCount() {
      return this.items.filter(item => item.is_completed === 1).length;
    },
    charCount() {
      return (this.localContent || '').length;
    },
    wordCount() {
      const text = (this.localContent || '').trim();
      if (!text) return 0;
      return text.split(/\s+/).length;
    }
  },
  watch: {
    note: {
      immediate: true,
      handler(newNote) {
        if (newNote) {
          this.localTitle = newNote.title || '';
          this.localContent = newNote.content || '';
        } else {
          this.localTitle = '';
          this.localContent = '';
        }
      }
    }
  },
  methods: {
    onTitleInput() {
      if (this.titleDebounceTimer) clearTimeout(this.titleDebounceTimer);
      this.titleDebounceTimer = setTimeout(() => {
        this.$emit('update-note', {
          title: this.localTitle
        });
      }, 300);
    },
    onContentInput() {
      if (this.contentDebounceTimer) clearTimeout(this.contentDebounceTimer);
      this.contentDebounceTimer = setTimeout(() => {
        this.$emit('update-note', {
          content: this.localContent
        });
      }, 300);
    },
    handleAddItem() {
      if (!this.newItemText.trim()) return;
      this.$emit('add-item', {
        text: this.newItemText.trim(),
        position: this.items.length
      });
      this.newItemText = '';
    },
    toggleItem(item) {
      const nextVal = item.is_completed === 1 ? 0 : 1;
      this.$emit('toggle-item', {
        itemId: item.id,
        is_completed: nextVal
      });
    },
    updateItemText(item, newText) {
      this.$emit('update-item', {
        itemId: item.id,
        text: newText
      });
    },
    deleteItem(itemId) {
      this.$emit('delete-item', itemId);
    },
    confirmDeleteNote() {
      if (window.confirm('Are you sure you want to delete this note and its checklist?')) {
        this.$emit('delete-note', this.note.id);
      }
    },
    copyFullContent() {
      let textToCopy = (this.localTitle || 'Untitled Note') + '\n\n';
      if (this.localContent) {
        textToCopy += this.localContent + '\n\n';
      }
      if (this.items.length > 0) {
        textToCopy += '--- Checklist ---\n';
        this.items.forEach(item => {
          const mark = item.is_completed === 1 ? '[x] ' : '[ ] ';
          textToCopy += mark + item.text + '\n';
        });
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.flashCopy();
        }).catch(() => {
          this.fallbackCopy(textToCopy);
        });
      } else {
        this.fallbackCopy(textToCopy);
      }
    },
    fallbackCopy(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.flashCopy();
      } catch (err) {
        // ignore
      }
      document.body.removeChild(textArea);
    },
    flashCopy() {
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    }
  }
};
</script>
