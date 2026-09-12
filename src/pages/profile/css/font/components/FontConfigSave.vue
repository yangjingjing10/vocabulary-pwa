<script setup lang="ts">
import { ref, watch } from 'vue'
import { Save, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  loading?: boolean
  canSave?: boolean
  isEditing?: boolean
  configName?: string
  currentFontFamily?: string
}>()

const emit = defineEmits<{
  save: [name: string]
  update: [name: string]
}>()

const nameInput = ref(props.configName || '')

watch(
  () => props.configName,
  (name) => {
    if (name != null) nameInput.value = name
  }
)

function handleSave() {
  emit('save', nameInput.value)
}

function handleUpdate() {
  emit('update', nameInput.value)
}
</script>

<template>
  <section class="font-section">
    <h2 class="font-section__title">保存 / 更新配置</h2>
    <p class="font-section__desc">
      <template v-if="isEditing">已选中下方配置，可直接更新；也可另存为新配置</template>
      <template v-else>为当前字体与颜色命名并永久保存</template>
      <template v-if="currentFontFamily">（当前：{{ currentFontFamily }}）</template>
    </p>

    <div class="font-url-row">
      <input
        v-model="nameInput"
        type="text"
        class="font-input"
        placeholder="例如：阅读模式 / 考试字体"
        maxlength="40"
        :disabled="loading"
        @keydown.enter="isEditing ? handleUpdate() : handleSave()"
      />
      <button
        v-if="isEditing"
        type="button"
        class="font-primary-btn"
        :disabled="loading || !canSave || !nameInput.trim()"
        @click="handleUpdate"
      >
        <RefreshCw :size="16" :stroke-width="2.5" />
        <span>更新</span>
      </button>
      <button
        type="button"
        class="font-primary-btn"
        :class="{ 'font-primary-btn--ghost': isEditing }"
        :disabled="loading || !canSave || !nameInput.trim()"
        @click="handleSave"
      >
        <Save :size="16" :stroke-width="2.5" />
        <span>{{ isEditing ? '另存' : '保存' }}</span>
      </button>
    </div>
  </section>
</template>
