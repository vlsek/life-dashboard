/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref } from 'vue';
import { getLang, t } from '../lib/i18n';
import { loadVersionInfo } from '../lib/version';
import EmojiText from './EmojiText.vue';
const { defineEmits, } = {};
const emit = defineEmits();
const entries = ref([]);
const loaded = ref(false);
const error = ref(false);
onMounted(async () => {
    try {
        const info = await loadVersionInfo();
        entries.value = getLang() === 'ru' ? info.ru : info.en;
    }
    catch {
        error.value = true;
    }
    finally {
        loaded.value = true;
    }
});
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
    __VLS_withDotValue(loaded, {});
    __VLS_withDotValue(error, {});
    __VLS_withDotValue(entries, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('close'));
                // @ts-ignore
                [emit,];
            } },
        ...{ class: "modal-backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "modal" },
        'data-test': "changelog-modal",
    });
    /** @type {__VLS_StyleScopedClasses['modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    const __VLS_0 = EmojiText;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        text: (__VLS_unwrap(t, {})('changelog_title')),
    }));
    const __VLS_2 = __VLS_1({
        text: (__VLS_unwrap(t, {})('changelog_title')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    if (loaded.value && (error.value || entries.value.length === 0)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim" },
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        (__VLS_unwrap(t, {})('changelog_empty'));
    }
    const __VLS_5 = __VLS_tryAsConstant((entries.value));
    for (const [e] of __VLS_vFor(__VLS_nonNull(__VLS_5))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.template)({
            key: (e.version),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "mb-1.5 mt-4 text-sm font-semibold" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        (e.version);
        (e.date ? ' — ' + e.date : '');
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "dim m-0 pl-5 text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['pl-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        const __VLS_6 = __VLS_tryAsConstant((e.changes));
        for (const [c, i] of __VLS_vFor(__VLS_nonNull(__VLS_6))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (i),
            });
            (c);
            // @ts-ignore
            [t, t, loaded, error, entries, entries,];
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "modal-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('close'));
                // @ts-ignore
                [emit,];
            } },
        type: "button",
        ...{ class: "secondary" },
    });
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
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
