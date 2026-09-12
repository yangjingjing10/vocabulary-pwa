// 在 WordImportPage.vue 中集成词典 API 的示例代码

// ==================== 在 <script setup> 顶部添加 import ====================
import { queryWordDefinition } from '@/services/dictionary-api.service'

// ==================== 修改 confirmSave 函数 ====================
async function confirmSave() {
  if (words.value.length === 0) {
    showToast('Please extract words first')
    return
  }
  
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 显示加载提示
    showToast('Fetching word definitions...')
    
    for (const item of words.value) {
      // 查询单词释义（自动按优先级尝试多个 API）
      const definition = await queryWordDefinition(item.word)
      
      const wordData: VocabularyWord = {
        id: item.id,
        word: item.word,
        // 使用查询到的释义数据
        phonetic: definition?.phonetic,
        pos: definition?.pos,
        translation: definition?.translation,
        source: item.source,
        addedAt: Date.now(),
        date: today
      }
      await addWord(wordData)
    }
    
    emit('save', words.value.map(w => w.word))
    showToast('Words saved to vocabulary')
  } catch (error) {
    showToast('Failed to save words')
    console.error('Save error:', error)
  }
}

// ==================== 或者使用批量查询优化性能 ====================
import { queryWordDefinitions } from '@/services/dictionary-api.service'

async function confirmSaveBatch() {
  if (words.value.length === 0) {
    showToast('Please extract words first')
    return
  }
  
  try {
    const today = new Date().toISOString().split('T')[0]
    
    showToast('Fetching word definitions...')
    
    // 批量查询所有单词的释义
    const wordList = words.value.map(w => w.word)
    const definitionsMap = await queryWordDefinitions(wordList)
    
    // 保存单词
    for (const item of words.value) {
      const definition = definitionsMap.get(item.word)
      
      const wordData: VocabularyWord = {
        id: item.id,
        word: item.word,
        phonetic: definition?.phonetic,
        pos: definition?.pos,
        translation: definition?.translation,
        source: item.source,
        addedAt: Date.now(),
        date: today
      }
      await addWord(wordData)
    }
    
    emit('save', words.value.map(w => w.word))
    showToast(`${words.value.length} words saved with definitions`)
  } catch (error) {
    showToast('Failed to save words')
    console.error('Save error:', error)
  }
}

// ==================== 可选：添加进度提示 ====================
async function confirmSaveWithProgress() {
  if (words.value.length === 0) {
    showToast('Please extract words first')
    return
  }
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const total = words.value.length
    
    for (let i = 0; i < words.value.length; i++) {
      const item = words.value[i]
      
      // 显示进度
      showToast(`Processing ${i + 1}/${total}: ${item.word}`)
      
      const definition = await queryWordDefinition(item.word)
      
      const wordData: VocabularyWord = {
        id: item.id,
        word: item.word,
        phonetic: definition?.phonetic,
        pos: definition?.pos,
        translation: definition?.translation,
        source: item.source,
        addedAt: Date.now(),
        date: today
      }
      await addWord(wordData)
    }
    
    emit('save', words.value.map(w => w.word))
    showToast('All words saved successfully!')
  } catch (error) {
    showToast('Failed to save words')
    console.error('Save error:', error)
  }
}

// ==================== 使用建议 ====================
// 1. 推荐使用批量查询方式（queryWordDefinitions）以提高性能
// 2. 如果单词数量较多，建议添加进度提示
// 3. 查询失败不会影响单词保存，只是没有释义数据
// 4. 控制台会输出详细的 API 调用日志，便于调试
