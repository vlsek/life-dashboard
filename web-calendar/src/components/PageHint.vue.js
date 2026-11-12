/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref } from 'vue';
import { getLang } from '../lib/i18n';
import { PAGE_HINT_LABELS, hasSeenHint, hintFor, markHintSeen } from '../lib/pageHints';
const { defineProps, } = {};
const props = defineProps();
const open = ref(false);
const lang = getLang();
const hint = computed(() => hintFor(props.page, lang));
const labels = computed(() => PAGE_HINT_LABELS[lang === 'en' ? 'en' : 'ru']);
onMounted(() => {
    if (hint.value && !props.suppress && !hasSeenHint(props.page))
        open.value = true;
});
function close() {
    open.value = false;
    markHintSeen(props.page);
}
function toggle() {
    if (open.value)
        close();
    else
        open.value = true;
}
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
    __VLS_withDotValue(hint, {});
    __VLS_withDotValue(labels, {});
    __VLS_withDotValue(open, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['ph-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-list']} */ ;
    if (hint.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ph-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['ph-wrap']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (toggle) },
            type: "button",
            ...{ class: "ph-btn" },
            'aria-expanded': (open.value),
            'aria-label': (labels.value.info),
            title: (labels.value.info),
            'data-test': "page-hint-btn",
        });
        /** @type {__VLS_StyleScopedClasses['ph-btn']} */ ;
        if (open.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "ph-card" },
                role: "dialog",
                'aria-label': (hint.value.title),
                'data-test': "page-hint",
            });
            /** @type {__VLS_StyleScopedClasses['ph-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
                ...{ class: "ph-title" },
            });
            /** @type {__VLS_StyleScopedClasses['ph-title']} */ ;
            (hint.value.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                ...{ class: "ph-list" },
            });
            /** @type {__VLS_StyleScopedClasses['ph-list']} */ ;
            const __VLS_0 = __VLS_tryAsConstant((hint.value.tips));
            for (const [tip, i] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                    key: (i),
                });
                (tip);
                // @ts-ignore
                [hint, hint, hint, hint, open, open, labels, labels,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (close) },
                type: "button",
                ...{ class: "ph-ok" },
                'data-test': "page-hint-ok",
            });
            /** @type {__VLS_StyleScopedClasses['ph-ok']} */ ;
            (labels.value.ok);
        }
    }
    // @ts-ignore
    [labels,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
