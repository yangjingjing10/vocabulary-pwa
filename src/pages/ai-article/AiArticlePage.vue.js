import { onMounted, ref } from 'vue';
import { ArrowLeft, Loader2, Sparkles, RefreshCw } from 'lucide-vue-next';
import { addArticle } from '@/db/repositories/articles.repository';
import { getApiConfig } from '@/db/repositories/api-config.repository';
import { getActivePromptConfig } from '@/db/repositories/prompt-config.repository';
import '@/styles/pages/ai-article-page.css';
const props = defineProps();
const emit = defineEmits();
const isGenerating = ref(false);
const articles = ref([]);
const activeArticleId = ref('');
const showError = ref(false);
const errorMessage = ref('');
onMounted(async () => {
    await generateArticle();
});
async function generateArticle() {
    isGenerating.value = true;
    showError.value = false;
    try {
        const apiConfig = await getApiConfig();
        const promptConfig = await getActivePromptConfig();
        if (!apiConfig || !apiConfig.apiKey) {
            throw new Error('Please configure API key first');
        }
        const systemPrompt = buildSystemPrompt(promptConfig);
        const userPrompt = buildUserPrompt(props.selectedWords, promptConfig);
        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: apiConfig.textModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7
            })
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('No content returned from API');
        }
        // Extract title and highlight words
        const lines = content.split('\n').filter((line) => line.trim());
        const articleTitle = lines[0].replace(/^#+\s*/, '');
        let articleBody = lines.slice(1).join('\n\n');
        // Highlight vocabulary words
        props.selectedWords.forEach(word => {
            const regex = new RegExp(`\\b(${word})\\b`, 'gi');
            articleBody = articleBody.replace(regex, '<mark>$1</mark>');
        });
        // Create new article object
        const newArticle = {
            id: `article-${Date.now()}`,
            title: articleTitle,
            content: articleBody,
            createdAt: Date.now(),
            isNew: articles.value.length > 0
        };
        // Insert at the beginning (new articles appear on top)
        articles.value.unshift(newArticle);
        // Set as active article
        activeArticleId.value = newArticle.id;
        // Remove "new" badge from previous articles after a moment
        setTimeout(() => {
            articles.value.forEach(article => {
                if (article.id !== newArticle.id) {
                    article.isNew = false;
                }
            });
        }, 3000);
        await saveArticleToDb(newArticle);
    }
    catch (error) {
        showError.value = true;
        errorMessage.value = error instanceof Error ? error.message : 'Failed to generate article';
        console.error('Generation error:', error);
    }
    finally {
        isGenerating.value = false;
    }
}
function buildSystemPrompt(promptConfig) {
    if (promptConfig && promptConfig.content) {
        return promptConfig.content;
    }
    return `You are an expert English teacher creating engaging articles for exam preparation. Write naturally and coherently while incorporating the given vocabulary words seamlessly into the content. The article should be well-structured with a clear title.

Important: Start your response with a title on the first line, then write the article body.`;
}
function buildUserPrompt(words, promptConfig) {
    const wordCount = Math.max(200, Math.min(800, words.length * 40));
    return `Write an approximately ${wordCount}-word article that naturally incorporates these vocabulary words: ${words.join(', ')}. 

Choose an appropriate theme based on the vocabulary provided. Make the article engaging, coherent, and educational. Use each word naturally in context.`;
}
async function saveArticleToDb(article) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const articleData = {
            id: article.id,
            title: article.title,
            content: article.content,
            words: [...props.selectedWords],
            date: today,
            createdAt: article.createdAt
        };
        console.log('Saving article:', articleData);
        await addArticle(articleData);
        console.log('✅ Article saved:', articleData.id, 'for date:', today);
    }
    catch (error) {
        console.error('❌ Failed to save article:', error);
    }
}
function copyArticle(article) {
    const textOnly = article.content.replace(/<mark>/g, '').replace(/<\/mark>/g, '');
    navigator.clipboard.writeText(`${article.title}\n\n${textOnly}`);
}
function startPractice() {
    emit('startPractice', props.selectedWords);
}
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleString('en-US', {
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
    ...{ class: "ai-article-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "article-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "article-icon-button" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.selectedWords.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-header__actions" },
});
if (__VLS_ctx.articles.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.generateArticle) },
        ...{ class: "article-regenerate-button" },
        type: "button",
        disabled: (__VLS_ctx.isGenerating),
        title: "Generate another article",
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
    ...{ class: "article-content" },
});
if (__VLS_ctx.isGenerating && __VLS_ctx.articles.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "article-loading" },
    });
    const __VLS_8 = {}.Loader2;
    /** @type {[typeof __VLS_components.Loader2, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ class: "is-spinning" },
        size: (48),
    }));
    const __VLS_10 = __VLS_9({
        ...{ class: "is-spinning" },
        size: (48),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.selectedWords.length);
}
else if (__VLS_ctx.showError && __VLS_ctx.articles.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "article-error" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "article-error__icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.errorMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.generateArticle) },
        type: "button",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "articles-container" },
    });
    if (__VLS_ctx.isGenerating && __VLS_ctx.articles.length > 0) {
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
            ...{ class: "article-generated" },
            ...{ class: ({ 'is-active': article.id === __VLS_ctx.activeArticleId, 'is-new': article.isNew }) },
        });
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "article-timestamp" },
        });
        (__VLS_ctx.formatTime(article.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isGenerating && __VLS_ctx.articles.length === 0))
                        return;
                    if (!!(__VLS_ctx.showError && __VLS_ctx.articles.length === 0))
                        return;
                    __VLS_ctx.copyArticle(article);
                } },
            ...{ class: "article-copy-button-inline" },
            type: "button",
            title: "Copy article",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "article-title" },
        });
        (article.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "article-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (article.content) }, null, null);
        if (index === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "article-vocabulary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "article-vocabulary__list" },
            });
            for (const [word] of __VLS_getVForSourceType((__VLS_ctx.selectedWords))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: (word),
                    ...{ class: "article-vocabulary__item" },
                });
                (word);
            }
        }
        if (index === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "article-practice" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.startPractice) },
                type: "button",
            });
        }
        if (index < __VLS_ctx.articles.length - 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "article-separator" },
            });
        }
    }
}
/** @type {__VLS_StyleScopedClasses['ai-article-page']} */ ;
/** @type {__VLS_StyleScopedClasses['article-header']} */ ;
/** @type {__VLS_StyleScopedClasses['article-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['article-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['article-header__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['article-regenerate-button']} */ ;
/** @type {__VLS_StyleScopedClasses['article-content']} */ ;
/** @type {__VLS_StyleScopedClasses['article-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['article-error']} */ ;
/** @type {__VLS_StyleScopedClasses['article-error__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-container']} */ ;
/** @type {__VLS_StyleScopedClasses['article-generating-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['article-generated']} */ ;
/** @type {__VLS_StyleScopedClasses['article-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['article-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['article-badge--new']} */ ;
/** @type {__VLS_StyleScopedClasses['article-timestamp']} */ ;
/** @type {__VLS_StyleScopedClasses['article-copy-button-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['article-title']} */ ;
/** @type {__VLS_StyleScopedClasses['article-body']} */ ;
/** @type {__VLS_StyleScopedClasses['article-vocabulary']} */ ;
/** @type {__VLS_StyleScopedClasses['article-vocabulary__list']} */ ;
/** @type {__VLS_StyleScopedClasses['article-vocabulary__item']} */ ;
/** @type {__VLS_StyleScopedClasses['article-practice']} */ ;
/** @type {__VLS_StyleScopedClasses['article-separator']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            Loader2: Loader2,
            Sparkles: Sparkles,
            RefreshCw: RefreshCw,
            emit: emit,
            isGenerating: isGenerating,
            articles: articles,
            activeArticleId: activeArticleId,
            showError: showError,
            errorMessage: errorMessage,
            generateArticle: generateArticle,
            copyArticle: copyArticle,
            startPractice: startPractice,
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
