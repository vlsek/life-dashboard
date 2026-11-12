/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from 'vue';
import { periodRange, shiftPeriod, summarizePeriod } from '../lib/periodSummary';
import { buildStory, periodTitle, signedPoints, trendDelta, trendValue } from '../lib/periodSummaryText';
import { t } from '../lib/i18n';
import EmojiText from './EmojiText.vue';
const { defineProps, } = {};
const props = defineProps();
const kind = ref('month');
const offset = ref(0); // сдвиг от текущего периода (≤ 0: в будущее не уходим)
const showTable = ref(false);
const range = computed(() => {
    let r = periodRange(kind.value, props.ctx.today);
    for (let i = 0; i < -offset.value; i++)
        r = shiftPeriod(r, -1);
    return r;
});
const sum = computed(() => summarizePeriod(props.ctx, range.value));
const story = computed(() => buildStory(sum.value));
const kinds = ['week', 'month', 'year'];
const kindLabel = (k) => t(`sum_${k}`);
function setKind(k) {
    kind.value = k;
    offset.value = 0;
    showTable.value = false;
}
const noteKey = computed(() => (sum.value.state === 'few' ? 'sum_few' : sum.value.state === 'empty' ? 'sum_empty' : sum.value.compareBlock === 'no_prev' ? 'sum_no_prev' : sum.value.compareBlock === 'coverage' ? 'sum_coverage' : null));
const note = computed(() => (noteKey.value ? t(noteKey.value).replace('{n}', String(sum.value.cur.tracked)) : null));
// разница к прошлому периоду для плиток (только если сравнение разрешено)
const avgDelta = computed(() => (sum.value.compare && sum.value.cur.avgPct != null && sum.value.prev.avgPct != null ? sum.value.cur.avgPct - sum.value.prev.avgPct : null));
function countDelta(cur, prev) {
    return sum.value.compare ? signedPoints(cur - prev) : null;
}
const tiles = computed(() => {
    const s = sum.value;
    return [
        { key: 'avg', v: s.cur.avgPct == null ? '—' : s.cur.avgPct + '%', l: t('sum_avg'), d: avgDelta.value == null ? null : `${signedPoints(avgDelta.value)} ${t('sum_pp')}` },
        { key: 'perfect', v: `${s.cur.perfectDays} / ${s.cur.scoredDays}`, l: t('sum_perfect'), d: countDelta(s.cur.perfectDays, s.prev.perfectDays) },
        { key: 'workouts', v: String(s.cur.workoutDays), l: t('sum_workouts'), d: countDelta(s.cur.workoutDays, s.prev.workoutDays) },
        { key: 'goals', v: String(s.cur.planGoalsDone), l: t('sum_goals'), d: countDelta(s.cur.planGoalsDone, s.prev.planGoalsDone) },
    ];
});
const rows = computed(() => (sum.value.metrics ? [...sum.value.metrics.better, ...sum.value.metrics.worse, ...sum.value.metrics.neutral, ...sum.value.metrics.same] : []));
const toneColor = (m) => (m.tone === 'good' ? 'var(--hist-ok)' : m.tone === 'bad' ? 'var(--danger)' : 'var(--text-dim)');
const groups = computed(() => {
    const m = sum.value.metrics;
    if (!m)
        return [];
    return [
        { key: 'better', h: t('sum_better_h'), items: m.better },
        { key: 'worse', h: t('sum_worse_h'), items: m.worse },
        { key: 'neutral', h: t('sum_neutral_h'), items: m.neutral },
    ].filter((g) => g.items.length > 0);
});
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
    __VLS_withDotValue(kind, {});
    __VLS_withDotValue(offset, {});
    __VLS_withDotValue(sum, {});
    __VLS_withDotValue(story, {});
    __VLS_withDotValue(note, {});
    __VLS_withDotValue(groups, {});
    __VLS_withDotValue(rows, {});
    __VLS_withDotValue(showTable, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "no-edge-swipe mb-3 rounded-xl border p-3" },
        ...{ style: {} },
        'data-no-swipe': true,
        'data-test': "hist-summary",
    });
    /** @type {__VLS_StyleScopedClasses['no-edge-swipe']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "mb-2 text-base font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    const __VLS_0 = EmojiText;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        text: (__VLS_unwrap(t, {})('sum_h')),
    }));
    const __VLS_2 = __VLS_1({
        text: (__VLS_unwrap(t, {})('sum_h')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-2 flex gap-1 rounded-xl p-1" },
        ...{ style: {} },
        role: "group",
        'aria-label': (__VLS_unwrap(t, {})('sum_h')),
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-1']} */ ;
    const __VLS_5 = __VLS_tryAsConstant((__VLS_unwrap(kinds, {})));
    for (const [k] of __VLS_vFor(__VLS_nonNull(__VLS_5))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (setKind(k));
                    // @ts-ignore
                    [t, t, kinds,];
                } },
            key: (k),
            type: "button",
            ...{ class: "min-h-11 flex-1 rounded-lg text-sm" },
            ...{ class: (kind.value === k ? 'font-bold' : '') },
            ...{ style: ({ background: kind.value === k ? 'var(--bg-card)' : 'transparent', color: 'var(--text)', boxShadow: kind.value === k ? '0 1px 2px rgba(0,0,0,0.2)' : 'none' }) },
            'aria-pressed': (kind.value === k),
            'data-test': (`sum-kind-${k}`),
        });
        /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(kindLabel, {})(k));
        // @ts-ignore
        [kind, kind, kind, kind, kindLabel,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-2 flex items-center justify-between gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (offset.value--);
                // @ts-ignore
                [offset,];
            } },
        type: "button",
        ...{ class: "min-h-11 min-w-11 rounded-lg border" },
        ...{ style: {} },
        'aria-label': (__VLS_unwrap(t, {})('sum_prev')),
        'data-test': "sum-prev",
    });
    /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-w-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "font-bold" },
        'data-test': "sum-title",
    });
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_unwrap(periodTitle, {})(__VLS_unwrap(range, {})));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (offset.value++);
                // @ts-ignore
                [t, offset, periodTitle, range,];
            } },
        type: "button",
        ...{ class: "min-h-11 min-w-11 rounded-lg border disabled:opacity-40" },
        ...{ style: {} },
        disabled: (offset.value >= 0),
        'aria-label': (__VLS_unwrap(t, {})('sum_next')),
        'data-test': "sum-next",
    });
    /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-w-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
    if (sum.value.state !== 'ok') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
            ...{ style: {} },
            'data-test': "sum-note",
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (note.value);
    }
    else {
        if (story.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mb-2 text-sm leading-relaxed" },
                'data-test': "sum-story",
            });
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            (story.value);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-2 gap-2" },
            'data-test': "sum-tiles",
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        const __VLS_6 = __VLS_tryAsConstant((__VLS_unwrap(tiles, {})));
        for (const [x] of __VLS_vFor(__VLS_nonNull(__VLS_6))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (x.key),
                ...{ class: "rounded-xl p-2.5" },
                ...{ style: {} },
                'data-test': (`sum-tile-${x.key}`),
            });
            /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-xl font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (x.v);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-[0.7em]" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['text-[0.7em]']} */ ;
            (x.l);
            if (x.d) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-[0.7em]" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['text-[0.7em]']} */ ;
                (x.d);
                (__VLS_unwrap(t, {})('sum_vs_prev'));
            }
            // @ts-ignore
            [t, t, offset, sum, note, story, story, tiles,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-2 text-[0.75em]" },
            ...{ style: {} },
            'data-test': "sum-tracked",
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[0.75em]']} */ ;
        (__VLS_unwrap(t, {})('sum_tracked').replace('{a}', String(sum.value.cur.tracked)).replace('{b}', String(sum.value.cur.possible)));
        if (note.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mt-1 text-sm" },
                ...{ style: {} },
                'data-test': "sum-note",
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (note.value);
        }
        if (sum.value.metrics) {
            const __VLS_7 = __VLS_tryAsConstant((groups.value));
            for (const [g] of __VLS_vFor(__VLS_nonNull(__VLS_7))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (g.key),
                    ...{ class: "mt-3" },
                    'data-test': (`sum-group-${g.key}`),
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-[0.75em]" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['text-[0.75em]']} */ ;
                (g.h);
                const __VLS_8 = __VLS_tryAsConstant((g.items));
                for (const [m] of __VLS_vFor(__VLS_nonNull(__VLS_8))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (m.id),
                        ...{ class: "flex min-h-11 items-center justify-between gap-2 border-t py-1.5 text-sm" },
                        ...{ style: {} },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "min-w-0 truncate" },
                    });
                    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                    const __VLS_9 = EmojiText;
                    // @ts-ignore
                    const __VLS_10 = __VLS_asFunctionalComponent1(__VLS_9, new __VLS_9({
                        // @ts-ignore
                        text: (`${m.icon} ${m.name}`),
                    }));
                    const __VLS_11 = __VLS_10({
                        text: (`${m.icon} ${m.name}`),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "shrink-0 text-right" },
                        ...{ style: ({ color: __VLS_unwrap(toneColor, {})(m) }) },
                    });
                    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                    (__VLS_unwrap(trendDelta, {})(m));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "block text-[0.75em]" },
                        ...{ style: {} },
                    });
                    /** @type {__VLS_StyleScopedClasses['block']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[0.75em]']} */ ;
                    (__VLS_unwrap(trendValue, {})(m));
                    if (m.kind === 'share') {
                        (' ' + __VLS_unwrap(t, {})('sum_share_unit'));
                    }
                    // @ts-ignore
                    [t, t, sum, sum, sum, note, note, groups, toneColor, trendDelta, trendValue,];
                }
                // @ts-ignore
                [];
            }
            if (groups.value.length === 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "mt-3 text-sm" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (__VLS_unwrap(t, {})('sum_none_better'));
            }
            if (sum.value.metrics.insufficient.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-3" },
                    'data-test': "sum-group-insufficient",
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-[0.75em]" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['text-[0.75em]']} */ ;
                (__VLS_unwrap(t, {})('sum_insuff_h'));
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-sm" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                const __VLS_14 = EmojiText;
                // @ts-ignore
                const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
                    // @ts-ignore
                    text: (sum.value.metrics.insufficient.map((x) => `${x.icon} ${x.name}`).join(', ')),
                }));
                const __VLS_16 = __VLS_15({
                    text: (sum.value.metrics.insufficient.map((x) => `${x.icon} ${x.name}`).join(', ')),
                }, ...__VLS_functionalComponentArgsRest(__VLS_15));
            }
            if (rows.value.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            void $event;
                            if (!!(sum.value.state !== 'ok'))
                                throw 0;
                            if (!(sum.value.metrics))
                                throw 0;
                            if (!(rows.value.length))
                                throw 0;
                            return (showTable.value = !showTable.value);
                            // @ts-ignore
                            [t, t, sum, sum, groups, rows, showTable, showTable,];
                        } },
                    type: "button",
                    ...{ class: "mt-3 min-h-11 rounded-lg border px-3 text-sm" },
                    ...{ style: {} },
                    'aria-expanded': (showTable.value),
                    'data-test': "sum-table-toggle",
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (showTable.value ? __VLS_unwrap(t, {})('sum_all_hide') : __VLS_unwrap(t, {})('sum_all'));
            }
            if (showTable.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-2 overflow-x-auto" },
                    'data-test': "sum-table",
                });
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
                    ...{ class: "w-full text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                    ...{ class: "text-left text-[0.75em]" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[0.75em]']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
                    ...{ class: "py-1 font-semibold" },
                });
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                (__VLS_unwrap(t, {})('sum_col_metric'));
                __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
                    ...{ class: "whitespace-nowrap py-1 pl-2 text-right font-semibold" },
                });
                /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['pl-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                (__VLS_unwrap(t, {})('sum_col_prev'));
                (__VLS_unwrap(t, {})('sum_col_now'));
                __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
                    ...{ class: "py-1 text-right font-semibold" },
                });
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                (__VLS_unwrap(t, {})('sum_col_delta'));
                __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
                const __VLS_19 = __VLS_tryAsConstant((rows.value));
                for (const [m] of __VLS_vFor(__VLS_nonNull(__VLS_19))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                        key: (m.id),
                        ...{ class: "border-t" },
                        ...{ style: {} },
                    });
                    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                        ...{ class: "py-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                    const __VLS_20 = EmojiText;
                    // @ts-ignore
                    const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({
                        // @ts-ignore
                        text: (`${m.icon} ${m.name}`),
                    }));
                    const __VLS_22 = __VLS_21({
                        text: (`${m.icon} ${m.name}`),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                        ...{ class: "whitespace-nowrap py-2 pl-2 text-right" },
                    });
                    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['pl-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                    (__VLS_unwrap(trendValue, {})(m));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                        ...{ class: "whitespace-nowrap py-2 pl-2 text-right" },
                        ...{ style: ({ color: __VLS_unwrap(toneColor, {})(m) }) },
                    });
                    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['pl-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                    (__VLS_unwrap(trendDelta, {})(m));
                    // @ts-ignore
                    [t, t, t, t, t, t, toneColor, trendDelta, trendValue, rows, showTable, showTable, showTable,];
                }
            }
        }
    }
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
