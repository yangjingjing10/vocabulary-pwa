<script setup lang="ts">
import { BookOpen, Zap } from 'lucide-vue-next'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  generateArticle: []
  startQuiz: []
  close: []
}>()
</script>

<template>
  <Transition name="vocab-modal">
    <div
      v-if="show"
      class="quiz-start-confirm-overlay"
      @click.self="emit('close')"
    >
      <div class="quiz-start-confirm" role="dialog" aria-modal="true" aria-labelledby="quiz-start-confirm-title">
        <div class="quiz-start-confirm__badge">提示</div>
        <h3 id="quiz-start-confirm-title" class="quiz-start-confirm__title">
          还没有生成文章哦
        </h3>
        <p class="quiz-start-confirm__desc">
          建议先通过文章理解单词语境，再开始测试，记忆会更牢固。
        </p>

        <div class="quiz-start-confirm__actions">
          <button
            type="button"
            class="quiz-start-confirm__btn quiz-start-confirm__btn--primary"
            @click="emit('generateArticle')"
          >
            <BookOpen :size="16" />
            <span>
              <strong>先生成文章再测试</strong>
              <small>推荐 · 帮助理解单词</small>
            </span>
          </button>

          <button
            type="button"
            class="quiz-start-confirm__btn quiz-start-confirm__btn--secondary"
            @click="emit('startQuiz')"
          >
            <Zap :size="16" />
            <span>
              <strong>直接开始测试</strong>
              <small>快速模式</small>
            </span>
          </button>
        </div>

        <p class="quiz-start-confirm__tip">通过文章学习单词，记忆更牢固</p>
      </div>
    </div>
  </Transition>
</template>
