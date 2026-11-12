/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
import { t } from '../lib/i18n';
const { defineProps, } = {};
const props = defineProps();
const busy = ref(false);
async function onRetry() {
    if (busy.value)
        return;
    busy.value = true;
    try {
        await props.retry();
    }
    finally {
        busy.value = false;
    }
}
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3 flex flex-col items-start gap-2" },
        role: "alert",
        'data-testid': "load-error",
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "dim m-0" },
    });
    /** @type {__VLS_StyleScopedClasses['dim']} */ ;
    /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
    (__VLS_unwrap(t, {})('comm_load_error'));
    (__VLS_ctx.message);
    var __VLS_0 = {};
    if (__VLS_unwrap(offline, {})()) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim m-0 text-sm" },
            'data-testid': "load-error-offline",
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('load_offline'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (onRetry) },
        type: "button",
        ...{ class: "secondary min-h-11 px-4" },
        disabled: (__VLS_unwrap(busy, {})),
        'data-testid': "load-retry",
    });
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    (__VLS_unwrap(t, {})('load_retry'));
    var __VLS_1 = __VLS_0;
    // @ts-ignore
    [t, t, t, message, offline, busy,];
    return {
        __VLS_Slots: {},
    };
};
void [__VLS_template, {}];
const __VLS_base = (await import('vue')).defineComponent({
    __typeProps: {},
});
const __VLS_export = {};
export default {};
