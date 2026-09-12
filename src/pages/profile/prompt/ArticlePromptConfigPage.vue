<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import '@/styles/pages/profile/prompt-config-page.css'

import PromptHeader from './components/PromptHeader.vue'
import PromptToolbar from './components/PromptToolbar.vue'
import PromptList from './components/PromptList.vue'
import PromptEditor from './components/PromptEditor.vue'
import DeleteConfirmModal from './components/DeleteConfirmModal.vue'

import { useToast } from './composables/useToast'
import { usePromptConfigs } from './composables/usePromptConfigs'
import { usePromptEditor } from './composables/usePromptEditor'

const emit = defineEmits<{
  back: []
}>()

const { toastMessage, toastType, showToast } = useToast()

const {
  configs,
  selectedConfigId,
  selectedConfig,
  showDeleteConfirm,
  selectConfig,
  createNewConfig,
  saveConfig,
  setAsActive,
  duplicateConfig,
  confirmDelete,
  performDelete,
  cancelDelete
} = usePromptConfigs(showToast)

const { editForm, handleFileUpload } = usePromptEditor(
  () => selectedConfig.value,
  showToast
)

async function saveCurrentConfig() {
  if (!selectedConfig.value) return
  
  await saveConfig(
    selectedConfig.value.id,
    editForm.value.name,
    editForm.value.content,
    selectedConfig.value.isActive
  )
}

function handleSetActive() {
  if (selectedConfig.value) {
    setAsActive(selectedConfig.value.id)
  }
}

function handleDuplicate() {
  if (selectedConfig.value) {
    duplicateConfig(selectedConfig.value.id)
  }
}

function handleDelete() {
  if (selectedConfig.value) {
    confirmDelete(selectedConfig.value.id)
  }
}
</script>

<template>
  <div class="prompt-config-page">
    <PromptHeader @back="emit('back')" />

    <main class="prompt-content">
      <PromptToolbar @create="createNewConfig" @upload="handleFileUpload" />

      <div class="prompt-layout">
        <PromptList
          :configs="configs"
          :selected-config-id="selectedConfigId"
          @select="selectConfig"
        />

        <PromptEditor
          :selected-config="selectedConfig"
          :edit-form="editForm"
          @update:name="editForm.name = $event"
          @update:content="editForm.content = $event"
          @set-active="handleSetActive"
          @duplicate="handleDuplicate"
          @delete="handleDelete"
        />
      </div>
    </main>

    <DeleteConfirmModal
      :show="showDeleteConfirm"
      @confirm="performDelete"
      @cancel="cancelDelete"
    />

    <Transition name="prompt-toast">
      <div v-if="toastMessage" class="prompt-toast" :class="{ 'is-error': toastType === 'error' }">
        {{ toastMessage }}
      </div>
    </Transition>

    <footer class="prompt-save-bar">
      <button type="button" :disabled="!selectedConfig" @click="saveCurrentConfig">
        <Save :size="15" />
        <span>Save Configuration</span>
      </button>
    </footer>
  </div>
</template>
