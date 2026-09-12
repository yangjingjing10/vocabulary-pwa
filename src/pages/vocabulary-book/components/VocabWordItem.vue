<script setup lang="ts">
import { Volume2 } from 'lucide-vue-next'
import type { Word } from '../composables/useVocabularyData'
import { speakText } from '@/services/speech.service'

interface Props {
  word: Word
}

defineProps<Props>()

const emit = defineEmits<{
  playAudio: [word: string]
}>()

function playAudio(word: string) {
  speakText(word)
  emit('playAudio', word)
}
</script>

<template>
  <div class="vocab-word">
    <div class="vocab-word__content">
      <div class="vocab-word__main">
        <strong>{{ word.word }}</strong>
        <span class="vocab-word__phonetic">{{ word.phonetic }}</span>
      </div>
      <p><span class="vocab-word__pos">{{ word.pos }}</span>{{ word.translation }}</p>
    </div>
    <button class="vocab-word__audio" type="button" @click="playAudio(word.word)">
      <Volume2 :size="14" />
    </button>
  </div>
</template>
