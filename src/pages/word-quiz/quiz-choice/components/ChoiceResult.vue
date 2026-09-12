<script setup lang="ts">
import { CheckCircle2, XCircle, RotateCcw, ArrowLeft } from 'lucide-vue-next'
import type { ChoiceQuizResult } from '../types/choiceQuiz'

interface Props {
  result: ChoiceQuizResult
}

interface Emits {
  (e: 'retry'): void
  (e: 'back'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="choice-result">
    <div class="choice-result__header">
      <h2 class="choice-result__title">选择题练习完成</h2>

      <div class="choice-result__summary">
        <div class="choice-result__stat">
          <div class="choice-result__stat-value">{{ result.accuracy }}%</div>
          <div class="choice-result__stat-label">准确率</div>
        </div>
        <div class="choice-result__stat">
          <div class="choice-result__stat-value choice-result__stat-value--correct">
            {{ result.correct }}
          </div>
          <div class="choice-result__stat-label">答对</div>
        </div>
        <div class="choice-result__stat">
          <div class="choice-result__stat-value choice-result__stat-value--wrong">
            {{ result.wrong }}
          </div>
          <div class="choice-result__stat-label">答错</div>
        </div>
      </div>
    </div>

    <div class="choice-result__details">
      <h3 class="choice-result__details-title">详细结果</h3>

      <div class="choice-result__list">
        <div
          v-for="(detail, index) in result.details"
          :key="detail.questionId"
          class="choice-result__item"
          :class="{ 'is-correct': detail.isCorrect, 'is-wrong': !detail.isCorrect }"
        >
          <div class="choice-result__item-header">
            <div class="choice-result__item-icon">
              <CheckCircle2 v-if="detail.isCorrect" :size="20" />
              <XCircle v-else :size="20" />
            </div>
            <div class="choice-result__item-info">
              <div class="choice-result__item-number">第 {{ index + 1 }} 题</div>
              <div class="choice-result__item-word">{{ detail.word }}</div>
            </div>
          </div>

          <div class="choice-result__item-body">
            <p class="choice-result__item-question">{{ detail.question }}</p>

            <div class="choice-result__item-answers">
              <div class="choice-result__answer">
                <span class="choice-result__answer-label">你的答案：</span>
                <span
                  class="choice-result__answer-value"
                  :class="{ 'is-correct': detail.isCorrect, 'is-wrong': !detail.isCorrect }"
                >
                  {{ detail.userAnswer || '未作答' }}
                </span>
              </div>

              <div v-if="!detail.isCorrect" class="choice-result__answer">
                <span class="choice-result__answer-label">正确答案：</span>
                <span class="choice-result__answer-value is-correct">
                  {{ detail.correctAnswer }}
                </span>
              </div>
            </div>

            <p v-if="detail.explanation" class="choice-result__item-explanation">
              <strong>解析：</strong>{{ detail.explanation }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="choice-result__actions">
      <button class="choice-result__button choice-result__button--secondary" type="button" @click="emit('back')">
        <ArrowLeft :size="18" />
        <span>返回</span>
      </button>
      <button class="choice-result__button choice-result__button--primary" type="button" @click="emit('retry')">
        <RotateCcw :size="18" />
        <span>再练一次</span>
      </button>
    </div>
  </div>
</template>
