<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'

import { addWallpaper } from '@/db/repositories/wallpaper.repository'

const emit = defineEmits<{
  uploaded: []
}>()

const fileInput = ref<HTMLInputElement>()
const isUploading = ref(false)

function triggerUpload() {
  fileInput.value?.click()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length === 0) return

  const invalidType = files.find(file => !file.type.startsWith('image/'))
  if (invalidType) {
    alert('请只上传图片文件')
    target.value = ''
    return
  }

  const oversized = files.find(file => file.size > 5 * 1024 * 1024)
  if (oversized) {
    alert('单张图片大小不能超过 5MB')
    target.value = ''
    return
  }

  isUploading.value = true

  try {
    const baseTime = Date.now()
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const imageData = await readFileAsDataUrl(file)
      await addWallpaper({
        id: `wallpaper-${baseTime}-${index}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        imageData,
        createdAt: baseTime + index,
        blur: 0,
        opacity: 85
      })
    }
    emit('uploaded')
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上传失败，请重试')
  } finally {
    isUploading.value = false
    target.value = ''
  }
}
</script>

<template>
  <button
    type="button"
    class="wallpaper-upload-button"
    :disabled="isUploading"
    :aria-label="isUploading ? '正在上传' : '上传壁纸'"
    @click="triggerUpload"
  >
    <Plus :size="20" :stroke-width="2.5" />
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleFileUpload"
    />
  </button>
</template>
