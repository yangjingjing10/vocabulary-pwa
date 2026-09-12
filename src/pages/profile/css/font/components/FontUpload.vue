<script setup lang="ts">
import { ref } from 'vue'
import { Upload } from 'lucide-vue-next'

const emit = defineEmits<{
  upload: [file: File]
}>()

defineProps<{
  loading?: boolean
}>()

const fileInput = ref<HTMLInputElement>()

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  emit('upload', file)
  target.value = ''
}
</script>

<template>
  <section class="font-section">
    <h2 class="font-section__title">上传字体</h2>
    <p class="font-section__desc">支持 .ttf / .otf / .woff / .woff2，上传后立即全局应用</p>

    <button
      type="button"
      class="font-upload-zone"
      :disabled="loading"
      @click="triggerUpload"
    >
      <Upload :size="22" :stroke-width="1.8" />
      <span>{{ loading ? '加载中…' : '选择字体文件' }}</span>
      <input
        ref="fileInput"
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        class="font-upload-zone__input"
        @change="handleFileChange"
      />
    </button>
  </section>
</template>
