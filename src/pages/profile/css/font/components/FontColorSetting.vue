<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 支持 #RRGGBB 或 rgba(...) */
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function parseColor(input: string): Rgba {
  const rgbaMatch = input.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i
  )
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] != null ? Number(rgbaMatch[4]) : 1
    }
  }

  const hex = input.replace('#', '')
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    }
  }
  if (/^[0-9a-f]{8}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / 255
    }
  }

  return { r: 15, g: 23, b: 42, a: 1 }
}

function toHex({ r, g, b }: Rgba): string {
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function toRgbaString({ r, g, b, a }: Rgba): string {
  const alpha = Math.round(a * 100) / 100
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const parsed = computed(() => parseColor(props.modelValue))

const hexValue = computed(() => toHex(parsed.value))

const opacityPercent = computed(() => Math.round(parsed.value.a * 100))

function onColorInput(event: Event) {
  const hex = (event.target as HTMLInputElement).value
  const next = parseColor(hex)
  next.a = parsed.value.a
  emit('update:modelValue', toRgbaString(next))
}

function onOpacityInput(event: Event) {
  const percent = clamp(Number((event.target as HTMLInputElement).value), 0, 100)
  const next = { ...parsed.value, a: percent / 100 }
  emit('update:modelValue', toRgbaString(next))
}
</script>

<template>
  <section class="font-section">
    <div class="font-color-setting">
      <div class="font-color-setting__left">
        <h2 class="font-section__title">字体颜色</h2>
        <p class="font-section__desc font-section__desc--tight">
          调整全局文字颜色与不透明度，便于适配壁纸
        </p>
      </div>

      <div class="font-color-setting__right">
        <label class="font-color-palette" :title="hexValue">
          <span
            class="font-color-palette__preview"
            :style="{ background: modelValue }"
          />
          <input
            type="color"
            class="font-color-palette__input"
            :value="hexValue"
            @input="onColorInput"
          />
        </label>
      </div>
    </div>

    <div class="font-opacity-row">
      <span class="font-opacity-row__label">不透明度</span>
      <input
        type="range"
        class="font-range"
        min="0"
        max="100"
        step="1"
        :value="opacityPercent"
        @input="onOpacityInput"
      />
      <span class="font-opacity-row__value">{{ opacityPercent }}%</span>
    </div>
  </section>
</template>
