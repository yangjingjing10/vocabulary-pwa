import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, ArrowDown, ArrowUp, Book, Check, Eye, EyeOff, KeyRound, LoaderCircle, Plus, Save, Trash2, Zap } from 'lucide-vue-next';
import { getApiConfig, saveApiConfig } from '@/db/repositories/api-config.repository';
import { deleteDictionaryApiConfig, getAllDictionaryApiConfigs, saveDictionaryApiConfig } from '@/db/repositories/dictionary-api-config.repository';
import { queryWordDefinition } from '@/services/dictionary-api.service';
import '@/styles/pages/profile/api-settings-page.css';
const emit = defineEmits();
const providers = [
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct' },
    { id: 'custom', name: 'Custom', baseUrl: '', model: 'custom' }
];
const dictProviderTemplates = [
    { provider: 'youdao', name: '网易有道', endpoint: 'https://openapi.youdao.com/api', requiresSecret: true },
    { provider: 'iciba', name: '金山词霸', endpoint: 'http://dict-co.iciba.com/api/dictionary.php', requiresSecret: false },
    { provider: 'baidu', name: '百度翻译', endpoint: 'https://fanyi-api.baidu.com/api/trans/vip/translate', requiresSecret: true },
    { provider: 'custom', name: '自定义', endpoint: '', requiresSecret: false }
];
const selectedProvider = ref('deepseek');
const showApiKey = ref(false);
const isTesting = ref(false);
const isFetchingModels = ref(false);
const isFetchingVisionModels = ref(false);
const testResult = ref(null);
const toastMessage = ref('');
const toastType = ref('success');
const customTextModel = ref('');
const fetchedModels = ref([]);
const fetchedVisionModels = ref([]);
const fetchStatusMessage = ref('');
const fetchStatusSuccess = ref(true);
const visionFetchStatusMessage = ref('');
const visionFetchStatusSuccess = ref(true);
const config = ref({
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    textModel: 'deepseek-chat',
    useIndependentVision: false,
    visionBaseUrl: 'https://api.openai.com/v1',
    visionApiKey: '',
    visionModel: 'gpt-4o-mini'
});
const dictionaryConfigs = ref([]);
const showDictApiKey = ref({});
const isTestingDict = ref({});
const dictTestResults = ref({});
const effectiveTextModel = computed(() => config.value.textModel === 'custom' ? customTextModel.value : config.value.textModel);
onMounted(async () => {
    const savedConfig = await getApiConfig();
    if (savedConfig) {
        config.value = {
            baseUrl: savedConfig.baseUrl,
            apiKey: savedConfig.apiKey,
            textModel: savedConfig.textModel,
            useIndependentVision: savedConfig.useIndependentVision,
            visionBaseUrl: savedConfig.visionBaseUrl,
            visionApiKey: savedConfig.visionApiKey,
            visionModel: savedConfig.visionModel
        };
        if (savedConfig.apiKey) {
            await fetchModels();
            config.value.textModel = savedConfig.textModel;
        }
        showToast('Config loaded');
    }
    await loadDictionaryConfigs();
});
async function loadDictionaryConfigs() {
    dictionaryConfigs.value = await getAllDictionaryApiConfigs();
}
function showToast(message, type = 'success') {
    toastMessage.value = message;
    toastType.value = type;
    window.setTimeout(() => {
        toastMessage.value = '';
    }, 2500);
}
function selectProvider(providerId) {
    selectedProvider.value = providerId;
    const provider = providers.find((item) => item.id === providerId);
    if (!provider || provider.id === 'custom')
        return;
    config.value.baseUrl = provider.baseUrl;
    config.value.textModel = provider.model;
    fetchedModels.value = [];
    fetchStatusMessage.value = '';
    showToast(`Loaded ${provider.name} preset`);
}
function resetBaseUrl() {
    config.value.baseUrl = 'https://api.deepseek.com/v1';
    showToast('Reset to default URL');
}
async function fetchModels() {
    if (!config.value.apiKey.trim()) {
        showToast('Enter API Key first', 'error');
        return;
    }
    isFetchingModels.value = true;
    fetchStatusMessage.value = '';
    const startedAt = performance.now();
    const url = `${config.value.baseUrl.trim().replace(/\/+$/, '')}/models`;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${config.value.apiKey}`, 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const models = data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)
            ? data.data.filter((item) => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string').map((item) => ({ id: item.id }))
            : [];
        if (!models.length)
            throw new Error('No models returned');
        fetchedModels.value = models;
        config.value.textModel = models[0].id;
        testResult.value = { success: true, latency: Math.round(performance.now() - startedAt) };
        fetchStatusSuccess.value = true;
        fetchStatusMessage.value = `Fetched ${models.length} models`;
        showToast('Models updated');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        fetchStatusSuccess.value = false;
        fetchStatusMessage.value = `Failed: ${message}`;
        testResult.value = { success: false, latency: 0 };
        showToast('Fetch failed', 'error');
    }
    finally {
        window.clearTimeout(timeoutId);
        isFetchingModels.value = false;
    }
}
async function fetchVisionModels() {
    const effectiveKey = config.value.visionApiKey.trim() || config.value.apiKey.trim();
    if (!effectiveKey) {
        showToast('Enter API Key first', 'error');
        return;
    }
    isFetchingVisionModels.value = true;
    visionFetchStatusMessage.value = '';
    const url = `${config.value.visionBaseUrl.trim().replace(/\/+$/, '')}/models`;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${effectiveKey}`, 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const models = data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)
            ? data.data.filter((item) => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string').map((item) => ({ id: item.id }))
            : [];
        if (!models.length)
            throw new Error('No models returned');
        fetchedVisionModels.value = models;
        config.value.visionModel = models[0].id;
        visionFetchStatusSuccess.value = true;
        visionFetchStatusMessage.value = `Fetched ${models.length} vision models`;
        showToast('Vision models updated');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        visionFetchStatusSuccess.value = false;
        visionFetchStatusMessage.value = `Failed: ${message}`;
        showToast('Vision fetch failed', 'error');
    }
    finally {
        window.clearTimeout(timeoutId);
        isFetchingVisionModels.value = false;
    }
}
async function testApiConnection() {
    isTesting.value = true;
    await fetchModels();
    isTesting.value = false;
}
async function saveConfiguration() {
    if (!config.value.baseUrl.trim() || !config.value.apiKey.trim() || !effectiveTextModel.value.trim()) {
        showToast('Complete all required fields', 'error');
        return;
    }
    try {
        await saveApiConfig({
            baseUrl: config.value.baseUrl,
            apiKey: config.value.apiKey,
            textModel: effectiveTextModel.value,
            useIndependentVision: config.value.useIndependentVision,
            visionBaseUrl: config.value.visionBaseUrl,
            visionApiKey: config.value.visionApiKey,
            visionModel: config.value.visionModel
        });
        for (const dictConfig of dictionaryConfigs.value) {
            await saveDictionaryApiConfig(dictConfig);
        }
        showToast('Config saved successfully');
    }
    catch (error) {
        showToast('Failed to save config', 'error');
    }
}
function addDictionaryApi() {
    const newConfig = {
        id: `dict-${Date.now()}`,
        name: '网易有道',
        enabled: true,
        priority: dictionaryConfigs.value.length + 1,
        apiKey: '',
        apiSecret: '',
        endpoint: 'https://openapi.youdao.com/api',
        provider: 'youdao',
        updatedAt: Date.now()
    };
    dictionaryConfigs.value.push(newConfig);
}
async function removeDictionaryApi(id) {
    try {
        await deleteDictionaryApiConfig(id);
        dictionaryConfigs.value = dictionaryConfigs.value.filter(c => c.id !== id);
        reorderPriorities();
        showToast('Dictionary API removed');
    }
    catch (error) {
        showToast('Failed to remove API', 'error');
    }
}
function moveDictionaryApiUp(index) {
    if (index === 0)
        return;
    const temp = dictionaryConfigs.value[index];
    dictionaryConfigs.value[index] = dictionaryConfigs.value[index - 1];
    dictionaryConfigs.value[index - 1] = temp;
    reorderPriorities();
}
function moveDictionaryApiDown(index) {
    if (index === dictionaryConfigs.value.length - 1)
        return;
    const temp = dictionaryConfigs.value[index];
    dictionaryConfigs.value[index] = dictionaryConfigs.value[index + 1];
    dictionaryConfigs.value[index + 1] = temp;
    reorderPriorities();
}
function reorderPriorities() {
    dictionaryConfigs.value.forEach((config, index) => {
        config.priority = index + 1;
    });
}
function selectDictProvider(config, template) {
    config.provider = template.provider;
    config.name = template.name;
    config.endpoint = template.endpoint;
    if (!template.requiresSecret) {
        config.apiSecret = '';
    }
}
async function testDictionaryApi(config) {
    if (!config.apiKey.trim()) {
        showToast('Enter API Key first', 'error');
        return;
    }
    isTestingDict.value[config.id] = true;
    dictTestResults.value[config.id] = { success: false, message: 'Testing...' };
    try {
        await saveDictionaryApiConfig(config);
        const result = await queryWordDefinition('hello');
        if (result) {
            dictTestResults.value[config.id] = {
                success: true,
                message: `Success: ${result.translation}`
            };
            showToast('Connection test passed');
        }
        else {
            dictTestResults.value[config.id] = {
                success: false,
                message: 'Failed: No result returned'
            };
            showToast('Connection test failed', 'error');
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        dictTestResults.value[config.id] = {
            success: false,
            message: `Error: ${message}`
        };
        showToast('Connection test failed', 'error');
    }
    finally {
        isTestingDict.value[config.id] = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-settings-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "api-settings-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-settings-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "api-icon-button" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "api-connection-status" },
    ...{ class: ({ 'is-connected': __VLS_ctx.testResult?.success }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.testResult?.success ? `${__VLS_ctx.testResult.latency}ms` : 'Pending');
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "api-settings-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "api-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "api-section__label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-provider-grid" },
});
for (const [provider] of __VLS_getVForSourceType((__VLS_ctx.providers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectProvider(provider.id);
            } },
        key: (provider.id),
        ...{ class: "api-provider" },
        ...{ class: ({ 'is-selected': __VLS_ctx.selectedProvider === provider.id }) },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "api-provider__mark" },
    });
    (provider.name.slice(0, 1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (provider.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "api-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-card__heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-card__heading-mark" },
});
const __VLS_4 = {}.KeyRound;
/** @type {[typeof __VLS_components.KeyRound, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (16),
}));
const __VLS_6 = __VLS_5({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "api-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetBaseUrl) },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "url",
    placeholder: "https://api.deepseek.com/v1",
});
(__VLS_ctx.config.baseUrl);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "api-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "api-input-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: (__VLS_ctx.showApiKey ? 'text' : 'password'),
    placeholder: "sk-xxxx",
});
(__VLS_ctx.config.apiKey);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showApiKey = !__VLS_ctx.showApiKey;
        } },
    type: "button",
});
if (__VLS_ctx.showApiKey) {
    const __VLS_8 = {}.EyeOff;
    /** @type {[typeof __VLS_components.EyeOff, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (15),
    }));
    const __VLS_10 = __VLS_9({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
else {
    const __VLS_12 = {}.Eye;
    /** @type {[typeof __VLS_components.Eye, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (15),
    }));
    const __VLS_14 = __VLS_13({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "api-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.fetchModels) },
    ...{ class: "api-fetch-button" },
    type: "button",
    disabled: (__VLS_ctx.isFetchingModels),
});
if (__VLS_ctx.isFetchingModels) {
    const __VLS_16 = {}.LoaderCircle;
    /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ class: "is-spinning" },
        size: (13),
    }));
    const __VLS_18 = __VLS_17({
        ...{ class: "is-spinning" },
        size: (13),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.isFetchingModels ? 'Fetching...' : 'Fetch Models');
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.config.textModel),
});
for (const [model] of __VLS_getVForSourceType((__VLS_ctx.fetchedModels))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (model.id),
        value: (model.id),
    });
    (model.id);
}
if (!__VLS_ctx.fetchedModels.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "deepseek-chat",
    });
}
if (!__VLS_ctx.fetchedModels.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "gpt-4o-mini",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "custom",
});
if (__VLS_ctx.config.textModel === 'custom') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.customTextModel),
        ...{ class: "api-field__input" },
        type: "text",
        placeholder: "Enter model ID",
    });
}
if (__VLS_ctx.fetchStatusMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "api-feedback" },
        ...{ class: ({ 'is-success': __VLS_ctx.fetchStatusSuccess }) },
    });
    if (__VLS_ctx.fetchStatusSuccess) {
        const __VLS_20 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: (13),
        }));
        const __VLS_22 = __VLS_21({
            size: (13),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.fetchStatusMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "api-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-card__heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-card__heading-mark api-card__heading-mark--amber" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.useIndependentVision = !__VLS_ctx.config.useIndependentVision;
        } },
    ...{ class: "api-toggle" },
    ...{ class: ({ 'is-on': __VLS_ctx.config.useIndependentVision }) },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (__VLS_ctx.config.useIndependentVision) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-vision-fields" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "url",
        placeholder: "https://api.openai.com/v1",
    });
    (__VLS_ctx.config.visionBaseUrl);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "password",
        placeholder: "Optional, reuse text key if empty",
    });
    (__VLS_ctx.config.visionApiKey);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchVisionModels) },
        ...{ class: "api-fetch-button" },
        type: "button",
        disabled: (__VLS_ctx.isFetchingVisionModels),
    });
    if (__VLS_ctx.isFetchingVisionModels) {
        const __VLS_24 = {}.LoaderCircle;
        /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ class: "is-spinning" },
            size: (13),
        }));
        const __VLS_26 = __VLS_25({
            ...{ class: "is-spinning" },
            size: (13),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.isFetchingVisionModels ? 'Fetching...' : 'Fetch Models');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.config.visionModel),
    });
    for (const [model] of __VLS_getVForSourceType((__VLS_ctx.fetchedVisionModels))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (model.id),
            value: (model.id),
        });
        (model.id);
    }
    if (!__VLS_ctx.fetchedVisionModels.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "gpt-4o-mini",
        });
    }
    if (!__VLS_ctx.fetchedVisionModels.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "gpt-4o",
        });
    }
    if (__VLS_ctx.visionFetchStatusMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "api-feedback" },
            ...{ class: ({ 'is-success': __VLS_ctx.visionFetchStatusSuccess }) },
        });
        if (__VLS_ctx.visionFetchStatusSuccess) {
            const __VLS_28 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                size: (13),
            }));
            const __VLS_30 = __VLS_29({
                size: (13),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.visionFetchStatusMessage);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "api-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "api-section__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "api-section__label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "api-section__desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.addDictionaryApi) },
    ...{ class: "api-add-button" },
    type: "button",
});
const __VLS_32 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    size: (14),
}));
const __VLS_34 = __VLS_33({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (__VLS_ctx.dictionaryConfigs.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-empty-state" },
    });
    const __VLS_36 = {}.Book;
    /** @type {[typeof __VLS_components.Book, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        size: (32),
    }));
    const __VLS_38 = __VLS_37({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
for (const [dictConfig, index] of __VLS_getVForSourceType((__VLS_ctx.dictionaryConfigs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (dictConfig.id),
        ...{ class: "api-dict-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-dict-card__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-dict-card__title" },
    });
    const __VLS_40 = {}.Book;
    /** @type {[typeof __VLS_components.Book, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        size: (16),
    }));
    const __VLS_42 = __VLS_41({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (index + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "api-dict-card__priority" },
    });
    (dictConfig.priority);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-dict-card__actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.moveDictionaryApiUp(index);
            } },
        type: "button",
        disabled: (index === 0),
        title: "Move up",
    });
    const __VLS_44 = {}.ArrowUp;
    /** @type {[typeof __VLS_components.ArrowUp, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: (14),
    }));
    const __VLS_46 = __VLS_45({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.moveDictionaryApiDown(index);
            } },
        type: "button",
        disabled: (index === __VLS_ctx.dictionaryConfigs.length - 1),
        title: "Move down",
    });
    const __VLS_48 = {}.ArrowDown;
    /** @type {[typeof __VLS_components.ArrowDown, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        size: (14),
    }));
    const __VLS_50 = __VLS_49({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.removeDictionaryApi(dictConfig.id);
            } },
        type: "button",
        ...{ class: "api-dict-card__delete" },
        title: "Remove",
    });
    const __VLS_52 = {}.Trash2;
    /** @type {[typeof __VLS_components.Trash2, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        size: (14),
    }));
    const __VLS_54 = __VLS_53({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-toggle-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                dictConfig.enabled = !dictConfig.enabled;
            } },
        ...{ class: "api-toggle" },
        ...{ class: ({ 'is-on': dictConfig.enabled }) },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-provider-select" },
    });
    for (const [template] of __VLS_getVForSourceType((__VLS_ctx.dictProviderTemplates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.selectDictProvider(dictConfig, template);
                } },
            key: (template.provider),
            type: "button",
            ...{ class: "api-provider-option" },
            ...{ class: ({ 'is-selected': dictConfig.provider === template.provider }) },
        });
        (template.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (dictConfig.name),
        type: "text",
        placeholder: "e.g., 网易有道",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "api-input-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: (__VLS_ctx.showDictApiKey[dictConfig.id] ? 'text' : 'password'),
        placeholder: "Enter your API key",
    });
    (dictConfig.apiKey);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showDictApiKey[dictConfig.id] = !__VLS_ctx.showDictApiKey[dictConfig.id];
            } },
        type: "button",
    });
    if (__VLS_ctx.showDictApiKey[dictConfig.id]) {
        const __VLS_56 = {}.EyeOff;
        /** @type {[typeof __VLS_components.EyeOff, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            size: (15),
        }));
        const __VLS_58 = __VLS_57({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    }
    else {
        const __VLS_60 = {}.Eye;
        /** @type {[typeof __VLS_components.Eye, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            size: (15),
        }));
        const __VLS_62 = __VLS_61({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    }
    if (dictConfig.provider === 'youdao' || dictConfig.provider === 'baidu') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "api-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "api-input-wrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: (__VLS_ctx.showDictApiKey[dictConfig.id + '-secret'] ? 'text' : 'password'),
            placeholder: "Enter your API secret",
        });
        (dictConfig.apiSecret);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(dictConfig.provider === 'youdao' || dictConfig.provider === 'baidu'))
                        return;
                    __VLS_ctx.showDictApiKey[dictConfig.id + '-secret'] = !__VLS_ctx.showDictApiKey[dictConfig.id + '-secret'];
                } },
            type: "button",
        });
        if (__VLS_ctx.showDictApiKey[dictConfig.id + '-secret']) {
            const __VLS_64 = {}.EyeOff;
            /** @type {[typeof __VLS_components.EyeOff, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                size: (15),
            }));
            const __VLS_66 = __VLS_65({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        }
        else {
            const __VLS_68 = {}.Eye;
            /** @type {[typeof __VLS_components.Eye, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                size: (15),
            }));
            const __VLS_70 = __VLS_69({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "api-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "url",
        placeholder: "https://openapi.youdao.com/api",
    });
    (dictConfig.endpoint);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.testDictionaryApi(dictConfig);
            } },
        ...{ class: "api-test-button" },
        type: "button",
        disabled: (__VLS_ctx.isTestingDict[dictConfig.id]),
    });
    if (__VLS_ctx.isTestingDict[dictConfig.id]) {
        const __VLS_72 = {}.LoaderCircle;
        /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            ...{ class: "is-spinning" },
            size: (14),
        }));
        const __VLS_74 = __VLS_73({
            ...{ class: "is-spinning" },
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    }
    else {
        const __VLS_76 = {}.Zap;
        /** @type {[typeof __VLS_components.Zap, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            size: (14),
        }));
        const __VLS_78 = __VLS_77({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.isTestingDict[dictConfig.id] ? 'Testing...' : 'Test Connection');
    if (__VLS_ctx.dictTestResults[dictConfig.id]) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "api-feedback" },
            ...{ class: ({ 'is-success': __VLS_ctx.dictTestResults[dictConfig.id].success }) },
        });
        if (__VLS_ctx.dictTestResults[dictConfig.id].success) {
            const __VLS_80 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                size: (13),
            }));
            const __VLS_82 = __VLS_81({
                size: (13),
            }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.dictTestResults[dictConfig.id].message);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "api-test-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.testApiConnection) },
    type: "button",
    disabled: (__VLS_ctx.isTesting),
});
if (__VLS_ctx.isTesting) {
    const __VLS_84 = {}.LoaderCircle;
    /** @type {[typeof __VLS_components.LoaderCircle, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ class: "is-spinning" },
        size: (14),
    }));
    const __VLS_86 = __VLS_85({
        ...{ class: "is-spinning" },
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
}
else {
    const __VLS_88 = {}.Zap;
    /** @type {[typeof __VLS_components.Zap, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        size: (14),
    }));
    const __VLS_90 = __VLS_89({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.isTesting ? 'Testing...' : 'Test');
const __VLS_92 = {}.Transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    name: "api-toast",
}));
const __VLS_94 = __VLS_93({
    name: "api-toast",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
if (__VLS_ctx.toastMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "api-toast" },
        ...{ class: ({ 'is-error': __VLS_ctx.toastType === 'error' }) },
    });
    const __VLS_96 = {}.Check;
    /** @type {[typeof __VLS_components.Check, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        size: (15),
    }));
    const __VLS_98 = __VLS_97({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.toastMessage);
}
var __VLS_95;
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "api-save-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveConfiguration) },
    type: "button",
});
const __VLS_100 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    size: (15),
}));
const __VLS_102 = __VLS_101({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
/** @type {__VLS_StyleScopedClasses['api-settings-page']} */ ;
/** @type {__VLS_StyleScopedClasses['api-settings-header']} */ ;
/** @type {__VLS_StyleScopedClasses['api-settings-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['api-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['api-connection-status']} */ ;
/** @type {__VLS_StyleScopedClasses['api-settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['api-section']} */ ;
/** @type {__VLS_StyleScopedClasses['api-section__label']} */ ;
/** @type {__VLS_StyleScopedClasses['api-provider-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['api-provider']} */ ;
/** @type {__VLS_StyleScopedClasses['api-provider__mark']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card__heading']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card__heading-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-fetch-button']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field__input']} */ ;
/** @type {__VLS_StyleScopedClasses['api-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card__heading']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card__heading-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['api-card__heading-mark--amber']} */ ;
/** @type {__VLS_StyleScopedClasses['api-toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['api-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['api-vision-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-fetch-button']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['api-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['api-section']} */ ;
/** @type {__VLS_StyleScopedClasses['api-section__header']} */ ;
/** @type {__VLS_StyleScopedClasses['api-section__label']} */ ;
/** @type {__VLS_StyleScopedClasses['api-section__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['api-add-button']} */ ;
/** @type {__VLS_StyleScopedClasses['api-empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['api-dict-card']} */ ;
/** @type {__VLS_StyleScopedClasses['api-dict-card__header']} */ ;
/** @type {__VLS_StyleScopedClasses['api-dict-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['api-dict-card__priority']} */ ;
/** @type {__VLS_StyleScopedClasses['api-dict-card__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['api-dict-card__delete']} */ ;
/** @type {__VLS_StyleScopedClasses['api-toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['api-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-provider-select']} */ ;
/** @type {__VLS_StyleScopedClasses['api-provider-option']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['api-field']} */ ;
/** @type {__VLS_StyleScopedClasses['api-test-button']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['api-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['api-test-card']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['api-toast']} */ ;
/** @type {__VLS_StyleScopedClasses['api-save-bar']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            ArrowDown: ArrowDown,
            ArrowUp: ArrowUp,
            Book: Book,
            Check: Check,
            Eye: Eye,
            EyeOff: EyeOff,
            KeyRound: KeyRound,
            LoaderCircle: LoaderCircle,
            Plus: Plus,
            Save: Save,
            Trash2: Trash2,
            Zap: Zap,
            emit: emit,
            providers: providers,
            dictProviderTemplates: dictProviderTemplates,
            selectedProvider: selectedProvider,
            showApiKey: showApiKey,
            isTesting: isTesting,
            isFetchingModels: isFetchingModels,
            isFetchingVisionModels: isFetchingVisionModels,
            testResult: testResult,
            toastMessage: toastMessage,
            toastType: toastType,
            customTextModel: customTextModel,
            fetchedModels: fetchedModels,
            fetchedVisionModels: fetchedVisionModels,
            fetchStatusMessage: fetchStatusMessage,
            fetchStatusSuccess: fetchStatusSuccess,
            visionFetchStatusMessage: visionFetchStatusMessage,
            visionFetchStatusSuccess: visionFetchStatusSuccess,
            config: config,
            dictionaryConfigs: dictionaryConfigs,
            showDictApiKey: showDictApiKey,
            isTestingDict: isTestingDict,
            dictTestResults: dictTestResults,
            selectProvider: selectProvider,
            resetBaseUrl: resetBaseUrl,
            fetchModels: fetchModels,
            fetchVisionModels: fetchVisionModels,
            testApiConnection: testApiConnection,
            saveConfiguration: saveConfiguration,
            addDictionaryApi: addDictionaryApi,
            removeDictionaryApi: removeDictionaryApi,
            moveDictionaryApiUp: moveDictionaryApiUp,
            moveDictionaryApiDown: moveDictionaryApiDown,
            selectDictProvider: selectDictProvider,
            testDictionaryApi: testDictionaryApi,
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
