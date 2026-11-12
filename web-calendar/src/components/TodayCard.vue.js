/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { t, locale } from '../lib/i18n';
import { parseIso } from '../lib/date';
const { defineProps, defineEmits, } = {};
const props = defineProps();
const emit = defineEmits();
const title = computed(() => t('cal_today_title') + ', ' + parseIso(props.date).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }));
const pct = computed(() => (props.summary.plannedTotal ? Math.round((props.summary.plannedDone / props.summary.plannedTotal) * 100) : 0));
const empty = computed(() => !props.summary.plannedTotal);
function due(g) {
    if (g.kind === 'overdue')
        return t('cal_due_overdue').replace('{n}', String(-g.daysLeft));
    if (g.kind === 'today')
        return t('cal_due_today');
    if (g.kind === 'tomorrow')
        return t('cal_due_tomorrow');
    return t('cal_due_soon').replace('{n}', String(g.daysLeft));
}
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
    __VLS_withDotValue(empty, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "mb-4 rounded-xl border p-3" },
        ...{ style: {} },
        'data-test': "today-card",
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-2 flex items-center justify-between gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "m-0 text-base font-medium" },
        'data-test': "today-title",
    });
    /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (__VLS_unwrap(title, {}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('open', __VLS_ctx.date));
                // @ts-ignore
                [title, emit, date,];
            } },
        type: "button",
        ...{ class: "shrink-0 px-3 py-1.5 text-sm" },
        'data-test': "today-open",
    });
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (empty.value ? __VLS_unwrap(t, {})('cal_today_plan') : __VLS_unwrap(t, {})('cal_today_open'));
    if (empty.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim m-0 text-sm" },
            'data-test': "today-none",
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('cal_today_none'));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "m-0 mb-1 text-sm" },
            'data-test': "today-progress",
        });
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('cal_today_plans').replace('{done}', String(__VLS_ctx.summary.plannedDone)).replace('{total}', String(__VLS_ctx.summary.plannedTotal)));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-2 h-1.5 overflow-hidden rounded-full" },
            ...{ style: {} },
            role: "progressbar",
            'aria-valuenow': (__VLS_unwrap(pct, {})),
            'aria-valuemin': "0",
            'aria-valuemax': "100",
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "h-full rounded-full" },
            ...{ style: ({ width: __VLS_unwrap(pct, {}) + '%', background: 'var(--accent)' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "m-0 list-none p-0 text-sm" },
            'data-test': "today-plans",
        });
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['list-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        const __VLS_0 = __VLS_tryAsConstant((__VLS_ctx.summary.plans));
        for (const [p, i] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (i),
                ...{ class: "flex gap-2" },
                ...{ style: ({ color: p.done ? 'var(--text-dim)' : 'var(--text)', textDecoration: p.done ? 'line-through' : 'none' }) },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                'aria-hidden': "true",
            });
            (p.done ? '✓' : '○');
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "min-w-0 break-words" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['break-words']} */ ;
            (p.text);
            // @ts-ignore
            [empty, empty, t, t, t, t, summary, summary, summary, pct, pct,];
        }
        if (__VLS_ctx.summary.planMore) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "dim m-0 mt-1 text-xs" },
                'data-test': "today-plans-more",
            });
            /** @type {__VLS_StyleScopedClasses['dim']} */ ;
            /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_unwrap(t, {})('cal_today_more').replace('{n}', String(__VLS_ctx.summary.planMore)));
        }
    }
    if (__VLS_ctx.summary.upcoming.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3" },
            'data-test': "today-deadlines",
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim m-0 mb-1 text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_unwrap(t, {})('cal_today_deadlines'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "m-0 list-none p-0 text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['list-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        const __VLS_1 = __VLS_tryAsConstant((__VLS_ctx.summary.upcoming));
        for (const [g] of __VLS_vFor(__VLS_nonNull(__VLS_1))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (g.id),
                ...{ class: "flex justify-between gap-2" },
                'data-kind': (g.kind),
                'data-test': ('today-due-' + g.id),
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "min-w-0 break-words" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['break-words']} */ ;
            (g.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "shrink-0" },
                ...{ style: ({ color: g.kind === 'overdue' ? 'var(--danger)' : 'var(--text-dim)' }) },
            });
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            (due(g));
            // @ts-ignore
            [t, t, summary, summary, summary, summary,];
        }
        if (__VLS_ctx.summary.upcomingMore) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "dim m-0 mt-1 text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['dim']} */ ;
            /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_unwrap(t, {})('cal_today_more').replace('{n}', String(__VLS_ctx.summary.upcomingMore)));
        }
    }
    // @ts-ignore
    [t, summary, summary,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
