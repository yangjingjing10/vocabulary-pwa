<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import BottomNavigation from '@/components/navigation/BottomNavigation.vue'
import { getUserProfile, saveUserProfile, updateUserAvatar, updateUserName } from '@/db/repositories/user-profile.repository'
import { getAllWords } from '@/db/repositories/words.repository'
import { getAllArticles } from '@/db/repositories/articles.repository'

import ProfileApiSettingCard from './components/ProfileApiSettingCard.vue'
import ProfileCssSettingCard from './components/ProfileCssSettingCard.vue'
import ProfileHeader from './components/ProfileHeader.vue'
import ProfileSettingsList from './components/ProfileSettingsList.vue'
import ProfileStats from './components/ProfileStats.vue'
import ProfileToast from './components/ProfileToast.vue'

import '@/styles/pages/profile/profile-page.css'

export interface ProfileUser {
  name: string
  avatar: string
  bio: string
  streakDays: number
  totalWords: number
  totalArticles: number
  masteryRate: number
}

const user = defineModel<ProfileUser>('user', { required: true })
defineProps<{
  activeTab: 'study' | 'home'
}>()
const emit = defineEmits<{
  navigate: [tab: 'study' | 'home']
  openApi: []
  openCss: []
  openPromptIndex: []
  openDataBackup: []
}>()
const toastMessage = defineModel<string>('toastMessage', { default: '' })

const liveStats = ref({
  totalWords: 0,
  totalArticles: 0,
  learningDays: 0,
})

async function refreshLiveStats() {
  try {
    const [words, articles] = await Promise.all([getAllWords(), getAllArticles()])
    const learningDays = new Set(words.map((word) => word.date).filter(Boolean)).size

    liveStats.value = {
      totalWords: words.length,
      totalArticles: articles.length,
      learningDays,
    }

    user.value.totalWords = words.length
    user.value.totalArticles = articles.length
    user.value.masteryRate = learningDays
  } catch (error) {
    console.error('Failed to load profile stats:', error)
  }
}

onMounted(async () => {
  const profile = await getUserProfile()
  if (profile) {
    user.value.name = profile.name
    user.value.avatar = profile.avatar
    user.value.bio = profile.bio
  } else {
    await saveUserProfile({
      name: user.value.name,
      avatar: user.value.avatar,
      bio: user.value.bio,
    })
  }

  await refreshLiveStats()
})

function showToast(message: string) {
  toastMessage.value = message
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

function editProfile() {
  const newBio = window.prompt('更新简介:', user.value.bio)?.trim()
  if (newBio) {
    user.value.bio = newBio
    saveUserProfile({
      name: user.value.name,
      avatar: user.value.avatar,
      bio: newBio,
    })
    showToast('简介已更新')
  }
}

async function handleUpdateAvatar(avatar: string) {
  user.value.avatar = avatar
  await updateUserAvatar(avatar)
  showToast('头像已更新')
}

async function handleUpdateName(name: string) {
  user.value.name = name
  await updateUserName(name)
  showToast('昵称已更新')
}

function openSettingPage(type: string) {
  if (type === 'api') {
    emit('openApi')
  } else if (type === 'css') {
    emit('openCss')
  } else if (type === 'prompt') {
    emit('openPromptIndex')
  } else if (type === 'data') {
    emit('openDataBackup')
  } else {
    showToast(`${type} settings - Coming soon`)
  }
}

const profileStats = computed(() => [
  { label: 'Total Words', value: liveStats.value.totalWords, tone: 'neutral' as const },
  { label: 'Articles', value: liveStats.value.totalArticles, tone: 'primary' as const },
  { label: 'Learning Days', value: liveStats.value.learningDays, tone: 'success' as const },
])
</script>

<template>
  <div class="profile-page">
    <main class="profile-page__content">
      <ProfileHeader
        :user="user"
        @edit-profile="editProfile"
        @update-avatar="handleUpdateAvatar"
        @update-name="handleUpdateName"
      />
      <ProfileStats :stats="profileStats" />
      <ProfileApiSettingCard @open="emit('openApi')" />
      <ProfileCssSettingCard @open="emit('openCss')" />
      <ProfileSettingsList @open-setting="openSettingPage" />
    </main>

    <BottomNavigation :active-tab="activeTab" @navigate="$emit('navigate', $event)" />
    <ProfileToast v-if="toastMessage" :message="toastMessage" />
  </div>
</template>
