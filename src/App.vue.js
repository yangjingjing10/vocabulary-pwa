import { ref } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import AiArticlePage from '@/pages/ai-article/AiArticlePage.vue';
import ArticleReadPage from '@/pages/article-read/ArticleReadPage.vue';
import HomePage from '@/pages/HomePage.vue';
import ProfilePage from '@/pages/profile/ProfilePage.vue';
import ApiSettingsPage from '@/pages/profile/api/ApiSettingsPage.vue';
import PromptConfigPage from '@/pages/profile/prompt/PromptConfigPage.vue';
import WordImportPage from '@/pages/word-import/WordImportPage.vue';
import VocabularyBookPage from '@/pages/vocabulary-book/VocabularyBookPage.vue';
import WordQuizPage from '@/pages/word-quiz/WordQuizPage.vue';
import '@/styles/pages/home-page.css';
registerSW({ immediate: true });
const activeView = ref('study');
const importType = ref('camera');
const selectedWords = ref([]);
const selectedArticleId = ref('');
const profileUser = ref({
    name: 'Vocabulary Learner',
    avatar: 'https://placehold.co/120x120/6366f1/ffffff?text=User',
    bio: 'Learning 20 words daily',
    streakDays: 5,
    totalWords: 345,
    totalArticles: 12,
    masteryRate: 82
});
function navigate(tab) {
    activeView.value = tab === 'study' ? 'study' : 'profile';
}
function openImport(type) {
    importType.value = type;
    activeView.value = 'import';
}
function saveWords(words) {
    console.log('Saved words:', words);
    activeView.value = 'study';
}
function generateArticle(words) {
    selectedWords.value = words;
    activeView.value = 'article';
}
function openArticleRead(articleId) {
    selectedArticleId.value = articleId;
    activeView.value = 'article-read';
}
function startQuizFromVocabulary(words) {
    selectedWords.value = words;
    activeView.value = 'word-quiz';
}
function startPractice(words) {
    selectedWords.value = words;
    activeView.value = 'word-quiz';
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.activeView === 'study') {
    /** @type {[typeof HomePage, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(HomePage, new HomePage({
        ...{ 'onNavigate': {} },
        ...{ 'onOpenImport': {} },
        ...{ 'onOpenVocabulary': {} },
        activeTab: "study",
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onNavigate': {} },
        ...{ 'onOpenImport': {} },
        ...{ 'onOpenVocabulary': {} },
        activeTab: "study",
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onNavigate: (__VLS_ctx.navigate)
    };
    const __VLS_7 = {
        onOpenImport: (__VLS_ctx.openImport)
    };
    const __VLS_8 = {
        onOpenVocabulary: (...[$event]) => {
            if (!(__VLS_ctx.activeView === 'study'))
                return;
            __VLS_ctx.activeView = 'vocabulary';
        }
    };
    var __VLS_9 = {};
    var __VLS_2;
}
else if (__VLS_ctx.activeView === 'profile') {
    /** @type {[typeof ProfilePage, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(ProfilePage, new ProfilePage({
        ...{ 'onNavigate': {} },
        ...{ 'onOpenApi': {} },
        ...{ 'onOpenPrompt': {} },
        user: (__VLS_ctx.profileUser),
        activeTab: "home",
    }));
    const __VLS_11 = __VLS_10({
        ...{ 'onNavigate': {} },
        ...{ 'onOpenApi': {} },
        ...{ 'onOpenPrompt': {} },
        user: (__VLS_ctx.profileUser),
        activeTab: "home",
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    let __VLS_13;
    let __VLS_14;
    let __VLS_15;
    const __VLS_16 = {
        onNavigate: (__VLS_ctx.navigate)
    };
    const __VLS_17 = {
        onOpenApi: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!(__VLS_ctx.activeView === 'profile'))
                return;
            __VLS_ctx.activeView = 'api';
        }
    };
    const __VLS_18 = {
        onOpenPrompt: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!(__VLS_ctx.activeView === 'profile'))
                return;
            __VLS_ctx.activeView = 'prompt';
        }
    };
    var __VLS_19 = {};
    var __VLS_12;
}
else if (__VLS_ctx.activeView === 'api') {
    /** @type {[typeof ApiSettingsPage, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(ApiSettingsPage, new ApiSettingsPage({
        ...{ 'onBack': {} },
    }));
    const __VLS_21 = __VLS_20({
        ...{ 'onBack': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    let __VLS_23;
    let __VLS_24;
    let __VLS_25;
    const __VLS_26 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!(__VLS_ctx.activeView === 'api'))
                return;
            __VLS_ctx.activeView = 'profile';
        }
    };
    var __VLS_27 = {};
    var __VLS_22;
}
else if (__VLS_ctx.activeView === 'prompt') {
    /** @type {[typeof PromptConfigPage, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(PromptConfigPage, new PromptConfigPage({
        ...{ 'onBack': {} },
    }));
    const __VLS_29 = __VLS_28({
        ...{ 'onBack': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    let __VLS_31;
    let __VLS_32;
    let __VLS_33;
    const __VLS_34 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!!(__VLS_ctx.activeView === 'api'))
                return;
            if (!(__VLS_ctx.activeView === 'prompt'))
                return;
            __VLS_ctx.activeView = 'profile';
        }
    };
    var __VLS_35 = {};
    var __VLS_30;
}
else if (__VLS_ctx.activeView === 'import') {
    /** @type {[typeof WordImportPage, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(WordImportPage, new WordImportPage({
        ...{ 'onBack': {} },
        ...{ 'onSave': {} },
        importType: (__VLS_ctx.importType),
    }));
    const __VLS_37 = __VLS_36({
        ...{ 'onBack': {} },
        ...{ 'onSave': {} },
        importType: (__VLS_ctx.importType),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    let __VLS_39;
    let __VLS_40;
    let __VLS_41;
    const __VLS_42 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!!(__VLS_ctx.activeView === 'api'))
                return;
            if (!!(__VLS_ctx.activeView === 'prompt'))
                return;
            if (!(__VLS_ctx.activeView === 'import'))
                return;
            __VLS_ctx.activeView = 'study';
        }
    };
    const __VLS_43 = {
        onSave: (__VLS_ctx.saveWords)
    };
    var __VLS_44 = {};
    var __VLS_38;
}
else if (__VLS_ctx.activeView === 'vocabulary') {
    /** @type {[typeof VocabularyBookPage, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(VocabularyBookPage, new VocabularyBookPage({
        ...{ 'onBack': {} },
        ...{ 'onGenerateArticle': {} },
        ...{ 'onOpenArticle': {} },
        ...{ 'onStartQuiz': {} },
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onBack': {} },
        ...{ 'onGenerateArticle': {} },
        ...{ 'onOpenArticle': {} },
        ...{ 'onStartQuiz': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_48;
    let __VLS_49;
    let __VLS_50;
    const __VLS_51 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!!(__VLS_ctx.activeView === 'api'))
                return;
            if (!!(__VLS_ctx.activeView === 'prompt'))
                return;
            if (!!(__VLS_ctx.activeView === 'import'))
                return;
            if (!(__VLS_ctx.activeView === 'vocabulary'))
                return;
            __VLS_ctx.activeView = 'study';
        }
    };
    const __VLS_52 = {
        onGenerateArticle: (__VLS_ctx.generateArticle)
    };
    const __VLS_53 = {
        onOpenArticle: (__VLS_ctx.openArticleRead)
    };
    const __VLS_54 = {
        onStartQuiz: (__VLS_ctx.startQuizFromVocabulary)
    };
    var __VLS_55 = {};
    var __VLS_47;
}
else if (__VLS_ctx.activeView === 'article') {
    /** @type {[typeof AiArticlePage, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(AiArticlePage, new AiArticlePage({
        ...{ 'onBack': {} },
        ...{ 'onStartPractice': {} },
        selectedWords: (__VLS_ctx.selectedWords),
    }));
    const __VLS_57 = __VLS_56({
        ...{ 'onBack': {} },
        ...{ 'onStartPractice': {} },
        selectedWords: (__VLS_ctx.selectedWords),
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    let __VLS_59;
    let __VLS_60;
    let __VLS_61;
    const __VLS_62 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!!(__VLS_ctx.activeView === 'api'))
                return;
            if (!!(__VLS_ctx.activeView === 'prompt'))
                return;
            if (!!(__VLS_ctx.activeView === 'import'))
                return;
            if (!!(__VLS_ctx.activeView === 'vocabulary'))
                return;
            if (!(__VLS_ctx.activeView === 'article'))
                return;
            __VLS_ctx.activeView = 'vocabulary';
        }
    };
    const __VLS_63 = {
        onStartPractice: (__VLS_ctx.startPractice)
    };
    var __VLS_64 = {};
    var __VLS_58;
}
else if (__VLS_ctx.activeView === 'article-read') {
    /** @type {[typeof ArticleReadPage, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(ArticleReadPage, new ArticleReadPage({
        ...{ 'onBack': {} },
        articleId: (__VLS_ctx.selectedArticleId),
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onBack': {} },
        articleId: (__VLS_ctx.selectedArticleId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!!(__VLS_ctx.activeView === 'api'))
                return;
            if (!!(__VLS_ctx.activeView === 'prompt'))
                return;
            if (!!(__VLS_ctx.activeView === 'import'))
                return;
            if (!!(__VLS_ctx.activeView === 'vocabulary'))
                return;
            if (!!(__VLS_ctx.activeView === 'article'))
                return;
            if (!(__VLS_ctx.activeView === 'article-read'))
                return;
            __VLS_ctx.activeView = 'vocabulary';
        }
    };
    var __VLS_72 = {};
    var __VLS_67;
}
else if (__VLS_ctx.activeView === 'word-quiz') {
    /** @type {[typeof WordQuizPage, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(WordQuizPage, new WordQuizPage({
        ...{ 'onBack': {} },
        words: (__VLS_ctx.selectedWords),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onBack': {} },
        words: (__VLS_ctx.selectedWords),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onBack: (...[$event]) => {
            if (!!(__VLS_ctx.activeView === 'study'))
                return;
            if (!!(__VLS_ctx.activeView === 'profile'))
                return;
            if (!!(__VLS_ctx.activeView === 'api'))
                return;
            if (!!(__VLS_ctx.activeView === 'prompt'))
                return;
            if (!!(__VLS_ctx.activeView === 'import'))
                return;
            if (!!(__VLS_ctx.activeView === 'vocabulary'))
                return;
            if (!!(__VLS_ctx.activeView === 'article'))
                return;
            if (!!(__VLS_ctx.activeView === 'article-read'))
                return;
            if (!(__VLS_ctx.activeView === 'word-quiz'))
                return;
            __VLS_ctx.activeView = 'vocabulary';
        }
    };
    var __VLS_80 = {};
    var __VLS_75;
}
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AiArticlePage: AiArticlePage,
            ArticleReadPage: ArticleReadPage,
            HomePage: HomePage,
            ProfilePage: ProfilePage,
            ApiSettingsPage: ApiSettingsPage,
            PromptConfigPage: PromptConfigPage,
            WordImportPage: WordImportPage,
            VocabularyBookPage: VocabularyBookPage,
            WordQuizPage: WordQuizPage,
            activeView: activeView,
            importType: importType,
            selectedWords: selectedWords,
            selectedArticleId: selectedArticleId,
            profileUser: profileUser,
            navigate: navigate,
            openImport: openImport,
            saveWords: saveWords,
            generateArticle: generateArticle,
            openArticleRead: openArticleRead,
            startQuizFromVocabulary: startQuizFromVocabulary,
            startPractice: startPractice,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
