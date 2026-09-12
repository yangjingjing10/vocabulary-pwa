<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <Transition name="profile-toast">
    <div v-if="message" class="profile-toast" role="status">
      <span class="profile-toast__icon" aria-hidden="true">✓</span>
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>
