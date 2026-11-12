/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { getLang } from '../lib/i18n';
const { defineEmits, } = {};
const emit = defineEmits();
const TEXTS = {
    ru: { title: 'Точно выйти?', text: 'Чтобы снова увидеть свои данные, нужно будет войти заново.', cancel: 'Отмена', logout: 'Выйти' },
    en: { title: 'Log out?', text: 'You will need to sign in again to see your data.', cancel: 'Cancel', logout: 'Log out' },
};
const tx = TEXTS[getLang()];
const cancelBtn = ref(null);
function onKeydown(e) {
    if (e.key === 'Escape')
        emit('cancel');
}
onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    cancelBtn.value?.focus();
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(tx, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['logout-box']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('cancel'));
                // @ts-ignore
                [emit,];
            } },
        ...{ class: "logout-backdrop no-edge-swipe" },
    });
    /** @type {__VLS_StyleScopedClasses['logout-backdrop']} */ ;
    /** @type {__VLS_StyleScopedClasses['no-edge-swipe']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logout-box" },
        role: "alertdialog",
        'aria-modal': "true",
        'aria-labelledby': "logout-confirm-title",
        'data-test': "logout-confirm",
    });
    /** @type {__VLS_StyleScopedClasses['logout-box']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        id: "logout-confirm-title",
    });
    (tx.value.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "logout-text" },
    });
    /** @type {__VLS_StyleScopedClasses['logout-text']} */ ;
    (tx.value.text);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logout-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['logout-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('cancel'));
                // @ts-ignore
                [emit, tx, tx,];
            } },
        ref: "cancelBtn",
        type: "button",
        ...{ class: "logout-btn logout-btn-secondary" },
        'data-test': "logout-cancel",
    });
    /** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['logout-btn-secondary']} */ ;
    (tx.value.cancel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('confirm'));
                // @ts-ignore
                [emit, tx,];
            } },
        type: "button",
        ...{ class: "logout-btn logout-btn-primary" },
        'data-test': "logout-confirm-btn",
    });
    /** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['logout-btn-primary']} */ ;
    (tx.value.logout);
    // @ts-ignore
    [tx,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
