import { ChevronRight, KeyRound } from 'lucide-vue-next';
const __VLS_emit = defineEmits();
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('open');
        } },
    ...{ class: "profile-setting" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-setting__icon profile-setting__icon--amber" },
    'aria-hidden': "true",
});
const __VLS_0 = {}.KeyRound;
/** @type {[typeof __VLS_components.KeyRound, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (17),
    strokeWidth: (2),
}));
const __VLS_2 = __VLS_1({
    size: (17),
    strokeWidth: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-setting__copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-setting__title-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-setting__badge profile-setting__badge--emerald" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-setting__description" },
});
const __VLS_4 = {}.ChevronRight;
/** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ class: "profile-setting__arrow" },
    size: (16),
    strokeWidth: (2),
    'aria-hidden': "true",
}));
const __VLS_6 = __VLS_5({
    ...{ class: "profile-setting__arrow" },
    size: (16),
    strokeWidth: (2),
    'aria-hidden': "true",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {__VLS_StyleScopedClasses['profile-setting']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__icon--amber']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__copy']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__badge--emerald']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__description']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__arrow']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ChevronRight: ChevronRight,
            KeyRound: KeyRound,
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
