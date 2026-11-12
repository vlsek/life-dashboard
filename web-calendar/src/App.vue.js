/// <reference types="../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref } from 'vue';
import AppShell from './components/AppShell.vue';
import DayModal from './components/DayModal.vue';
import { useCalendar } from './lib/useCalendar';
import { t } from './lib/i18n';
import HistoryView from './components/HistoryView.vue';
import TodayCard from './components/TodayCard.vue';
import { todayStr } from './lib/date';
import { friendlyError } from './lib/friendlyError';
import CalendarShowToggles from './components/CalendarShowToggles.vue';
import { loadShow, saveShow } from './lib/calendarShow';
import { buildIcs, icsFileName, icsItemsFromMonth } from './lib/ics';
const { auth, byDate, deadlines, events, today, init, loadMonth, loadToday, savePlanned, movePlanned } = useCalendar();
const initialView = new URLSearchParams(window.location.search).get('view') === 'history' ? 'history' : 'calendar';
const view = ref(initialView);
function setView(next) {
    view.value = next;
    const url = new URL(window.location.href);
    if (next === 'history')
        url.searchParams.set('view', 'history');
    else
        url.searchParams.delete('view');
    window.history.replaceState({}, '', url);
}
// Сетка вкладки «Календарь» — та же, что в «Истории» (HistoryView, mode="calendar", BACKLOG 44.8): сама листает месяцы и сообщает, какой месяц показан,
// а планы и дедлайны целей этого месяца подгружаются здесь (useCalendar).
const shownYear = ref(new Date().getFullYear());
const shownMonth = ref(new Date().getMonth());
async function reloadMonth() {
    if (auth.value.status !== 'ready')
        return;
    await loadMonth(auth.value.userId, shownYear.value, shownMonth.value);
}
function onMonthChange(year, month) {
    shownYear.value = year;
    shownMonth.value = month;
    void reloadMonth();
}
const todayIso = todayStr();
const reloadToday = async () => {
    if (auth.value.status === 'ready')
        await loadToday(auth.value.userId, todayIso);
};
onMounted(async () => {
    await init();
    await Promise.all([reloadMonth(), reloadToday()]);
});
// «Показывать …» (44.8 срез 2): что видно на вкладках; выключенное хранится в localStorage `calendar_show` и синхронизируется в профиль шапкой
const grid = ref(null); // сетка вкладки «Календарь»: знает, у каких дней есть итоги, и открывает их
const show = ref(loadShow());
function toggleShow(k) {
    show.value = { ...show.value, [k]: !show.value[k] };
    saveShow(show.value);
}
// Экспорт показанного месяца в .ics (BACKLOG 76.5): планы дней и сроки целей, что уже загружено для сетки
const icsEmpty = ref(false);
function exportIcs() {
    const items = icsItemsFromMonth(byDate.value, deadlines.value, t('cal_ics_deadline'));
    icsEmpty.value = items.length === 0;
    if (icsEmpty.value)
        return;
    const blob = new Blob([buildIcs(items)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsFileName(shownYear.value, shownMonth.value);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const openDate = ref(null);
function openDay(dateStr) {
    openDate.value = dateStr;
}
const moveError = ref(null);
async function onMoveDay(p) {
    if (auth.value.status !== 'ready' || !openDate.value)
        return;
    moveError.value = null;
    try {
        await movePlanned(auth.value.userId, openDate.value, p.to, p.items.filter((_, i) => i !== p.index), p.items[p.index]);
    }
    catch (e) {
        moveError.value = friendlyError(e, 'save'); // окно остаётся открытым: ничего не потеряно, можно повторить
        return;
    }
    openDate.value = null;
    await reloadToday();
}
async function onSaveDay(items) {
    if (auth.value.status !== 'ready' || !openDate.value)
        return;
    await savePlanned(auth.value.userId, openDate.value, items);
    openDate.value = null;
    await reloadToday(); // карточка «Сегодня» (44.8 срез 4) показывает свежие планы и сроки
}
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
void __VLS_ctx, __VLS_components, __VLS_intrinsics, __VLS_directives;
const __VLS_template = () => {
    __VLS_withDotValue(auth, {});
    __VLS_withDotValue(view, {});
    __VLS_withDotValue(show, {});
    __VLS_withDotValue(today, {});
    __VLS_withDotValue(icsEmpty, {});
    __VLS_withDotValue(openDate, {});
    __VLS_withDotValue(byDate, {});
    __VLS_withDotValue(deadlines, {});
    __VLS_withDotValue(events, {});
    __VLS_withDotValue(grid, {});
    const __VLS_0 = AppShell;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        userEmail: (auth.value.status === 'ready' ? auth.value.userEmail : null),
    }));
    const __VLS_2 = __VLS_1({
        userEmail: (auth.value.status === 'ready' ? auth.value.userEmail : null),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "mx-auto max-w-3xl px-4 pb-16 pt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-16']} */ ;
    /** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-4 flex rounded-xl border p-1" },
        ...{ style: {} },
        'data-test': "calendar-history-tabs",
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (setView('calendar'));
                // @ts-ignore
                [auth, auth,];
            } },
        type: "button",
        ...{ class: "flex-1 rounded-lg px-3 py-2 text-sm font-medium" },
        ...{ style: ({ background: view.value === 'calendar' ? 'var(--accent)' : 'transparent', color: view.value === 'calendar' ? 'var(--accent-text)' : 'var(--text)' }) },
        'data-test': "calendar-tab",
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (__VLS_unwrap(t, {})('cal_title'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (setView('history'));
                // @ts-ignore
                [view, view, t,];
            } },
        type: "button",
        ...{ class: "flex-1 rounded-lg px-3 py-2 text-sm font-medium" },
        ...{ style: ({ background: view.value === 'history' ? 'var(--accent)' : 'transparent', color: view.value === 'history' ? 'var(--accent-text)' : 'var(--text)' }) },
        'data-test': "history-tab",
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (__VLS_unwrap(t, {})('hist_title'));
    const __VLS_5 = CalendarShowToggles;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        // @ts-ignore
        ...{ 'onToggle': {} }, view: (view.value), show: (show.value),
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onToggle': {} },
        view: (view.value),
        show: (show.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_10;
    const __VLS_11 = {
        /** @type {typeof __VLS_10.toggle} */
        onToggle: (toggleShow),
    };
    void __VLS_11;
    var __VLS_8;
    var __VLS_9;
    if (view.value === 'history') {
        const __VLS_12 = HistoryView;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
            // @ts-ignore
            show: (show.value),
        }));
        const __VLS_14 = __VLS_13({
            show: (show.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    else {
        if (show.value.today && today.value) {
            const __VLS_17 = TodayCard;
            // @ts-ignore
            const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
                // @ts-ignore
                ...{ 'onOpen': {} }, summary: (today.value), date: (__VLS_unwrap(todayIso, {})),
            }));
            const __VLS_19 = __VLS_18({
                ...{ 'onOpen': {} },
                summary: (today.value),
                date: (__VLS_unwrap(todayIso, {})),
            }, ...__VLS_functionalComponentArgsRest(__VLS_18));
            let __VLS_22;
            const __VLS_23 = {
                /** @type {typeof __VLS_22.open} */
                onOpen: (openDay),
            };
            void __VLS_23;
            var __VLS_20;
            var __VLS_21;
        }
        const __VLS_24 = HistoryView;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
            // @ts-ignore
            ...{ 'onSelectDay': {} }, ...{ 'onMonthChange': {} }, ref: "grid", mode: "calendar", show: (show.value), planned: (byDate.value), deadlines: (deadlines.value), events: (events.value), dataTest: "calendar-grid-view",
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onSelectDay': {} },
            ...{ 'onMonthChange': {} },
            ref: "grid",
            mode: "calendar",
            show: (show.value),
            planned: (byDate.value),
            deadlines: (deadlines.value),
            events: (events.value),
            dataTest: "calendar-grid-view",
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_29;
        const __VLS_30 = {
            /** @type {typeof __VLS_29.selectDay} */
            onSelectDay: (openDay),
        };
        void __VLS_30;
        const __VLS_31 = {
            /** @type {typeof __VLS_29.monthChange} */
            onMonthChange: (onMonthChange),
        };
        void __VLS_31;
        var __VLS_27;
        var __VLS_28;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3 flex flex-wrap items-center gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (exportIcs) },
            type: "button",
            ...{ class: "secondary px-3 py-2 text-sm" },
            'data-test': "export-ics",
        });
        /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('cal_ics_btn'));
        if (icsEmpty.value) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs" },
                ...{ style: {} },
                role: "status",
                'data-test': "export-ics-empty",
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_unwrap(t, {})('cal_ics_empty'));
        }
        if (openDate.value) {
            const __VLS_32 = DayModal;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
                // @ts-ignore
                ...{ 'onSummary': {} }, ...{ 'onClose': {} }, ...{ 'onSave': {} }, ...{ 'onMove': {} }, dateStr: (openDate.value), initial: (byDate.value[openDate.value] || []), deadlines: (deadlines.value[openDate.value] || []), events: (events.value[openDate.value] || null), hasSummary: (!!grid.value?.hasSummary(openDate.value)), moveError: (__VLS_unwrap(moveError, {})),
            }));
            const __VLS_34 = __VLS_33({
                ...{ 'onSummary': {} },
                ...{ 'onClose': {} },
                ...{ 'onSave': {} },
                ...{ 'onMove': {} },
                dateStr: (openDate.value),
                initial: (byDate.value[openDate.value] || []),
                deadlines: (deadlines.value[openDate.value] || []),
                events: (events.value[openDate.value] || null),
                hasSummary: (!!grid.value?.hasSummary(openDate.value)),
                moveError: (__VLS_unwrap(moveError, {})),
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            let __VLS_37;
            const __VLS_38 = {
                /** @type {typeof __VLS_37.summary} */
                onSummary: (...[$event]) => {
                    void $event;
                    if (!!(view.value === 'history'))
                        throw 0;
                    if (!(openDate.value))
                        throw 0;
                    return (grid.value?.openSummary(openDate.value));
                    // @ts-ignore
                    [view, view, view, view, t, t, t, show, show, show, show, today, today, todayIso, byDate, byDate, deadlines, deadlines, events, events, icsEmpty, openDate, openDate, openDate, openDate, openDate, openDate, openDate, grid, grid, moveError,];
                },
            };
            void __VLS_38;
            const __VLS_39 = {
                /** @type {typeof __VLS_37.close} */
                onClose: (...[$event]) => {
                    void $event;
                    if (!!(view.value === 'history'))
                        throw 0;
                    if (!(openDate.value))
                        throw 0;
                    return (openDate.value = null);
                    // @ts-ignore
                    [openDate,];
                },
            };
            void __VLS_39;
            const __VLS_40 = {
                /** @type {typeof __VLS_37.save} */
                onSave: (onSaveDay),
            };
            void __VLS_40;
            const __VLS_41 = {
                /** @type {typeof __VLS_37.move} */
                onMove: (onMoveDay),
            };
            void __VLS_41;
            var __VLS_35;
            var __VLS_36;
        }
    }
    // @ts-ignore
    [];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
