import { onMounted, ref } from 'vue';
import { ArrowLeft, Loader2, Volume2, X, RefreshCw, Sparkles } from 'lucide-vue-next';
import { getArticle, addArticle } from '@/db/repositories/articles.repository';
import ParagraphTranslation from './components/ParagraphTranslation.vue';
import '@/styles/pages/article-read-page.css';
const props = defineProps();
const emit = defineEmits();
const articles = ref([]);
const isLoading = ref(true);
const isGenerating = ref(false);
const showDefinition = ref(false);
const selectedWord = ref('');
const wordDefinition = ref(null);
const isLoadingDefinition = ref(false);
onMounted(async () => {
    await loadArticle();
});
async function loadArticle() {
    try {
        const data = await getArticle(props.articleId);
        if (data) {
            articles.value = [data];
        }
    }
    catch (error) {
        console.error('Failed to load article:', error);
    }
    finally {
        isLoading.value = false;
    }
}
async function regenerateArticle() {
    if (isGenerating.value || articles.value.length === 0)
        return;
    isGenerating.value = true;
    try {
        const originalArticle = articles.value[articles.value.length - 1];
        const words = originalArticle.words || [];
        // 🔧 测试模式：生成模拟文章，不调用 API（节省 token）
        await new Promise(resolve => setTimeout(resolve, 2000));
        const articleTitle = `测试文章 - ${new Date().toLocaleTimeString('zh-CN')}`;
        const articleBody = `<p>This is a <mark>test</mark> paragraph with some vocabulary words. The purpose of this demo is to verify the regeneration functionality without consuming API tokens.</p>

<p>Another paragraph here. We can include more <mark>words</mark> from the vocabulary list to make it look realistic. This helps us test the layout and interaction before enabling the real API calls.</p>

<p>A third paragraph to demonstrate multiple sections. The <mark>article</mark> should display properly with all the styling and features we've implemented.</p>`;
        const newArticle = {
            id: `article-${Date.now()}`,
            title: articleTitle,
            content: articleBody,
            words: words,
            date: new Date().toISOString().split('T')[0],
            createdAt: Date.now(),
            isNew: true
        };
        articles.value.unshift(newArticle);
        setTimeout(() => {
            articles.value.forEach(article => {
                if (article.id !== newArticle.id) {
                    article.isNew = false;
                }
            });
        }, 3000);
        await addArticle(newArticle);
    }
    catch (error) {
        console.error('Failed to regenerate article:', error);
        alert('生成失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
    finally {
        isGenerating.value = false;
    }
}
async function handleWordClick(event) {
    const target = event.target;
    if (target.tagName === 'MARK') {
        const word = target.textContent?.trim().toLowerCase();
        if (word) {
            selectedWord.value = word;
            showDefinition.value = true;
            await fetchDefinition(word);
        }
    }
}
async function fetchDefinition(word) {
    isLoadingDefinition.value = true;
    wordDefinition.value = null;
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (response.ok) {
            const data = await response.json();
            wordDefinition.value = {
                word: data[0].word,
                phonetic: data[0].phonetic || data[0].phonetics?.[0]?.text || '',
                meanings: data[0].meanings.slice(0, 2).map((m) => ({
                    partOfSpeech: m.partOfSpeech,
                    definition: m.definitions[0].definition,
                    example: m.definitions[0].example
                }))
            };
        }
        else {
            wordDefinition.value = {
                word,
                phonetic: '',
                meanings: [{
                        partOfSpeech: '',
                        definition: 'Definition not available.',
                        example: ''
                    }]
            };
        }
    }
    catch (error) {
        wordDefinition.value = {
            word,
            phonetic: '',
            meanings: [{
                    partOfSpeech: '',
                    definition: 'Failed to fetch definition.',
                    example: ''
                }]
        };
    }
    finally {
        isLoadingDefinition.value = false;
    }
}
function closeDefinition() {
    showDefinition.value = false;
    wordDefinition.value = null;
}
function playAudio(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }
}
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)
        return '刚刚';
    if (diffMins < 60)
        return `${diffMins} 分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
        return `${diffHours} 小时前`;
    return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-read-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "article-read-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "article-read-icon-button" },
    type: "button",
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-read-header__actions" },
});
if (__VLS_ctx.articles.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.regenerateArticle) },
        ...{ class: "article-regenerate-button" },
        type: "button",
        disabled: (__VLS_ctx.isGenerating),
        title: "再生成一篇文章",
    });
    const __VLS_4 = {}.RefreshCw;
    /** @type {[typeof __VLS_components.RefreshCw, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (18),
        ...{ class: ({ 'is-spinning': __VLS_ctx.isGenerating }) },
    }));
    const __VLS_6 = __VLS_5({
        size: (18),
        ...{ class: ({ 'is-spinning': __VLS_ctx.isGenerating }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "article-read-content" },
});
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "article-read-loading" },
    });
    const __VLS_8 = {}.Loader2;
    /** @type {[typeof __VLS_components.Loader2, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ class: "is-spinning" },
        size: (32),
    }));
    const __VLS_10 = __VLS_9({
        ...{ class: "is-spinning" },
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "articles-container" },
    });
    if (__VLS_ctx.isGenerating) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "article-generating-indicator" },
        });
        const __VLS_12 = {}.Loader2;
        /** @type {[typeof __VLS_components.Loader2, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            ...{ class: "is-spinning" },
            size: (20),
        }));
        const __VLS_14 = __VLS_13({
            ...{ class: "is-spinning" },
            size: (20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    for (const [article, index] of __VLS_getVForSourceType((__VLS_ctx.articles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (article.id),
            ...{ class: "article-read-body" },
            ...{ class: ({ 'is-new': article.isNew }) },
        });
        if (__VLS_ctx.articles.length > 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "article-meta" },
            });
            if (article.isNew) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "article-badge article-badge--new" },
                });
                const __VLS_16 = {}.Sparkles;
                /** @type {[typeof __VLS_components.Sparkles, ]} */ ;
                // @ts-ignore
                const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                    size: (14),
                }));
                const __VLS_18 = __VLS_17({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_17));
            }
            if (article.createdAt) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "article-timestamp" },
                });
                (__VLS_ctx.formatTime(article.createdAt));
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "article-read-title" },
        });
        (article.title);
        /** @type {[typeof ParagraphTranslation, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(ParagraphTranslation, new ParagraphTranslation({
            ...{ 'onWordClick': {} },
            articleId: (article.id),
            content: (article.content),
        }));
        const __VLS_21 = __VLS_20({
            ...{ 'onWordClick': {} },
            articleId: (article.id),
            content: (article.content),
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        let __VLS_23;
        let __VLS_24;
        let __VLS_25;
        const __VLS_26 = {
            onWordClick: (__VLS_ctx.handleWordClick)
        };
        var __VLS_22;
        if (index < __VLS_ctx.articles.length - 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "article-separator" },
            });
        }
    }
}
const __VLS_27 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    name: "definition-modal",
}));
const __VLS_29 = __VLS_28({
    name: "definition-modal",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_30.slots.default;
if (__VLS_ctx.showDefinition) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeDefinition) },
        ...{ class: "definition-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "definition-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "definition-card__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedWord);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeDefinition) },
        type: "button",
    });
    const __VLS_31 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        size: (16),
    }));
    const __VLS_33 = __VLS_32({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    if (__VLS_ctx.isLoadingDefinition) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "definition-card__loading" },
        });
        const __VLS_35 = {}.Loader2;
        /** @type {[typeof __VLS_components.Loader2, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            ...{ class: "is-spinning" },
            size: (24),
        }));
        const __VLS_37 = __VLS_36({
            ...{ class: "is-spinning" },
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else if (__VLS_ctx.wordDefinition) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "definition-card__content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "definition-card__phonetic" },
        });
        if (__VLS_ctx.wordDefinition.phonetic) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.wordDefinition.phonetic);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showDefinition))
                        return;
                    if (!!(__VLS_ctx.isLoadingDefinition))
                        return;
                    if (!(__VLS_ctx.wordDefinition))
                        return;
                    __VLS_ctx.playAudio(__VLS_ctx.selectedWord);
                } },
            type: "button",
        });
        const __VLS_39 = {}.Volume2;
        /** @type {[typeof __VLS_components.Volume2, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            size: (14),
        }));
        const __VLS_41 = __VLS_40({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        for (const [meaning, idx] of __VLS_getVForSourceType((__VLS_ctx.wordDefinition.meanings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (idx),
                ...{ class: "definition-card__meaning" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "definition-card__pos" },
            });
            (meaning.partOfSpeech);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "definition-card__def" },
            });
            (meaning.definition);
            if (meaning.example) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "definition-card__example" },
                });
                (meaning.example);
            }
        }
    }
}
var __VLS_30;
/** @type {__VLS_StyleScopedClasses['article-read-page']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-header']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-header__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['article-regenerate-button']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-content']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-container']} */ ;
/** @type {__VLS_StyleScopedClasses['article-generating-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-body']} */ ;
/** @type {__VLS_StyleScopedClasses['article-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['article-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['article-badge--new']} */ ;
/** @type {__VLS_StyleScopedClasses['article-timestamp']} */ ;
/** @type {__VLS_StyleScopedClasses['article-read-title']} */ ;
/** @type {__VLS_StyleScopedClasses['article-separator']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__header']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__content']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__phonetic']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__meaning']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__pos']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__def']} */ ;
/** @type {__VLS_StyleScopedClasses['definition-card__example']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            Loader2: Loader2,
            Volume2: Volume2,
            X: X,
            RefreshCw: RefreshCw,
            Sparkles: Sparkles,
            ParagraphTranslation: ParagraphTranslation,
            emit: emit,
            articles: articles,
            isLoading: isLoading,
            isGenerating: isGenerating,
            showDefinition: showDefinition,
            selectedWord: selectedWord,
            wordDefinition: wordDefinition,
            isLoadingDefinition: isLoadingDefinition,
            regenerateArticle: regenerateArticle,
            handleWordClick: handleWordClick,
            closeDefinition: closeDefinition,
            playAudio: playAudio,
            formatTime: formatTime,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
