<script setup lang="ts">
import { Pencil, Camera } from 'lucide-vue-next'
import { ref } from 'vue'

import type { ProfileUser } from '../ProfilePage.vue'

defineProps<{
  user: ProfileUser
}>()

const emit = defineEmits<{
  editProfile: []
  updateAvatar: [avatar: string]
  updateName: [name: string]
}>()

const fileInput = ref<HTMLInputElement>()

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    emit('updateAvatar', base64)
  }
  reader.readAsDataURL(file)
}

function editName() {
  const newName = window.prompt('输入新名字:')?.trim()
  if (newName) {
    emit('updateName', newName)
  }
}
</script>

<template>
  <section class="profile-card" aria-labelledby="profile-card-title">
    <div class="profile-card__content">
      <div class="profile-card__avatar-wrap" @click="triggerFileUpload">
        <img class="profile-card__avatar" :src="user.avatar" alt="用户头像" />
        <div class="profile-card__avatar-overlay">
          <Camera :size="20" />
        </div>
        <input 
          ref="fileInput" 
          type="file" 
          accept="image/*" 
          style="display: none"
          @change="handleFileUpload"
        />
      </div>

      <div class="profile-card__identity">
        <div class="profile-card__identity-row">
          <h2 id="profile-card-title" @click="editName">{{ user.name }}</h2>
          <button class="profile-icon-button" type="button" aria-label="编辑个人资料" @click="$emit('editProfile')">
            <Pencil :size="15" :stroke-width="2" />
          </button>
        </div>
        <p>{{ user.bio }}</p>
      </div>
    </div>
  </section>
</template>
