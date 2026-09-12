<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

defineProps<{
  show: boolean
  dateLabel: string
  wordCount: number
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()
</script>

<template>
  <Transition name="vocab-modal">
    <div
      v-if="show"
      class="day-delete-confirm-overlay"
      @click.self="emit('close')"
    >
      <div
        class="day-delete-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-delete-confirm-title"
      >
        <div class="day-delete-confirm__icon">
          <Trash2 :size="22" :stroke-width="2.2" />
        </div>
        <div class="day-delete-confirm__badge">删除确认</div>
        <h3 id="day-delete-confirm-title" class="day-delete-confirm__title">
          删除 {{ dateLabel }} 的单词卡？
        </h3>
        <p class="day-delete-confirm__desc">
          将删除该日的 {{ wordCount }} 个单词，以及当天相关的文章与练习记录。此操作不可撤销。
        </p>

        <div class="day-delete-confirm__actions">
          <button
            type="button"
            class="day-delete-confirm__btn day-delete-confirm__btn--ghost"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="day-delete-confirm__btn day-delete-confirm__btn--danger"
            @click="emit('confirm')"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
