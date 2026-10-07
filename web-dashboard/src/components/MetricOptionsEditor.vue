<script setup lang="ts">
import { nextTick, ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import { moveTo } from '../lib/dragReorder'
import { newOptionDraft, type OptionDraft } from '../lib/metricsManager'
import { useRowDrag } from '../lib/useRowDrag'

// Варианты метрики списком вместо строки «ключ:Метка, ключ:Метка» (BACKLOG «Форма метрики: поле вариантов выглядит устаревшим»): у каждого варианта
// поле «Название», ручка ☰ (перетаскивание — общий жест lib/useRowDrag, тот же, что в «Раскладке» и в окне графиков), стрелки ↑/↓, ✕ и кнопка
// «+ вариант». Ключ в базе пользователь не видит: у нового варианта он назначается при сохранении (metricsManager.optionsFromDrafts), у сохранённого не меняется.
const props = defineProps<{ modelValue: OptionDraft[]; disabled?: boolean; sets?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: OptionDraft[]] }>()

const root = ref<HTMLElement | null>(null)
const { setListEl, drag, dragging, onDown, onMove, onUp, onCancel, onKey, rowStyle } = useRowDrag(
  () => props.modelValue,
  (next) => emit('update:modelValue', next),
)
const setRoot = (el: unknown) => {
  root.value = (el as HTMLElement | null) ?? null
  setListEl(el)
}
const arrowStyle = { borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }

function setLabel(i: number, label: string) {
  emit('update:modelValue', props.modelValue.map((o, j) => (j === i ? { ...o, label } : o)))
}
function remove(i: number) {
  emit('update:modelValue', props.modelValue.filter((_, j) => j !== i))
}
function move(i: number, dir: -1 | 1) {
  emit('update:modelValue', moveTo(props.modelValue, i, i + dir))
}
// Новая строка после i (или в конец) и фокус в её поле — чтобы можно было вводить варианты подряд, нажимая Enter
async function addAfter(i: number) {
  const list = [...props.modelValue]
  list.splice(i + 1, 0, newOptionDraft())
  emit('update:modelValue', list)
  await nextTick()
  const inputs = root.value?.querySelectorAll<HTMLInputElement>('[data-test="option-label"]')
  inputs?.[i + 1]?.focus()
}
</script>

<template>
  <div :style="{ opacity: disabled ? 0.4 : 1 }" data-test="options-editor">
    <div :ref="setRoot" class="flex flex-col gap-1.5" :style="{ userSelect: dragging ? 'none' : undefined }" data-test="options-list">
      <div
        v-for="(o, i) in modelValue"
        :key="o.id"
        class="flex items-center gap-1.5 rounded-xl border p-1.5"
        :class="{ 'is-dragging': drag?.from === i }"
        :style="{ borderColor: 'var(--border)', background: 'var(--bg)', ...rowStyle(i) }"
        data-test="option-row"
      >
        <button
          type="button"
          class="grid h-9 w-8 flex-none cursor-grab place-items-center rounded-lg text-lg leading-none"
          style="touch-action: none; background: transparent; border: none; color: var(--text-dim)"
          data-test="option-drag"
          :disabled="disabled"
          :aria-label="t('dash_layout_drag')"
          :title="t('dash_layout_drag')"
          @pointerdown.prevent="onDown($event, i)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onCancel"
          @keydown="onKey($event, i)"
        ><Icon name="menu" /></button>
        <input
          type="text"
          class="min-w-0 flex-1"
          maxlength="60"
          data-test="option-label"
          :value="o.label"
          :disabled="disabled"
          :placeholder="sets ? t('dash_metric_option_placeholder_sets') : t('dash_metric_option_placeholder')"
          @input="setLabel(i, ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="addAfter(i)"
        />
        <button type="button" class="rounded-md border px-2 py-1 text-sm" :style="arrowStyle" data-test="option-up" :disabled="disabled || i === 0" :aria-label="t('dash_layout_up')" @click="move(i, -1)">↑</button>
        <button type="button" class="rounded-md border px-2 py-1 text-sm" :style="arrowStyle" data-test="option-down" :disabled="disabled || i === modelValue.length - 1" :aria-label="t('dash_layout_down')" @click="move(i, 1)">↓</button>
        <button type="button" class="danger px-2" data-test="option-remove" :disabled="disabled" :aria-label="t('dash_metric_option_remove')" :title="t('dash_metric_option_remove')" @click="remove(i)"><Icon name="x" /></button>
      </div>
    </div>
    <button type="button" class="secondary mt-1.5" data-test="option-add" :disabled="disabled" @click="addAfter(modelValue.length - 1)">{{ sets ? t('dash_metric_option_add_sets') : t('dash_metric_option_add') }}</button>
  </div>
</template>
