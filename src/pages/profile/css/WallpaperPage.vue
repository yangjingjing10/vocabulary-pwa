<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ChevronLeft, Image, Check } from 'lucide-vue-next'

import {
  getAllWallpapers,
  setCurrentWallpaper,
  updateWallpaperSettings,
  type Wallpaper
} from '@/db/repositories/wallpaper.repository'
import { wallpaperService } from '@/services/wallpaper.service'
import WallpaperUpload from './components/WallpaperUpload.vue'
import WallpaperEdit from './components/WallpaperEdit.vue'

import '@/styles/pages/profile/css-pages.css'

const emit = defineEmits<{
  back: []
}>()

const wallpapers = ref<Wallpaper[]>([])
const selectedWallpaper = ref<string>('')
const isEditMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const blurValue = ref(0)
const opacityValue = ref(85)
const rotationEnabled = ref(false)
const rotationInterval = ref(5)

const hasSelectedWallpaper = computed(() => Boolean(selectedWallpaper.value))
const canRotate = computed(() => wallpapers.value.length >= 2)

let unsubscribeWallpaper: (() => void) | null = null
let unsubscribeRotation: (() => void) | null = null

function syncControlsFromWallpaper(wallpaper?: Wallpaper) {
  blurValue.value = wallpaper?.blur ?? 0
  opacityValue.value = wallpaper?.opacity ?? 85
}

function syncRotationFromService() {
  const settings = wallpaperService.getRotationSettings()
  rotationEnabled.value = settings.enabled
  rotationInterval.value = settings.intervalMinutes
}

async function loadWallpapers() {
  wallpapers.value = await getAllWallpapers()
  const current = wallpapers.value.find(w => w.isSelected)
  if (current) {
    selectedWallpaper.value = current.id
    syncControlsFromWallpaper(current)
  } else {
    selectedWallpaper.value = ''
    syncControlsFromWallpaper()
  }
  await wallpaperService.refreshRotation()
}

onMounted(() => {
  syncRotationFromService()
  unsubscribeWallpaper = wallpaperService.onWallpaperChange((wallpaper) => {
    if (!wallpaper) {
      selectedWallpaper.value = ''
      syncControlsFromWallpaper()
      return
    }
    selectedWallpaper.value = wallpaper.id
    const index = wallpapers.value.findIndex(w => w.id === wallpaper.id)
    if (index >= 0) {
      wallpapers.value[index] = wallpaper
    }
    syncControlsFromWallpaper(wallpaper)
  })
  unsubscribeRotation = wallpaperService.onRotationSettingsChange((settings) => {
    rotationEnabled.value = settings.enabled
    rotationInterval.value = settings.intervalMinutes
  })
})

onUnmounted(() => {
  unsubscribeWallpaper?.()
  unsubscribeRotation?.()
})

loadWallpapers()

async function selectWallpaper(id: string) {
  if (isEditMode.value) {
    toggleSelect(id)
    return
  }
  
  selectedWallpaper.value = id
  const wallpaper = wallpapers.value.find(w => w.id === id)
  if (wallpaper) {
    await setCurrentWallpaper(id)
    syncControlsFromWallpaper(wallpaper)
    wallpaperService.applyWallpaper(wallpaper)
  }
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

async function applySettings() {
  if (!selectedWallpaper.value) return

  const updated = await updateWallpaperSettings(selectedWallpaper.value, {
    blur: blurValue.value,
    opacity: opacityValue.value
  })

  if (!updated) return

  const index = wallpapers.value.findIndex(w => w.id === updated.id)
  if (index >= 0) {
    wallpapers.value[index] = updated
  }

  wallpaperService.applyWallpaper(updated)
}

async function handleBlurInput(event: Event) {
  blurValue.value = Number((event.target as HTMLInputElement).value)
  await applySettings()
}

async function handleOpacityInput(event: Event) {
  opacityValue.value = Number((event.target as HTMLInputElement).value)
  await applySettings()
}

async function handleRotationToggle() {
  if (!canRotate.value && !rotationEnabled.value) return
  await wallpaperService.setRotationEnabled(!rotationEnabled.value)
}

async function handleRotationIntervalInput(event: Event) {
  const minutes = Number((event.target as HTMLInputElement).value)
  rotationInterval.value = minutes
  await wallpaperService.setRotationInterval(minutes)
}

async function handleUploaded() {
  await loadWallpapers()
}

async function handleDeleted() {
  await loadWallpapers()
  const current = wallpapers.value.find(w => w.isSelected)
  if (!current) {
    wallpaperService.clearWallpaper()
  }
}

function handleEditModeChange(editing: boolean) {
  isEditMode.value = editing
  if (!editing) {
    selectedIds.value.clear()
  }
}
</script>

<template>
  <div class="wallpaper-page">
    <header class="wallpaper-page__header">
      <button class="wallpaper-page__back" type="button" aria-label="返回" @click="emit('back')">
        <ChevronLeft :size="20" :stroke-width="2.5" />
      </button>
      <h1>壁纸</h1>
      <div class="wallpaper-page__actions">
        <WallpaperEdit 
          :wallpapers="wallpapers" 
          :selected-ids="selectedIds"
          @deleted="handleDeleted" 
          @edit-mode-change="handleEditModeChange"
        />
        <WallpaperUpload @uploaded="handleUploaded" />
      </div>
    </header>

    <main class="wallpaper-page__content">
      <div v-if="wallpapers.length === 0" class="wallpaper-empty">
        <div class="wallpaper-empty__icon">
          <Image :size="48" />
        </div>
        <p class="wallpaper-empty__text">还没有壁纸</p>
        <p class="wallpaper-empty__hint">点击右上角 + 上传壁纸</p>
      </div>

      <template v-else>
        <section v-if="!isEditMode" class="wallpaper-controls">
          <template v-if="hasSelectedWallpaper">
            <div class="wallpaper-control-row">
              <span class="wallpaper-control-row__label">模糊度</span>
              <input
                class="wallpaper-range"
                type="range"
                min="0"
                max="20"
                step="1"
                :value="blurValue"
                @input="handleBlurInput"
              />
              <span class="wallpaper-control-row__value">{{ blurValue }}px</span>
            </div>
            <div class="wallpaper-control-row">
              <span class="wallpaper-control-row__label">不透明度</span>
              <input
                class="wallpaper-range"
                type="range"
                min="10"
                max="100"
                step="1"
                :value="opacityValue"
                @input="handleOpacityInput"
              />
              <span class="wallpaper-control-row__value">{{ opacityValue }}%</span>
            </div>
          </template>

          <div class="wallpaper-control-row wallpaper-control-row--toggle">
            <span class="wallpaper-control-row__label">定时轮换</span>
            <button
              class="wallpaper-toggle"
              type="button"
              :class="{ 'is-on': rotationEnabled }"
              :disabled="!canRotate && !rotationEnabled"
              :aria-pressed="rotationEnabled"
              aria-label="定时轮换壁纸"
              @click="handleRotationToggle"
            >
              <span></span>
            </button>
          </div>

          <div v-if="rotationEnabled" class="wallpaper-control-row">
            <span class="wallpaper-control-row__label">间隔</span>
            <input
              class="wallpaper-range"
              type="range"
              min="1"
              max="30"
              step="1"
              :value="rotationInterval"
              @input="handleRotationIntervalInput"
            />
            <span class="wallpaper-control-row__value">{{ rotationInterval }}分钟</span>
          </div>

          <p class="wallpaper-controls__hint">
            <template v-if="!canRotate">至少上传 2 张壁纸后才能开启定时轮换</template>
            <template v-else-if="rotationEnabled">将按列表顺序每隔 {{ rotationInterval }} 分钟自动更换壁纸</template>
            <template v-else>模糊度调到 0 可恢复清晰壁纸</template>
          </p>
        </section>

        <div class="wallpaper-grid">
          <button
            v-for="wallpaper in wallpapers"
            :key="wallpaper.id"
            type="button"
            class="wallpaper-card"
            :class="{ 
              'wallpaper-card--selected': !isEditMode && selectedWallpaper === wallpaper.id,
              'wallpaper-card--editing': isEditMode && selectedIds.has(wallpaper.id)
            }"
            @click="selectWallpaper(wallpaper.id)"
          >
            <div class="wallpaper-card__preview" :style="{ backgroundImage: `url(${wallpaper.imageData})` }">
              <div v-if="!isEditMode && selectedWallpaper === wallpaper.id" class="wallpaper-card__check">
                <Check :size="20" :stroke-width="3" />
              </div>
              <div v-if="isEditMode" class="wallpaper-card__checkbox">
                <div v-if="selectedIds.has(wallpaper.id)" class="wallpaper-card__checkbox-check">
                  <Check :size="16" :stroke-width="3" />
                </div>
              </div>
            </div>
            <div class="wallpaper-card__info">
              <span class="wallpaper-card__name">{{ wallpaper.name }}</span>
            </div>
          </button>
        </div>
      </template>
    </main>
  </div>
</template>
