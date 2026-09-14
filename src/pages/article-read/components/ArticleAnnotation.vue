<script setup lang="ts">
import { computed } from 'vue'
import type { Annotation } from '../types/annotation'

/**
 * 批注组件（骨架）
 * TODO: 实现完整的批注功能
 * 
 * 计划功能：
 * 1. 文本选择后显示批注工具栏
 * 2. 创建/编辑/删除批注
 * 3. 批注高亮显示
 * 4. 批注列表侧边栏
 * 5. 批注导出/分享
 */

interface Props {
  articleId: string
  isActive: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  annotationCreated: [annotation: Annotation]
}>()

// TODO: 集成 useAnnotation composable
// const { state, toggleAnnotationMode, createAnnotation } = useAnnotation(props.articleId)

function handleClose() {
  emit('close')
}

// TODO: 实现批注创建逻辑
function handleCreateAnnotation() {
  console.log('TODO: 创建批注')
  // 获取用户选中的文本
  // 显示批注编辑器
  // 保存批注到数据库
}

// TODO: 实现批注渲染逻辑
const annotationCount = computed(() => 0)
</script>

<template>
  <div class="article-annotation">
    <!-- TODO: 批注模式激活指示器 -->
    <div v-if="isActive" class="annotation-mode-indicator">
      <span class="indicator-icon">✏️</span>
      <span class="indicator-text">批注模式已启用</span>
      <button class="close-button" @click="handleClose">退出</button>
    </div>

    <!-- TODO: 批注工具栏 -->
    <div v-if="isActive" class="annotation-toolbar">
      <p class="toolbar-hint">选中文本后可添加批注</p>
      <div class="toolbar-stats">
        <span>当前批注: {{ annotationCount }}</span>
      </div>
    </div>

    <!-- TODO: 批注列表侧边栏 -->
    <div v-if="isActive" class="annotation-sidebar">
      <h3>批注列表</h3>
      <p class="empty-state">暂无批注</p>
      <!-- 
      <div v-for="annotation in annotations" :key="annotation.id" class="annotation-item">
        <div class="annotation-content">{{ annotation.content }}</div>
        <div class="annotation-actions">
          <button @click="editAnnotation(annotation.id)">编辑</button>
          <button @click="deleteAnnotation(annotation.id)">删除</button>
        </div>
      </div>
      -->
    </div>

    <!-- TODO: 批注编辑弹窗 -->
    <!--
    <div v-if="showEditor" class="annotation-editor">
      <textarea v-model="editorContent" placeholder="输入批注内容..."></textarea>
      <div class="editor-actions">
        <button @click="saveAnnotation">保存</button>
        <button @click="cancelEdit">取消</button>
      </div>
    </div>
    -->
  </div>
</template>

<style scoped>
.article-annotation {
  position: relative;
}

.annotation-mode-indicator {
  position: fixed;
  top: 70px;
  right: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
}

.indicator-icon {
  font-size: 1.125rem;
}

.close-button {
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: #fff;
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: #f59e0b;
  color: #fff;
}

.annotation-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 16px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.toolbar-hint {
  margin: 0 0 8px;
  color: var(--app-font-color-muted, #64748b);
  font-size: 0.8125rem;
}

.toolbar-stats {
  color: var(--app-font-color-soft, #94a3b8);
  font-size: 0.75rem;
}

.annotation-sidebar {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 300px;
  max-height: calc(100vh - 100px);
  padding: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.annotation-sidebar h3 {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--app-font-color, #0f172a);
}

.empty-state {
  padding: 40px 20px;
  color: var(--app-font-color-soft, #94a3b8);
  font-size: 0.875rem;
  text-align: center;
}

/* TODO: 批注高亮样式 */
.annotation-highlight {
  background: rgba(251, 191, 36, 0.3);
  border-bottom: 2px solid #f59e0b;
  cursor: pointer;
  transition: background 0.15s ease;
}

.annotation-highlight:hover {
  background: rgba(251, 191, 36, 0.5);
}
</style>
