<script lang="ts">
// Фигура карты мышц в трёх направлениях (BACKLOG 70.1/70.4): «Анатомия» (A), «Атлас» (B), «Техно» (C). Геометрия — из макета (`muscleModels.generated.ts`),
// состояние (недавно/нет, нагрузка, выбор) — из `MuscleMap.vue`. Контракт зон тот же, что у прежней карты: data-muscle / data-state (done|idle) / data-heat /
// data-selected, role=button, tabindex, aria-pressed, aria-label, Enter/Space.
import { defineComponent, h, type PropType, type VNode } from 'vue'
import { MUSCLE_MODELS, type ModelNode, type ModelStyle } from '../lib/muscleModels.generated'
import type { MuscleId } from '../lib/muscles'

export interface ZoneState {
  done: boolean
  heat: number | null // ступень нагрузки (режим «Нагрузка»), иначе null
  opacity: number | null // плотность заливки у «задействованных» в режиме нагрузки
}

// id градиентов и ссылки на них уникальны для каждой фигуры (спереди/сзади), иначе в документе дубли id
const scopeUrl = (v: string, suffix: string) => v.replace(/url\(#([\w-]+)\)/g, (_m, id: string) => `url(#${id}-${suffix})`)

export default defineComponent({
  name: 'MuscleModelFigure',
  props: {
    visualStyle: { type: String as PropType<ModelStyle>, required: true },
    view: { type: String as PropType<'front' | 'back'>, required: true },
    label: { type: String, required: true },
    selected: { type: String as PropType<MuscleId | null>, default: null },
    studyRecent: { type: Boolean, default: false },
    stateOf: { type: Function as PropType<(m: MuscleId) => ZoneState>, required: true },
    labelOf: { type: Function as PropType<(m: MuscleId) => string>, required: true },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const suffix = () => props.view
    function render(n: ModelNode): VNode {
      const attrs: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(n.attrs ?? {})) attrs[k] = k === 'id' ? `${v}-${suffix()}` : scopeUrl(v, suffix())
      const muscle = (n.attrs?.['data-muscle'] ?? null) as MuscleId | null
      const nodeFor = n.attrs?.['data-node-for'] ?? null
      if (muscle) {
        const st = props.stateOf(muscle)
        const isSel = props.selected === muscle
        const style: Record<string, string> = {}
        style['stroke-dasharray'] = st.done ? 'none' : '1.2 0.8'
        if (st.done && st.opacity !== null) style.opacity = String(st.opacity)
        if (st.done && props.visualStyle === 'anatomy') style.fill = `url(#fleshHot-${suffix()})`
        return h(n.tag, {
          ...attrs,
          class: ['muscle-zone', isSel ? 'selected' : ''],
          style,
          role: 'button',
          tabindex: 0,
          'data-state': st.done ? 'done' : 'idle',
          'data-heat': st.heat ?? undefined,
          'data-selected': isSel,
          'aria-pressed': isSel,
          'aria-label': props.labelOf(muscle),
          onClick: () => emit('select', muscle),
          onKeydown: (e: KeyboardEvent) => {
            const k = e.key || ''
            if (k === 'Enter' || k === ' ' || k === 'Spacebar' || e.code === 'Enter' || e.code === 'Space' || e.keyCode === 13 || e.keyCode === 32) {
              e.preventDefault()
              emit('select', muscle)
            }
          },
        })
      }
      const kids: (VNode | string)[] = n.children ? n.children.map(render) : n.text ? [n.text] : []
      if (nodeFor) return h(n.tag, { ...attrs, class: ['muscle-node', props.selected === nodeFor ? 'node-selected' : ''], 'aria-hidden': 'true' }, kids)
      return h(n.tag, { ...attrs, 'aria-hidden': 'true' }, kids)
    }
    return () => {
      const model = MUSCLE_MODELS[props.visualStyle]
      return h('div', { class: ['muscle-stage', 'muscle-stage--' + props.visualStyle] }, [
        h('svg', { viewBox: '0 0 100 190', class: ['muscle-map-svg', 'muscle-map-svg--' + props.visualStyle, 'muscle-model'], 'data-visual-style': props.visualStyle, role: 'group', 'aria-label': props.label }, [
          h('defs', model.defs.map(render)),
          // голова в режиме «Учёба»: отметка того же цвета, что у прежней карты
          h('circle', { cx: 50, cy: 14, r: 8, fill: props.studyRecent ? 'var(--success)' : 'none', 'fill-opacity': props.studyRecent ? 0.9 : 1, stroke: props.studyRecent ? 'var(--success)' : 'none', 'stroke-width': 1, 'aria-hidden': 'true', 'data-testid': 'muscle-head' }),
          ...model[props.view].map(render),
          props.visualStyle === 'tech'
            ? h('g', { class: 'muscle-tech-overlay', 'aria-hidden': 'true' }, [
                h('path', { d: 'M5 6V1H10 M90 1H95V6 M5 184V189H10 M90 189H95V184', fill: 'none', stroke: '#65e5eb', 'stroke-width': 0.9, opacity: 0.85 }),
                h('path', { d: 'M12 43H88 M12 79H88 M12 115H88 M12 151H88', fill: 'none', stroke: '#65e5eb', 'stroke-width': 0.3, 'stroke-dasharray': '1 2', opacity: 0.4 }),
              ])
            : null,
        ]),
      ])
    }
  },
})
</script>

<style>
.muscle-stage {
  width: 9rem;
  padding: 0.5rem;
  border-radius: 0.9rem;
  border: 1px solid var(--border);
}
.muscle-stage--anatomy {
  background: radial-gradient(circle at 50% 38%, rgba(255, 170, 110, 0.2), transparent 62%), linear-gradient(#171b26, #0d0f16);
}
.muscle-stage--atlas {
  background-color: #eaf0f4;
  background-image: linear-gradient(rgba(70, 105, 135, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 105, 135, 0.14) 1px, transparent 1px);
  background-size: 14px 14px;
}
.muscle-stage--tech {
  background-color: #071a22;
  background-image: linear-gradient(rgba(60, 220, 225, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(60, 220, 225, 0.12) 1px, transparent 1px);
  background-size: 14px 14px;
}
.muscle-model {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
/* всё, что не зона, не перехватывает клики */
.muscle-model * { pointer-events: none; }
.muscle-model [data-muscle] { pointer-events: auto; cursor: pointer; transition: fill 0.16s, stroke 0.16s, filter 0.16s, opacity 0.16s; }
.muscle-model [data-muscle][data-state='done'] { filter: drop-shadow(0 0 2px #ffcf8a); }
.muscle-model [data-muscle][data-state='idle'] { opacity: 0.38; }
.muscle-map-svg--atlas [data-muscle][data-state='done'] { fill: #78aeca; stroke: #245a7d; }
.muscle-map-svg--tech [data-muscle][data-state='done'] { fill: #0e7580; stroke: #9affed; filter: drop-shadow(0 0 2px #3de7e8); }
.muscle-map-svg--anatomy [data-muscle][data-state='done'] { stroke: #ffe2ac; }
.muscle-model [data-muscle].selected { fill: #ffcc68 !important; stroke: #fff3bc !important; stroke-width: 1.5 !important; stroke-dasharray: none !important; opacity: 1 !important; filter: drop-shadow(0 0 4px #ffe49a) !important; }
.muscle-model [data-muscle]:focus-visible { outline: none; stroke: #fff !important; stroke-width: 1.6 !important; }
.muscle-map-svg--tech .node-selected { fill: #fff1b8 !important; stroke: #fff !important; filter: drop-shadow(0 0 3px #ffb64c); }
@media (prefers-reduced-motion: reduce) {
  .muscle-model [data-muscle] { transition: none; }
}
</style>
