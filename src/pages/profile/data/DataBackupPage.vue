<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  ArrowLeft,
  Download,
  Loader2,
  Upload,
} from 'lucide-vue-next'

import {
  collectBackupSummary,
  downloadBackupJson,
  exportAllData,
  importAllData,
  parseBackupJson,
  summarizePayload,
  type BackupSummary,
} from '@/services/data-backup.service'
import { wallpaperService } from '@/services/wallpaper.service'
import { fontService } from '@/services/font.service'
import { ensureLocalDictionary } from '@/services/local-dictionary.service'

import '@/styles/pages/profile/data-backup-page.css'

const emit = defineEmits<{
  back: []
  restored: []
}>()

const summary = ref<BackupSummary>({
  words: 0,
  articles: 0,
  wallpapers: 0,
  fontConfigs: 0,
})
const isExporting = ref(false)
const isImporting = ref(false)
const statusMessage = ref('')
const statusTone = ref<'neutral' | 'success' | 'error'>('neutral')
const fileInputRef = ref<HTMLInputElement | null>(null)

async function refreshSummary() {
  try {
    summary.value = await collectBackupSummary()
  } catch (error) {
    console.error('Failed to load backup summary:', error)
  }
}

onMounted(() => {
  void refreshSummary()
})

function setStatus(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral') {
  statusMessage.value = message
  statusTone.value = tone
}

async function handleExport() {
  if (isExporting.value || isImporting.value) return
  isExporting.value = true
  setStatus('正在打包本地数据…')

  try {
    const payload = await exportAllData()
    downloadBackupJson(payload)
    const stats = summarizePayload(payload)
    setStatus(
      `已导出：${stats.words} 词 · ${stats.articles} 篇 · ${stats.wallpapers} 壁纸`,
      'success',
    )
  } catch (error) {
    console.error('Export failed:', error)
    setStatus(error instanceof Error ? error.message : '导出失败', 'error')
  } finally {
    isExporting.value = false
  }
}

function openFilePicker() {
  if (isExporting.value || isImporting.value) return
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const confirmed = window.confirm(
    '导入将覆盖当前设备上的词库、文章、配置、壁纸与字体等数据。确定继续？',
  )
  if (!confirmed) return

  isImporting.value = true
  setStatus('正在读取并恢复备份…')

  try {
    const raw = await file.text()
    const payload = parseBackupJson(raw)
    const result = await importAllData(payload)

    await wallpaperService.init()
    await fontService.init()
    ensureLocalDictionary().catch((err) => {
      console.warn('[local-dict] rebuild after restore failed:', err)
    })

    emit('restored')

    summary.value = {
      words: result.words,
      articles: result.articles,
      wallpapers: result.wallpapers,
      fontConfigs: result.fontConfigs,
    }

    setStatus(
      `恢复完成：${result.words} 词 · ${result.articles} 篇 · ${result.wallpapers} 壁纸`,
      'success',
    )
  } catch (error) {
    console.error('Import failed:', error)
    setStatus(error instanceof Error ? error.message : '导入失败', 'error')
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="data-backup-page">
    <header class="data-backup-page__header">
      <button
        class="data-backup-page__back"
        type="button"
        aria-label="返回"
        @click="emit('back')"
      >
        <ArrowLeft :size="18" />
      </button>
      <div class="data-backup-page__title">
        <h1>数据备份与恢复</h1>
        <p>导出或导入本地全部用户数据</p>
      </div>
    </header>

    <main class="data-backup-page__content">
      <section class="data-backup-card data-backup-summary">
        <h2>当前数据概览</h2>
        <div class="data-backup-summary__grid">
          <div>
            <span>单词</span>
            <strong>{{ summary.words }}</strong>
          </div>
          <div>
            <span>文章</span>
            <strong>{{ summary.articles }}</strong>
          </div>
          <div>
            <span>壁纸</span>
            <strong>{{ summary.wallpapers }}</strong>
          </div>
          <div>
            <span>字体配置</span>
            <strong>{{ summary.fontConfigs }}</strong>
          </div>
        </div>
      </section>

      <section class="data-backup-card">
        <h2>导出备份</h2>
        <p class="data-backup-card__desc">
          导出词库、文章、测验记录、API/提示词配置、个人资料、壁纸与字体等。离线大词库体积很大，不包含在备份中，恢复后会自动重建。
        </p>
        <button
          class="data-backup-action"
          type="button"
          :disabled="isExporting || isImporting"
          @click="handleExport"
        >
          <Loader2 v-if="isExporting" :size="18" class="is-spinning" />
          <Download v-else :size="18" />
          <span>{{ isExporting ? '导出中…' : '导出全部数据' }}</span>
        </button>
      </section>

      <section class="data-backup-card">
        <h2>导入恢复</h2>
        <p class="data-backup-card__desc">
          选择之前导出的 JSON 备份文件。导入会覆盖当前设备上的对应数据，请先确认已备份。
        </p>
        <button
          class="data-backup-action data-backup-action--secondary"
          type="button"
          :disabled="isExporting || isImporting"
          @click="openFilePicker"
        >
          <Loader2 v-if="isImporting" :size="18" class="is-spinning" />
          <Upload v-else :size="18" />
          <span>{{ isImporting ? '导入中…' : '从文件恢复' }}</span>
        </button>
        <input
          ref="fileInputRef"
          class="data-backup-file"
          type="file"
          accept="application/json,.json"
          @change="handleFileChange"
        />
      </section>

      <p
        v-if="statusMessage"
        class="data-backup-status"
        :class="`data-backup-status--${statusTone}`"
      >
        {{ statusMessage }}
      </p>
    </main>
  </div>
</template>
