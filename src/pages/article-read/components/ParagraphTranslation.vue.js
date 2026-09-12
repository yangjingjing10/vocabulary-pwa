import { ref, computed, onMounted } from 'vue';
import { ChevronDown, ChevronUp, Check, Save, Sparkles } from 'lucide-vue-next';
import { getParagraphTranslations, saveParagraphTranslation } from '@/db/repositories/paragraph-translation.repository';
const props = defineProps();
const emit = defineEmits();
const paragraphs = ref([]);
const isRevising = ref(false);
onMounted(async () => {
    parseParagraphs();
    await loadSavedTranslations();
});
function parseParagraphs() {
    const div = document.createElement('div');
    div.innerHTML = props.content;
    const pTags = div.querySelectorAll('p');
    paragraphs.value = Array.from(pTags).map((p, index) => ({
        index,
        htmlContent: p.innerHTML,
        textContent: p.textContent || '',
        isExpanded: false,
        userTranslation: '',
        aiRevision: '',
        isSaved: false
    }));
}
async function loadSavedTranslations() {
    try {
        const saved = await getParagraphTranslations(props.articleId);
        saved.forEach(item => {
            const para = paragraphs.value[item.paragraphIndex];
            if (para) {
                para.userTranslation = item.userTranslation;
                para.aiRevision = item.aiRevisedTranslation || '';
                para.isSaved = !!item.userTranslation;
            }
        });
    }
    catch (error) {
        console.error('Failed to load saved translations:', error);
    }
}
function toggleExpand(index) {
    const para = paragraphs.value[index];
    para.isExpanded = !para.isExpanded;
}
async function saveTranslation(index) {
    const para = paragraphs.value[index];
    try {
        await saveParagraphTranslation({
            articleId: props.articleId,
            paragraphIndex: index,
            userTranslation: para.userTranslation,
            aiRevisedTranslation: para.aiRevision,
            updatedAt: Date.now()
        });
        para.isSaved = true;
        setTimeout(() => {
            para.isSaved = false;
        }, 2000);
    }
    catch (error) {
        console.error('Failed to save translation:', error);
        alert('保存失败');
    }
}
const allTranslated = computed(() => {
    return paragraphs.value.length > 0 &&
        paragraphs.value.every(p => p.userTranslation.trim() !== '');
});
async function requestAIRevision() {
    if (!allTranslated.value) {
        alert('请先完成所有段落的翻译');
        return;
    }
    isRevising.value = true;
    try {
        // 🔧 测试模式：返回模拟修改结果
        await new Promise(resolve => setTimeout(resolve, 3000));
        paragraphs.value.forEach((para, index) => {
            para.aiRevision = `【AI修改版 - 段落${index + 1}】\n${para.userTranslation}\n\n✨ 建议改进：语句更加流畅，词汇选择更精准。`;
        });
        // 保存 AI 修改结果
        for (const para of paragraphs.value) {
            await saveParagraphTranslation({
                articleId: props.articleId,
                paragraphIndex: para.index,
                userTranslation: para.userTranslation,
                aiRevisedTranslation: para.aiRevision,
                updatedAt: Date.now()
            });
        }
        /*
        // 🚀 生产模式：真实 AI 调用
        const apiConfig = await getApiConfig()
        if (!apiConfig || !apiConfig.apiKey) {
          throw new Error('请先配置 API')
        }
        
        for (const para of paragraphs.value) {
          const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiConfig.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: apiConfig.textModel,
              messages: [
                {
                  role: 'system',
                  content: '你是一位专业的英语翻译老师。请在用户翻译的基础上进行修改和润色，指出问题并给出更好的译文。'
                },
                {
                  role: 'user',
                  content: `原文：${para.textContent}\n\n学生翻译：${para.userTranslation}\n\n请给出修改建议和改进版本。`
                }
              ],
              temperature: 0.7
            })
          })
          
          const data = await response.json()
          para.aiRevision = data.choices?.[0]?.message?.content || '无法获取修改建议'
          
          await saveParagraphTranslation({
            articleId: props.articleId,
            paragraphIndex: para.index,
            userTranslation: para.userTranslation,
            aiRevisedTranslation: para.aiRevision,
            updatedAt: Date.now()
          })
        }
        */
    }
    catch (error) {
        console.error('Failed to get AI revision:', error);
        alert('AI 修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
    finally {
        isRevising.value = false;
    }
}
function handleWordClick(event) {
    emit('wordClick', event);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ai-revision-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-revision-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-revision-button']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-item']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-content']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-content']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-input-section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-input-section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-input-section']} */ ;
/** @type {__VLS_StyleScopedClasses['save-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-revision-section']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-view']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "paragraph-translation" },
});
if (__VLS_ctx.allTranslated) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-revision-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.requestAIRevision) },
        ...{ class: "ai-revision-button" },
        disabled: (__VLS_ctx.isRevising),
    });
    const __VLS_0 = {}.Sparkles;
    /** @type {[typeof __VLS_components.Sparkles, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (16),
        ...{ class: ({ 'is-spinning': __VLS_ctx.isRevising }) },
    }));
    const __VLS_2 = __VLS_1({
        size: (16),
        ...{ class: ({ 'is-spinning': __VLS_ctx.isRevising }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    if (__VLS_ctx.isRevising) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
for (const [para] of __VLS_getVForSourceType((__VLS_ctx.paragraphs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (para.index),
        ...{ class: "paragraph-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleWordClick) },
        ...{ class: "paragraph-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (para.htmlContent) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleExpand(para.index);
            } },
        ...{ class: "paragraph-toggle" },
        ...{ class: ({ 'has-translation': para.userTranslation }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "paragraph-toggle__icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "paragraph-toggle__text" },
    });
    (para.userTranslation ? '已翻译' : '翻译本段');
    if (para.userTranslation) {
        const __VLS_4 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            size: (14),
            ...{ class: "check-icon" },
        }));
        const __VLS_6 = __VLS_5({
            size: (14),
            ...{ class: "check-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
    if (!para.isExpanded) {
        const __VLS_8 = {}.ChevronDown;
        /** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            size: (16),
        }));
        const __VLS_10 = __VLS_9({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    }
    if (para.isExpanded) {
        const __VLS_12 = {}.ChevronUp;
        /** @type {[typeof __VLS_components.ChevronUp, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (16),
        }));
        const __VLS_14 = __VLS_13({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    const __VLS_16 = {}.Transition;
    /** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        name: "expand",
    }));
    const __VLS_18 = __VLS_17({
        name: "expand",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    if (para.isExpanded) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "paragraph-translation-area" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "translation-input-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (para.userTranslation),
            placeholder: "请在此输入该段落的中文翻译...",
            rows: "4",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(para.isExpanded))
                        return;
                    __VLS_ctx.saveTranslation(para.index);
                } },
            ...{ class: "save-button" },
        });
        const __VLS_20 = {}.Save;
        /** @type {[typeof __VLS_components.Save, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (14),
        }));
        const __VLS_22 = __VLS_21({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        (para.isSaved ? '已保存 ✓' : '保存');
        if (para.aiRevision) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ai-revision-section" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "comparison-view" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "comparison-column" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "column-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "comparison-content user-translation" },
            });
            (para.userTranslation);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "comparison-column" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "column-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "comparison-content ai-translation" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (para.aiRevision) }, null, null);
        }
    }
    var __VLS_19;
}
/** @type {__VLS_StyleScopedClasses['paragraph-translation']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-revision-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-revision-button']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-item']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-content']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-toggle__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-toggle__text']} */ ;
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['paragraph-translation-area']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-input-section']} */ ;
/** @type {__VLS_StyleScopedClasses['save-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-revision-section']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-view']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-column']} */ ;
/** @type {__VLS_StyleScopedClasses['column-label']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-content']} */ ;
/** @type {__VLS_StyleScopedClasses['user-translation']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-column']} */ ;
/** @type {__VLS_StyleScopedClasses['column-label']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-translation']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ChevronDown: ChevronDown,
            ChevronUp: ChevronUp,
            Check: Check,
            Save: Save,
            Sparkles: Sparkles,
            paragraphs: paragraphs,
            isRevising: isRevising,
            toggleExpand: toggleExpand,
            saveTranslation: saveTranslation,
            allTranslated: allTranslated,
            requestAIRevision: requestAIRevision,
            handleWordClick: handleWordClick,
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
