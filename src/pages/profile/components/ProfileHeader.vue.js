import { Pencil, Camera } from 'lucide-vue-next';
import { ref } from 'vue';
const __VLS_props = defineProps();
const emit = defineEmits();
const fileInput = ref();
function triggerFileUpload() {
    fileInput.value?.click();
}
async function handleFileUpload(event) {
    const target = event.target;
    const file = target.files?.[0];
    if (!file)
        return;
    // 将图片转换为 base64
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target?.result;
        emit('updateAvatar', base64);
    };
    reader.readAsDataURL(file);
}
function editName() {
    const newName = window.prompt('输入新名字:')?.trim();
    if (newName) {
        emit('updateName', newName);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "profile-card" },
    'aria-labelledby': "profile-card-title",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-card__background" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-card__content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.triggerFileUpload) },
    ...{ class: "profile-card__avatar-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    ...{ class: "profile-card__avatar" },
    src: (__VLS_ctx.user.avatar),
    alt: "用户头像",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-card__avatar-overlay" },
});
const __VLS_0 = {}.Camera;
/** @type {[typeof __VLS_components.Camera, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (20),
}));
const __VLS_2 = __VLS_1({
    size: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileUpload) },
    ref: "fileInput",
    type: "file",
    accept: "image/*",
    ...{ style: {} },
});
/** @type {typeof __VLS_ctx.fileInput} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-card__identity" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-card__identity-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ onClick: (__VLS_ctx.editName) },
    id: "profile-card-title",
});
(__VLS_ctx.user.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('editProfile');
        } },
    ...{ class: "profile-icon-button" },
    type: "button",
    'aria-label': "编辑个人资料",
});
const __VLS_4 = {}.Pencil;
/** @type {[typeof __VLS_components.Pencil, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (15),
    strokeWidth: (2),
}));
const __VLS_6 = __VLS_5({
    size: (15),
    strokeWidth: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.user.bio);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-card__badges" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-badge profile-badge--streak" },
});
(__VLS_ctx.user.streakDays);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-badge profile-badge--private" },
});
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__background']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__content']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__avatar-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__avatar-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__identity']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__identity-row']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card__badges']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-badge--streak']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-badge--private']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Pencil: Pencil,
            Camera: Camera,
            fileInput: fileInput,
            triggerFileUpload: triggerFileUpload,
            handleFileUpload: handleFileUpload,
            editName: editName,
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
