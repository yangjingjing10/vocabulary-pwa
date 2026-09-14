<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  modelValue: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: []
}>()

const editorRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

function syncFromDom() {
  const text = editorRef.value?.innerText ?? ''
  emit('update:modelValue', text)
}

function setEditorText(text: string) {
  if (!editorRef.value) return
  if (editorRef.value.innerText !== text) {
    editorRef.value.innerText = text
  }
}

async function focusEditor() {
  await nextTick()
  const el = editorRef.value
  if (!el) return
  el.focus()
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(false)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    syncFromDom()
    emit('save')
  }
}

function onDocPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!wrapperRef.value || !target) return
  if (!wrapperRef.value.contains(target)) {
    syncFromDom()
    emit('save')
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (document.activeElement !== editorRef.value) {
      setEditorText(value)
    }
  }
)

onMounted(async () => {
  setEditorText(props.modelValue)
  document.addEventListener('pointerdown', onDocPointerDown)
  if (props.autofocus) {
    await focusEditor()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
})

defineExpose({ focusEditor })
</script>

<template>
  <div ref="wrapperRef" class="translation-bubble">
    <div
      ref="editorRef"
      class="translation-bubble__input"
      contenteditable="true"
      role="textbox"
      data-placeholder="在此输入你的翻译，按 Enter 保存..."
      @input="syncFromDom"
      @keydown="onKeydown"
    />
    <span class="translation-bubble__hint">↵ Enter 保存</span>
  </div>
</template>

<style scoped>
.translation-bubble {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 14px 18px;
  border-radius: 16px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.translation-bubble:focus-within {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.03);
}

.translation-bubble__input {
  flex: 1;
  min-height: 24px;
  max-height: 200px;
  overflow-y: auto;
  outline: none;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--app-font-color, #1d1d1f);
  word-break: break-word;
  white-space: pre-wrap;
}

.translation-bubble__input:empty::before {
  content: attr(data-placeholder);
  color: var(--app-font-color-soft, #c7c7cc);
  pointer-events: none;
}

.translation-bubble__input::-webkit-scrollbar {
  width: 4px;
}

.translation-bubble__input::-webkit-scrollbar-thumb {
  background: #d1d1d6;
  border-radius: 4px;
}

.translation-bubble__hint {
  margin-left: 12px;
  align-self: flex-end;
  font-size: 0.6875rem;
  color: var(--app-font-color-soft, #c7c7cc);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.translation-bubble:focus-within .translation-bubble__hint {
  opacity: 1;
}
</style>
