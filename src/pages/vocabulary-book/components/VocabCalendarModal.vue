<script setup lang="ts">
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Week {
  weekNum: number
  range: string
  wordCount: number
}

interface Props {
  show: boolean
  year: number
  month: number
  currentWeek: number
  weeks: Week[]
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  changeMonth: [delta: number]
  selectWeek: [weekNum: number]
  resetToCurrent: []
}>()
</script>

<template>
  <Transition name="vocab-modal">
    <div v-if="show" class="vocab-calendar-modal" @click.self="emit('close')">
      <div class="vocab-calendar">
        <!-- 头部 -->
        <div class="vocab-calendar__header">
          <div class="vocab-calendar__title">
            <Calendar :size="20" />
            <div>
              <h3>Switch Month & Week</h3>
              <p>Select month and week</p>
            </div>
          </div>
          <button type="button" @click="emit('close')">
            <X :size="16" />
          </button>
        </div>

        <!-- 月份导航 -->
        <div class="vocab-calendar__month-nav">
          <button type="button" @click="emit('changeMonth', -1)">
            <ChevronLeft :size="16" />
          </button>
          <span>{{ year }} / {{ month.toString().padStart(2, '0') }}</span>
          <button type="button" @click="emit('changeMonth', 1)">
            <ChevronRight :size="16" />
          </button>
        </div>

        <!-- 周列表 -->
        <div class="vocab-calendar__weeks">
          <button 
            v-for="w in weeks" 
            :key="w.weekNum" 
            type="button" 
            :class="{ 'is-current': w.weekNum === currentWeek }" 
            @click="emit('selectWeek', w.weekNum)"
          >
            <span class="vocab-calendar__week-num">Week {{ w.weekNum }}</span>
            <span class="vocab-calendar__word-count">{{ w.wordCount }} words</span>
            <span class="vocab-calendar__week-range">{{ w.range }}</span>
          </button>
        </div>

        <!-- 重置按钮 -->
        <button class="vocab-calendar__reset" type="button" @click="emit('resetToCurrent')">
          Back to current month
        </button>
      </div>
    </div>
  </Transition>
</template>
