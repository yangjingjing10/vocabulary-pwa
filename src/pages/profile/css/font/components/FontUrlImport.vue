<script setup lang="ts">
import { ref } from 'vue'
import { Link } from 'lucide-vue-next'

const emit = defineEmits<{
  import: [url: string]
}>()

defineProps<{
  loading?: boolean
}>()

const urlInput = ref('')

function handleImport() {
  emit('import', urlInput.value)
}
</script>

<template>
  <section class="font-section">
    <h2 class="font-section__title">字体链接</h2>
    <p class="font-section__desc">粘贴字体文件 URL，一键加载并设为全局字体</p>

    <div class="font-url-row">
      <input
        v-model="urlInput"
        type="url"
        class="font-input"
        placeholder="https://example.com/font.ttf"
        :disabled="loading"
        @keydown.enter="handleImport"
      />
      <button
        type="button"
        class="font-primary-btn"
        :disabled="loading || !urlInput.trim()"
        @click="handleImport"
      >
        <Link :size="16" :stroke-width="2.5" />
        <span>加载</span>
      </button>
    </div>
  </section>
</template>
