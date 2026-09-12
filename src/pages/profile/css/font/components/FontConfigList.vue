<script setup lang="ts">
import { Check, Trash2 } from 'lucide-vue-next'
import type { FontConfig } from '../types/font'

defineProps<{
  configs: FontConfig[]
  activeConfigId: string | null
}>()

const emit = defineEmits<{
  apply: [id: string]
  remove: [id: string]
}>()
</script>

<template>
  <section class="font-section">
    <h2 class="font-section__title">已保存配置</h2>
    <p class="font-section__desc">点击载入并编辑；修改后可在上方点「更新」保存</p>

    <div v-if="configs.length === 0" class="font-empty">
      暂无保存的字体配置
    </div>

    <ul v-else class="font-config-list">
      <li
        v-for="config in configs"
        :key="config.id"
        class="font-config-item"
        :class="{ 'font-config-item--active': activeConfigId === config.id }"
      >
        <button
          type="button"
          class="font-config-item__main"
          @click="emit('apply', config.id)"
        >
          <div class="font-config-item__check" v-if="activeConfigId === config.id">
            <Check :size="14" :stroke-width="3" />
          </div>
          <div class="font-config-item__info">
            <strong>{{ config.name }}</strong>
            <span>
              {{ config.fontFamily }}
              · {{ config.source === 'file' ? '本地' : '链接' }}
            </span>
          </div>
        </button>
        <button
          type="button"
          class="font-config-item__delete"
          aria-label="删除配置"
          @click.stop="emit('remove', config.id)"
        >
          <Trash2 :size="16" :stroke-width="2" />
        </button>
      </li>
    </ul>
  </section>
</template>
