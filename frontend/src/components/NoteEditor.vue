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

        <button
          class="btn btn-danger"
          style="padding: 6px 12px; font-size: 13px;"
          @click="confirmDeleteNote"
        >
          Delete Note
        </button>
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
      <div class="section-title">
        Script & Agenda Notes
      </div>
      <textarea
        v-model="localContent"
        class="notes-textarea"
        placeholder="Type voiceover script, meeting outline, or speaking cues here..."
        @input="onContentInput"
      ></textarea>

      <!-- Checklist Items Section -->
      <div class="checklist-section">
        <div class="section-title">
          Interactive Checklist ({{ completedCount }} / {{ items.length }} Completed)
        </div>

        <!-- Add Item Form -->
        <form class="add-item-form" @submit.prevent="handleAddItem">
          <input
            v-model="newItemText"
            type="text"
            class="item-input"
            placeholder="Add new checklist item..."
          />
          <button
            type="submit"
            class="add-item-btn"
            :disabled="!newItemText.trim()"
          >
            + Add Item
          </button>
        </form>

        <!-- Checklist List -->
        <div v-if="items.length === 0" class="empty-state" style="padding: 20px 0;">
          <p style="font-size: 14px;">No checklist items yet.</p>
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
    'toggle-item',
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
      contentDebounceTimer: null
    };
  },
  computed: {
    completedCount() {
      return this.items.filter(item => item.is_completed === 1).length;
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
    }
  }
};
</script>
