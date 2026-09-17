<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { registerSW } from 'virtual:pwa-register'

import AiArticlePage from '@/pages/ai-article/AiArticlePage.vue'
import ArticleHubPage from '@/pages/ai-article/ArticleHubPage.vue'
import NewsBriefPage from '@/pages/ai-article/NewsBriefPage.vue'
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
import RssFeedsPage from '@/pages/profile/RssFeedsPage.vue'
import WordImportPage from '@/pages/word-import/WordImportPage.vue'
import VocabularyBookPage from '@/pages/vocabulary-book/VocabularyBookPage.vue'
import WordQuizPage from '@/pages/word-quiz/WordQuizPage.vue'
import ChoiceQuizPage from '@/pages/word-quiz/quiz-choice/index.vue'

import { wallpaperService } from '@/services/wallpaper.service'
import { fontService } from '@/services/font.service'
import { ensureLocalDictionary } from '@/services/local-dictionary.service'
import { articleGenerationService } from '@/services/article-generation.service'
import { mixYesterdayWrongWords } from '@/services/practice-mix.service'
import { peekUnfinishedQuizBatch } from '@/pages/word-quiz/composables/useQuizPause'
import { getUserProfile } from '@/db/repositories/user-profile.repository'
import type { ArticleGenPrefs } from '@/constants/article-gen-prefs'
import { loadArticleGenPrefs } from '@/constants/article-gen-prefs'
import { todayLocalDate } from '@/utils/localDate'

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
    if (activeView.value === 'article' || activeView.value === 'article-read' || activeView.value === 'article-hub' || activeView.value === 'news-brief') return

    if (event.status === 'success' && event.article) {
      const done = articleGenerationService.batchProgress.value.done
      const msg =
        done > 1
          ? `已生成 ${done} 篇主题短文（最新：${event.article.title}）`
          : `文章已生成：${event.article.title}`
      showAppToast(msg, event.article.id)
    } else if (event.status === 'error') {
      showAppToast(`文章生成失败：${event.error || '请重试'}`, null, true)
    }
  })
})

onUnmounted(() => {
  unsubscribeArticleGen?.()
})

type View = 'study' | 'profile' | 'api' | 'css-index' | 'css-wallpaper' | 'css-font' | 'prompt-index' | 'article-prompt' | 'quiz-prompt' | 'data-backup' | 'rss-feeds' | 'import' | 'vocabulary' | 'article-hub' | 'article' | 'news-brief' | 'article-read' | 'word-quiz' | 'choice-quiz'

const activeView = ref<View>('study')
const importType = ref<'camera' | 'upload' | 'manual'>('camera')
const importReturnView = ref<'study' | 'vocabulary'>('vocabulary')
const articleReturnView = ref<'study' | 'vocabulary'>('study')
const selectedWords = ref<string[]>([])
const articleGenPrefs = ref<ArticleGenPrefs>(loadArticleGenPrefs())
const priorityWords = ref<string[]>([])
const selectedDate = ref('')
/** 进阶首批可补全；学习记录「生成」续练只出剩余错题 */
const choiceFillFromPool = ref(true)
const selectedArticleId = ref('')
/** 默写是否为复习模式（对搁错留） */
const quizReviewMode = ref(false)
/** 默写结束后回到哪 */
const quizReturnView = ref<'study' | 'vocabulary'>('vocabulary')
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
  articleReturnView.value = activeView.value === 'vocabulary' ? 'vocabulary' : 'study'
  activeView.value = 'article-hub'
}

function startAiFromHub(prefs: ArticleGenPrefs) {
  articleGenPrefs.value = prefs
  articleGenerationService.clearSession()
  activeView.value = 'article'
}

function startNewsFromHub() {
  activeView.value = 'news-brief'
}

function openArticleRead(articleId: string) {
  selectedArticleId.value = articleId
  activeView.value = 'article-read'
}

function backFromArticleFlow() {
  activeView.value = articleReturnView.value
}

async function startQuizFromVocabulary(words: string[], date = '') {
  const practiceDate = date || todayLocalDate()
  try {
    const mixed = await mixYesterdayWrongWords(practiceDate, words)
    if (mixed.words.length === 0) {
      activeView.value = 'vocabulary'
      return
    }
    selectedWords.value = mixed.words
  } catch (error) {
    console.error('Failed to mix yesterday wrong words:', error)
    if (words.length === 0) {
      activeView.value = 'vocabulary'
      return
    }
    selectedWords.value = words
  }
  priorityWords.value = []
  quizReviewMode.value = false
  quizReturnView.value = 'vocabulary'
  selectedDate.value = practiceDate
  activeView.value = 'word-quiz'
}

async function startQuizFromHome(words: string[], date = '') {
  const practiceDate = date || todayLocalDate()
  try {
    const mixed = await mixYesterdayWrongWords(practiceDate, words)
    if (mixed.words.length === 0) {
      // 无词可练时打开单词本，避免空白测验
      activeView.value = 'vocabulary'
      return
    }
    selectedWords.value = mixed.words
  } catch (error) {
    console.error('Failed to mix yesterday wrong words:', error)
    if (words.length === 0) {
      activeView.value = 'vocabulary'
      return
    }
    selectedWords.value = words
  }
  priorityWords.value = []
  quizReviewMode.value = false
  quizReturnView.value = 'study'
  selectedDate.value = practiceDate
  activeView.value = 'word-quiz'
}

async function startPractice(words: string[]) {
  const practiceDate = selectedDate.value || todayLocalDate()
  try {
    const mixed = await mixYesterdayWrongWords(practiceDate, words)
    selectedWords.value = mixed.words
  } catch (error) {
    console.error('Failed to mix yesterday wrong words:', error)
    selectedWords.value = words
  }
  priorityWords.value = []
  quizReviewMode.value = false
  quizReturnView.value = 'study'
  if (!selectedDate.value) selectedDate.value = practiceDate
  activeView.value = 'word-quiz'
}

function startReview(words: string[], date = '') {
  if (words.length === 0) return
  selectedWords.value = words
  priorityWords.value = []
  quizReviewMode.value = true
  quizReturnView.value = 'study'
  selectedDate.value = date || todayLocalDate()
  activeView.value = 'word-quiz'
}

/** 续未完成的复习：进入测验页后由暂停批次弹续测对话框 */
function resumeReview(date = '') {
  const practiceDate = date || todayLocalDate()
  const unfinished = peekUnfinishedQuizBatch(practiceDate, 'review')
  if (!unfinished) {
    // 没有进度则回落到新建复习（由首页再点）
    return
  }
  selectedWords.value = unfinished.batch.words.map((w) => w.word).filter(Boolean)
  priorityWords.value = []
  quizReviewMode.value = true
  quizReturnView.value = 'study'
  selectedDate.value = practiceDate
  activeView.value = 'word-quiz'
}

function backFromQuiz() {
  activeView.value = quizReturnView.value
  quizReviewMode.value = false
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
    @start-quiz="startQuizFromHome"
    @start-review="startReview"
    @resume-review="resumeReview"
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
    @open-rss-feeds="activeView = 'rss-feeds'"
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
  <RssFeedsPage v-else-if="activeView === 'rss-feeds'" @back="activeView = 'profile'" />
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
  <ArticleHubPage
    v-else-if="activeView === 'article-hub'"
    :words="selectedWords"
    :date="selectedDate"
    @back="backFromArticleFlow"
    @start-ai="startAiFromHub"
    @start-news="startNewsFromHub"
    @open-article="openArticleRead"
  />
  <AiArticlePage
    v-else-if="activeView === 'article'"
    :selected-words="selectedWords"
    :date="selectedDate"
    :gen-prefs="articleGenPrefs"
    @back="activeView = 'article-hub'"
    @start-practice="startPractice"
  />
  <NewsBriefPage
    v-else-if="activeView === 'news-brief'"
    :date="selectedDate"
    :words="selectedWords"
    @back="activeView = 'article-hub'"
  />
  <ArticleReadPage
    v-else-if="activeView === 'article-read'"
    :article-id="selectedArticleId"
    @back="activeView = 'article-hub'"
  />
  <WordQuizPage
    v-else-if="activeView === 'word-quiz'"
    :words="selectedWords"
    :date="selectedDate"
    :review-mode="quizReviewMode"
    @back="backFromQuiz"
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
