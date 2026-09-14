<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { getParagraphTranslations, saveParagraphTranslation } from '@/db/repositories/paragraph-translation.repository'
import { reviseParagraphTranslations } from '@/services/paragraph-revision.service'
import InlineTranslationToggle from './InlineTranslationToggle.vue'
import TranslationBubble from './TranslationBubble.vue'
import TranslationDiff from './TranslationDiff.vue'
import ParagraphDrawingCanvas from './drawing/ParagraphDrawingCanvas.vue'
import { provideArticleDrawing } from '../composables/useArticleDrawingContext'
import type { DrawingTool } from '../types/drawing'

interface Props {
  articleId: string
  content: string
  drawingActive?: boolean
  drawingTool?: DrawingTool
  drawingColor?: string
  drawingWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  drawingActive: false,
  drawingTool: 'pan',
  drawingColor: '#ef4444',
  drawingWidth: 4
})

const emit = defineEmits<{
  wordClick: [event: MouseEvent]
}>()

provideArticleDrawing(props.articleId)

interface ParagraphData {
  index: number
  htmlContent: string
  textContent: string
  isExpanded: boolean
  isEditing: boolean
  userTranslation: string
  aiRevision: string
  /** 采纳后保留的修改前文本，用于继续渲染 Diff */
  diffBase: string
}

const paragraphs = ref<ParagraphData[]>([])
const isRevising = ref(false)
const revisionError = ref('')

const translatedParagraphs = computed(() =>
  paragraphs.value.filter(p => p.userTranslation.trim() !== '')
)

const translatedCount = computed(() => translatedParagraphs.value.length)

const hasAnyAiRevision = computed(() =>
  paragraphs.value.some(p => p.aiRevision.trim() !== '')
)

onMounted(async () => {
  parseParagraphs()
  await loadSavedTranslations()
})

function parseParagraphs() {
  const div = document.createElement('div')
  div.innerHTML = props.content

  const pTags = div.querySelectorAll('p')

  paragraphs.value = Array.from(pTags).map((p, index) => ({
    index,
    htmlContent: p.innerHTML,
    textContent: p.textContent || '',
    isExpanded: false,
    isEditing: false,
    userTranslation: '',
    aiRevision: '',
    diffBase: ''
  }))
}

async function loadSavedTranslations() {
  try {
    const saved = await getParagraphTranslations(props.articleId)

    saved.forEach(item => {
      const para = paragraphs.value[item.paragraphIndex]
      if (para) {
        para.userTranslation = item.userTranslation
        para.aiRevision = item.aiRevisedTranslation || ''
        para.diffBase = item.diffBaseTranslation || ''
        if (item.userTranslation?.trim()) {
          para.isExpanded = true
        }
      }
    })
  } catch (error) {
    console.error('Failed to load saved translations:', error)
  }
}

function toggleExpand(index: number) {
  const para = paragraphs.value[index]

  if (para.isEditing) {
    void commitSave(index)
    return
  }

  if (!para.userTranslation.trim()) {
    para.isExpanded = true
    para.isEditing = true
    return
  }

  para.isExpanded = !para.isExpanded
}

function startEdit(index: number) {
  const para = paragraphs.value[index]
  para.isExpanded = true
  para.isEditing = true
  // 进入编辑时收起批改痕迹，避免和气泡叠在一起
  para.diffBase = ''
}

async function persistParagraph(para: ParagraphData) {
  await saveParagraphTranslation({
    articleId: props.articleId,
    paragraphIndex: para.index,
    userTranslation: para.userTranslation,
    aiRevisedTranslation: para.aiRevision || undefined,
    diffBaseTranslation: para.diffBase || undefined,
    updatedAt: Date.now()
  })
}

async function commitSave(index: number) {
  const para = paragraphs.value[index]
  const text = para.userTranslation.trim()

  if (!text) {
    para.userTranslation = ''
    para.aiRevision = ''
    para.diffBase = ''
    para.isEditing = false
    para.isExpanded = false
    return
  }

  try {
    para.userTranslation = text
    para.diffBase = ''
    await persistParagraph(para)
    para.isEditing = false
    para.isExpanded = true
  } catch (error) {
    console.error('Failed to save translation:', error)
    alert('保存失败')
  }
}

/** 对已翻译段落调用 AI 润色；未翻译的跳过 */
async function requestAIRevision() {
  if (translatedCount.value === 0 || isRevising.value) return

  isRevising.value = true
  revisionError.value = ''

  try {
    const inputs = translatedParagraphs.value.map((para) => ({
      index: para.index,
      english: para.textContent,
      userTranslation: para.userTranslation.trim(),
    }))

    const results = await reviseParagraphTranslations(inputs)
    if (results.length === 0) {
      throw new Error('AI 未返回有效修改')
    }

    const byIndex = new Map(results.map((item) => [item.index, item.revised]))

    for (const para of translatedParagraphs.value) {
      const revised = byIndex.get(para.index)?.trim()
      if (!revised) continue
      // 与原文完全相同则不展示无意义 Diff
      if (revised === para.userTranslation.trim()) continue

      para.diffBase = ''
      para.aiRevision = revised
      para.isExpanded = true
      para.isEditing = false
      await persistParagraph(para)
    }

    const applied = translatedParagraphs.value.some((para) => para.aiRevision.trim())
    if (!applied) {
      revisionError.value = 'AI 未提出实质修改'
    }
  } catch (error) {
    console.error('Failed to revise translations:', error)
    revisionError.value = error instanceof Error ? error.message : '生成建议失败'
  } finally {
    isRevising.value = false
  }
}

async function acceptAiRevision(index: number) {
  const para = paragraphs.value[index]
  if (!para.aiRevision.trim()) return

  // 保留修改前文本，继续用 Diff 渲染「老师批改」痕迹
  para.diffBase = para.userTranslation
  para.userTranslation = para.aiRevision.trim()
  para.aiRevision = ''
  para.isExpanded = true
  para.isEditing = false

  try {
    await persistParagraph(para)
  } catch (error) {
    console.error('Failed to accept AI revision:', error)
    alert('采纳失败')
  }
}

async function dismissAiRevision(index: number) {
  const para = paragraphs.value[index]
  // 待采纳：丢掉建议；已采纳：只收起标记，保留最终译文
  para.aiRevision = ''
  para.diffBase = ''

  try {
    await persistParagraph(para)
  } catch (error) {
    console.error('Failed to dismiss AI revision:', error)
  }
}

function handleWordClick(event: MouseEvent) {
  emit('wordClick', event)
}
</script>

<template>
  <div class="paragraph-translation">
    <div v-if="translatedCount > 0" class="ai-revision-bar">
      <button
        type="button"
        class="ai-revision-bar__btn"
        :disabled="isRevising"
        @click="requestAIRevision"
      >
        <Sparkles :size="15" :class="{ 'is-spinning': isRevising }" />
        <span v-if="isRevising">正在修改已译段落…</span>
        <span v-else>
          {{ hasAnyAiRevision ? '重新修改已译段落' : '让 AI 修改已译段落' }}
          （{{ translatedCount }}）
        </span>
      </button>
      <span class="ai-revision-bar__hint">未翻译段落会跳过</span>
    </div>
    <p v-if="revisionError" class="ai-revision-bar__error">{{ revisionError }}</p>

    <div
      v-for="para in paragraphs"
      :key="para.index"
      class="paragraph-item"
    >
      <div class="paragraph-text">
        <span
          class="paragraph-text__body"
          v-html="para.htmlContent"
          @click="handleWordClick"
        />
        <InlineTranslationToggle
          :expanded="para.isEditing || (para.isExpanded && !!para.userTranslation.trim())"
          @click="toggleExpand(para.index)"
        />
        <ParagraphDrawingCanvas
          :paragraph-index="para.index"
          :is-session-active="drawingActive"
          :tool="drawingTool"
          :color="drawingColor"
          :width="drawingWidth"
        />
      </div>

      <div
        v-if="para.isEditing"
        class="paragraph-translation-panel"
      >
        <TranslationBubble
          v-model="para.userTranslation"
          :autofocus="true"
          @save="commitSave(para.index)"
        />
      </div>

      <template v-else-if="para.isExpanded && para.userTranslation.trim()">
        <!-- 待采纳：原文 vs AI；已采纳：仍用 Diff 保留批改痕迹 -->
        <TranslationDiff
          v-if="para.aiRevision.trim()"
          mode="pending"
          :before="para.userTranslation"
          :after="para.aiRevision"
          @accept="acceptAiRevision(para.index)"
          @dismiss="dismissAiRevision(para.index)"
        />
        <TranslationDiff
          v-else-if="para.diffBase.trim()"
          mode="accepted"
          :before="para.diffBase"
          :after="para.userTranslation"
          @dismiss="dismissAiRevision(para.index)"
        />
        <button
          v-else
          type="button"
          class="saved-translation"
          @click="startEdit(para.index)"
        >
          {{ para.userTranslation }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.paragraph-translation {
  margin-bottom: 8px;
}

.ai-revision-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 18px;
}

.ai-revision-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-font-color-muted, #8e8e93);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease;
}

.ai-revision-bar__btn:hover:not(:disabled) {
  color: var(--app-font-color, #1d1d1f);
}

.ai-revision-bar__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ai-revision-bar__btn .is-spinning {
  animation: spin 1s linear infinite;
}

.ai-revision-bar__hint {
  font-size: 0.6875rem;
  color: var(--app-font-color-soft, #d2d2d7);
}

.ai-revision-bar__error {
  margin: -10px 0 14px;
  color: #b91c1c;
  font-size: 0.75rem;
  line-height: 1.4;
}

.paragraph-item {
  margin-bottom: 22px;
}

.paragraph-item:last-child {
  margin-bottom: 0;
}

.paragraph-text {
  position: relative;
  color: var(--app-font-color, #1d1d1f);
  font-size: clamp(1.0625rem, 1.6vw, 1.3125rem);
  line-height: 1.8;
  letter-spacing: 0.1px;
}

.paragraph-text__body {
  display: inline;
}

.paragraph-text__body :deep(mark) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--app-font-color, #1d1d1f) 35%, transparent);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
  cursor: pointer;
}

.paragraph-text__body :deep(mark:hover) {
  text-decoration-color: color-mix(in srgb, var(--app-font-color, #1d1d1f) 70%, transparent);
}

.paragraph-translation-panel {
  margin-top: 12px;
  animation: fade-slide-in 0.28s ease;
}

.saved-translation {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 0 0 0 12px;
  border: 0;
  border-left: 2px solid #e5e5ea;
  background: transparent;
  color: var(--app-font-color-muted, #86868b);
  font-size: 1rem;
  font-style: italic;
  line-height: 1.6;
  text-align: left;
  cursor: pointer;
  animation: fade-slide-in 0.28s ease;
}

.saved-translation:hover {
  color: var(--app-font-color-muted, #6e6e73);
  border-left-color: var(--app-font-color-soft, #c7c7cc);
}

@keyframes fade-slide-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
