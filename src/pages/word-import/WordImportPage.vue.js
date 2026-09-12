import { computed, ref } from 'vue';
import { ArrowLeft, Camera, Check, FileText, Image, Loader2, Save, Trash2, Upload } from 'lucide-vue-next';
import { addWord } from '@/db/repositories/words.repository';
import '@/styles/pages/word-import-page.css';
const props = defineProps();
const emit = defineEmits();
const isProcessing = ref(false);
const ocrResult = ref('');
const manualInput = ref('');
const useManualMode = ref(props.importType === 'manual');
const words = ref([]);
const toastMessage = ref('');
const hasContent = computed(() => ocrResult.value.trim() || manualInput.value.trim() || words.value.length > 0);
function showToast(message) {
    toastMessage.value = message;
    window.setTimeout(() => {
        toastMessage.value = '';
    }, 2000);
}
async function handleCapture() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                await processImage(file);
            }
        };
        input.click();
    }
    catch (error) {
        showToast('Cannot access camera');
    }
}
async function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.txt';
    input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.type.startsWith('image/')) {
            await processImage(file);
        }
        else if (file.type === 'text/plain') {
            await processText(file);
        }
    };
    input.click();
}
async function processImage(file) {
    isProcessing.value = true;
    try {
        // TODO: Call real OCR API here
        await new Promise(resolve => setTimeout(resolve, 1500));
        ocrResult.value = '';
        showToast('Image uploaded, OCR API integration needed');
    }
    catch (error) {
        showToast('OCR failed, please retry');
    }
    finally {
        isProcessing.value = false;
    }
}
async function processText(file) {
    isProcessing.value = true;
    try {
        const text = await file.text();
        manualInput.value = text;
        showToast('File imported successfully');
    }
    catch (error) {
        showToast('File read failed');
    }
    finally {
        isProcessing.value = false;
    }
}
function extractWords() {
    const source = useManualMode.value ? manualInput.value : ocrResult.value;
    if (!source.trim()) {
        showToast('Please input or scan words first');
        return;
    }
    const extracted = source
        .split(/[\s\n,]+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => /^[a-z]+$/.test(w))
        .filter((w, i, arr) => arr.indexOf(w) === i);
    const sourceType = useManualMode.value ? 'manual' : (props.importType === 'upload' ? 'file' : 'ocr');
    words.value = extracted.map(word => ({
        id: `${Date.now()}-${Math.random()}`,
        word,
        source: sourceType
    }));
    showToast(`Extracted ${words.value.length} words`);
}
function removeWord(id) {
    words.value = words.value.filter(w => w.id !== id);
}
// ??? AI ???? - ?????????
// async function generateTranslations(wordList: string[]): Promise<Record<string, string>> {
//   try {
//     const apiConfig = await getApiConfig()
//     if (!apiConfig) {
//       console.warn('No API config, skipping translation generation')
//       return {}
//     }
//     ... (???)
//   }
// }
async function confirmSave() {
    if (words.value.length === 0) {
        showToast('Please extract words first');
        return;
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        for (const item of words.value) {
            const wordData = {
                id: item.id,
                word: item.word,
                source: item.source,
                addedAt: Date.now(),
                date: today
            };
            await addWord(wordData);
        }
        emit('save', words.value.map(w => w.word));
        showToast('Words saved to vocabulary');
    }
    catch (error) {
        showToast('Failed to save words');
        console.error('Save error:', error);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "word-import-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "import-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "import-icon-button" },
    type: "button",
    'aria-label': "Back",
});
const __VLS_0 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (20),
}));
const __VLS_2 = __VLS_1({
    size: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
(__VLS_ctx.importType === 'camera' ? 'Camera OCR' : __VLS_ctx.importType === 'manual' ? 'Manual Input' : 'Import File');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "import-content" },
});
if (!__VLS_ctx.hasContent) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "import-empty" },
    });
    if (__VLS_ctx.importType === 'camera') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleCapture) },
            ...{ class: "import-capture-button" },
            type: "button",
        });
        const __VLS_4 = {}.Camera;
        /** @type {[typeof __VLS_components.Camera, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            size: (32),
        }));
        const __VLS_6 = __VLS_5({
            size: (32),
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else if (__VLS_ctx.importType === 'upload') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleFileUpload) },
            ...{ class: "import-capture-button" },
            type: "button",
        });
        const __VLS_8 = {}.Upload;
        /** @type {[typeof __VLS_components.Upload, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            size: (32),
        }));
        const __VLS_10 = __VLS_9({
            size: (32),
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "import-editor" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.manualInput),
            placeholder: "Enter words separated by space or newline",
            rows: "12",
            autofocus: true,
        });
    }
    if (__VLS_ctx.importType !== 'manual') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "import-hint" },
        });
    }
    if (__VLS_ctx.importType !== 'manual') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.hasContent))
                        return;
                    if (!(__VLS_ctx.importType !== 'manual'))
                        return;
                    __VLS_ctx.useManualMode = true;
                } },
            ...{ class: "import-text-button" },
            type: "button",
        });
    }
    if (__VLS_ctx.importType === 'manual' && !__VLS_ctx.hasContent) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.extractWords) },
            ...{ class: "import-extract-button" },
            type: "button",
        });
        const __VLS_12 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (18),
        }));
        const __VLS_14 = __VLS_13({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "import-result" },
    });
    if (__VLS_ctx.importType !== 'manual') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "import-mode-toggle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hasContent))
                        return;
                    if (!(__VLS_ctx.importType !== 'manual'))
                        return;
                    __VLS_ctx.useManualMode = false;
                } },
            ...{ class: ({ 'is-active': !__VLS_ctx.useManualMode }) },
            type: "button",
        });
        const __VLS_16 = {}.Image;
        /** @type {[typeof __VLS_components.Image, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (16),
        }));
        const __VLS_18 = __VLS_17({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hasContent))
                        return;
                    if (!(__VLS_ctx.importType !== 'manual'))
                        return;
                    __VLS_ctx.useManualMode = true;
                } },
            ...{ class: ({ 'is-active': __VLS_ctx.useManualMode }) },
            type: "button",
        });
        const __VLS_20 = {}.FileText;
        /** @type {[typeof __VLS_components.FileText, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (16),
        }));
        const __VLS_22 = __VLS_21({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-editor" },
    });
    if (__VLS_ctx.useManualMode || __VLS_ctx.importType === 'manual') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.manualInput),
            placeholder: "Enter words separated by space or newline",
            rows: "8",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.ocrResult),
            placeholder: "AI OCR result will show here",
            rows: "8",
            disabled: (__VLS_ctx.isProcessing),
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.extractWords) },
        ...{ class: "import-extract-button" },
        type: "button",
        disabled: (__VLS_ctx.isProcessing),
    });
    const __VLS_24 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (18),
    }));
    const __VLS_26 = __VLS_25({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    if (__VLS_ctx.words.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "import-words" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "import-words__header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.words.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.hasContent))
                        return;
                    if (!(__VLS_ctx.words.length > 0))
                        return;
                    __VLS_ctx.words = [];
                } },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "import-word-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.words))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.id),
                ...{ class: "import-word-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.word);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.hasContent))
                            return;
                        if (!(__VLS_ctx.words.length > 0))
                            return;
                        __VLS_ctx.removeWord(item.id);
                    } },
                type: "button",
                'aria-label': "Delete",
            });
            const __VLS_28 = {}.Trash2;
            /** @type {[typeof __VLS_components.Trash2, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                size: (14),
            }));
            const __VLS_30 = __VLS_29({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
    }
}
const __VLS_32 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    name: "import-toast",
}));
const __VLS_34 = __VLS_33({
    name: "import-toast",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
if (__VLS_ctx.toastMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-toast" },
    });
    (__VLS_ctx.toastMessage);
}
var __VLS_35;
if (__VLS_ctx.words.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "import-save-bar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmSave) },
        type: "button",
    });
    const __VLS_36 = {}.Save;
    /** @type {[typeof __VLS_components.Save, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (16),
    }));
    const __VLS_38 = __VLS_37({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.words.length);
}
if (__VLS_ctx.isProcessing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "import-loading" },
    });
    const __VLS_40 = {}.Loader2;
    /** @type {[typeof __VLS_components.Loader2, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ class: "is-spinning" },
        size: (32),
    }));
    const __VLS_42 = __VLS_41({
        ...{ class: "is-spinning" },
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
/** @type {__VLS_StyleScopedClasses['word-import-page']} */ ;
/** @type {__VLS_StyleScopedClasses['import-header']} */ ;
/** @type {__VLS_StyleScopedClasses['import-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['import-content']} */ ;
/** @type {__VLS_StyleScopedClasses['import-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['import-capture-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-capture-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['import-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['import-text-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-extract-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-result']} */ ;
/** @type {__VLS_StyleScopedClasses['import-mode-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['import-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['import-extract-button']} */ ;
/** @type {__VLS_StyleScopedClasses['import-words']} */ ;
/** @type {__VLS_StyleScopedClasses['import-words__header']} */ ;
/** @type {__VLS_StyleScopedClasses['import-word-list']} */ ;
/** @type {__VLS_StyleScopedClasses['import-word-item']} */ ;
/** @type {__VLS_StyleScopedClasses['import-toast']} */ ;
/** @type {__VLS_StyleScopedClasses['import-save-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['import-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            Camera: Camera,
            Check: Check,
            FileText: FileText,
            Image: Image,
            Loader2: Loader2,
            Save: Save,
            Trash2: Trash2,
            Upload: Upload,
            emit: emit,
            isProcessing: isProcessing,
            ocrResult: ocrResult,
            manualInput: manualInput,
            useManualMode: useManualMode,
            words: words,
            toastMessage: toastMessage,
            hasContent: hasContent,
            handleCapture: handleCapture,
            handleFileUpload: handleFileUpload,
            extractWords: extractWords,
            removeWord: removeWord,
            confirmSave: confirmSave,
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
