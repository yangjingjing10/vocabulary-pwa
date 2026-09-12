import { addWord, getAllWords, deleteWord } from '@/db/repositories/words.repository'
import { addArticle } from '@/db/repositories/articles.repository'

/**
 * 开发调试工具
 * 用于填充测试数据和清空数据
 */
export function useDebugTools() {
  
  // 填充测试数据
  async function fillTestData() {
    if (!confirm('🧪 开发者调试功能\n\n将填充以下测试数据：\n- 10-15 个测试单词\n- 2-3 篇测试文章\n\n确认继续？')) {
      return false
    }
    
    try {
      const todayDate = new Date().toISOString().split('T')[0]
      
      const testWords = [
        { word: 'apple', phonetic: '/ˈæpl/', pos: 'n.', translation: '苹果' },
        { word: 'banana', phonetic: '/bəˈnænə/', pos: 'n.', translation: '香蕉' },
        { word: 'cat', phonetic: '/kæt/', pos: 'n.', translation: '猫' },
        { word: 'dog', phonetic: '/dɔːɡ/', pos: 'n.', translation: '狗' },
        { word: 'elephant', phonetic: '/ˈelɪfənt/', pos: 'n.', translation: '大象' },
        { word: 'flower', phonetic: '/ˈflaʊər/', pos: 'n.', translation: '花' },
        { word: 'guitar', phonetic: '/ɡɪˈtɑːr/', pos: 'n.', translation: '吉他' },
        { word: 'house', phonetic: '/haʊs/', pos: 'n.', translation: '房子' },
        { word: 'island', phonetic: '/ˈaɪlənd/', pos: 'n.', translation: '岛屿' },
        { word: 'jungle', phonetic: '/ˈdʒʌŋɡl/', pos: 'n.', translation: '丛林' }
      ]
      
      // 添加单词
      let wordCount = 0
      for (const wordData of testWords) {
        await addWord({
          id: `test-${Date.now()}-${Math.random()}`,
          word: wordData.word,
          phonetic: wordData.phonetic,
          pos: wordData.pos,
          translation: wordData.translation,
          source: 'manual',
          addedAt: Date.now(),
          date: todayDate
        })
        wordCount++
      }
      
      // 添加测试文章
      const testArticles = [
        {
          title: '测试文章 1 - Garden Visit',
          content: `<p>Yesterday, I visited a beautiful garden near my <mark>house</mark>. There were many colorful <mark>flowers</mark> blooming everywhere. I saw an <mark>apple</mark> tree and a <mark>banana</mark> tree in the corner.</p><p>A small <mark>cat</mark> was playing under the tree, and a friendly <mark>dog</mark> was running around. The garden felt like a peaceful <mark>island</mark> away from the busy city.</p>`,
          words: ['apple', 'banana', 'cat', 'dog', 'flower', 'house', 'island']
        },
        {
          title: '测试文章 2 - Jungle Adventure',
          content: `<p>During my safari trip, I saw an amazing <mark>elephant</mark> drinking water from a river. The guide took us through the dense <mark>jungle</mark> where we discovered hidden treasures.</p><p>We stayed in a comfortable <mark>house</mark> near the mountain. Every evening, I would play my <mark>guitar</mark> while watching the sunset over the beautiful <mark>island</mark>.</p>`,
          words: ['elephant', 'jungle', 'house', 'guitar', 'island']
        }
      ]
      
      let articleCount = 0
      for (const article of testArticles) {
        await addArticle({
          id: `test-article-${Date.now()}-${Math.random()}`,
          title: article.title,
          content: article.content,
          words: article.words,
          date: todayDate,
          createdAt: Date.now()
        })
        articleCount++
      }
      
      alert(`✅ 测试数据已填充！\n\n共添加：\n- ${wordCount} 个单词\n- ${articleCount} 篇文章`)
      return true
      
    } catch (error) {
      console.error('Failed to fill test data:', error)
      alert('❌ 填充测试数据失败：' + error)
      return false
    }
  }

  // 清空所有数据
  async function deleteAllData() {
    if (!confirm('⚠️ 危险操作！\n\n将删除所有：\n- 所有单词\n- 所有文章\n- 所有翻译记录\n\n此操作不可撤销，确认继续？')) {
      return false
    }
    
    try {
      // 删除所有单词
      const allWords = await getAllWords()
      for (const word of allWords) {
        await deleteWord(word.id)
      }
      
      // 清空文章和翻译记录表
      const { initDatabase } = await import('@/db/index')
      const db = await initDatabase()
      await db.clear('articles')
      await db.clear('translationRecords')
      if (db.objectStoreNames.contains('choiceQuizRecords')) {
        await db.clear('choiceQuizRecords')
      }
      if (db.objectStoreNames.contains('choicePracticeStates')) {
        await db.clear('choicePracticeStates')
      }
      
      alert('✅ 所有数据已清空')
      return true
      
    } catch (error) {
      console.error('Failed to delete data:', error)
      alert('❌ 清空失败：' + error)
      return false
    }
  }

  return {
    fillTestData,
    deleteAllData
  }
}
