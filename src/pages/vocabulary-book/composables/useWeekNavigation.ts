import { ref, computed } from 'vue'

/**
 * 周导航逻辑
 * 管理年月周的切换和计算
 */
export function useWeekNavigation() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const selectYear = ref(currentYear)
  const selectMonth = ref(currentMonth)
  const currentWeekNum = ref(1)

  // 按当月日期估算当前周
  function getCurrentWeekNumber(): number {
    const today = new Date()
    const currentDay = today.getDate()

    if (currentDay <= 7) return 1
    if (currentDay <= 14) return 2
    if (currentDay <= 21) return 3
    return 4
  }

  // 初始化到当前周
  async function initializeToCurrentWeek() {
    currentWeekNum.value = getCurrentWeekNumber()
    selectYear.value = currentYear
    selectMonth.value = currentMonth
  }

  // 周标签显示
  const currentWeekLabel = computed(() => 
    `${selectYear.value}/${selectMonth.value.toString().padStart(2, '0')} Week ${currentWeekNum.value}`
  )

  // 月份周列表
  const monthWeeks = computed(() => {
    return [
      { weekNum: 1, range: `${selectMonth.value.toString().padStart(2, '0')}/01 - ${selectMonth.value.toString().padStart(2, '0')}/07`, wordCount: 0 },
      { weekNum: 2, range: `${selectMonth.value.toString().padStart(2, '0')}/08 - ${selectMonth.value.toString().padStart(2, '0')}/14`, wordCount: 0 },
      { weekNum: 3, range: `${selectMonth.value.toString().padStart(2, '0')}/15 - ${selectMonth.value.toString().padStart(2, '0')}/21`, wordCount: 0 },
      { weekNum: 4, range: `${selectMonth.value.toString().padStart(2, '0')}/22 - ${selectMonth.value.toString().padStart(2, '0')}/28`, wordCount: 0 }
    ]
  })

  // 获取周的起始日期
  function getWeekStartDate(year: number, month: number, weekNum: number): Date {
    const startDay = (weekNum - 1) * 7 + 1
    return new Date(year, month - 1, startDay)
  }

  // 上一周
  function prevWeek() {
    if (currentWeekNum.value > 1) {
      currentWeekNum.value--
    }
  }

  // 下一周
  function nextWeek() {
    if (currentWeekNum.value < 4) {
      currentWeekNum.value++
    }
  }

  // 切换月份
  function changeMonth(delta: number) {
    selectMonth.value += delta
    if (selectMonth.value > 12) {
      selectMonth.value = 1
      selectYear.value++
    } else if (selectMonth.value < 1) {
      selectMonth.value = 12
      selectYear.value--
    }
    currentWeekNum.value = 1
  }

  // 选择指定周
  function selectWeek(weekNum: number) {
    currentWeekNum.value = weekNum
  }

  // 重置到当前周
  async function resetToCurrentWeek() {
    selectYear.value = currentYear
    selectMonth.value = currentMonth
    currentWeekNum.value = await getCurrentWeekNumber()
  }

  return {
    selectYear,
    selectMonth,
    currentWeekNum,
    currentWeekLabel,
    monthWeeks,
    initializeToCurrentWeek,
    getWeekStartDate,
    prevWeek,
    nextWeek,
    changeMonth,
    selectWeek,
    resetToCurrentWeek
  }
}
