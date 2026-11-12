/// <reference types="../../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
const { defineProps, withDefaults, } = {};
const __VLS_props = withDefaults(defineProps(), { size: 80, sparks: true });
const __VLS_defaults = { size: 80, sparks: true };
void __VLS_defaults;
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        ...{ class: "splash-live" },
        ...{ class: ({ 'splash-live-sm': __VLS_ctx.size < 48 }) },
        viewBox: "0 0 64 64",
        width: (__VLS_ctx.size),
        height: (__VLS_ctx.size),
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['splash-live']} */ ;
    /** @type {__VLS_StyleScopedClasses['splash-live-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
        ...{ class: "flame-body" },
    });
    /** @type {__VLS_StyleScopedClasses['flame-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        ...{ class: "flame-layer layer-outer" },
        d: "M32 3C34.8 13 51.6 21 51.6 37C51.6 49 43.2 58 32 58C20.8 58 12.4 49 12.4 37C12.4 29 20.8 25 23.6 17C26.4 21 29.2 21 30.6 15C31.3 10 31.72 7 32 3Z",
    });
    /** @type {__VLS_StyleScopedClasses['flame-layer']} */ ;
    /** @type {__VLS_StyleScopedClasses['layer-outer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        ...{ class: "flame-layer layer-mid" },
        d: "M32 3C34.8 13 51.6 21 51.6 37C51.6 49 43.2 58 32 58C20.8 58 12.4 49 12.4 37C12.4 29 20.8 25 23.6 17C26.4 21 29.2 21 30.6 15C31.3 10 31.72 7 32 3Z",
    });
    /** @type {__VLS_StyleScopedClasses['flame-layer']} */ ;
    /** @type {__VLS_StyleScopedClasses['layer-mid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        ...{ class: "flame-layer layer-core" },
        d: "M32 30C33.4 36 43.2 40 43.2 47C43.2 53 37.6 58 32 58C26.4 58 20.8 53 20.8 47C20.8 40 30.6 36 32 30Z",
    });
    /** @type {__VLS_StyleScopedClasses['flame-layer']} */ ;
    /** @type {__VLS_StyleScopedClasses['layer-core']} */ ;
    if (__VLS_ctx.sparks) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            ...{ class: "spark" },
            cx: "22.2",
            cy: "14",
            r: "1.3",
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['spark']} */ ;
    }
    if (__VLS_ctx.sparks) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            ...{ class: "spark" },
            cx: "34.8",
            cy: "10",
            r: "1.1",
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['spark']} */ ;
    }
    if (__VLS_ctx.sparks) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            ...{ class: "spark" },
            cx: "44.6",
            cy: "16",
            r: "1.4",
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['spark']} */ ;
    }
    if (__VLS_ctx.sparks) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            ...{ class: "spark" },
            cx: "29.2",
            cy: "12",
            r: "0.9",
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['spark']} */ ;
    }
    // @ts-ignore
    [size, size, size, sparks, sparks, sparks, sparks,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
