import { onMounted } from 'vue';
import BottomNavigation from '@/components/navigation/BottomNavigation.vue';
import { getUserProfile, saveUserProfile, updateUserAvatar, updateUserName } from '@/db/repositories/user-profile.repository';
import ProfileApiSettingCard from './components/ProfileApiSettingCard.vue';
import ProfileCssSettingCard from './components/ProfileCssSettingCard.vue';
import ProfileHeader from './components/ProfileHeader.vue';
import ProfileSettingsList from './components/ProfileSettingsList.vue';
import ProfileStats from './components/ProfileStats.vue';
import ProfileToast from './components/ProfileToast.vue';
import '@/styles/pages/profile/profile-page.css';
const user = defineModel('user', { required: true });
const __VLS_props = defineProps();
const emit = defineEmits();
const toastMessage = defineModel('toastMessage', { default: '' });
onMounted(async () => {
    // ??????????
    const profile = await getUserProfile();
    if (profile) {
        user.value.name = profile.name;
        user.value.avatar = profile.avatar;
        user.value.bio = profile.bio;
    }
    else {
        // ???????????
        await saveUserProfile({
            name: user.value.name,
            avatar: user.value.avatar,
            bio: user.value.bio
        });
    }
});
function showToast(message) {
    toastMessage.value = message;
    window.setTimeout(() => {
        toastMessage.value = '';
    }, 2500);
}
function editProfile() {
    const newBio = window.prompt('????????:', user.value.bio)?.trim();
    if (newBio) {
        user.value.bio = newBio;
        saveUserProfile({
            name: user.value.name,
            avatar: user.value.avatar,
            bio: newBio
        });
        showToast('???????');
    }
}
async function handleUpdateAvatar(avatar) {
    user.value.avatar = avatar;
    await updateUserAvatar(avatar);
    showToast('?????');
}
async function handleUpdateName(name) {
    user.value.name = name;
    await updateUserName(name);
    showToast('?????');
}
function openSettingPage(type) {
    if (type === 'api') {
        emit('openApi');
    }
    else if (type === 'prompt') {
        emit('openPrompt');
    }
    else {
        showToast(`${type} settings - Coming soon`);
    }
}
const profileStats = [
    { label: 'Total Words', value: user.value.totalWords, tone: 'neutral' },
    { label: 'Articles', value: user.value.totalArticles, tone: 'primary' },
    { label: 'Mastery Rate', value: `${user.value.masteryRate}%`, tone: 'success' }
];
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_defaults = {
    'toastMessage': '',
};
const __VLS_modelEmit = defineEmits();
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "profile-page__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-page__brand" },
});
if (__VLS_ctx.user.avatar) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.user.avatar),
        ...{ class: "profile-page__brand-avatar" },
        alt: "????",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-page__brand-mark" },
        'aria-hidden': "true",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-page__status" },
    role: "status",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-page__status-dot" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "profile-page__content" },
});
/** @type {[typeof ProfileHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ProfileHeader, new ProfileHeader({
    ...{ 'onEditProfile': {} },
    ...{ 'onUpdateAvatar': {} },
    ...{ 'onUpdateName': {} },
    user: (__VLS_ctx.user),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onEditProfile': {} },
    ...{ 'onUpdateAvatar': {} },
    ...{ 'onUpdateName': {} },
    user: (__VLS_ctx.user),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onEditProfile: (__VLS_ctx.editProfile)
};
const __VLS_7 = {
    onUpdateAvatar: (__VLS_ctx.handleUpdateAvatar)
};
const __VLS_8 = {
    onUpdateName: (__VLS_ctx.handleUpdateName)
};
var __VLS_2;
/** @type {[typeof ProfileStats, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(ProfileStats, new ProfileStats({
    stats: (__VLS_ctx.profileStats),
}));
const __VLS_10 = __VLS_9({
    stats: (__VLS_ctx.profileStats),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
/** @type {[typeof ProfileApiSettingCard, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(ProfileApiSettingCard, new ProfileApiSettingCard({
    ...{ 'onOpen': {} },
}));
const __VLS_13 = __VLS_12({
    ...{ 'onOpen': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
let __VLS_15;
let __VLS_16;
let __VLS_17;
const __VLS_18 = {
    onOpen: (...[$event]) => {
        __VLS_ctx.emit('openApi');
    }
};
var __VLS_14;
/** @type {[typeof ProfileCssSettingCard, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(ProfileCssSettingCard, new ProfileCssSettingCard({}));
const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
/** @type {[typeof ProfileSettingsList, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(ProfileSettingsList, new ProfileSettingsList({
    ...{ 'onOpenSetting': {} },
}));
const __VLS_23 = __VLS_22({
    ...{ 'onOpenSetting': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_25;
let __VLS_26;
let __VLS_27;
const __VLS_28 = {
    onOpenSetting: (__VLS_ctx.openSettingPage)
};
var __VLS_24;
/** @type {[typeof BottomNavigation, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(BottomNavigation, new BottomNavigation({
    ...{ 'onNavigate': {} },
    activeTab: (__VLS_ctx.activeTab),
}));
const __VLS_30 = __VLS_29({
    ...{ 'onNavigate': {} },
    activeTab: (__VLS_ctx.activeTab),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_32;
let __VLS_33;
let __VLS_34;
const __VLS_35 = {
    onNavigate: (...[$event]) => {
        __VLS_ctx.$emit('navigate', $event);
    }
};
var __VLS_31;
if (__VLS_ctx.toastMessage) {
    /** @type {[typeof ProfileToast, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(ProfileToast, new ProfileToast({
        message: (__VLS_ctx.toastMessage),
    }));
    const __VLS_37 = __VLS_36({
        message: (__VLS_ctx.toastMessage),
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
}
/** @type {__VLS_StyleScopedClasses['profile-page']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__header']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__brand']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__brand-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__status']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__status-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-page__content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BottomNavigation: BottomNavigation,
            ProfileApiSettingCard: ProfileApiSettingCard,
            ProfileCssSettingCard: ProfileCssSettingCard,
            ProfileHeader: ProfileHeader,
            ProfileSettingsList: ProfileSettingsList,
            ProfileStats: ProfileStats,
            ProfileToast: ProfileToast,
            user: user,
            emit: emit,
            toastMessage: toastMessage,
            editProfile: editProfile,
            handleUpdateAvatar: handleUpdateAvatar,
            handleUpdateName: handleUpdateName,
            openSettingPage: openSettingPage,
            profileStats: profileStats,
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
