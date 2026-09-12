<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'

import { addWallpaper } from '@/db/repositories/wallpaper.repository'
import { looksLikeImageFile, normalizeImageFromFile } from '@/utils/imageNormalize'

const emit = defineEmits<{
  uploaded: []
}>()

const fileInput = ref<HTMLInputElement>()
const isUploading = ref(false)

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length === 0) return

  const invalid = files.find((file) => !looksLikeImageFile(file))
  if (invalid) {
    alert('请选择图片文件（JPG / PNG / WebP 等）')
    target.value = ''
    return
  }

  isUploading.value = true

  try {
    const baseTime = Date.now()
    let successCount = 0
    const failures: string[] = []

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      try {
        const imageData = await normalizeImageFromFile(file)
        await addWallpaper({
          id: `wallpaper-${baseTime}-${index}`,
          name: file.name.replace(/\.[^/.]+$/, '') || `wallpaper-${index + 1}`,
          imageData,
          createdAt: baseTime + index,
          blur: 0,
          opacity: 85,
        })
        successCount += 1
      } catch (error) {
        console.error('Normalize/upload failed:', file.name, error)
        failures.push(file.name)
      }
    }

    if (successCount > 0) {
      emit('uploaded')
    }

    if (failures.length > 0) {
      alert(
        `有 ${failures.length} 张未能导入（可能是 HEIC 等当前浏览器不支持的格式）。\n已成功 ${successCount} 张。\n失败：${failures.slice(0, 3).join('、')}${failures.length > 3 ? '…' : ''}`,
      )
    }
  } catch (error) {
    console.error('Upload failed:', error)
    alert(error instanceof Error ? error.message : '上传失败，请重试')
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
      accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff"
      multiple
      style="display: none"
      @change="handleFileUpload"
    />
  </button>
</template>
