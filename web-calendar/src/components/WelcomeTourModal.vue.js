/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, onUnmounted, ref } from 'vue';
import { t } from '../lib/i18n';
import Icon from './Icon.vue';
const { defineEmits, } = {};
const emit = defineEmits();
const TOUR_STEPS = [
    { icon: 'hand', key: 'tour_1' },
    { icon: 'home', key: 'tour_2' },
    { icon: 'goals', key: 'tour_3' },
    { icon: 'skills', key: 'tour_4' },
    { icon: 'trophy', key: 'tour_5' },
    { icon: 'calendar', key: 'tour_6' },
    { icon: 'compass', key: 'tour_7' },
];
const step = ref(0);
// Направление последнего перехода — от него зависит, с какой стороны выезжает шаг
const dir = ref('next');
function isLast() {
    return step.value === TOUR_STEPS.length - 1;
}
function goBack() {
    if (step.value > 0) {
        dir.value = 'back';
        step.value--;
    }
}
function goNext() {
    if (!isLast()) {
        dir.value = 'next';
        step.value++;
    }
    else
        emit('close');
}
function onKey(e) {
    if (e.key === 'ArrowRight')
        goNext();
    else if (e.key === 'ArrowLeft')
        goBack();
    else if (e.key === 'Escape')
        emit('close');
}
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
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5)
        return;
    if (dx < 0)
        goNext();
    else
        goBack();
}
onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => document.removeEventListener('keydown', onKey));
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
    __VLS_withDotValue(TOUR_STEPS, {});
    __VLS_withDotValue(step, {});
    void {};
    /** @type {__VLS_StyleScopedClasses['tour-next-enter-active']} */ ;
    /** @type {__VLS_StyleScopedClasses['tour-next-leave-active']} */ ;
    /** @type {__VLS_StyleScopedClasses['tour-back-enter-active']} */ ;
    /** @type {__VLS_StyleScopedClasses['tour-back-leave-active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                void $event;
                return (__VLS_unwrap(emit, {})('close'));
                // @ts-ignore
                [emit,];
            } },
        ...{ onTouchstart: (onTouchStart) },
        ...{ onTouchend: (onTouchEnd) },
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
        ...{ class: "w-full max-w-md rounded-2xl border p-5" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tour-viewport" },
        'data-testid': "tour-viewport",
    });
    /** @type {__VLS_StyleScopedClasses['tour-viewport']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        // @ts-ignore
        name: ('tour-' + __VLS_unwrap(dir, {})), mode: "out-in",
    }));
    const __VLS_2 = __VLS_1({
        name: ('tour-' + __VLS_unwrap(dir, {})),
        mode: "out-in",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    var __VLS_3;
    const { default: __VLS_5 } = __VLS_nonNull(__VLS_3.slots);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (step.value),
        'data-testid': "tour-step",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-1 flex justify-center text-[2.2em]" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[2.2em]']} */ ;
    const __VLS_6 = Icon;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        // @ts-ignore
        name: (TOUR_STEPS.value[step.value].icon),
    }));
    const __VLS_8 = __VLS_7({
        name: (TOUR_STEPS.value[step.value].icon),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "my-2 text-center text-lg font-bold" },
    });
    /** @type {__VLS_StyleScopedClasses['my-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (__VLS_unwrap(t, {})((TOUR_STEPS.value[step.value].key + '_title')));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "whitespace-pre-line text-center text-sm leading-relaxed" },
    });
    /** @type {__VLS_StyleScopedClasses['whitespace-pre-line']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    (__VLS_unwrap(t, {})((TOUR_STEPS.value[step.value].key + '_text')));
    // @ts-ignore
    [dir, step, step, step, step, TOUR_STEPS, TOUR_STEPS, TOUR_STEPS, t, t,];
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-1 mt-3.5 flex justify-center gap-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    const __VLS_11 = __VLS_tryAsConstant((TOUR_STEPS.value));
    for (const [s, i] of __VLS_vFor(__VLS_nonNull(__VLS_11))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (s.key),
            ...{ class: "h-2 w-2 rounded-full" },
            ...{ style: ({ background: i === step.value ? 'var(--accent)' : 'var(--border)' }) },
        });
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        // @ts-ignore
        [step, TOUR_STEPS,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-4 flex justify-end gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    if (!isLast()) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    void $event;
                    if (!(!isLast()))
                        throw 0;
                    return (__VLS_unwrap(emit, {})('close'));
                    // @ts-ignore
                    [emit,];
                } },
            type: "button",
            ...{ class: "rounded-lg border px-3 py-1.5 text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('tour_skip'));
    }
    if (step.value > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (goBack) },
            type: "button",
            ...{ class: "rounded-lg border px-3 py-1.5 text-sm" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_unwrap(t, {})('tour_back'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (goNext) },
        type: "button",
        ...{ class: "rounded-lg px-3 py-1.5 text-sm" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (isLast() ? __VLS_unwrap(t, {})('tour_done') : __VLS_unwrap(t, {})('tour_next'));
    // @ts-ignore
    [step, t, t, t, t,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
