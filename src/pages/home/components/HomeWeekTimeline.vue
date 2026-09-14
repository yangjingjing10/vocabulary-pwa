<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { addLocalDays, formatLocalDate, parseLocalDate, todayLocalDate } from '@/utils/localDate'

export interface TimelineDay {
  date: string
  dayNum: number
  weekday: string
  isToday: boolean
}

const props = defineProps<{
  modelValue?: string
  avatar?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [date: string]
}>()

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function toDateStr(d: Date) {
  return formatLocalDate(d)
}

function startOfWeekMonday(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addLocalDays(d, diff)
}

function buildWeek(anchor: Date): TimelineDay[] {
  const start = startOfWeekMonday(anchor)
  const todayStr = todayLocalDate()
  return Array.from({ length: 7 }, (_, i) => {
    const d = addLocalDays(start, i)
    const date = toDateStr(d)
    return {
      date,
      dayNum: d.getDate(),
      weekday: WEEKDAYS[i],
      isToday: date === todayStr,
    }
  })
}

const weekDays = ref<TimelineDay[]>(buildWeek(new Date()))

const selectedDate = computed({
  get: () => props.modelValue || todayLocalDate(),
  set: (value: string) => emit('update:modelValue', value),
})

const headerDateLabel = computed(() => {
  const target = weekDays.value.find((d) => d.date === selectedDate.value)
  const d = target ? parseLocalDate(target.date) : new Date()
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

const headerTitle = computed(() => {
  const target = weekDays.value.find((d) => d.date === selectedDate.value)
  if (target?.isToday) return 'Today'
  return target?.weekday ?? 'Day'
})

function selectDay(date: string) {
  selectedDate.value = date
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value) return
    const inWeek = weekDays.value.some((d) => d.date === value)
    if (!inWeek) {
      weekDays.value = buildWeek(parseLocalDate(value))
    }
  },
)
</script>

<template>
  <div class="home-week-timeline">
    <div class="home-week-timeline__header">
      <div class="home-week-timeline__heading">
        <p class="home-week-timeline__date">{{ headerDateLabel }}</p>
        <h2 class="home-week-timeline__title">{{ headerTitle }}</h2>
      </div>
      <img
        v-if="avatar"
        :src="avatar"
        class="home-week-timeline__avatar"
        alt="用户头像"
      />
      <div v-else class="home-week-timeline__avatar home-week-timeline__avatar--fallback" aria-hidden="true">
        U
      </div>
    </div>

    <div class="home-week-timeline__row" role="listbox" aria-label="本周日期">
      <button
        v-for="day in weekDays"
        :key="day.date"
        type="button"
        class="home-week-timeline__day"
        :class="{ 'is-active': day.date === selectedDate }"
        role="option"
        :aria-selected="day.date === selectedDate"
        @click="selectDay(day.date)"
      >
        <span class="home-week-timeline__num">{{ day.dayNum }}</span>
        <span class="home-week-timeline__weekday">{{ day.weekday }}</span>
        <span v-if="day.date === selectedDate" class="home-week-timeline__dot" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.home-week-timeline {
  width: 100%;
  background: transparent;
  padding: 4px 0 8px;
}

.home-week-timeline__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 14px;
}

.home-week-timeline__heading {
  min-width: 0;
}

.home-week-timeline__date {
  margin: 0 0 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--app-font-color-soft, #94a3b8);
}

.home-week-timeline__title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--app-font-color, #0f172a);
}

.home-week-timeline__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(241, 245, 249, 0.7);
}

.home-week-timeline__avatar--fallback {
  display: grid;
  place-items: center;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--app-font-color-muted, #64748b);
}

.home-week-timeline__row {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 4px;
}

.home-week-timeline__day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 64px;
  padding: 10px 0 12px;
  border: 1px solid transparent;
  border-radius: 50%;
  aspect-ratio: 1;
  max-width: 52px;
  margin: 0 auto;
  background: transparent;
  color: var(--app-font-color-soft, #94a3b8);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.18s ease;
}

.home-week-timeline__day:active {
  transform: scale(0.96);
}

.home-week-timeline__num {
  font-size: 0.9375rem;
  font-weight: 650;
  line-height: 1;
}

.home-week-timeline__weekday {
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1;
}

.home-week-timeline__dot {
  width: 4px;
  height: 4px;
  margin-top: 2px;
  border-radius: 50%;
  background: rgba(71, 85, 105, 0.55);
}

.home-week-timeline__day.is-active {
  background: rgba(255, 255, 255, 0.42);
  border-color: rgba(148, 163, 184, 0.35);
  color: var(--app-font-color, #334155);
  box-shadow: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.home-week-timeline__day.is-active .home-week-timeline__num {
  font-weight: 750;
}

.home-week-timeline__day.is-active .home-week-timeline__weekday {
  opacity: 0.85;
}
</style>
