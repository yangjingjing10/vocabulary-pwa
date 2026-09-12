<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Transition name="prompt-modal">
    <div v-if="show" class="prompt-modal-overlay" @click="emit('cancel')">
      <div class="prompt-modal" @click.stop>
        <div class="prompt-modal-header">
          <h3>Delete Configuration</h3>
          <button type="button" @click="emit('cancel')">
            <X :size="18" />
          </button>
        </div>
        <p>Are you sure you want to delete this configuration? This action cannot be undone.</p>
        <div class="prompt-modal-actions">
          <button class="prompt-modal-btn" type="button" @click="emit('cancel')">Cancel</button>
          <button class="prompt-modal-btn prompt-modal-btn--danger" type="button" @click="emit('confirm')">Delete</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
