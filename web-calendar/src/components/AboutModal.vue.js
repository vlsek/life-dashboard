/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { t } from '../lib/i18n';
import EmojiText from './EmojiText.vue';
const { defineEmits, } = {};
const __VLS_emit = defineEmits();
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_ctx.$emit('close'));
                // @ts-ignore
                [$emit,];
            } },
        ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "w-full max-w-md rounded-2xl border p-5" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-lg font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    const __VLS_0 = EmojiText;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        text: (__VLS_unwrap(t, {})('about_title')),
    }));
    const __VLS_2 = __VLS_1({
        text: (__VLS_unwrap(t, {})('about_title')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mt-3 text-sm leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (__VLS_unwrap(t, {})('about_creator_text'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mt-3 text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "https://portfolio.orneryhero.workers.dev/",
        target: "_blank",
        rel: "noopener",
        ...{ class: "inline-block rounded-lg border px-3 py-1.5 font-medium" },
        ...{ style: {} },
        'data-test': "about-resume",
    });
    /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (__VLS_unwrap(t, {})('about_portfolio_link'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mt-4 text-sm leading-relaxed" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (__VLS_unwrap(t, {})('about_feedback_intro'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "https://t.me/vsekorolev",
        target: "_blank",
        rel: "noopener",
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-4 flex justify-end" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_ctx.$emit('close'));
                // @ts-ignore
                [$emit, t, t, t, t,];
            } },
        type: "button",
        ...{ class: "rounded-lg border px-3 py-1.5 text-sm" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_unwrap(t, {})('close'));
    // @ts-ignore
    [t,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
