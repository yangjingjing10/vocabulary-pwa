<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'

import AiArticlePage from '@/pages/ai-article/AiArticlePage.vue'
import ArticleReadPage from '@/pages/article-read/ArticleReadPage.vue'
import HomePage from '@/pages/HomePage.vue'
import ProfilePage, { type ProfileUser } from '@/pages/profile/ProfilePage.vue'
import ApiSettingsPage from '@/pages/profile/api/ApiSettingsPage.vue'
import CssIndexPage from '@/pages/profile/css/CssIndexPage.vue'
import WallpaperPage from '@/pages/profile/css/WallpaperPage.vue'
import FontPage from '@/pages/profile/css/font/index.vue'
import PromptConfigIndexPage from '@/pages/profile/prompt/PromptConfigIndexPage.vue'
import ArticlePromptConfigPage from '@/pages/profile/prompt/ArticlePromptConfigPage.vue'
import QuizPromptConfigPage from '@/pages/profile/prompt/QuizPromptConfigPage.vue'
import DataBackupPage from '@/pages/profile/data/DataBackupPage.vue'
import WordImportPage from '@/pages/word-import/WordImportPage.vue'
import VocabularyBookPage from '@/pages/vocabulary-book/VocabularyBookPage.vue'
import WordQuizPage from '@/pages/word-quiz/WordQuizPage.vue'
import ChoiceQuizPage from '@/pages/word-quiz/quiz-choice/index.vue'

import { wallpaperService } from '@/services/wallpaper.service'
import { fontService } from '@/services/font.service'
import { ensureLocalDictionary } from '@/services/local-dictionary.service'
import { articleGenerationService } from '@/services/article-generation.service'
import { getUserProfile } from '@/db/repositories/user-profile.repository'

import '@/styles/pages/home-page.css'

registerSW({ immediate: true })

onMounted(async () => {
  await wallpaperService.init()
  await fontService.init()
  ensureLocalDictionary().catch((err) => {
    console.warn('[local-dict] background import failed:', err)
  })
  const profile = await getUserProfile()
  if (profile) {
    profileUser.value.name = profile.name
    profileUser.value.avatar = profile.avatar
    profileUser.value.bio = profile.bio
  }

  unsubscribeArticleGen = articleGenerationService.subscribe((event) => {
    // 只在不在文章页时弹全局提醒，避免重复打扰
    if (activeView.value === 'article' || activeView.value === 'article-read') return

    if (event.status === 'success' && event.article) {
      showAppToast(`文章已生成：${event.article.title}`, event.article.id)
    } else if (event.status === 'error') {
      showAppToast(`文章生成失败：${event.error || '请重试'}`, null, true)
    }
  })
})

onUnmounted(() => {
  unsubscribeArticleGen?.()
})

type View = 'study' | 'profile' | 'api' | 'css-index' | 'css-wallpaper' | 'css-font' | 'prompt-index' | 'article-prompt' | 'quiz-prompt' | 'data-backup' | 'import' | 'vocabulary' | 'article' | 'article-read' | 'word-quiz' | 'choice-quiz'

const activeView = ref<View>('study')
const importType = ref<'camera' | 'upload' | 'manual'>('camera')
const importReturnView = ref<'study' | 'vocabulary'>('vocabulary')
const selectedWords = ref<string[]>([])
const priorityWords = ref<string[]>([])
const selectedDate = ref('')
/** 进阶首批可补全；学习记录「生成」续练只出剩余错题 */
const choiceFillFromPool = ref(true)
const selectedArticleId = ref('')
const profileUser = ref<ProfileUser>({
  name: 'Vocabulary Learner',
  avatar: 'https://placehold.co/120x120/334155/ffffff?text=User',
  bio: 'Learning 20 words daily',
  streakDays: 5,
  totalWords: 345,
  totalArticles: 12,
  masteryRate: 82
})

const appToast = ref('')
const appToastArticleId = ref<string | null>(null)
const appToastIsError = ref(false)
let appToastTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeArticleGen: (() => void) | undefined

function showAppToast(message: string, articleId: string | null = null, isError = false) {
  appToast.value = message
  appToastArticleId.value = articleId
  appToastIsError.value = isError
  if (appToastTimer) clearTimeout(appToastTimer)
  appToastTimer = setTimeout(() => {
    appToast.value = ''
    appToastArticleId.value = null
  }, 6000)
}

function openToastArticle() {
  if (!appToastArticleId.value) return
  selectedArticleId.value = appToastArticleId.value
  activeView.value = 'article-read'
  appToast.value = ''
}

function navigate(tab: 'study' | 'home') {
  activeView.value = tab === 'study' ? 'study' : 'profile'
}

function openImport(type: 'camera' | 'upload' | 'manual') {
  importType.value = type
  importReturnView.value = activeView.value === 'vocabulary' ? 'vocabulary' : 'study'
  activeView.value = 'import'
}

function saveWords(words: string[]) {
  console.log('Saved words:', words)
  activeView.value = importReturnView.value
}

function backFromImport() {
  activeView.value = importReturnView.value
}

function generateArticle(words: string[], date = '') {
  selectedWords.value = words
  selectedDate.value = date
  // 先清会话再进页，避免旧文章残留；生成由页面/服务后台执行
  articleGenerationService.clearSession()
  activeView.value = 'article'
}

function openArticleRead(articleId: string) {
  selectedArticleId.value = articleId
  activeView.value = 'article-read'
}

function startQuizFromVocabulary(words: string[], date = '') {
  selectedWords.value = words
  priorityWords.value = []
  selectedDate.value = date
  activeView.value = 'word-quiz'
}

function startPractice(words: string[]) {
  selectedWords.value = words
  priorityWords.value = []
  // 保留 selectedDate（从文章页回来可能已有日期）
  activeView.value = 'word-quiz'
}

function startAdvancedPractice(words: string[], wrongWords: string[] = [], date = '') {
  selectedWords.value = words
  priorityWords.value = wrongWords
  if (date) selectedDate.value = date
  choiceFillFromPool.value = true
  activeView.value = 'choice-quiz'
}

function openChoiceQuiz(words: string[], date = '', wrongWords: string[] = []) {
  selectedWords.value = words
  priorityWords.value = wrongWords
  selectedDate.value = date
  choiceFillFromPool.value = false
  activeView.value = 'choice-quiz'
}

async function reloadProfileAfterRestore() {
  const profile = await getUserProfile()
  if (profile) {
    profileUser.value.name = profile.name
    profileUser.value.avatar = profile.avatar
    profileUser.value.bio = profile.bio
  }
}
</script>

<template>
  <HomePage
    v-if="activeView === 'study'"
    :avatar="profileUser.avatar"
    active-tab="study"
    @navigate="navigate"
    @open-vocabulary="activeView = 'vocabulary'"
    @start-quiz="startQuizFromVocabulary"
    @open-article="openArticleRead"
    @generate-article="generateArticle"
  />
  <ProfilePage
    v-else-if="activeView === 'profile'"
    v-model:user="profileUser"
    active-tab="home"
    @navigate="navigate"
    @open-api="activeView = 'api'"
    @open-css="activeView = 'css-index'"
    @open-prompt-index="activeView = 'prompt-index'"
    @open-data-backup="activeView = 'data-backup'"
  />
  <ApiSettingsPage v-else-if="activeView === 'api'" @back="activeView = 'profile'" />
  <CssIndexPage v-else-if="activeView === 'css-index'" @back="activeView = 'profile'" @navigate-to-wallpaper="activeView = 'css-wallpaper'" @navigate-to-font="activeView = 'css-font'" />
  <WallpaperPage v-else-if="activeView === 'css-wallpaper'" @back="activeView = 'css-index'" />
  <FontPage v-else-if="activeView === 'css-font'" @back="activeView = 'css-index'" />
  <PromptConfigIndexPage v-else-if="activeView === 'prompt-index'" @back="activeView = 'profile'" @navigate-to-article="activeView = 'article-prompt'" @navigate-to-quiz="activeView = 'quiz-prompt'" />
  <ArticlePromptConfigPage v-else-if="activeView === 'article-prompt'" @back="activeView = 'prompt-index'" />
  <QuizPromptConfigPage v-else-if="activeView === 'quiz-prompt'" @back="activeView = 'prompt-index'" />
  <DataBackupPage
    v-else-if="activeView === 'data-backup'"
    @back="activeView = 'profile'"
    @restored="reloadProfileAfterRestore"
  />
  <WordImportPage v-else-if="activeView === 'import'" :import-type="importType" @back="backFromImport" @save="saveWords" />
  <VocabularyBookPage
    v-else-if="activeView === 'vocabulary'"
    @back="activeView = 'study'"
    @generate-article="generateArticle"
    @open-article="openArticleRead"
    @start-quiz="startQuizFromVocabulary"
    @open-choice-quiz="openChoiceQuiz"
    @open-import="openImport"
  />
  <AiArticlePage v-else-if="activeView === 'article'" :selected-words="selectedWords" @back="activeView = 'vocabulary'" @start-practice="startPractice" />
  <ArticleReadPage v-else-if="activeView === 'article-read'" :article-id="selectedArticleId" @back="activeView = 'vocabulary'" />
  <WordQuizPage
    v-else-if="activeView === 'word-quiz'"
    :words="selectedWords"
    :date="selectedDate"
    @back="activeView = 'vocabulary'"
    @advanced-practice="startAdvancedPractice"
  />
  <ChoiceQuizPage
    v-else-if="activeView === 'choice-quiz'"
    :words="selectedWords"
    :priority-words="priorityWords"
    :date="selectedDate"
    :fill-from-pool="choiceFillFromPool"
    @back="activeView = 'vocabulary'"
  />

  <Transition name="app-toast">
    <div
      v-if="appToast"
      class="app-toast"
      :class="{ 'is-error': appToastIsError }"
      role="status"
    >
      <span class="app-toast__text">{{ appToast }}</span>
      <button
        v-if="appToastArticleId"
        type="button"
        class="app-toast__action"
        @click="openToastArticle"
      >
        查看
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.app-toast {
  position: fixed;
  left: 50%;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(92vw, 420px);
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
}

.app-toast.is-error {
  background: rgba(127, 29, 29, 0.94);
}

.app-toast__text {
  flex: 1;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.app-toast__action {
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  background: #38bdf8;
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
