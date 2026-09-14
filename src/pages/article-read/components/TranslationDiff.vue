<script setup lang="ts">
import { computed } from 'vue'
import { diffTexts } from '../utils/textDiff'

const props = defineProps<{
  before: string
  after: string
  /** pending: 待采纳；accepted: 已采纳但仍保留批改痕迹 */
  mode?: 'pending' | 'accepted'
}>()

defineEmits<{
  accept: []
  dismiss: []
}>()

const parts = computed(() => diffTexts(props.before, props.after))
const isAccepted = computed(() => props.mode === 'accepted')
</script>

<template>
  <div class="translation-diff" :class="{ 'is-accepted': isAccepted }">
    <p class="translation-diff__body" :title="isAccepted ? '已采纳，仍保留修改痕迹' : '在你的译文上直接标出修改'">
      <span
        v-for="(part, i) in parts"
        :key="i"
        class="diff-part"
        :class="`diff-part--${part.type}`"
      >{{ part.text }}</span>
    </p>
    <div class="translation-diff__actions">
      <template v-if="!isAccepted">
        <button type="button" class="diff-action diff-action--accept" @click="$emit('accept')">
          采纳
        </button>
        <span class="diff-action-sep">·</span>
        <button type="button" class="diff-action diff-action--dismiss" @click="$emit('dismiss')">
          忽略
        </button>
      </template>
      <template v-else>
        <button type="button" class="diff-action diff-action--dismiss" @click="$emit('dismiss')">
          收起标记
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.translation-diff {
  margin-top: 10px;
  padding-left: 12px;
  border-left: 2px solid #d2d2d7;
  animation: fade-slide-in 0.28s ease;
}

.translation-diff__body {
  margin: 0;
  font-size: clamp(0.9375rem, 1.35vw, 1.125rem);
  line-height: 1.65;
  color: var(--app-font-color-muted, #86868b);
  word-break: break-word;
}

.diff-part--equal {
  color: var(--app-font-color-muted, #86868b);
}

.diff-part--insert {
  color: var(--app-font-color, #1d1d1f);
  background: rgba(52, 199, 89, 0.14);
  border-radius: 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.diff-part--delete {
  color: #b0b0b5;
  text-decoration: line-through;
  text-decoration-color: rgba(255, 59, 48, 0.5);
  text-decoration-thickness: 1px;
}

.translation-diff__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.diff-action {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease;
}

.diff-action--accept {
  color: var(--app-font-color-muted, #6e6e73);
}

.diff-action--accept:hover {
  color: var(--app-font-color, #1d1d1f);
}

.diff-action--dismiss {
  color: var(--app-font-color-soft, #c7c7cc);
}

.diff-action--dismiss:hover {
  color: var(--app-font-color-muted, #8e8e93);
}

.diff-action-sep {
  color: var(--app-font-color-soft, #d2d2d7);
  font-size: 0.75rem;
  line-height: 1;
}

@keyframes fade-slide-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
