<script setup lang="ts">
import { ref } from 'vue'
import { Link, Save } from 'lucide-vue-next'

import { addWallpaper } from '@/db/repositories/wallpaper.repository'
import { guessNameFromUrl, normalizeImageFromUrl } from '@/utils/imageNormalize'

const emit = defineEmits<{
  saved: []
}>()

const urlInput = ref('')
const previewDataUrl = ref('')
const previewError = ref('')
const isLoadingPreview = ref(false)
const isSaving = ref(false)

async function handlePreview() {
  const url = urlInput.value.trim()
  previewError.value = ''
  previewDataUrl.value = ''

  if (!url) {
    previewError.value = '请先输入壁纸链接'
    return
  }

  if (!/^https?:\/\//i.test(url)) {
    previewError.value = '请输入以 http:// 或 https:// 开头的图片链接'
    return
  }

  isLoadingPreview.value = true
  try {
    // 预览用规范后的图，顺便验证能否解码并过跨域
    previewDataUrl.value = await normalizeImageFromUrl(url)
  } catch (error) {
    console.error('Wallpaper URL preview failed:', error)
    previewDataUrl.value = ''
    previewError.value =
      error instanceof Error
        ? `${error.message}（若是跨域限制，请换可公开访问的直链图）`
        : '无法加载该链接'
  } finally {
    isLoadingPreview.value = false
  }
}

async function handleSave() {
  if (!previewDataUrl.value) {
    await handlePreview()
    if (!previewDataUrl.value) return
  }

  isSaving.value = true
  previewError.value = ''

  try {
    const url = urlInput.value.trim()
    await addWallpaper({
      id: `wallpaper-url-${Date.now()}`,
      name: guessNameFromUrl(url),
      imageData: previewDataUrl.value,
      createdAt: Date.now(),
      blur: 0,
      opacity: 85,
    })
    emit('saved')
  } catch (error) {
    console.error('Wallpaper URL save failed:', error)
    previewError.value =
      error instanceof Error
        ? `${error.message}（很多图床禁止跨域，可先下载到相册再本地上传）`
        : '保存失败'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="wallpaper-url-import">
    <h2 class="wallpaper-url-import__title">从链接添加</h2>
    <p class="wallpaper-url-import__desc">输入可公开访问的图片直链，预览后再保存</p>

    <div class="wallpaper-url-import__row">
      <input
        v-model="urlInput"
        class="wallpaper-url-import__input"
        type="url"
        placeholder="https://example.com/wallpaper.jpg"
        enterkeyhint="go"
        @keydown.enter.prevent="handlePreview"
      />
      <button
        class="wallpaper-url-import__btn"
        type="button"
        :disabled="isLoadingPreview || isSaving"
        @click="handlePreview"
      >
        <Link :size="16" />
        <span>{{ isLoadingPreview ? '加载中' : '预览' }}</span>
      </button>
    </div>

    <p v-if="previewError" class="wallpaper-url-import__error">{{ previewError }}</p>

    <div v-if="previewDataUrl" class="wallpaper-url-import__preview-wrap">
      <div
        class="wallpaper-url-import__preview"
        :style="{ backgroundImage: `url(${previewDataUrl})` }"
        role="img"
        aria-label="壁纸预览"
      />
      <button
        class="wallpaper-url-import__save"
        type="button"
        :disabled="isSaving"
        @click="handleSave"
      >
        <Save :size="16" />
        <span>{{ isSaving ? '保存中…' : '保存为壁纸' }}</span>
      </button>
    </div>
  </section>
</template>
