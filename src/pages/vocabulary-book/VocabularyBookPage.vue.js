import { computed, onMounted, ref, watch } from 'vue';
import { ArrowLeft, BookOpen, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileText, Search, Volume2, X, Trash2, Bug } from 'lucide-vue-next';
import { getArticlesByDate, addArticle } from '@/db/repositories/articles.repository';
import { getPromptConfig } from '@/db/repositories/prompt-config.repository';
import { getTranslationRecordsByDate } from '@/db/repositories/translation-records.repository';
import { getAllWords, deleteWord, addWord } from '@/db/repositories/words.repository';
import TranslationRecordsList from './components/TranslationRecordsList.vue';
import TranslationRecordModal from './components/TranslationRecordModal.vue';
import '@/styles/pages/vocabulary-book-page.css';
const emit = defineEmits();
const showSearch = ref(false);
const searchQuery = ref('');
const isGenerating = ref(false);
const showCalendarModal = ref(false);
const selectedTranslationRecord = ref(null);
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const selectYear = ref(currentYear);
const selectMonth = ref(currentMonth);
// Calculate current week number based on semester start date
async function getCurrentWeekNumber() {
    try {
        const promptConfig = await getPromptConfig();
        const semesterStartDate = promptConfig?.semesterStartDate;
        if (semesterStartDate) {
            // ?????????????????????
            const startDate = new Date(semesterStartDate);
            const today = new Date();
            const diffTime = today.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;
            console.log('?? Semester start:', semesterStartDate);
            console.log('?? Days since start:', diffDays);
            console.log('?? Current week:', weekNum);
            return Math.max(1, Math.min(weekNum, 20)); // ??? 1-20 ???
        }
    }
    catch (error) {
        console.log('Using default week calculation');
    }
    // ???????????????????????
    const today = new Date();
    const currentDay = today.getDate();
    if (currentDay <= 7)
        return 1;
    if (currentDay <= 14)
        return 2;
    if (currentDay <= 21)
        return 3;
    return 4;
}
const currentWeekNum = ref(1); // ???? 1?? onMounted ???
console.log('?? Initial week number:', currentWeekNum.value);
const currentWeekLabel = computed(() => `${selectYear.value}/${selectMonth.value.toString().padStart(2, '0')} Week ${currentWeekNum.value}`);
const monthWeeks = computed(() => {
    return [
        { weekNum: 1, range: `${selectMonth.value.toString().padStart(2, '0')}/01 - ${selectMonth.value.toString().padStart(2, '0')}/07`, wordCount: 0 },
        { weekNum: 2, range: `${selectMonth.value.toString().padStart(2, '0')}/08 - ${selectMonth.value.toString().padStart(2, '0')}/14`, wordCount: 0 },
        { weekNum: 3, range: `${selectMonth.value.toString().padStart(2, '0')}/15 - ${selectMonth.value.toString().padStart(2, '0')}/21`, wordCount: 0 },
        { weekNum: 4, range: `${selectMonth.value.toString().padStart(2, '0')}/22 - ${selectMonth.value.toString().padStart(2, '0')}/28`, wordCount: 0 }
    ];
});
const weekDays = ref([]);
const totalWordsThisWeek = computed(() => weekDays.value.reduce((sum, day) => sum + day.words.length, 0));
const hasAnyWords = computed(() => weekDays.value.some(day => day.hasWords));
onMounted(async () => {
    // ?????????
    currentWeekNum.value = await getCurrentWeekNumber();
    selectYear.value = currentYear;
    selectMonth.value = currentMonth;
    console.log('?? Initialized to current week:', currentWeekNum.value);
    await loadWords();
});
watch([selectYear, selectMonth, currentWeekNum], async () => {
    await loadWords();
});
async function loadWords() {
    try {
        const allWords = await getAllWords();
        const weekStart = getWeekStartDate(selectYear.value, selectMonth.value, currentWeekNum.value);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dateFormatted = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
            const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayWords = allWords.filter(w => w.date === dateStr).map(w => ({
                id: parseInt(w.id.split('-')[0]) || Date.now(),
                word: w.word,
                phonetic: w.phonetic || '',
                pos: w.pos || 'n.',
                translation: w.translation || ''
            }));
            // Get article count for this date
            const dayArticles = await getArticlesByDate(dateStr);
            // Get translation records for this date (with error handling)
            let dayTranslations = [];
            try {
                dayTranslations = await getTranslationRecordsByDate(dateStr);
                if (dayTranslations.length > 0) {
                    console.log(`?? Found ${dayTranslations.length} translation record(s) for ${dateStr}`, dayTranslations);
                }
            }
            catch (error) {
                // Translation records table might not exist yet, ignore error
                console.warn('Translation records not available yet:', error);
            }
            if (dayWords.length > 0 || isToday) {
                days.push({
                    date: dateStr,
                    dateFormatted,
                    dayOfWeek,
                    isToday,
                    hasWords: dayWords.length > 0,
                    source: dayWords.length > 0 ? `${dayWords.length} words` : '',
                    expanded: isToday && dayWords.length > 0,
                    words: dayWords,
                    articleCount: dayArticles.length,
                    translationRecords: dayTranslations
                });
            }
        }
        weekDays.value = days.reverse();
    }
    catch (error) {
        console.error('Failed to load words:', error);
    }
}
function getWeekStartDate(year, month, weekNum) {
    const firstDay = new Date(year, month - 1, 1);
    const startDay = (weekNum - 1) * 7 + 1;
    return new Date(year, month - 1, startDay);
}
function toggleDayExpand(day) {
    if (day.hasWords)
        day.expanded = !day.expanded;
}
function prevWeek() {
    if (currentWeekNum.value > 1) {
        currentWeekNum.value--;
    }
}
function nextWeek() {
    if (currentWeekNum.value < 4) {
        currentWeekNum.value++;
    }
}
function changeMonth(delta) {
    selectMonth.value += delta;
    if (selectMonth.value > 12) {
        selectMonth.value = 1;
        selectYear.value++;
    }
    else if (selectMonth.value < 1) {
        selectMonth.value = 12;
        selectYear.value--;
    }
    currentWeekNum.value = 1;
}
function selectWeekFromModal(w) {
    currentWeekNum.value = w.weekNum;
    showCalendarModal.value = false;
}
async function resetToCurrentWeek() {
    selectYear.value = currentYear;
    selectMonth.value = currentMonth;
    currentWeekNum.value = await getCurrentWeekNumber();
    showCalendarModal.value = false;
}
function playAudio(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }
}
async function openFirstArticle(date) {
    try {
        const articles = await getArticlesByDate(date);
        if (articles.length > 0) {
            emit('openArticle', articles[0].id);
        }
    }
    catch (error) {
        console.error('Failed to open article:', error);
    }
}
function viewTranslationRecord(record) {
    selectedTranslationRecord.value = record;
}
function closeTranslationModal() {
    selectedTranslationRecord.value = null;
}
async function startQuiz(day) {
    const wordsToQuiz = day.words.map(w => w.word);
    // ?????????
    if (day.articleCount > 0) {
        // ???????????
        emit('startQuiz', wordsToQuiz);
    }
    else {
        // ??????????
        isGenerating.value = true;
        emit('generateArticle', wordsToQuiz);
    }
}
async function fillTestData() {
    if (!confirm('🧪 开发者调试功能\n\n将填充以下测试数据：\n- 10-15 个测试单词\n- 2-3 篇测试文章\n- 1 条翻译练习记录\n\n确认继续？')) {
        return;
    }
    try {
        const todayDate = new Date().toISOString().split('T')[0];
        // 测试单词数据
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
            { word: 'jungle', phonetic: '/ˈdʒʌŋɡl/', pos: 'n.', translation: '丛林' },
            { word: 'kitchen', phonetic: '/ˈkɪtʃɪn/', pos: 'n.', translation: '厨房' },
            { word: 'library', phonetic: '/ˈlaɪbreri/', pos: 'n.', translation: '图书馆' },
            { word: 'mountain', phonetic: '/ˈmaʊntən/', pos: 'n.', translation: '山' },
            { word: 'notebook', phonetic: '/ˈnoʊtbʊk/', pos: 'n.', translation: '笔记本' },
            { word: 'ocean', phonetic: '/ˈoʊʃn/', pos: 'n.', translation: '海洋' }
        ];
        // 1. 填充单词
        let wordCount = 0;
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
            });
            wordCount++;
        }
        // 2. 填充测试文章
        const testArticles = [
            {
                title: '测试文章 1',
                content: `
<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
  <h1 style="color: #667eea; margin-bottom: 20px;">A Day in the Garden</h1>
  <p style="line-height: 1.8; margin-bottom: 15px;">
    Yesterday, I visited a beautiful <strong>garden</strong> near my <strong>house</strong>. 
    There were many colorful <strong>flowers</strong> blooming everywhere. I saw an <strong>apple</strong> 
    tree and a <strong>banana</strong> tree in the corner.
  </p>
  <p style="line-height: 1.8; margin-bottom: 15px;">
    A small <strong>cat</strong> was playing under the tree, and a friendly <strong>dog</strong> 
    was running around. The garden felt like a peaceful <strong>island</strong> away from the busy city.
  </p>
  <p style="line-height: 1.8; color: #6b7280; font-size: 14px;">
    Practice words: apple, banana, cat, dog, flower, garden, house, island
  </p>
</div>`,
                words: ['apple', 'banana', 'cat', 'dog', 'flower', 'house', 'island']
            },
            {
                title: '测试文章 2',
                content: `
<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
  <h1 style="color: #667eea; margin-bottom: 20px;">My Favorite Place</h1>
  <p style="line-height: 1.8; margin-bottom: 15px;">
    The <strong>library</strong> is my favorite place to study. It's located near a tall <strong>mountain</strong>, 
    and you can see the beautiful <strong>ocean</strong> from its windows.
  </p>
  <p style="line-height: 1.8; margin-bottom: 15px;">
    I always bring my <strong>notebook</strong> and sometimes my <strong>guitar</strong>. 
    After studying, I like to walk through the nearby <strong>jungle</strong> trail and 
    prepare a simple meal in my <strong>kitchen</strong> when I get home.
  </p>
  <p style="line-height: 1.8; color: #6b7280; font-size: 14px;">
    Practice words: library, mountain, ocean, notebook, guitar, jungle, kitchen
  </p>
</div>`,
                words: ['library', 'mountain', 'ocean', 'notebook', 'guitar', 'jungle', 'kitchen']
            },
            {
                title: '测试文章 3',
                content: `
<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
  <h1 style="color: #667eea; margin-bottom: 20px;">Safari Adventure</h1>
  <p style="line-height: 1.8; margin-bottom: 15px;">
    During my safari trip, I saw an amazing <strong>elephant</strong> drinking water from a river. 
    The guide took us through the dense <strong>jungle</strong> where we discovered a hidden <strong>island</strong> 
    in the middle of a lake.
  </p>
  <p style="line-height: 1.8; margin-bottom: 15px;">
    We stayed in a comfortable <strong>house</strong> near the <strong>mountain</strong>. 
    Every morning, I would sit in the <strong>kitchen</strong> and write in my <strong>notebook</strong> 
    while watching the sunrise over the <strong>ocean</strong>.
  </p>
  <p style="line-height: 1.8; color: #6b7280; font-size: 14px;">
    Practice words: elephant, jungle, island, house, mountain, kitchen, notebook, ocean
  </p>
</div>`,
                words: ['elephant', 'jungle', 'island', 'house', 'mountain', 'kitchen', 'notebook', 'ocean']
            }
        ];
        let articleCount = 0;
        for (const article of testArticles) {
            await addArticle({
                id: `test-article-${Date.now()}-${Math.random()}`,
                title: article.title,
                content: article.content,
                words: article.words,
                date: todayDate,
                createdAt: Date.now()
            });
            articleCount++;
        }
        // 3. 填充翻译练习记录（保存为文章格式）
        const translationRecordContent = `
<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
  <h1 style="color: #667eea; margin-bottom: 10px;">🎯 翻译练习记录</h1>
  <p style="color: #6b7280; margin-bottom: 30px;">得分：<strong style="color: #3b82f6; font-size: 24px;">85/100</strong> ⭐⭐⭐⭐</p>
  
  <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #667eea;">
    <h3 style="margin-top: 0;">📝 中文原文</h3>
    <p style="line-height: 1.8;">我喜欢在图书馆学习。从窗户可以看到美丽的海洋和远处的山脉。每次学习后，我都会在笔记本上记录我的想法。</p>
  </div>
  
  <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #f97316;">
    <h3 style="margin-top: 0;">✍️ 你的译文</h3>
    <p style="line-height: 1.8;">I like studying in the library. I can see the beautiful ocean and mountains in the distance from the window. After each study session, I record my thoughts in my notebook.</p>
  </div>
  
  <div style="background: #ecfdf5; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #10b981;">
    <h3 style="margin-top: 0;">💬 AI 评语</h3>
    <p style="line-height: 1.8;">整体翻译流畅自然，准确传达了原文意思。词汇使用恰当，包含了 library, ocean, mountains, notebook 等目标词汇。句式结构清晰。建议："in the distance" 可以提前到 "mountains" 之前，使表达更加地道。</p>
  </div>
  
  <div style="background: #eff6ff; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
    <h3 style="margin-top: 0;">📖 参考译文</h3>
    <div style="margin-bottom: 15px;">
      <strong style="color: #3b82f6;">参考译文 1：</strong>
      <p style="line-height: 1.8; margin: 5px 0 0 0;">I enjoy studying at the library. From the windows, I can see the beautiful ocean and distant mountains. After studying, I always write down my thoughts in my notebook.</p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
    练习时间：${new Date().toLocaleString('zh-CN')}
  </div>
</div>`;
        await addArticle({
            id: `test-translation-${Date.now()}`,
            title: '翻译练习 - 得分 85',
            content: translationRecordContent,
            words: ['library', 'ocean', 'mountain', 'notebook'],
            date: todayDate,
            createdAt: Date.now()
        });
        // 刷新数据
        await loadWords();
        alert(`✅ 测试数据已填充！\n\n共添加：\n- ${wordCount} 个单词\n- ${articleCount} 篇文章\n- 1 条翻译练习记录`);
    }
    catch (error) {
        console.error('Failed to fill test data:', error);
        alert('❌ 填充测试数据失败：' + error);
    }
}
async function deleteAllData() {
    if (!confirm('?? ???????????\n\n?????\n- ????\n- ????\n- ??????\n\n????????')) {
        return;
    }
    try {
        // ??????
        const allWords = await getAllWords();
        for (const word of allWords) {
            await deleteWord(word.id);
        }
        // ?? articles ? translationRecords
        const { initDatabase } = await import('@/db/index');
        const db = await initDatabase();
        // ?? articles
        await db.clear('articles');
        // ?? translationRecords
        await db.clear('translationRecords');
        // ????
        await loadWords();
        alert('? ???????');
    }
    catch (error) {
        console.error('Failed to delete data:', error);
        alert('? ?????' + error);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "vocabulary-book-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "vocab-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "vocab-icon-button" },
    type: "button",
    'aria-label': "Back",
});
const __VLS_0 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (18),
}));
const __VLS_2 = __VLS_1({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "vocab-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
if (__VLS_ctx.totalWordsThisWeek > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.totalWordsThisWeek);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showSearch = !__VLS_ctx.showSearch;
        } },
    ...{ class: "vocab-icon-button" },
    type: "button",
    'aria-label': "Search",
});
const __VLS_4 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (16),
}));
const __VLS_6 = __VLS_5({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.fillTestData) },
    ...{ class: "vocab-icon-button vocab-debug-button" },
    type: "button",
    'aria-label': "Developer Debug",
    title: "开发者调试功能",
});
const __VLS_8 = {}.Bug;
/** @type {[typeof __VLS_components.Bug, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (16),
}));
const __VLS_10 = __VLS_9({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.deleteAllData) },
    ...{ class: "vocab-icon-button vocab-danger-button" },
    type: "button",
    'aria-label': "Clear All Data",
    title: "清空所有数据",
});
const __VLS_12 = {}.Trash2;
/** @type {[typeof __VLS_components.Trash2, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    size: (16),
}));
const __VLS_14 = __VLS_13({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "vocab-week-control" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.prevWeek) },
    type: "button",
    disabled: (__VLS_ctx.currentWeekNum === 1),
});
const __VLS_16 = {}.ChevronLeft;
/** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    size: (16),
}));
const __VLS_18 = __VLS_17({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showCalendarModal = true;
        } },
    ...{ class: "vocab-week-label" },
});
const __VLS_20 = {}.Calendar;
/** @type {[typeof __VLS_components.Calendar, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    size: (14),
}));
const __VLS_22 = __VLS_21({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.currentWeekLabel);
const __VLS_24 = {}.ChevronDown;
/** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    size: (12),
}));
const __VLS_26 = __VLS_25({
    size: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.nextWeek) },
    type: "button",
    disabled: (__VLS_ctx.currentWeekNum === 4),
});
const __VLS_28 = {}.ChevronRight;
/** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    size: (16),
}));
const __VLS_30 = __VLS_29({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
if (__VLS_ctx.showSearch) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-search" },
    });
    const __VLS_32 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        size: (14),
    }));
    const __VLS_34 = __VLS_33({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.searchQuery),
        type: "text",
        placeholder: "Search words...",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "vocab-content" },
});
if (!__VLS_ctx.hasAnyWords) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-empty" },
    });
    const __VLS_36 = {}.BookOpen;
    /** @type {[typeof __VLS_components.BookOpen, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (48),
    }));
    const __VLS_38 = __VLS_37({
        size: (48),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-timeline" },
    });
    for (const [day] of __VLS_getVForSourceType((__VLS_ctx.weekDays))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (day.date),
            ...{ class: "vocab-day" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vocab-day__dot" },
            ...{ class: ({ 'is-today': day.isToday, 'has-words': day.hasWords }) },
        });
        if (day.isToday) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vocab-day__card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hasAnyWords))
                        return;
                    __VLS_ctx.toggleDayExpand(day);
                } },
            ...{ class: "vocab-day__header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vocab-day__date" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (day.dateFormatted);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (day.dayOfWeek);
        if (day.isToday) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "vocab-today-badge" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vocab-day__meta" },
        });
        if (day.hasWords) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (day.words.length);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vocab-day__actions" },
        });
        if (day.hasWords) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hasAnyWords))
                            return;
                        if (!(day.hasWords))
                            return;
                        __VLS_ctx.startQuiz(day);
                    } },
                type: "button",
                ...{ class: "vocab-start-quiz-btn" },
            });
        }
        if (day.hasWords && !day.expanded) {
            const __VLS_40 = {}.ChevronDown;
            /** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                size: (14),
            }));
            const __VLS_42 = __VLS_41({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        }
        if (day.hasWords && day.expanded) {
            const __VLS_44 = {}.ChevronUp;
            /** @type {[typeof __VLS_components.ChevronUp, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                size: (14),
            }));
            const __VLS_46 = __VLS_45({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        }
        if (day.hasWords && day.expanded) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "vocab-day__words" },
            });
            if (day.articleCount > 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "vocab-day__records" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "vocab-day__records-title" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.hasAnyWords))
                                return;
                            if (!(day.hasWords && day.expanded))
                                return;
                            if (!(day.articleCount > 0))
                                return;
                            __VLS_ctx.openFirstArticle(day.date);
                        } },
                    ...{ class: "vocab-day__record-item" },
                    type: "button",
                });
                const __VLS_48 = {}.FileText;
                /** @type {[typeof __VLS_components.FileText, ]} */ ;
                // @ts-ignore
                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                    size: (14),
                }));
                const __VLS_50 = __VLS_49({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (day.articleCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "vocab-day__record-arrow" },
                });
            }
            if (day.translationRecords.length > 0) {
                /** @type {[typeof TranslationRecordsList, ]} */ ;
                // @ts-ignore
                const __VLS_52 = __VLS_asFunctionalComponent(TranslationRecordsList, new TranslationRecordsList({
                    ...{ 'onViewRecord': {} },
                    records: (day.translationRecords),
                }));
                const __VLS_53 = __VLS_52({
                    ...{ 'onViewRecord': {} },
                    records: (day.translationRecords),
                }, ...__VLS_functionalComponentArgsRest(__VLS_52));
                let __VLS_55;
                let __VLS_56;
                let __VLS_57;
                const __VLS_58 = {
                    onViewRecord: (__VLS_ctx.viewTranslationRecord)
                };
                var __VLS_54;
            }
            else if (day.articleCount === 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "vocab-day__no-records" },
                });
            }
            for (const [word] of __VLS_getVForSourceType((day.words))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (word.id),
                    ...{ class: "vocab-word" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "vocab-word__content" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "vocab-word__main" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (word.word);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "vocab-word__phonetic" },
                });
                (word.phonetic);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "vocab-word__pos" },
                });
                (word.pos);
                (word.translation);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.hasAnyWords))
                                return;
                            if (!(day.hasWords && day.expanded))
                                return;
                            __VLS_ctx.playAudio(word.word);
                        } },
                    ...{ class: "vocab-word__audio" },
                    type: "button",
                });
                const __VLS_59 = {}.Volume2;
                /** @type {[typeof __VLS_components.Volume2, ]} */ ;
                // @ts-ignore
                const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
                    size: (14),
                }));
                const __VLS_61 = __VLS_60({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_60));
            }
        }
    }
}
const __VLS_63 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    name: "vocab-modal",
}));
const __VLS_65 = __VLS_64({
    name: "vocab-modal",
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
__VLS_66.slots.default;
if (__VLS_ctx.isGenerating) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-generating" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-generating__content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-generating__icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.selectedWordIds.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-generating__progress" },
    });
}
var __VLS_66;
const __VLS_67 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    name: "vocab-modal",
}));
const __VLS_69 = __VLS_68({
    name: "vocab-modal",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
if (__VLS_ctx.showCalendarModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCalendarModal))
                    return;
                __VLS_ctx.showCalendarModal = false;
            } },
        ...{ class: "vocab-calendar-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-calendar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-calendar__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-calendar__title" },
    });
    const __VLS_71 = {}.Calendar;
    /** @type {[typeof __VLS_components.Calendar, ]} */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
        size: (20),
    }));
    const __VLS_73 = __VLS_72({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCalendarModal))
                    return;
                __VLS_ctx.showCalendarModal = false;
            } },
        type: "button",
    });
    const __VLS_75 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        size: (16),
    }));
    const __VLS_77 = __VLS_76({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-calendar__month-nav" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCalendarModal))
                    return;
                __VLS_ctx.changeMonth(-1);
            } },
        type: "button",
    });
    const __VLS_79 = {}.ChevronLeft;
    /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        size: (16),
    }));
    const __VLS_81 = __VLS_80({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectYear);
    (__VLS_ctx.selectMonth.toString().padStart(2, '0'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCalendarModal))
                    return;
                __VLS_ctx.changeMonth(1);
            } },
        type: "button",
    });
    const __VLS_83 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        size: (16),
    }));
    const __VLS_85 = __VLS_84({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "vocab-calendar__weeks" },
    });
    for (const [w] of __VLS_getVForSourceType((__VLS_ctx.monthWeeks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showCalendarModal))
                        return;
                    __VLS_ctx.selectWeekFromModal(w);
                } },
            key: (w.weekNum),
            type: "button",
            ...{ class: ({ 'is-current': w.weekNum === __VLS_ctx.currentWeekNum }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "vocab-calendar__week-num" },
        });
        (w.weekNum);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "vocab-calendar__word-count" },
        });
        (w.wordCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "vocab-calendar__week-range" },
        });
        (w.range);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetToCurrentWeek) },
        ...{ class: "vocab-calendar__reset" },
        type: "button",
    });
}
var __VLS_70;
/** @type {[typeof TranslationRecordModal, ]} */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(TranslationRecordModal, new TranslationRecordModal({
    ...{ 'onClose': {} },
    record: (__VLS_ctx.selectedTranslationRecord),
}));
const __VLS_88 = __VLS_87({
    ...{ 'onClose': {} },
    record: (__VLS_ctx.selectedTranslationRecord),
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
let __VLS_90;
let __VLS_91;
let __VLS_92;
const __VLS_93 = {
    onClose: (__VLS_ctx.closeTranslationModal)
};
var __VLS_89;
/** @type {__VLS_StyleScopedClasses['vocabulary-book-page']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-header']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-debug-button']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-danger-button']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-week-control']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-week-label']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-search']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-content']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__card']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__header']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__date']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-today-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-start-quiz-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__words']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__records']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__records-title']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__record-item']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__record-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-day__no-records']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-word']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-word__content']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-word__main']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-word__phonetic']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-word__pos']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-word__audio']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-generating']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-generating__content']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-generating__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-generating__progress']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__header']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__title']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__month-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__weeks']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__week-num']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__word-count']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__week-range']} */ ;
/** @type {__VLS_StyleScopedClasses['vocab-calendar__reset']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            BookOpen: BookOpen,
            Calendar: Calendar,
            ChevronDown: ChevronDown,
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            ChevronUp: ChevronUp,
            FileText: FileText,
            Search: Search,
            Volume2: Volume2,
            X: X,
            Trash2: Trash2,
            Bug: Bug,
            TranslationRecordsList: TranslationRecordsList,
            TranslationRecordModal: TranslationRecordModal,
            emit: emit,
            showSearch: showSearch,
            searchQuery: searchQuery,
            isGenerating: isGenerating,
            showCalendarModal: showCalendarModal,
            selectedTranslationRecord: selectedTranslationRecord,
            selectYear: selectYear,
            selectMonth: selectMonth,
            currentWeekNum: currentWeekNum,
            currentWeekLabel: currentWeekLabel,
            monthWeeks: monthWeeks,
            weekDays: weekDays,
            totalWordsThisWeek: totalWordsThisWeek,
            hasAnyWords: hasAnyWords,
            toggleDayExpand: toggleDayExpand,
            prevWeek: prevWeek,
            nextWeek: nextWeek,
            changeMonth: changeMonth,
            selectWeekFromModal: selectWeekFromModal,
            resetToCurrentWeek: resetToCurrentWeek,
            playAudio: playAudio,
            openFirstArticle: openFirstArticle,
            viewTranslationRecord: viewTranslationRecord,
            closeTranslationModal: closeTranslationModal,
            startQuiz: startQuiz,
            fillTestData: fillTestData,
            deleteAllData: deleteAllData,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
});
; /* PartiallyEnd: #4569/main.vue */
