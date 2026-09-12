import { FileCheck } from 'lucide-vue-next';
const __VLS_props = defineProps();
const emit = defineEmits();
function getScoreColor(score) {
    if (score >= 90)
        return 'gold';
    if (score >= 80)
        return 'blue';
    if (score >= 70)
        return 'green';
    return 'orange';
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['translation-record-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.records.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "translation-records" },
    });
    for (const [record] of __VLS_getVForSourceType((__VLS_ctx.records))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.records.length > 0))
                        return;
                    __VLS_ctx.emit('viewRecord', record);
                } },
            key: (record.id),
            ...{ class: "translation-record-item" },
            type: "button",
        });
        const __VLS_0 = {}.FileCheck;
        /** @type {[typeof __VLS_components.FileCheck, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            size: (14),
        }));
        const __VLS_2 = __VLS_1({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "translation-record-item__title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "translation-record-item__score" },
            ...{ class: (`translation-record-item__score--${__VLS_ctx.getScoreColor(record.score)}`) },
        });
        (record.score);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "translation-record-item__arrow" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['translation-records']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-record-item']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-record-item__title']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-record-item__score']} */ ;
/** @type {__VLS_StyleScopedClasses['translation-record-item__arrow']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            FileCheck: FileCheck,
            emit: emit,
            getScoreColor: getScoreColor,
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
