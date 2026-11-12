/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { t } from '../lib/i18n';
import { monthCategoryGroups } from '../lib/historyCategories';
import { donutArcs, groupPct } from '../lib/categoryDonut';
const { defineProps, } = {};
const props = defineProps();
const groups = computed(() => monthCategoryGroups(props.ctx, props.ctx.categories || {}, props.year, props.month));
const arcs = computed(() => donutArcs(groups.value));
const show = computed(() => groups.value.length >= 2);
const R = 15.9155; // длина окружности = 100 → доли без пересчёта
const color = (hue) => `hsl(${hue} 65% 55%)`;
const labelOf = (g) => (g.kind === 'none' ? t('hist_cat_none') : g.label);
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
    __VLS_withDotValue(show, {});
    __VLS_withDotValue(arcs, {});
    if (show.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-3 rounded-xl border p-3" },
            ...{ style: {} },
            'data-test': "month-category-chart",
        });
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-2 text-sm font-semibold" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        (__VLS_unwrap(t, {})('hist_cat_h'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center gap-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "84",
            height: "84",
            viewBox: "0 0 36 36",
            role: "img",
            'aria-label': (__VLS_unwrap(t, {})('hist_cat_aria')),
            ...{ style: {} },
        });
        const __VLS_0 = __VLS_tryAsConstant((arcs.value));
        for (const [a] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.template)({
                key: (a.key),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                cx: "18",
                cy: "18",
                r: (__VLS_unwrap(R, {})),
                fill: "none",
                stroke: (__VLS_unwrap(color, {})(a.hue)),
                'stroke-opacity': "0.22",
                'stroke-width': "4",
                'stroke-dasharray': (`${a.lenFrac * 100} ${100 - a.lenFrac * 100}`),
                'stroke-dashoffset': (-a.startFrac * 100),
                'data-test': "donut-track",
            });
            if (a.doneFrac > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                    cx: "18",
                    cy: "18",
                    r: (__VLS_unwrap(R, {})),
                    fill: "none",
                    stroke: (__VLS_unwrap(color, {})(a.hue)),
                    'stroke-width': "4",
                    'stroke-dasharray': (`${a.doneFrac * 100} ${100 - a.doneFrac * 100}`),
                    'stroke-dashoffset': (-a.startFrac * 100),
                    'data-test': "donut-fill",
                });
            }
            // @ts-ignore
            [show, t, t, arcs, R, R, color, color,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "min-w-0 flex-1 text-xs" },
            'aria-label': (__VLS_unwrap(t, {})('hist_cat_h')),
        });
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        const __VLS_1 = __VLS_tryAsConstant((__VLS_unwrap(groups, {})));
        for (const [g, k] of __VLS_vFor(__VLS_nonNull(__VLS_1))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (g.key),
                ...{ class: "flex items-center gap-1.5 py-px" },
                'data-test': "donut-legend",
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-px']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
                ...{ class: "inline-block h-2.5 w-2.5 shrink-0 rounded-full" },
                ...{ style: ({ background: __VLS_unwrap(color, {})(arcs.value[k]?.hue ?? 0) }) },
            });
            /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-2.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-2.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "min-w-0 flex-1 truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_unwrap(labelOf, {})(g));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "whitespace-nowrap" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
            (g.done);
            (g.total);
            (__VLS_unwrap(groupPct, {})(g));
            // @ts-ignore
            [t, arcs, color, groups, labelOf, groupPct,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-2 text-[0.7em]" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[0.7em]']} */ ;
        (__VLS_unwrap(t, {})('hist_cat_hint'));
    }
    // @ts-ignore
    [t,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
