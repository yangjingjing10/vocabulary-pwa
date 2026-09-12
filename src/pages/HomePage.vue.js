import { ref } from 'vue';
import { BookOpen, Camera, FileText, Plus, Upload, X } from 'lucide-vue-next';
import BottomNavigation from '@/components/navigation/BottomNavigation.vue';
import '@/styles/pages/home-page.css';
const showImportModal = ref(false);
const __VLS_props = defineProps();
const emit = defineEmits();
function openImportModal() {
    showImportModal.value = true;
}
function closeImportModal() {
    showImportModal.value = false;
}
function handleImport(type) {
    showImportModal.value = false;
    emit('openImport', type);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "home-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-brand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-brand-mark" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "home-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openImportModal) },
    ...{ class: "home-add-button" },
    type: "button",
    'aria-label': "Import words",
});
const __VLS_0 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (20),
    strokeWidth: (2.5),
}));
const __VLS_2 = __VLS_1({
    size: (20),
    strokeWidth: (2.5),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "home-main" },
    'aria-live': "polite",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-empty-state" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-empty-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "home-empty-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "home-empty-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('openVocabulary');
        } },
    ...{ class: "home-vocabulary-button" },
    type: "button",
});
const __VLS_4 = {}.BookOpen;
/** @type {[typeof __VLS_components.BookOpen, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (20),
}));
const __VLS_6 = __VLS_5({
    size: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_8 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    name: "import-modal",
}));
const __VLS_10 = __VLS_9({
    name: "import-modal",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
if (__VLS_ctx.showImportModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeImportModal) },
        ...{ class: "import-modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-modal__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeImportModal) },
        type: "button",
        'aria-label': "Close",
    });
    const __VLS_12 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (20),
    }));
    const __VLS_14 = __VLS_13({
        size: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-modal__grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showImportModal))
                    return;
                __VLS_ctx.handleImport('camera');
            } },
        ...{ class: "import-card" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-card__icon import-card__icon--blue" },
    });
    const __VLS_16 = {}.Camera;
    /** @type {[typeof __VLS_components.Camera, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (32),
    }));
    const __VLS_18 = __VLS_17({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showImportModal))
                    return;
                __VLS_ctx.handleImport('upload');
            } },
        ...{ class: "import-card" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-card__icon import-card__icon--green" },
    });
    const __VLS_20 = {}.Upload;
    /** @type {[typeof __VLS_components.Upload, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (32),
    }));
    const __VLS_22 = __VLS_21({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showImportModal))
                    return;
                __VLS_ctx.handleImport('manual');
            } },
        ...{ class: "import-card" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-card__icon import-card__icon--purple" },
    });
    const __VLS_24 = {}.FileText;
    /** @type {[typeof __VLS_components.FileText, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (32),
    }));
    const __VLS_26 = __VLS_25({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
var __VLS_11;
/** @type {[typeof BottomNavigation, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(BottomNavigation, new BottomNavigation({
    ...{ 'onNavigate': {} },
    activeTab: (__VLS_ctx.activeTab),
}));
const __VLS_29 = __VLS_28({
    ...{ 'onNavigate': {} },
    activeTab: (__VLS_ctx.activeTab),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
let __VLS_31;
let __VLS_32;
let __VLS_33;
const __VLS_34 = {
    onNavigate: (...[$event]) => {
        __VLS_ctx.$emit('navigate', $event);
    }
};
var __VLS_30;
/** @type {__VLS_StyleScopedClasses['home-page']} */ ;
/** @type {__VLS_StyleScopedClasses['home-header']} */ ;
/** @type {__VLS_StyleScopedClasses['home-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['home-brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['home-title']} */ ;
/** @type {__VLS_StyleScopedClasses['home-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['home-add-button']} */ ;
/** @type {__VLS_StyleScopedClasses['home-main']} */ ;
/** @type {__VLS_StyleScopedClasses['home-empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['home-empty-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['home-empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['home-empty-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['home-vocabulary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['import-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['import-modal__header']} */ ;
/** @type {__VLS_StyleScopedClasses['import-modal__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card__icon--blue']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card__icon--green']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['import-card__icon--purple']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BookOpen: BookOpen,
            Camera: Camera,
            FileText: FileText,
            Plus: Plus,
            Upload: Upload,
            X: X,
            BottomNavigation: BottomNavigation,
            showImportModal: showImportModal,
            emit: emit,
            openImportModal: openImportModal,
            closeImportModal: closeImportModal,
            handleImport: handleImport,
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
