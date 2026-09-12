import { BookOpen, House } from 'lucide-vue-next';
import '@/styles/components/bottom-navigation.css';
const __VLS_props = defineProps();
const emit = defineEmits();
const tabs = [
    { id: 'study', label: '背单词', icon: BookOpen },
    { id: 'home', label: '主页', icon: House }
];
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "bottom-navigation" },
    'aria-label': "主导航",
});
for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.emit('navigate', tab.id);
            } },
        key: (tab.id),
        type: "button",
        ...{ class: "bottom-navigation__tab" },
        ...{ class: ({ 'is-active': __VLS_ctx.activeTab === tab.id }) },
    });
    const __VLS_0 = ((tab.icon));
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (19),
        strokeWidth: (__VLS_ctx.activeTab === tab.id ? 2.4 : 2),
        'aria-hidden': "true",
    }));
    const __VLS_2 = __VLS_1({
        size: (19),
        strokeWidth: (__VLS_ctx.activeTab === tab.id ? 2.4 : 2),
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (tab.label);
}
/** @type {__VLS_StyleScopedClasses['bottom-navigation']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-navigation__tab']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            emit: emit,
            tabs: tabs,
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
