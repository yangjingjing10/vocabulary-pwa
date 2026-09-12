<script setup lang="ts">
import { ref, computed } from 'vue'
import { Pencil, Trash2, X } from 'lucide-vue-next'

import { deleteWallpapers } from '@/db/repositories/wallpaper.repository'

const emit = defineEmits<{
  deleted: []
  editModeChange: [isEditing: boolean]
}>()

const isEditing = ref(false)

const props = defineProps<{
  wallpapers: Array<{ id: string; name: string; imageData: string }>
  selectedIds: Set<string>
}>()

const hasSelection = computed(() => props.selectedIds.size > 0)

function toggleEdit() {
  isEditing.value = !isEditing.value
  emit('editModeChange', isEditing.value)
}

async function handleDelete() {
  if (props.selectedIds.size === 0) return

  const confirmed = window.confirm(`确定要删除选中的 ${props.selectedIds.size} 张壁纸吗？`)
  if (!confirmed) return

  try {
    await deleteWallpapers(Array.from(props.selectedIds))
    isEditing.value = false
    emit('editModeChange', false)
    emit('deleted')
  } catch (error) {
    console.error('Delete failed:', error)
    alert('删除失败，请重试')
  }
}
</script>

<template>
  <div class="wallpaper-edit-toolbar">
    <button
      v-if="!isEditing"
      type="button"
      class="wallpaper-edit-button"
      :disabled="wallpapers.length === 0"
      @click="toggleEdit"
    >
      <Pencil :size="18" :stroke-width="2" />
    </button>

    <template v-else>
      <button
        type="button"
        class="wallpaper-action-button wallpaper-action-button--delete"
        :disabled="!hasSelection"
        @click="handleDelete"
      >
        <Trash2 :size="18" :stroke-width="2" />
        <span v-if="hasSelection">删除 ({{ selectedIds.size }})</span>
        <span v-else>删除</span>
      </button>
      <button
        type="button"
        class="wallpaper-action-button wallpaper-action-button--cancel"
        @click="toggleEdit"
      >
        <X :size="18" :stroke-width="2" />
      </button>
    </template>
  </div>
</template>
