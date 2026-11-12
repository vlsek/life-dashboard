/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../home/claude/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import Icon from './Icon.vue';
import { splitEmojiText } from '../lib/emojiText';
const { defineProps, } = {};
const props = defineProps();
const segments = computed(() => splitEmojiText(props.text));
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
    __VLS_withDotValue(segments, {});
    void {};
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "emoji-text" },
        'data-test': "emoji-text",
    });
    /** @type {__VLS_StyleScopedClasses['emoji-text']} */ ;
    const __VLS_0 = __VLS_tryAsConstant((segments.value));
    for (const [s, i] of __VLS_vFor(__VLS_nonNull(__VLS_0))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.template)({
            key: (i),
        });
        if (s.kind === 'icon') {
            const __VLS_1 = Icon;
            // @ts-ignore
            const __VLS_2 = __VLS_asFunctionalComponent1(__VLS_1, new __VLS_1({
                // @ts-ignore
                name: (s.name), ...{ class: "emoji-text-icon" }, ...{ class: ({ 'emoji-text-icon--tail': i === segments.value.length - 1 }) },
            }));
            const __VLS_3 = __VLS_2({
                name: (s.name),
                ...{ class: "emoji-text-icon" },
                ...{ class: ({ 'emoji-text-icon--tail': i === segments.value.length - 1 }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_2));
            /** @type {__VLS_StyleScopedClasses['emoji-text-icon']} */ ;
            /** @type {__VLS_StyleScopedClasses['emoji-text-icon--tail']} */ ;
        }
        else {
            (s.value);
        }
        // @ts-ignore
        [segments, segments,];
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
