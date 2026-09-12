<script setup lang="ts">
import { ChevronRight, Code2 } from 'lucide-vue-next'

defineEmits<{
  open: []
}>()
</script>

<template>
  <button class="profile-setting" type="button" @click="$emit('open')">
    <span class="profile-setting__icon profile-setting__icon--slate" aria-hidden="true">
      <Code2 :size="17" :stroke-width="2" />
    </span>
    <span class="profile-setting__copy">
      <span class="profile-setting__title-row">
        <strong>自定义 CSS &amp; 视觉主题</strong>
        <span class="profile-setting__badge profile-setting__badge--slate">默认极简</span>
      </span>
      <span class="profile-setting__description">支持注入个性化 CSS 代码与高亮颜色排版</span>
    </span>
    <ChevronRight class="profile-setting__arrow" :size="16" :stroke-width="2" aria-hidden="true" />
  </button>
</template>
