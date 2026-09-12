<script setup lang="ts">
import type { FontAsset } from '../types/font'

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
    <h2 class="font-section__title">已上传字体</h2>
    <p class="font-section__desc">从下拉列表选择曾经上传或导入的字体</p>

    <select
      class="font-select"
      :value="selectedAssetId || ''"
      :disabled="loading || assets.length === 0"
      @change="onChange"
    >
      <option value="" disabled>
        {{ assets.length === 0 ? '暂无已上传字体' : '选择字体…' }}
      </option>
      <option v-for="asset in assets" :key="asset.id" :value="asset.id">
        {{ asset.name }}（{{ asset.source === 'file' ? '本地' : '链接' }}）
      </option>
    </select>
  </section>
</template>
