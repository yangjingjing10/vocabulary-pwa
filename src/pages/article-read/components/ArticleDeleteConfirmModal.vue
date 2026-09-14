<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()
</script>

<template>
  <Transition name="definition-modal">
    <div
      v-if="show"
      class="article-delete-confirm-overlay"
      @click.self="emit('close')"
    >
      <div
        class="article-delete-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-delete-confirm-title"
      >
        <div class="article-delete-confirm__icon">
          <Trash2 :size="22" :stroke-width="2.2" />
        </div>
        <div class="article-delete-confirm__badge">删除确认</div>
        <h3 id="article-delete-confirm-title" class="article-delete-confirm__title">
          删除这篇文章？
        </h3>
        <p class="article-delete-confirm__desc">
          「{{ title }}」及其批注、翻译记录将一并删除，此操作不可撤销。
        </p>
        <div class="article-delete-confirm__actions">
          <button
            type="button"
            class="article-delete-confirm__btn article-delete-confirm__btn--ghost"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="article-delete-confirm__btn article-delete-confirm__btn--danger"
            @click="emit('confirm')"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
