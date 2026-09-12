import { ChevronRight, Database, Smartphone, WandSparkles } from 'lucide-vue-next';
const __VLS_emit = defineEmits();
const settings = [
    {
        type: 'data',
        title: '数据配置与备份恢复',
        description: '词库 JSON 导出备份、恢复与本地缓存清理',
        badge: 'IndexedDB',
        badgeTone: 'blue',
        icon: Database,
        iconTone: 'blue'
    },
    {
        type: 'prompt',
        title: 'AI 提示词 & 语境风格',
        description: '配置 AI 自动撰写英文短文时的难度与题材控制',
        badge: '专四/外刊',
        badgeTone: 'amber',
        icon: WandSparkles,
        iconTone: 'emerald'
    },
    {
        type: 'pwa',
        title: 'PWA 离线支持与关于',
        description: '离线缓存 Service Worker 就绪，可安装至桌面',
        badge: 'v1.0.0',
        badgeTone: 'slate',
        icon: Smartphone,
        iconTone: 'slate'
    }
];
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-settings" },
});
for (const [setting] of __VLS_getVForSourceType((__VLS_ctx.settings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('openSetting', setting.type);
            } },
        key: (setting.type),
        ...{ class: "profile-setting" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "profile-setting__icon" },
        ...{ class: (`profile-setting__icon--${setting.iconTone}`) },
        'aria-hidden': "true",
    });
    const __VLS_0 = ((setting.icon));
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
    (setting.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "profile-setting__badge" },
        ...{ class: (`profile-setting__badge--${setting.badgeTone}`) },
    });
    (setting.badge);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "profile-setting__description" },
    });
    (setting.description);
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
}
/** @type {__VLS_StyleScopedClasses['profile-settings']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__copy']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__description']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-setting__arrow']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ChevronRight: ChevronRight,
            settings: settings,
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
