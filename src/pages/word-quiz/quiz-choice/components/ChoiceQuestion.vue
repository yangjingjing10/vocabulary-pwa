<script setup lang="ts">
import type { ChoiceQuestion } from '../types/choiceQuiz'

interface Props {
  question: ChoiceQuestion
  selectedAnswer?: string
}

interface Emits {
  (e: 'select', answer: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const optionLabels = ['A', 'B', 'C', 'D']

function handleSelect(option: string) {
  emit('select', option)
}

function isSelected(option: string) {
  return props.selectedAnswer === option
}
</script>

<template>
  <div class="choice-question">
    <div class="choice-question__body">
      <p class="choice-question__text">{{ question.question }}</p>

      <div class="choice-question__options">
        <button
          v-for="(option, index) in question.options"
          :key="index"
          class="choice-option"
          :class="{ 'is-selected': isSelected(option) }"
          type="button"
          @click="handleSelect(option)"
        >
          <span class="choice-option__label">{{ optionLabels[index] }}</span>
          <span class="choice-option__text">{{ option }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
