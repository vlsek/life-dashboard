/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { ICON_PATHS } from '../lib/icons';
const { defineProps, } = {};
const props = defineProps();
const body = computed(() => ICON_PATHS[props.name] || '');
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
    __VLS_withDotValue(body, {});
    if (body.value) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            ...{ class: "icon inline-block h-[1em] w-[1em] shrink-0 align-[-0.15em]" },
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.9",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
            'aria-hidden': "true",
            ...{ style: (__VLS_ctx.extraStyle) },
        });
        const __VLS_0 = __VLS_asFunctionalDirective(__VLS_directives.vHtml, {});
        __VLS_0(__VLS_nonNull(null), { ...__VLS_directiveBindingRestFields, value: (body.value), }, ...__VLS_directiveHookArgsRest(__VLS_0));
        /** @type {__VLS_StyleScopedClasses['icon']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-[1em]']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-[1em]']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['align-[-0.15em]']} */ ;
    }
    // @ts-ignore
    [body, body, extraStyle,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
