import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, Check, Copy, FileText, Plus, Save, Trash2, Upload, X } from 'lucide-vue-next';
import { createPromptConfig, deletePromptConfig, duplicatePromptConfig, getAllPromptConfigs, savePromptConfig, setActivePromptConfig } from '@/db/repositories/prompt-config.repository';
import '@/styles/pages/profile/prompt-config-page.css';
const emit = defineEmits();
const configs = ref([]);
const selectedConfigId = ref(null);
const toastMessage = ref('');
const toastType = ref('success');
const showDeleteConfirm = ref(false);
const configToDelete = ref(null);
const editForm = ref({
    name: '',
    content: ''
});
const selectedConfig = computed(() => {
    if (!selectedConfigId.value)
        return null;
    return configs.value.find(c => c.id === selectedConfigId.value) || null;
});
const activeConfig = computed(() => {
    return configs.value.find(c => c.isActive) || null;
});
function showToast(message, type = 'success') {
    toastMessage.value = message;
    toastType.value = type;
    window.setTimeout(() => {
        toastMessage.value = '';
    }, 2500);
}
onMounted(async () => {
    await loadConfigs();
});
async function loadConfigs() {
    try {
        configs.value = await getAllPromptConfigs();
        configs.value.sort((a, b) => b.updatedAt - a.updatedAt);
        if (configs.value.length > 0 && !selectedConfigId.value) {
            const active = configs.value.find(c => c.isActive);
            selectedConfigId.value = active?.id || configs.value[0].id;
            loadEditForm();
        }
    }
    catch (error) {
        console.error('Failed to load configs:', error);
        showToast('Failed to load configs', 'error');
    }
}
function selectConfig(id) {
    selectedConfigId.value = id;
    loadEditForm();
}
function loadEditForm() {
    if (selectedConfig.value) {
        editForm.value.name = selectedConfig.value.name;
        editForm.value.content = selectedConfig.value.content;
    }
}
async function createNewConfig() {
    try {
        const newConfig = await createPromptConfig({
            name: 'New Prompt Config',
            content: '',
            isActive: false
        });
        configs.value.unshift(newConfig);
        selectedConfigId.value = newConfig.id;
        loadEditForm();
        showToast('Config created');
    }
    catch (error) {
        console.error('Failed to create config:', error);
        showToast('Failed to create config', 'error');
    }
}
async function saveCurrentConfig() {
    if (!selectedConfig.value)
        return;
    if (!editForm.value.name.trim()) {
        showToast('Config name required', 'error');
        return;
    }
    try {
        await savePromptConfig({
            id: selectedConfig.value.id,
            name: editForm.value.name,
            content: editForm.value.content,
            isActive: selectedConfig.value.isActive
        });
        const index = configs.value.findIndex(c => c.id === selectedConfig.value.id);
        if (index !== -1) {
            configs.value[index].name = editForm.value.name;
            configs.value[index].content = editForm.value.content;
            configs.value[index].updatedAt = Date.now();
        }
        showToast('Config saved');
    }
    catch (error) {
        console.error('Failed to save config:', error);
        showToast('Failed to save config', 'error');
    }
}
async function setAsActive() {
    if (!selectedConfig.value)
        return;
    try {
        await setActivePromptConfig(selectedConfig.value.id);
        configs.value.forEach(c => {
            c.isActive = c.id === selectedConfig.value.id;
        });
        showToast('Set as active config');
    }
    catch (error) {
        console.error('Failed to set active:', error);
        showToast('Failed to set active', 'error');
    }
}
async function duplicateConfig() {
    if (!selectedConfig.value)
        return;
    try {
        const duplicate = await duplicatePromptConfig(selectedConfig.value.id);
        if (duplicate) {
            configs.value.unshift(duplicate);
            selectedConfigId.value = duplicate.id;
            loadEditForm();
            showToast('Config duplicated');
        }
    }
    catch (error) {
        console.error('Failed to duplicate config:', error);
        showToast('Failed to duplicate', 'error');
    }
}
function confirmDelete(id) {
    configToDelete.value = id;
    showDeleteConfirm.value = true;
}
async function performDelete() {
    if (!configToDelete.value)
        return;
    const idToDelete = configToDelete.value;
    try {
        await deletePromptConfig(idToDelete);
        const index = configs.value.findIndex(c => c.id === idToDelete);
        configs.value.splice(index, 1);
        if (selectedConfigId.value === idToDelete) {
            selectedConfigId.value = configs.value.length > 0 ? configs.value[0].id : null;
            if (selectedConfigId.value) {
                loadEditForm();
            }
            else {
                editForm.value.name = '';
                editForm.value.content = '';
            }
        }
        showToast('Config deleted');
    }
    catch (error) {
        console.error('Failed to delete config:', error);
        showToast('Failed to delete', 'error');
    }
    finally {
        showDeleteConfirm.value = false;
        configToDelete.value = null;
    }
}
function cancelDelete() {
    showDeleteConfirm.value = false;
    configToDelete.value = null;
}
async function handleFileUpload(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    const validExtensions = ['.txt', '.md'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
        showToast('Only .txt and .md files supported', 'error');
        input.value = '';
        return;
    }
    try {
        const text = await file.text();
        editForm.value.content = text;
        if (!editForm.value.name || editForm.value.name === 'New Prompt Config') {
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            editForm.value.name = baseName;
        }
        showToast('File loaded successfully');
    }
    catch (error) {
        console.error('Failed to read file:', error);
        showToast('Failed to read file', 'error');
    }
    finally {
        input.value = '';
    }
}
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1)
        return 'Just now';
    if (minutes < 60)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    if (days < 7)
        return `${days}d ago`;
    return date.toLocaleDateString();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "prompt-config-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "prompt-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "prompt-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "prompt-icon-button" },
    type: "button",
});
const __VLS_0 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (17),
}));
const __VLS_2 = __VLS_1({
    size: (17),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "prompt-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "prompt-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createNewConfig) },
    ...{ class: "prompt-toolbar-btn prompt-toolbar-btn--primary" },
    type: "button",
});
const __VLS_4 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (15),
}));
const __VLS_6 = __VLS_5({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "prompt-toolbar-btn" },
});
const __VLS_8 = {}.Upload;
/** @type {[typeof __VLS_components.Upload, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (15),
}));
const __VLS_10 = __VLS_9({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileUpload) },
    type: "file",
    accept: ".txt,.md",
    hidden: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "prompt-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "prompt-list" },
});
if (__VLS_ctx.configs.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-list-empty" },
    });
    const __VLS_12 = {}.FileText;
    /** @type {[typeof __VLS_components.FileText, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (32),
    }));
    const __VLS_14 = __VLS_13({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
for (const [config] of __VLS_getVForSourceType((__VLS_ctx.configs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectConfig(config.id);
            } },
        key: (config.id),
        ...{ class: "prompt-list-item" },
        ...{ class: ({ 'is-selected': __VLS_ctx.selectedConfigId === config.id }) },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-list-item__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (config.name);
    if (config.isActive) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "prompt-list-item__badge" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "prompt-list-item__preview" },
    });
    (config.content ? config.content.substring(0, 60) + '...' : 'Empty');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "prompt-list-item__time" },
    });
    (__VLS_ctx.formatDate(config.updatedAt));
}
if (__VLS_ctx.selectedConfig) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "prompt-editor" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-editor-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-editor-actions" },
    });
    if (!__VLS_ctx.selectedConfig.isActive) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.setAsActive) },
            ...{ class: "prompt-action-btn" },
            type: "button",
            title: "Set as active",
        });
        const __VLS_16 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (15),
        }));
        const __VLS_18 = __VLS_17({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.duplicateConfig) },
        ...{ class: "prompt-action-btn" },
        type: "button",
        title: "Duplicate",
    });
    const __VLS_20 = {}.Copy;
    /** @type {[typeof __VLS_components.Copy, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (15),
    }));
    const __VLS_22 = __VLS_21({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedConfig))
                    return;
                __VLS_ctx.confirmDelete(__VLS_ctx.selectedConfig.id);
            } },
        ...{ class: "prompt-action-btn prompt-action-btn--danger" },
        type: "button",
        title: "Delete",
    });
    const __VLS_24 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (15),
    }));
    const __VLS_26 = __VLS_25({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-editor-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "prompt-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.editForm.name),
        type: "text",
        placeholder: "e.g., IELTS Writing, TOEFL Reading",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "prompt-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.editForm.content),
        rows: "18",
        placeholder: "\u0045\u006e\u0074\u0065\u0072\u0020\u0079\u006f\u0075\u0072\u0020\u0070\u0072\u006f\u006d\u0070\u0074\u0020\u0069\u006e\u0073\u0074\u0072\u0075\u0063\u0074\u0069\u006f\u006e\u0073\u0020\u0068\u0065\u0072\u0065\u002e\u002e\u002e\u000d\u000a\u000d\u000a\u0059\u006f\u0075\u0020\u0063\u0061\u006e\u0020\u0075\u0070\u006c\u006f\u0061\u0064\u0020\u0061\u0020\u002e\u0074\u0078\u0074\u0020\u006f\u0072\u0020\u002e\u006d\u0064\u0020\u0066\u0069\u006c\u0065\u0020\u0075\u0073\u0069\u006e\u0067\u0020\u0074\u0068\u0065\u0020\u0027\u0055\u0070\u006c\u006f\u0061\u0064\u0020\u0046\u0069\u006c\u0065\u0027\u0020\u0062\u0075\u0074\u0074\u006f\u006e\u0020\u0061\u0062\u006f\u0076\u0065\u002e",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-editor-empty" },
    });
    const __VLS_28 = {}.FileText;
    /** @type {[typeof __VLS_components.FileText, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        size: (48),
    }));
    const __VLS_30 = __VLS_29({
        size: (48),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
const __VLS_32 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    name: "prompt-modal",
}));
const __VLS_34 = __VLS_33({
    name: "prompt-modal",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
if (__VLS_ctx.showDeleteConfirm) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.cancelDelete) },
        ...{ class: "prompt-modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: () => { } },
        ...{ class: "prompt-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-modal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelDelete) },
        type: "button",
    });
    const __VLS_36 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (18),
    }));
    const __VLS_38 = __VLS_37({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelDelete) },
        ...{ class: "prompt-modal-btn" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.performDelete) },
        ...{ class: "prompt-modal-btn prompt-modal-btn--danger" },
        type: "button",
    });
}
var __VLS_35;
const __VLS_40 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    name: "prompt-toast",
}));
const __VLS_42 = __VLS_41({
    name: "prompt-toast",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
if (__VLS_ctx.toastMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-toast" },
        ...{ class: ({ 'is-error': __VLS_ctx.toastType === 'error' }) },
    });
    (__VLS_ctx.toastMessage);
}
var __VLS_43;
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "prompt-save-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveCurrentConfig) },
    type: "button",
    disabled: (!__VLS_ctx.selectedConfig),
});
const __VLS_44 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    size: (15),
}));
const __VLS_46 = __VLS_45({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
/** @type {__VLS_StyleScopedClasses['prompt-config-page']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-header']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-content']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-toolbar-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-toolbar-btn--primary']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-toolbar-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list-item__header']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list-item__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list-item__preview']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-list-item__time']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-editor-header']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-editor-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-action-btn--danger']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-editor-body']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-field']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-field']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-editor-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-modal-btn--danger']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-toast']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-save-bar']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            Check: Check,
            Copy: Copy,
            FileText: FileText,
            Plus: Plus,
            Save: Save,
            Trash2: Trash2,
            Upload: Upload,
            X: X,
            emit: emit,
            configs: configs,
            selectedConfigId: selectedConfigId,
            toastMessage: toastMessage,
            toastType: toastType,
            showDeleteConfirm: showDeleteConfirm,
            editForm: editForm,
            selectedConfig: selectedConfig,
            selectConfig: selectConfig,
            createNewConfig: createNewConfig,
            saveCurrentConfig: saveCurrentConfig,
            setAsActive: setAsActive,
            duplicateConfig: duplicateConfig,
            confirmDelete: confirmDelete,
            performDelete: performDelete,
            cancelDelete: cancelDelete,
            handleFileUpload: handleFileUpload,
            formatDate: formatDate,
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
