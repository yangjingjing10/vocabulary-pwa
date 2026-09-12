<script setup lang="ts">
interface ProfileStat {
  label: string
  value: string | number
  tone: 'neutral' | 'primary' | 'success'
}

defineProps<{
  stats: ProfileStat[]
}>()
</script>

<template>
  <section class="profile-stats" aria-label="学习统计">
    <div v-for="stat in stats" :key="stat.label" class="profile-stat" :class="`profile-stat--${stat.tone}`">
      <span class="profile-stat__label">{{ stat.label }}</span>
      <strong>{{ stat.value }}</strong>
    </div>
  </section>
</template>
