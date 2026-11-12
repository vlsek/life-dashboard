/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { metricIconKey } from '../lib/icons';
import Icon from './Icon.vue';
const { defineProps, } = {};
const props = defineProps();
const svgName = computed(() => metricIconKey(props.icon));
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
    __VLS_withDotValue(svgName, {});
    if (svgName.value) {
        const __VLS_0 = Icon;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            // @ts-ignore
            name: (svgName.value), extraStyle: (__VLS_ctx.extraStyle),
        }));
        const __VLS_2 = __VLS_1({
            name: (svgName.value),
            extraStyle: (__VLS_ctx.extraStyle),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    }
    else if (__VLS_ctx.icon && !__VLS_ctx.icon.startsWith('svg:')) {
        (__VLS_ctx.icon);
    }
    // @ts-ignore
    [svgName, svgName, extraStyle, icon, icon, icon,];
    return {};
};
void [__VLS_template];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
