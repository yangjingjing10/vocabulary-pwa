import { X, Trophy } from 'lucide-vue-next';
import { computed } from 'vue';
const props = defineProps();
const emit = defineEmits();
const scoreColor = computed(() => {
    if (!props.record)
        return '';
    const score = props.record.score;
    if (score >= 90)
        return 'gold';
    if (score >= 80)
        return 'blue';
    if (score >= 70)
        return 'green';
    return 'orange';
});
const scoreStars = computed(() => {
    if (!props.record)
        return '';
    const score = props.record.score;
    if (score >= 90)
        return '⭐⭐⭐⭐⭐';
    if (score >= 80)
        return '⭐⭐⭐⭐';
    if (score >= 70)
        return '⭐⭐⭐';
    if (score >= 60)
        return '⭐⭐';
    return '⭐';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['modal-enter-active']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-leave-active']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-enter-from']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-leave-to']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__header-content']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__header-content']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__close']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-item--correct']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-item--incorrect']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__reference']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__reference']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__comparison-item']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__comparison-item']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__body']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-number']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    name: "modal",
}));
const __VLS_2 = __VLS_1({
    name: "modal",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (__VLS_ctx.record) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.record))
                    return;
                __VLS_ctx.emit('close');
            } },
        ...{ class: "translation-modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__header-content" },
    });
    const __VLS_4 = {}.Trophy;
    /** @type {[typeof __VLS_components.Trophy, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (24),
    }));
    const __VLS_6 = __VLS_5({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (new Date(__VLS_ctx.record.createdAt).toLocaleString());
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.record))
                    return;
                __VLS_ctx.emit('close');
            } },
        type: "button",
        ...{ class: "translation-modal__close" },
    });
    const __VLS_8 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (20),
    }));
    const __VLS_10 = __VLS_9({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__score" },
        ...{ class: (`translation-modal__score--${__VLS_ctx.scoreColor}`) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__score-circle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "translation-modal__score-number" },
    });
    (__VLS_ctx.record.score);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "translation-modal__score-total" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__score-stars" },
    });
    (__VLS_ctx.scoreStars);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.record.feedback);
    if (Object.keys(__VLS_ctx.record.wordUsage).length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "translation-modal__section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "translation-modal__word-usage" },
        });
        for (const [detail, word] of __VLS_getVForSourceType((__VLS_ctx.record.wordUsage))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (word),
                ...{ class: "translation-modal__word-item" },
                ...{ class: ({
                        'translation-modal__word-item--correct': detail.correct,
                        'translation-modal__word-item--incorrect': !detail.correct
                    }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "translation-modal__word-icon" },
            });
            (detail.correct ? '✓' : '✗');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "translation-modal__word-text" },
            });
            (word);
            if (detail.suggestion) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "translation-modal__word-suggestion" },
                });
                (detail.suggestion);
            }
        }
    }
    if (__VLS_ctx.record.referenceTranslations.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "translation-modal__section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        for (const [translation, idx] of __VLS_getVForSourceType((__VLS_ctx.record.referenceTranslations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (idx),
                ...{ class: "translation-modal__reference" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "translation-modal__reference-label" },
            });
            (idx + 1);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (translation);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        open: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__comparison" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__comparison-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.record.chineseText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-modal__comparison-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.record.userTranslation);
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['translation-modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__header']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__header-content']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__close']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__body']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-number']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-total']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__score-stars']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-usage']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-item']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-text']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__word-suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__reference']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__reference-label']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__section']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__comparison']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__comparison-item']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-modal__comparison-item']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            X: X,
            Trophy: Trophy,
            emit: emit,
            scoreColor: scoreColor,
            scoreStars: scoreStars,
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
