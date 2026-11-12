/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
import { t, getLang } from '../lib/i18n';
import { addDaysIso } from '../lib/date';
import { hasEvents } from '../lib/lifeEvents';
import EmojiText from './EmojiText.vue';
import Icon from './Icon.vue';
const { defineProps, defineEmits, } = {};
const props = defineProps();
const emit = defineEmits();
const items = ref(props.initial.map((p) => ({ ...p })));
const newText = ref('');
function fmtHeader(iso) {
    const [y, m, d] = iso.split('-');
    const dm = getLang() === 'en' ? `${m}/${d}/${y}` : `${d}.${m}.${y}`;
    return `${t('cal_plan_for')} ${dm}`;
}
function addItem() {
    const text = newText.value.trim();
    if (!text)
        return;
    items.value.push({ type: 'custom', text, done: false });
    newText.value = '';
}
// Перенос пункта на другой день (76.4): «Завтра», «+7 дней» или своя дата; пункты-цели не переносятся (это сроки целей)
const moving = ref(null);
const moveDate = ref('');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const moveValid = (to) => ISO.test(to) && to !== props.dateStr;
function startMove(idx) {
    moving.value = moving.value === idx ? null : idx;
    moveDate.value = '';
}
function doMove(to) {
    if (moving.value === null || !moveValid(to))
        return;
    emit('move', { items: items.value.map((i) => ({ ...i })), index: moving.value, to });
}
function removeItem(idx) {
    items.value.splice(idx, 1);
}
// 🐞 BACKLOG раздел 35: «когда план в календаре пишешь и жмёшь «Сохранить», он не добавляется, только на «+»».
// Недописанный текст в поле — тоже план: при «Сохранить» он добавляется пунктом автоматически (как если бы нажали «+»).
function save() {
    addItem();
    emit('save', items.value);
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
    __VLS_withDotValue(items, {});
    __VLS_withDotValue(moving, {});
    __VLS_withDotValue(moveDate, {});
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
    });
    /** @type {__VLS_StyleScopedClasses['modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    (fmtHeader(props.dateStr));
    if (__VLS_ctx.deadlines?.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-2" },
            'data-test': "day-deadlines",
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim mb-1 text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_unwrap(t, {})('cal_deadlines_h'));
        const __VLS_0 = __VLS_tryAsConstant((__VLS_ctx.deadlines));
        for (const [g] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (g.id),
                ...{ class: "flex items-center gap-2 py-0.5 text-sm" },
                'data-test': "day-deadline",
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            const __VLS_1 = Icon;
            // @ts-ignore
            const __VLS_2 = __VLS_asFunctionalComponent1(__VLS_1, new __VLS_1({
                // @ts-ignore
                name: "goals",
            }));
            const __VLS_3 = __VLS_2({
                name: "goals",
            }, ...__VLS_functionalComponentArgsRest(__VLS_2));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: ({ 'line-through opacity-60': g.done }) },
            });
            /** @type {__VLS_StyleScopedClasses['line-through']} */ ;
            /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
            (g.name);
            // @ts-ignore
            [deadlines, deadlines, t,];
        }
    }
    if (__VLS_unwrap(hasEvents, {})(__VLS_ctx.events)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-2" },
            'data-test': "day-events",
        });
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim mb-1 text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_unwrap(t, {})('cal_events_h'));
        if (__VLS_ctx.events.workouts > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center gap-2 py-0.5 text-sm" },
                'data-test': "day-event-workout",
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "cal-dot cal-dot-workout" },
            });
            /** @type {__VLS_StyleScopedClasses['cal-dot']} */ ;
            /** @type {__VLS_StyleScopedClasses['cal-dot-workout']} */ ;
            (__VLS_unwrap(t, {})('cal_ev_workout'));
            (__VLS_ctx.events.workouts);
            (__VLS_unwrap(t, {})('cal_ev_workout_n'));
        }
        const __VLS_6 = __VLS_tryAsConstant((__VLS_ctx.events.challenges));
        for (const [c] of __VLS_vFor(__VLS_nonNull(__VLS_6))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (c.id),
                ...{ class: "flex items-center gap-2 py-0.5 text-sm" },
                'data-test': "day-event-challenge",
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "cal-dot cal-dot-challenge" },
            });
            /** @type {__VLS_StyleScopedClasses['cal-dot']} */ ;
            /** @type {__VLS_StyleScopedClasses['cal-dot-challenge']} */ ;
            (__VLS_unwrap(t, {})('cal_ev_challenge'));
            (c.title);
            if (c.day) {
                (__VLS_unwrap(t, {})('cal_ev_day'));
                (c.day);
            }
            // @ts-ignore
            [t, t, t, t, t, hasEvents, events, events, events, events,];
        }
        const __VLS_7 = __VLS_tryAsConstant((__VLS_ctx.events.milestones));
        for (const [m] of __VLS_vFor(__VLS_nonNull(__VLS_7))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (m.id),
                ...{ class: "flex items-center gap-2 py-0.5 text-sm" },
                'data-test': "day-event-milestone",
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "cal-dot cal-dot-milestone" },
            });
            /** @type {__VLS_StyleScopedClasses['cal-dot']} */ ;
            /** @type {__VLS_StyleScopedClasses['cal-dot-milestone']} */ ;
            (__VLS_unwrap(t, {})('cal_ev_milestone'));
            (m.name);
            // @ts-ignore
            [t, events,];
        }
    }
    if (items.value.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "dim" },
        });
        /** @type {__VLS_StyleScopedClasses['dim']} */ ;
        (__VLS_unwrap(t, {})('cal_empty'));
    }
    const __VLS_8 = __VLS_tryAsConstant((items.value));
    for (const [item, idx] of __VLS_vFor(__VLS_nonNull(__VLS_8))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (idx),
            ...{ class: "flex flex-wrap items-center gap-2 py-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
            disabled: (item.type === 'goal'),
        });
        (item.done);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex-1" },
            ...{ class: ({ 'line-through opacity-60': item.done }) },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['line-through']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
        (item.text);
        if (item.type === 'goal') {
            (__VLS_unwrap(t, {})('cal_goal_suffix'));
        }
        if (item.type !== 'goal') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!(item.type !== 'goal'))
                            throw 0;
                        return (startMove(idx));
                        // @ts-ignore
                        [t, t, items, items,];
                    } },
                type: "button",
                ...{ class: "secondary" },
                'aria-label': (__VLS_unwrap(t, {})('cal_move')),
                title: (__VLS_unwrap(t, {})('cal_move')),
                'aria-expanded': (moving.value === idx),
                'data-test': "plan-move-btn",
            });
            /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    return (removeItem(idx));
                    // @ts-ignore
                    [t, t, moving,];
                } },
            ...{ class: "danger" },
        });
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
        if (moving.value === idx) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex w-full flex-wrap items-center gap-2 pb-1 pl-6" },
                'data-test': "plan-move-row",
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['pb-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['pl-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "dim text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['dim']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (__VLS_unwrap(t, {})('cal_move_to'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!(moving.value === idx))
                            throw 0;
                        return (doMove(__VLS_unwrap(addDaysIso, {})(__VLS_ctx.dateStr, 1)));
                        // @ts-ignore
                        [t, moving, addDaysIso, dateStr,];
                    } },
                type: "button",
                ...{ class: "secondary" },
                'data-test': "plan-move-tomorrow",
            });
            /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
            (__VLS_unwrap(t, {})('cal_move_tomorrow'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!(moving.value === idx))
                            throw 0;
                        return (doMove(__VLS_unwrap(addDaysIso, {})(__VLS_ctx.dateStr, 7)));
                        // @ts-ignore
                        [t, addDaysIso, dateStr,];
                    } },
                type: "button",
                ...{ class: "secondary" },
                'data-test': "plan-move-week",
            });
            /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
            (__VLS_unwrap(t, {})('cal_move_week'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "date",
                'data-test': "plan-move-date",
                'aria-label': (__VLS_unwrap(t, {})('cal_move_pick')),
            });
            (moveDate.value);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        void $event;
                        if (!(moving.value === idx))
                            throw 0;
                        return (doMove(moveDate.value));
                        // @ts-ignore
                        [t, t, moveDate, moveDate,];
                    } },
                type: "button",
                disabled: (!__VLS_unwrap(moveValid, {})(moveDate.value)),
                'data-test': "plan-move-go",
            });
            (__VLS_unwrap(t, {})('cal_move_go'));
        }
        // @ts-ignore
        [t, moveDate, moveValid,];
    }
    if (__VLS_ctx.moveError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1 text-sm" },
            ...{ style: {} },
            role: "alert",
            'data-test': "plan-move-error",
        });
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_ctx.moveError);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-2.5 flex gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onKeydown: (addItem) },
        value: (__VLS_unwrap(newText, {})),
        type: "text",
        ...{ class: "flex-1" },
        placeholder: (__VLS_unwrap(t, {})('cal_new_item_placeholder')),
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (addItem) },
        ...{ class: "secondary" },
    });
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "dim mt-1.5 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['dim']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    const __VLS_9 = EmojiText;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent1(__VLS_9, new __VLS_9({
        // @ts-ignore
        text: (__VLS_unwrap(t, {})('cal_hint')),
    }));
    const __VLS_11 = __VLS_10({
        text: (__VLS_unwrap(t, {})('cal_hint')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    if (__VLS_ctx.hasSummary) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(__VLS_ctx.hasSummary))
                        throw 0;
                    return (__VLS_unwrap(emit, {})('summary'));
                    // @ts-ignore
                    [emit, t, t, moveError, moveError, newText, hasSummary,];
                } },
            type: "button",
            ...{ class: "secondary mt-2 w-full" },
            'data-test': "day-summary-btn",
        });
        /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        (__VLS_unwrap(t, {})('cal_day_summary'));
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
                [emit, t,];
            } },
        ...{ class: "secondary" },
    });
    /** @type {__VLS_StyleScopedClasses['secondary']} */ ;
    (__VLS_unwrap(t, {})('cancel'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (save) },
    });
    (__VLS_unwrap(t, {})('save'));
    // @ts-ignore
    [t, t,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
