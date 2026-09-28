<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { matchVariations } from '../lib/setsBlock'
import { t } from '../lib/i18n'

// Портировано из buildVariationCombo() в dashboard.js: поле + выпадашка с сохранёнными вариантами
// (у каждого ✕, чтобы убрать неверный вариант прямо здесь). Своя выпадашка вместо <datalist>.
const props = defineProps<{ modelValue: string | null; labels: string[] }>()
const emit = defineEmits<{ commit: [text: string]; forget: [label: string] }>()

const text = ref(props.modelValue ?? '')
watch(() => props.modelValue, (v) => (text.value = v ?? ''))

const open = ref(false)
const showAll = ref(false)
const matches = computed(() => matchVariations(props.labels, text.value, showAll.value))

function onInput() {
  showAll.value = false
  open.value = true
}
function pick(label: string) {
  text.value = label
  open.value = false
  emit('commit', label)
}
function onChange() {
  emit('commit', text.value.trim())
}
// небольшая задержка, чтобы клик по варианту успел сработать до закрытия списка
function onBlur() {
  setTimeout(() => (open.value = false), 150)
}
function toggleAll() {
  if (open.value) {
    open.value = false
    return
  }
  showAll.value = true
  open.value = true
}
</script>

<template>
  <div class="relative flex items-center gap-1">
    <input
      v-model="text"
      type="text"
      class="min-w-0 flex-1"
      :placeholder="t('dash_sets_variation_placeholder')"
      @input="onInput"
      @focus="onInput"
      @blur="onBlur"
      @change="onChange"
    />
    <button type="button" class="secondary" tabindex="-1" style="padding: 2px 6px; min-height: 0" :title="t('dash_sets_variation_show_all_title')" @mousedown.prevent="toggleAll">▾</button>
    <div
      v-if="open && matches.length > 0"
      class="absolute left-0 top-full z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border"
      style="background: var(--bg-card); border-color: var(--border)"
    >
      <div v-for="label in matches" :key="label" class="flex items-center justify-between gap-2 px-2 py-1 text-sm">
        <span class="flex-1 cursor-pointer" @mousedown.prevent="pick(label)">{{ label }}</span>
        <button type="button" class="danger" style="padding: 0 4px; min-height: 0" :title="t('dash_sets_variation_remove_title')" @mousedown.prevent.stop="emit('forget', label)">
          <Icon name="x" />
        </button>
      </div>
    </div>
  </div>
</template>
