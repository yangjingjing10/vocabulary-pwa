<script setup lang="ts">
import { SYSTEM_FONT_ASSET_ID, type FontAsset } from '../types/font'

defineProps<{
  assets: FontAsset[]
  selectedAssetId?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [assetId: string]
}>()

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  emit('select', value)
}
</script>

<template>
  <section class="font-section font-section--compact">
    <h2 class="font-section__title">选择字体</h2>
    <p class="font-section__desc">可随时切回手机系统默认字体，或选择已上传的字体</p>

    <select
      class="font-select"
      :value="selectedAssetId || SYSTEM_FONT_ASSET_ID"
      :disabled="loading"
      @change="onChange"
    >
      <option :value="SYSTEM_FONT_ASSET_ID">系统默认字体</option>
      <option v-for="asset in assets" :key="asset.id" :value="asset.id">
        {{ asset.name }}（{{ asset.source === 'file' ? '本地' : '链接' }}）
      </option>
    </select>
  </section>
</template>
