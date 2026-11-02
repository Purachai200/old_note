<template>
  <main class="editor-pane" :class="{ 'hidden-mobile': !isMobileDetailActive }">
    <div v-if="!note" class="empty-state" style="margin-top: 100px;">
      <div class="empty-state-icon">📋</div>
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
            ← Back
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
            {{ note.is_pinned === 1 ? '📌 Pinned' : '📍 Pin' }}
          </button>

          <!-- Copy text button -->
          <button
            class="btn btn-secondary"
            style="padding: 6px 12px; font-size: 13px; margin-right: 8px;"
            @click="copyFullContent"
          >
            {{ copySuccess ? '✓ Copied!' : '📋 Copy All' }}
          </button>

          <button
            class="btn btn-danger"
            style="padding: 6px 12px; font-size: 13px;"
            @click="confirmDeleteNote"
          >
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
              ✓ Check All
            </button>
            <button
              type="button"
              class="quick-action-btn"
              @click="$emit('toggle-all-items', false)"
            >
              ○ Uncheck All
            </button>
            <button
              v-if="completedCount > 0"
              type="button"
              class="quick-action-btn text-danger"
              @click="$emit('clear-completed-items')"
            >
              ✕ Clear Done ({{ completedCount }})
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
            + Add Task
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
              <span v-if="item.is_completed === 1">✓</span>
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
            ×
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

      // Legacy-safe clipboard copy (supports Safari 9 & modern)
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
