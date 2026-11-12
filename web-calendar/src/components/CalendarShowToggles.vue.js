/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from 'vue';
import { t } from '../lib/i18n';
import { CALENDAR_PARTS, HISTORY_PARTS } from '../lib/calendarShow';
const { defineProps, defineEmits, } = {};
const props = defineProps();
const emit = defineEmits();
const open = ref(false);
const parts = computed(() => (props.view === 'history' ? HISTORY_PARTS : CALENDAR_PARTS));
const hidden = computed(() => parts.value.filter((k) => !props.show[k]).length);
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
    __VLS_withDotValue(open, {});
    __VLS_withDotValue(hidden, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-3" },
        'data-test': "cal-show",
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (open.value = !open.value);
                // @ts-ignore
                [open, open,];
            } },
        type: "button",
        ...{ class: "rounded-lg border px-3 py-1.5 text-sm" },
        ...{ style: {} },
        'aria-expanded': (open.value),
        'data-test': "cal-show-toggle",
    });
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_unwrap(t, {})('cal_show_title'));
    if (hidden.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "ml-1" },
            ...{ style: {} },
            'data-test': "cal-show-hidden",
        });
        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
        (hidden.value);
    }
    if (open.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-2" },
            'data-test': "cal-show-panel",
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-wrap gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        const __VLS_0 = __VLS_tryAsConstant((__VLS_unwrap(parts, {})));
        for (const [k] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!(open.value))
                            throw 0;
                        return (__VLS_unwrap(emit, {})('toggle', k));
                        // @ts-ignore
                        [open, open, t, hidden, hidden, parts, emit,];
                    } },
                key: (k),
                type: "button",
                ...{ class: "rounded-full border px-3 py-1 text-sm" },
                ...{ style: ({ borderColor: __VLS_ctx.show[k] ? 'var(--accent)' : 'var(--border)', background: __VLS_ctx.show[k] ? 'var(--accent)' : 'var(--bg-card)', color: __VLS_ctx.show[k] ? 'var(--accent-text)' : 'var(--text-dim)' }) },
                'aria-pressed': (__VLS_ctx.show[k]),
                'data-test': ('cal-show-' + k),
            });
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_unwrap(t, {})(('cal_show_' + k)));
            // @ts-ignore
            [t, show, show, show, show,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1 text-xs" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_unwrap(t, {})('cal_show_hint'));
    }
    // @ts-ignore
    [t,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
