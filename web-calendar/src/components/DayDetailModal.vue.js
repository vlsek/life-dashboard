/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { dayStats, hasData, plannedItemDone, plannedOf } from '../lib/historyStats';
import { isMetricDone, metricExpectedOn, metricSchedule } from '../lib/historyMetrics';
import { locale, t } from '../lib/i18n';
import { reflectionOf } from '../lib/reflection';
import MetricIcon from './MetricIcon.vue';
import Icon from './Icon.vue';
const { defineProps, defineEmits, } = {};
const props = defineProps();
const emit = defineEmits();
const isFuture = computed(() => props.dateStr > props.ctx.today);
const hasStats = computed(() => hasData(props.ctx, props.dateStr));
const stats = computed(() => dayStats(props.ctx, props.dateStr));
const fill = computed(() => Math.min(100, stats.value.pct));
const dateLabel = computed(() => {
    const d = new Date(props.dateStr + 'T00:00:00');
    const s = d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
});
const metricRows = computed(() => {
    const vals = props.ctx.byDate[props.dateStr] || {};
    return props.ctx.metrics.map((m) => {
        const v = vals[m.id];
        const done = isMetricDone(m, v, props.dateStr);
        const expected = metricExpectedOn(m, props.dateStr);
        const sc = metricSchedule(m);
        return {
            metric: m,
            done,
            expected,
            offLabel: !expected && !done ? (sc?.type === 'weekly' ? `${sc.min}${t('dash_schedule_weekly_short')}` : t('hist_not_scheduled')) : null,
            valueText: fmtMetricValue(m, v),
        };
    });
});
function fmtMetricValue(m, v) {
    if (v == null)
        return '—';
    if (m.type === 'boolean')
        return v === true ? '✓' : '—';
    if (m.type === 'multiselect') {
        if (!Array.isArray(v) || v.length === 0)
            return '—';
        return v.map((k) => (m.options || []).find((o) => (o.key ?? o.label) === k)?.label ?? k).join(', ');
    }
    if (m.type === 'sets') {
        const sets = v;
        if (!Array.isArray(sets) || sets.length === 0)
            return '—';
        const reps = sets.reduce((sum, s) => sum + (s?.reps || 0), 0);
        const times = sets.map((s) => s?.time).filter(Boolean);
        return `${sets.length} ${t('hist_sets_word')} · ${reps} ${t('hist_reps_word')}` + (times.length ? `\n${times.join(', ')}` : '');
    }
    const goal = m.goal_value ? ` / ${m.goal_direction === 'at_most' ? '< ' : ''}${m.goal_value}` : '';
    return `${v}${m.unit ? ' ' + m.unit : ''}${goal}`;
}
const plannedRows = computed(() => plannedOf(props.ctx, props.dateStr).map((item) => ({
    item,
    done: plannedItemDone(props.ctx, item),
})));
const reflection = computed(() => reflectionOf(props.ctx.notesByDate[props.dateStr]));
const notes = computed(() => {
    const raw = props.ctx.notesByDate[props.dateStr]?.items || [];
    return raw.map((n) => (typeof n === 'string' ? n : (n?.text ?? '')));
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
    __VLS_withDotValue(isFuture, {});
    __VLS_withDotValue(hasStats, {});
    __VLS_withDotValue(stats, {});
    __VLS_withDotValue(plannedRows, {});
    __VLS_withDotValue(reflection, {});
    __VLS_withDotValue(notes, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('close'));
                // @ts-ignore
                [emit,];
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
        ...{ class: "max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['max-h-[85vh]']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "mb-3 text-lg font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_unwrap(dateLabel, {}));
    if (isFuture.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('hist_future_day'));
    }
    else if (!hasStats.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('hist_no_data'));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-baseline gap-2.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-baseline']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-2xl font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        (stats.value.pct);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('hist_done_of'));
        (stats.value.done);
        (stats.value.total);
        if (stats.value.bonusPct) {
            (stats.value.bonusPct);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "my-3 h-2.5 overflow-hidden rounded-md border" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['my-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "h-full rounded-md" },
            ...{ style: ({ width: __VLS_unwrap(fill, {}) + '%', background: stats.value.pct >= 100 ? 'var(--hist-ok)' : 'var(--accent)' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
        if (__VLS_ctx.ctx.metrics.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "mb-1.5 mt-3 font-semibold" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            (__VLS_unwrap(t, {})('hist_metrics_h'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "table-scroll overflow-x-auto" },
                'data-test': "table-scroll",
            });
            /** @type {__VLS_StyleScopedClasses['table-scroll']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
                ...{ class: "w-full text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
            const __VLS_0 = __VLS_tryAsConstant((__VLS_unwrap(metricRows, {})));
            for (const [r] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                    key: (r.metric.id),
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                    ...{ class: "w-[1%] pr-2 align-top" },
                });
                /** @type {__VLS_StyleScopedClasses['w-[1%]']} */ ;
                /** @type {__VLS_StyleScopedClasses['pr-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['align-top']} */ ;
                if (r.done) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                }
                else if (r.expected) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                    ...{ class: "py-1 align-top" },
                });
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['align-top']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "inline-flex items-center gap-1" },
                });
                /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
                const __VLS_1 = MetricIcon;
                // @ts-ignore
                const __VLS_2 = __VLS_asFunctionalComponent1(__VLS_1, new __VLS_1({
                    // @ts-ignore
                    icon: (r.metric.icon),
                }));
                const __VLS_3 = __VLS_2({
                    icon: (r.metric.icon),
                }, ...__VLS_functionalComponentArgsRest(__VLS_2));
                (r.metric.name);
                if (r.offLabel) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-[0.75em]" },
                        ...{ style: {} },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[0.75em]']} */ ;
                    (r.offLabel);
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
                    ...{ class: "whitespace-pre-line py-1 text-right align-top" },
                });
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-line']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                /** @type {__VLS_StyleScopedClasses['align-top']} */ ;
                (r.valueText);
                // @ts-ignore
                [dateLabel, isFuture, t, t, t, t, hasStats, stats, stats, stats, stats, stats, stats, fill, ctx, metricRows,];
            }
        }
        if (plannedRows.value.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "mb-1.5 mt-3.5 font-semibold" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            (__VLS_unwrap(t, {})('hist_planned_h'));
            const __VLS_6 = __VLS_tryAsConstant((plannedRows.value));
            for (const [r, i] of __VLS_vFor(__VLS_nonNull(__VLS_6))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (i),
                    ...{ class: "flex items-center gap-2 py-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                if (r.done === null) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                    const __VLS_7 = Icon;
                    // @ts-ignore
                    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
                        // @ts-ignore
                        name: "alert",
                    }));
                    const __VLS_9 = __VLS_8({
                        name: "alert",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
                }
                else if (r.done) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ style: ({ opacity: r.done ? 0.7 : 1 }) },
                });
                (r.item.text);
                if (r.item.type === 'goal') {
                    (__VLS_unwrap(t, {})('cal_goal_suffix'));
                }
                if (r.item.bonus) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ style: {} },
                    });
                    const __VLS_12 = Icon;
                    // @ts-ignore
                    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
                        // @ts-ignore
                        name: "star",
                    }));
                    const __VLS_14 = __VLS_13({
                        name: "star",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
                }
                // @ts-ignore
                [t, t, plannedRows, plannedRows,];
            }
        }
        if (reflection.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "mb-1.5 mt-3.5 font-semibold" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            (__VLS_unwrap(t, {})('hist_reflect_h'));
            if (reflection.value.mood) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "m-0" },
                    'data-test': "day-mood",
                });
                /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
                (__VLS_unwrap(t, {})('hist_reflect_mood'));
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (reflection.value.mood);
                (__VLS_unwrap(t, {})(('hist_reflect_mood_' + reflection.value.mood)));
            }
            if (reflection.value.note) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "m-0 mt-1 whitespace-pre-wrap" },
                    'data-test': "day-note",
                });
                /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
                (reflection.value.note);
            }
        }
        if (notes.value.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "mb-1.5 mt-3.5 font-semibold" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            (__VLS_unwrap(t, {})('hist_notes_h'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                ...{ class: "list-disc pl-5" },
            });
            /** @type {__VLS_StyleScopedClasses['list-disc']} */ ;
            /** @type {__VLS_StyleScopedClasses['pl-5']} */ ;
            const __VLS_17 = __VLS_tryAsConstant((notes.value));
            for (const [n, i] of __VLS_vFor(__VLS_nonNull(__VLS_17))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                    key: (i),
                });
                (n);
                // @ts-ignore
                [t, t, t, t, reflection, reflection, reflection, reflection, reflection, reflection, notes, notes,];
            }
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-4 flex justify-end" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('close'));
                // @ts-ignore
                [emit,];
            } },
        type: "button",
        ...{ class: "rounded-lg border px-4 py-2 text-sm" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_unwrap(t, {})('dash_close_btn'));
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
