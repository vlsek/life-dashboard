/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from 'vue';
import { useAuthAndData } from '../lib/useHistoryData';
import { addDaysIso, fmtDate, mondayOf, parseIso } from '../lib/date';
import { dayStats, hasData, weekStats } from '../lib/historyStats';
import { locale, t } from '../lib/i18n';
import { hasEvents } from '../lib/lifeEvents';
import { reflectionOf } from '../lib/reflection';
import DayDetailModal from './DayDetailModal.vue';
import LoadError from './LoadError.vue';
import EmojiText from './EmojiText.vue';
import Icon from './Icon.vue';
import MonthCategoryChart from './MonthCategoryChart.vue';
import PeriodSummaryCard from './PeriodSummaryCard.vue';
import { doneCount, openDeadlines } from '../lib/calendar';
import { defaultShow } from '../lib/calendarShow';
const { defineProps, defineEmits, defineExpose, withDefaults, } = {};
const props = withDefaults(defineProps(), { show: () => defaultShow() });
const emit = defineEmits();
const isCalendar = computed(() => props.mode === 'calendar');
// BACKLOG 48.1 (владелец 2026-10-08: «в обычном календаре не надо показывать прогресс дня, только во вкладке календаря история; в обычном только планы»):
// прогресс дня (заливка, %, золотая обводка >100%, колонка недели, статистика месяца) — ТОЛЬКО во вкладке «История»; в «Календаре» остаются планы и дедлайны.
// «Показывать …» (44.8 срез 2): каждую часть можно выключить; сетка месяца остаётся всегда
const showSummary = computed(() => !isCalendar.value && props.show.summary);
const showProgress = computed(() => !isCalendar.value && props.show.progress);
const showWeekCol = computed(() => !isCalendar.value && props.show.weekcol);
const showStats = computed(() => !isCalendar.value && props.show.stats);
const showChart = computed(() => !isCalendar.value && props.show.chart);
const showWeeks = computed(() => !isCalendar.value && props.show.weeks);
const gridCols = computed(() => (showWeekCol.value ? 'repeat(7, minmax(0, 1fr)) minmax(0, 1.05fr)' : 'repeat(7, minmax(0, 1fr))'));
const { auth, ctx, error, reload } = useAuthAndData();
const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth()); // 0..11
const weekdayNames = t('dash_weekdays_short').split(',');
const monthTitle = computed(() => {
    const d = new Date(viewYear.value, viewMonth.value, 1);
    const s = d.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
});
const isCurrentMonth = computed(() => viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth());
// В «Истории» вперёд листать нельзя (данных ещё нет); в «Календаре» можно — планы ставят наперёд
const nextDisabled = computed(() => !isCalendar.value && (isCurrentMonth.value || viewYear.value > now.getFullYear() || (viewYear.value === now.getFullYear() && viewMonth.value >= now.getMonth())));
function shiftMonth(delta) {
    const d = new Date(viewYear.value, viewMonth.value + delta, 1);
    if (!isCalendar.value && (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())))
        return;
    viewYear.value = d.getFullYear();
    viewMonth.value = d.getMonth();
    emit('monthChange', viewYear.value, viewMonth.value);
}
function goToday() {
    viewYear.value = now.getFullYear();
    viewMonth.value = now.getMonth();
    emit('monthChange', viewYear.value, viewMonth.value);
}
// Бейджи «Календаря» на ячейке: планы дня (✓ если всё выполнено, иначе 📌 сделано/всего) и дедлайны целей (число; приглушены, когда все закрыты)
function planBadge(dateStr) {
    const items = dateStr ? props.planned?.[dateStr] : undefined;
    if (!items || !items.length)
        return null;
    const c = doneCount(items);
    return { done: c.done, total: c.total, all: c.done === c.total };
}
function deadlineBadge(dateStr) {
    const list = dateStr ? props.deadlines?.[dateStr] : undefined;
    if (!list || !list.length)
        return null;
    return { count: list.length, allDone: openDeadlines(list) === 0 };
}
// Точки «событий жизни» (76.1): разные формы и цвета — тренировка, день челленджа, срок вехи; полный список в окне дня
function eventDots(dateStr) {
    const e = dateStr ? props.events?.[dateStr] : undefined;
    if (!hasEvents(e))
        return null;
    return { workout: e.workouts > 0, challenge: e.challenges.length > 0, milestone: e.milestones.length > 0 };
}
// Оценка дня (75.3) маленьким кружком на ячейке «Календаря»: цвет от красного (1) к зелёному (5), цифра внутри; нет оценки — нет кружка
function moodOf(dateStr) {
    if (!dateStr || !ctx.value)
        return null;
    return reflectionOf(ctx.value.notesByDate?.[dateStr])?.mood ?? null;
}
function onCellClick(dateStr) {
    if (!dateStr)
        return;
    if (isCalendar.value)
        emit('selectDay', dateStr);
    else
        selectedDate.value = dateStr;
}
const monthGrid = computed(() => {
    const c = ctx.value;
    const rows = [];
    if (!c)
        return { rows, weekPct: new Map(), avg: null, perfect: 0, trackedDays: 0 };
    const first = new Date(viewYear.value, viewMonth.value, 1);
    const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7;
    let pctSum = 0;
    let pctDays = 0;
    let perfect = 0;
    const weekPct = new Map(); // индекс строки -> % недели (или null)
    let row = [];
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - lead + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
            row.push({ key: `e${i}`, dateStr: null, dayNum: null, isToday: false, isFuture: false, hasStats: false, hasNoData: false, pct: 0, fill: 0, over: false });
        }
        else {
            const dateStr = fmtDate(new Date(viewYear.value, viewMonth.value, dayNum));
            const future = dateStr > c.today;
            const data = hasData(c, dateStr);
            const st = data ? dayStats(c, dateStr) : null;
            const show = !!st && (st.total > 0 || st.bonusPct > 0);
            const fill = show ? Math.max(0, Math.min(100, st.pct)) : 0;
            if (show) {
                pctSum += Math.min(100, st.pct);
                pctDays++;
                if (st.pct >= 100)
                    perfect++;
            }
            row.push({
                key: dateStr,
                dateStr,
                dayNum,
                isToday: dateStr === c.today,
                isFuture: future,
                hasStats: show,
                hasNoData: !data && !future,
                pct: show ? st.pct : 0,
                fill,
                over: show && st.pct > 100,
            });
        }
        if (i % 7 === 6) {
            const monday = fmtDate(new Date(viewYear.value, viewMonth.value, i - 6 - lead + 1));
            const ws = weekStats(c, monday);
            weekPct.set(rows.length, ws && (ws.total > 0 || ws.bonusPct > 0) ? ws.pct : null);
            rows.push(row);
            row = [];
        }
    }
    return { rows, weekPct, avg: pctDays > 0 ? Math.round(pctSum / pctDays) : null, perfect, trackedDays: pctDays };
});
const recentWeeks = computed(() => {
    const c = ctx.value;
    const items = [];
    if (!c)
        return items;
    let monday = mondayOf(c.today);
    for (let i = 0; i < 8; i++) {
        const ws = weekStats(c, monday);
        if (ws && (ws.total > 0 || ws.bonusPct > 0)) {
            const end = addDaysIso(monday, 6);
            const fmt = (iso) => parseIso(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
            items.push({ label: `${fmt(monday)} – ${fmt(end)}`, pct: ws.pct });
        }
        monday = addDaysIso(monday, -7);
    }
    return items;
});
const selectedDate = ref(null);
// «Итоги дня» из формы планов (44.8 срез 3): страница «Календаря» спрашивает, есть ли у дня итоги (день уже начался и в истории есть данные), и открывает их поверх формы
const __VLS_exposed = {
    hasSummary: (dateStr) => !!ctx.value && hasData(ctx.value, dateStr),
    openSummary: (dateStr) => {
        selectedDate.value = dateStr;
    },
};
defineExpose(__VLS_exposed);
// Свайп по календарю — предыдущий/следующий месяц
let touchX = null;
let touchY = null;
function onTouchStart(e) {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
}
function onTouchEnd(e) {
    if (touchX === null || touchY === null)
        return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    touchX = touchY = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5)
        return;
    shiftMonth(dx < 0 ? 1 : -1);
}
const __VLS_defaults = { show: () => defaultShow() };
void __VLS_defaults;
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
    __VLS_withDotValue(isCalendar, {});
    __VLS_withDotValue(error, {});
    __VLS_withDotValue(auth, {});
    __VLS_withDotValue(ctx, {});
    __VLS_withDotValue(showSummary, {});
    __VLS_withDotValue(showStats, {});
    __VLS_withDotValue(monthGrid, {});
    __VLS_withDotValue(showChart, {});
    __VLS_withDotValue(showWeekCol, {});
    __VLS_withDotValue(showProgress, {});
    __VLS_withDotValue(showWeeks, {});
    __VLS_withDotValue(recentWeeks, {});
    __VLS_withDotValue(selectedDate, {});
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "pt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
    if (!isCalendar.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "mb-1 text-xl font-bold" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        const __VLS_0 = EmojiText;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            // @ts-ignore
            text: (__VLS_unwrap(t, {})('hist_h1')),
        }));
        const __VLS_2 = __VLS_1({
            text: (__VLS_unwrap(t, {})('hist_h1')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mb-4 text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('hist_intro'));
    }
    if (error.value) {
        const __VLS_5 = LoadError;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
            // @ts-ignore
            message: (error.value), retry: (__VLS_unwrap(reload, {})),
        }));
        const __VLS_7 = __VLS_6({
            message: (error.value),
            retry: (__VLS_unwrap(reload, {})),
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    }
    if (auth.value.status === 'loading' || auth.value.status === 'redirecting') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    }
    else if (ctx.value) {
        if (!ctx.value.firstDate && !isCalendar.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col items-center gap-2 rounded-2xl border p-6 text-center" },
                ...{ style: {} },
                'data-test': "hist-empty",
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-4xl" },
                'aria-hidden': "true",
            });
            /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "m-0 font-semibold" },
            });
            /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            (__VLS_unwrap(t, {})('hist_no_data'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "m-0 text-sm" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['m-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_unwrap(t, {})('hist_no_data_hint'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
                href: "/dashboard/",
                ...{ class: "mt-1 rounded-lg px-4 py-2 text-sm no-underline" },
                ...{ style: {} },
                'data-test': "hist-empty-link",
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['no-underline']} */ ;
            (__VLS_unwrap(t, {})('hist_no_data_cta'));
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "no-edge-swipe mb-3 flex items-center gap-2" },
                'data-no-swipe': true,
                'data-test': "hist-head",
            });
            /** @type {__VLS_StyleScopedClasses['no-edge-swipe']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!!(auth.value.status === 'loading' || auth.value.status === 'redirecting'))
                            throw 0;
                        if (!(ctx.value))
                            throw 0;
                        if (!!(!ctx.value.firstDate && !isCalendar.value))
                            throw 0;
                        return (shiftMonth(-1));
                        // @ts-ignore
                        [isCalendar, isCalendar, t, t, t, t, t, error, error, reload, auth, auth, ctx, ctx,];
                    } },
                type: "button",
                ...{ class: "rounded-lg border px-2.5 py-1.5" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 text-center font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_unwrap(monthTitle, {}));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!!(auth.value.status === 'loading' || auth.value.status === 'redirecting'))
                            throw 0;
                        if (!(ctx.value))
                            throw 0;
                        if (!!(!ctx.value.firstDate && !isCalendar.value))
                            throw 0;
                        return (shiftMonth(1));
                        // @ts-ignore
                        [monthTitle,];
                    } },
                type: "button",
                ...{ class: "rounded-lg border px-2.5 py-1.5 disabled:opacity-40" },
                ...{ style: {} },
                disabled: (__VLS_unwrap(nextDisabled, {})),
            });
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (goToday) },
                type: "button",
                ...{ class: "rounded-lg border px-3 py-1.5 text-sm" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_unwrap(t, {})('hist_today_btn'));
            if (showSummary.value) {
                const __VLS_10 = PeriodSummaryCard;
                // @ts-ignore
                const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
                    // @ts-ignore
                    ctx: ctx.value,
                }));
                const __VLS_12 = __VLS_11({
                    ctx: ctx.value,
                }, ...__VLS_functionalComponentArgsRest(__VLS_11));
            }
            if (showStats.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mb-3 grid grid-cols-3 gap-2" },
                    'data-test': "hist-stats",
                });
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                const __VLS_15 = __VLS_tryAsConstant(([
                    [monthGrid.value.avg == null ? '—' : monthGrid.value.avg + '%', __VLS_unwrap(t, {})('hist_stat_avg')],
                    [String(monthGrid.value.perfect), __VLS_unwrap(t, {})('hist_stat_perfect')],
                    [String(monthGrid.value.trackedDays), __VLS_unwrap(t, {})('hist_stat_days')],
                ]));
                for (const [s] of __VLS_vFor(__VLS_nonNull(__VLS_15))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (s[1]),
                        ...{ class: "rounded-xl border p-2 text-center" },
                        ...{ style: {} },
                    });
                    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-xl font-bold" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                    (s[0]);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-[0.7em]" },
                        ...{ style: {} },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-[0.7em]']} */ ;
                    (s[1]);
                    // @ts-ignore
                    [t, t, t, t, ctx, nextDisabled, showSummary, showStats, monthGrid, monthGrid, monthGrid, monthGrid,];
                }
            }
            if (showChart.value) {
                const __VLS_16 = MonthCategoryChart;
                // @ts-ignore
                const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
                    // @ts-ignore
                    ctx: ctx.value, year: (__VLS_unwrap(viewYear, {})), month: (__VLS_unwrap(viewMonth, {})),
                }));
                const __VLS_18 = __VLS_17({
                    ctx: ctx.value,
                    year: (__VLS_unwrap(viewYear, {})),
                    month: (__VLS_unwrap(viewMonth, {})),
                }, ...__VLS_functionalComponentArgsRest(__VLS_17));
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onTouchstart: (onTouchStart) },
                ...{ onTouchend: (onTouchEnd) },
                ...{ class: "no-edge-swipe mb-2 flex flex-col gap-1" },
                'data-no-swipe': true,
                'data-test': "hist-grid",
            });
            /** @type {__VLS_StyleScopedClasses['no-edge-swipe']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid gap-1" },
                ...{ style: ({ gridTemplateColumns: __VLS_unwrap(gridCols, {}) }) },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
            const __VLS_21 = __VLS_tryAsConstant((__VLS_unwrap(weekdayNames, {})));
            for (const [n] of __VLS_vFor(__VLS_nonNull(__VLS_21))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (n),
                    ...{ class: "py-0.5 text-center text-[0.72em]" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[0.72em]']} */ ;
                (n);
                // @ts-ignore
                [ctx, showChart, viewYear, viewMonth, gridCols, weekdayNames,];
            }
            if (showWeekCol.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "py-0.5 text-center text-[0.72em]" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[0.72em]']} */ ;
                (__VLS_unwrap(t, {})('hist_week_col'));
            }
            const __VLS_22 = __VLS_tryAsConstant((monthGrid.value.rows));
            for (const [row, ri] of __VLS_vFor(__VLS_nonNull(__VLS_22))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (ri),
                    ...{ class: "grid gap-1" },
                    ...{ style: ({ gridTemplateColumns: __VLS_unwrap(gridCols, {}) }) },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
                const __VLS_23 = __VLS_tryAsConstant((row));
                for (const [cell] of __VLS_vFor(__VLS_nonNull(__VLS_23))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                void $event;
                                if (!!(auth.value.status === 'loading' || auth.value.status === 'redirecting'))
                                    throw 0;
                                if (!(ctx.value))
                                    throw 0;
                                if (!!(!ctx.value.firstDate && !isCalendar.value))
                                    throw 0;
                                return (onCellClick(cell.dateStr));
                                // @ts-ignore
                                [t, monthGrid, gridCols, showWeekCol,];
                            } },
                        key: (cell.key),
                        type: "button",
                        ...{ class: "relative flex min-h-11 flex-col items-start justify-between overflow-hidden rounded-lg border p-1 text-left" },
                        ...{ class: ([
                                cell.dateStr ? 'cursor-pointer' : 'cursor-default border-transparent',
                                cell.isToday ? 'outline outline-2 -outline-offset-2' : '',
                                !isCalendar.value && (cell.isFuture || cell.hasNoData) ? 'opacity-50' : '',
                                showProgress.value && cell.over ? 'shadow-[inset_0_0_0_2px_#e0a93b]' : '',
                            ]) },
                        ...{ style: ({
                                aspectRatio: '1 / 1.1',
                                borderColor: cell.dateStr ? 'var(--border)' : 'transparent',
                                background: showProgress.value && cell.hasStats
                                    ? `linear-gradient(to top, var(--hist-ok) ${cell.fill}%, var(--bg-card) ${cell.fill}%)`
                                    : 'var(--bg-card)',
                                outlineColor: cell.isToday ? 'var(--accent)' : undefined,
                                color: showProgress.value && cell.hasStats && cell.fill >= 55 ? '#fff' : 'var(--text)',
                                textShadow: showProgress.value && cell.hasStats && cell.fill >= 55 ? '0 1px 2px rgba(0,0,0,0.4)' : undefined,
                            }) },
                        disabled: (!cell.dateStr),
                        'aria-hidden': (cell.dateStr ? undefined : 'true'),
                        tabindex: (cell.dateStr ? undefined : -1),
                        'data-date': (cell.dateStr ?? undefined),
                    });
                    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['min-h-11']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['p-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
                    if (cell.dayNum) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-[0.78em] font-semibold" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-[0.78em]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                        (cell.dayNum);
                    }
                    if (isCalendar.value && ((__VLS_ctx.show.plans && planBadge(cell.dateStr)) || (__VLS_ctx.show.deadlines && deadlineBadge(cell.dateStr)))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "absolute right-0.5 top-0.5 flex flex-col items-end gap-px text-[0.6em] leading-none" },
                        });
                        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
                        /** @type {__VLS_StyleScopedClasses['right-0.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['top-0.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-end']} */ ;
                        /** @type {__VLS_StyleScopedClasses['gap-px']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-[0.6em]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['leading-none']} */ ;
                        if (__VLS_ctx.show.deadlines && deadlineBadge(cell.dateStr)) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "cal-deadline" },
                                ...{ class: ({ 'cal-deadline-done': deadlineBadge(cell.dateStr).allDone }) },
                                title: (__VLS_unwrap(t, {})('cal_deadline_title')),
                                'data-test': "cal-deadline",
                            });
                            /** @type {__VLS_StyleScopedClasses['cal-deadline']} */ ;
                            /** @type {__VLS_StyleScopedClasses['cal-deadline-done']} */ ;
                            const __VLS_24 = Icon;
                            // @ts-ignore
                            const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
                                // @ts-ignore
                                name: "goals",
                            }));
                            const __VLS_26 = __VLS_25({
                                name: "goals",
                            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
                            (deadlineBadge(cell.dateStr).count);
                        }
                        if (__VLS_ctx.show.plans && planBadge(cell.dateStr)) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "cal-badge" },
                                'data-test': "cal-badge",
                            });
                            /** @type {__VLS_StyleScopedClasses['cal-badge']} */ ;
                            if (planBadge(cell.dateStr).all) {
                                const __VLS_29 = Icon;
                                // @ts-ignore
                                const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
                                    // @ts-ignore
                                    name: "done",
                                }));
                                const __VLS_31 = __VLS_30({
                                    name: "done",
                                }, ...__VLS_functionalComponentArgsRest(__VLS_30));
                            }
                            else {
                                const __VLS_34 = Icon;
                                // @ts-ignore
                                const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
                                    // @ts-ignore
                                    name: "pin",
                                }));
                                const __VLS_36 = __VLS_35({
                                    name: "pin",
                                }, ...__VLS_functionalComponentArgsRest(__VLS_35));
                                (planBadge(cell.dateStr).done);
                                (planBadge(cell.dateStr).total);
                            }
                        }
                    }
                    if (isCalendar.value && __VLS_ctx.show.events && eventDots(cell.dateStr)) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "cal-dots" },
                            'data-test': "cal-events",
                        });
                        /** @type {__VLS_StyleScopedClasses['cal-dots']} */ ;
                        if (eventDots(cell.dateStr).workout) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "cal-dot cal-dot-workout" },
                                title: (__VLS_unwrap(t, {})('cal_ev_workout')),
                                'data-test': "cal-dot-workout",
                            });
                            /** @type {__VLS_StyleScopedClasses['cal-dot']} */ ;
                            /** @type {__VLS_StyleScopedClasses['cal-dot-workout']} */ ;
                        }
                        if (eventDots(cell.dateStr).challenge) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "cal-dot cal-dot-challenge" },
                                title: (__VLS_unwrap(t, {})('cal_ev_challenge')),
                                'data-test': "cal-dot-challenge",
                            });
                            /** @type {__VLS_StyleScopedClasses['cal-dot']} */ ;
                            /** @type {__VLS_StyleScopedClasses['cal-dot-challenge']} */ ;
                        }
                        if (eventDots(cell.dateStr).milestone) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "cal-dot cal-dot-milestone" },
                                title: (__VLS_unwrap(t, {})('cal_ev_milestone')),
                                'data-test': "cal-dot-milestone",
                            });
                            /** @type {__VLS_StyleScopedClasses['cal-dot']} */ ;
                            /** @type {__VLS_StyleScopedClasses['cal-dot-milestone']} */ ;
                        }
                    }
                    if (isCalendar.value && moodOf(cell.dateStr)) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "cal-mood" },
                            ...{ class: ('cal-mood-' + moodOf(cell.dateStr)) },
                            title: (__VLS_unwrap(t, {})('hist_reflect_mood') + ': ' + moodOf(cell.dateStr) + '/5'),
                            'data-test': "cal-mood",
                        });
                        /** @type {__VLS_StyleScopedClasses['cal-mood']} */ ;
                        (moodOf(cell.dateStr));
                    }
                    if (showProgress.value && cell.hasStats) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "self-end text-[0.68em] font-semibold" },
                        });
                        /** @type {__VLS_StyleScopedClasses['self-end']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-[0.68em]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                        (cell.pct);
                    }
                    // @ts-ignore
                    [isCalendar, isCalendar, isCalendar, isCalendar, t, t, t, t, t, showProgress, showProgress, showProgress, showProgress, showProgress, show, show, show, show, show,];
                }
                if (showWeekCol.value) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-center rounded-lg border" },
                        'data-test': "hist-weekcol",
                        ...{ style: ({
                                borderColor: 'var(--border)',
                                background: monthGrid.value.weekPct.get(ri) != null
                                    ? `linear-gradient(to top, var(--accent) ${Math.min(100, monthGrid.value.weekPct.get(ri))}%, var(--bg-card) ${Math.min(100, monthGrid.value.weekPct.get(ri))}%)`
                                    : 'var(--bg-card)',
                                color: monthGrid.value.weekPct.get(ri) != null && monthGrid.value.weekPct.get(ri) >= 55 ? 'var(--accent-text)' : 'var(--text)',
                            }) },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    if (monthGrid.value.weekPct.get(ri) != null) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-[0.68em] font-semibold" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-[0.68em]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                        (monthGrid.value.weekPct.get(ri));
                    }
                }
                // @ts-ignore
                [monthGrid, monthGrid, monthGrid, monthGrid, monthGrid, monthGrid, monthGrid, showWeekCol,];
            }
            if (showWeeks.value) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
                    ...{ class: "mb-2 mt-6 text-lg font-bold" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                const __VLS_39 = EmojiText;
                // @ts-ignore
                const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
                    // @ts-ignore
                    text: (__VLS_unwrap(t, {})('hist_weeks_h2')),
                }));
                const __VLS_41 = __VLS_40({
                    text: (__VLS_unwrap(t, {})('hist_weeks_h2')),
                }, ...__VLS_functionalComponentArgsRest(__VLS_40));
            }
            if (showWeeks.value && recentWeeks.value.length === 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (__VLS_unwrap(t, {})('hist_no_data'));
            }
            const __VLS_44 = __VLS_tryAsConstant(((showWeeks.value ? recentWeeks.value : [])));
            for (const [w] of __VLS_vFor(__VLS_nonNull(__VLS_44))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (w.label),
                    ...{ class: "my-2 flex items-center gap-2.5" },
                });
                /** @type {__VLS_StyleScopedClasses['my-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "w-[124px] shrink-0 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['w-[124px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (w.label);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "h-2.5 flex-1 overflow-hidden rounded-md border" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['h-2.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "h-full rounded-md transition-[width]" },
                    ...{ style: ({ width: Math.min(100, w.pct) + '%', background: w.pct >= 100 ? 'var(--hist-ok)' : 'var(--accent)' }) },
                });
                /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-[width]']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "w-11 shrink-0 text-right text-sm font-semibold" },
                });
                /** @type {__VLS_StyleScopedClasses['w-11']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                (w.pct);
                // @ts-ignore
                [t, t, showWeeks, showWeeks, showWeeks, recentWeeks, recentWeeks,];
            }
        }
    }
    let __VLS_45;
    /** @ts-ignore @type { | typeof __VLS_components.Teleport | typeof __VLS_components.Teleport} */
    Teleport;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
        // @ts-ignore
        to: "body", disabled: (!isCalendar.value),
    }));
    const __VLS_47 = __VLS_46({
        to: "body",
        disabled: (!isCalendar.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    var __VLS_48;
    const { default: __VLS_50 } = __VLS_nonNull(__VLS_48.slots);
    if (selectedDate.value && ctx.value) {
        const __VLS_51 = DayDetailModal;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
            // @ts-ignore
            ...{ 'onClose': {} }, ctx: ctx.value, dateStr: (selectedDate.value),
        }));
        const __VLS_53 = __VLS_52({
            ...{ 'onClose': {} },
            ctx: ctx.value,
            dateStr: (selectedDate.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        let __VLS_56;
        const __VLS_57 = {
            /** @type {typeof __VLS_56.close} */
            onClose: (...[$event]) => {
                void $event;
                if (!(selectedDate.value && ctx.value))
                    throw 0;
                return (selectedDate.value = null);
                // @ts-ignore
                [isCalendar, ctx, ctx, selectedDate, selectedDate, selectedDate,];
            },
        };
        void __VLS_57;
        var __VLS_54;
        var __VLS_55;
    }
    // @ts-ignore
    [];
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    setup: () => __VLS_exposed,
    __typeEmits: {},
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
