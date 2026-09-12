<script setup lang="ts">
import { Check, Copy, FileText, Trash2 } from 'lucide-vue-next'
import type { PromptConfig } from '@/db/schema/database'
import type { EditForm } from '../types'

defineProps<{
  selectedConfig: PromptConfig | null
  editForm: EditForm
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:content': [value: string]
  'set-active': []
  duplicate: []
  delete: []
}>()
</script>

<template>
  <section v-if="selectedConfig" class="prompt-editor">
    <div class="prompt-editor-header">
      <h2>Edit Configuration</h2>
      <div class="prompt-editor-actions">
        <button
          v-if="!selectedConfig.isActive"
          class="prompt-action-btn"
          type="button"
          title="Set as active"
          @click="emit('set-active')"
        >
          <Check :size="15" />
          <span>Set Active</span>
        </button>
        <button
          class="prompt-action-btn"
          type="button"
          title="Duplicate"
          @click="emit('duplicate')"
        >
          <Copy :size="15" />
        </button>
        <button
          class="prompt-action-btn prompt-action-btn--danger"
          type="button"
          title="Delete"
          @click="emit('delete')"
        >
          <Trash2 :size="15" />
        </button>
      </div>
    </div>

    <div class="prompt-editor-body">
      <label class="prompt-field">
        <span>Configuration Name</span>
        <input 
          :value="editForm.name" 
          type="text" 
          placeholder="e.g., IELTS Writing, TOEFL Reading" 
          @input="emit('update:name', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="prompt-field">
        <span>Prompt Content</span>
        <textarea
          :value="editForm.content"
          rows="18"
          placeholder="Enter your prompt instructions here...

You can upload a .txt or .md file using the 'Upload File' button above."
          @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>
    </div>
  </section>

  <div v-else class="prompt-editor-empty">
    <FileText :size="48" />
    <p>Select a configuration to edit</p>
  </div>
</template>
