<script setup lang="ts">
import { ChevronLeft, RotateCcw } from 'lucide-vue-next'

import { useFontSetting } from './composables/useFontSetting'
import FontPreview from './components/FontPreview.vue'
import FontLibrarySelect from './components/FontLibrarySelect.vue'
import FontUpload from './components/FontUpload.vue'
import FontUrlImport from './components/FontUrlImport.vue'
import FontColorSetting from './components/FontColorSetting.vue'
import FontConfigList from './components/FontConfigList.vue'
import FontConfigSave from './components/FontConfigSave.vue'

import '@/styles/pages/profile/css-pages.css'

const emit = defineEmits<{
  back: []
}>()

const {
  configs,
  fontAssets,
  activeConfigId,
  editingConfigId,
  editingConfigName,
  isEditingExisting,
  canSave,
  draft,
  loading,
  errorMessage,
  successMessage,
  uploadFontFile,
  importFontFromUrl,
  selectFontAsset,
  setFontColor,
  saveNamedConfig,
  updateExistingConfig,
  applyConfig,
  removeConfig,
  resetToDefault
} = useFontSetting()

async function handleFontColor(value: string) {
  await setFontColor(value)
}
</script>

<template>
  <div class="font-page">
    <header class="font-page__header">
      <button class="font-page__back" type="button" aria-label="返回" @click="emit('back')">
        <ChevronLeft :size="20" :stroke-width="2.5" />
      </button>
      <h1>字体</h1>
      <button
        type="button"
        class="font-page__reset"
        title="恢复默认"
        @click="resetToDefault"
      >
        <RotateCcw :size="18" :stroke-width="2" />
      </button>
    </header>

    <main class="font-page__content">
      <div v-if="errorMessage" class="font-toast font-toast--error">{{ errorMessage }}</div>
      <div v-if="successMessage" class="font-toast font-toast--success">{{ successMessage }}</div>

      <FontPreview
        :font-family="draft.fontFamily"
        :color="draft.color"
      />
      <FontLibrarySelect
        :assets="fontAssets"
        :selected-asset-id="draft.fontAssetId"
        :loading="loading"
        @select="selectFontAsset"
      />
      <FontUpload :loading="loading" @upload="uploadFontFile" />
      <FontUrlImport :loading="loading" @import="importFontFromUrl" />
      <FontColorSetting :model-value="draft.color" @update:model-value="handleFontColor" />
      <FontConfigSave
        :loading="loading"
        :can-save="canSave"
        :is-editing="isEditingExisting"
        :config-name="editingConfigName"
        :current-font-family="draft.fontFamily"
        @save="saveNamedConfig"
        @update="updateExistingConfig"
      />
      <FontConfigList
        :configs="configs"
        :active-config-id="activeConfigId || editingConfigId"
        @apply="applyConfig"
        @remove="removeConfig"
      />
    </main>
  </div>
</template>
