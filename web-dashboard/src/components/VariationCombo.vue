<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { floatingPanelStyle, matchVariations } from '../lib/setsBlock'
import type { FloatingStyle } from '../lib/setsBlock'
import { t } from '../lib/i18n'

// Портировано из buildVariationCombo() в dashboard.js: поле + выпадашка с сохранёнными вариантами
// (у каждого ✕, чтобы убрать неверный вариант прямо здесь). Своя выпадашка вместо <datalist>.
// Список вынесен в <body> (Teleport) и позиционируется как fixed под/над полем — как в классике:
// внутри таблицы подходов (overflow-x: auto) он обрезался на телефоне (BACKLOG 11).
const props = defineProps<{ modelValue: string | null; labels: string[] }>()
const emit = defineEmits<{ commit: [text: string]; forget: [label: string] }>()

const text = ref(props.modelValue ?? '')
watch(() => props.modelValue, (v) => (text.value = v ?? ''))

const rootEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const open = ref(false)
const showAll = ref(false)
const panelStyle = ref<FloatingStyle | null>(null)
const matches = computed(() => matchVariations(props.labels, text.value, showAll.value))
const visible = computed(() => open.value && matches.value.length > 0)

function place() {
  const el = inputEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vv = window.visualViewport
  const top = vv ? vv.offsetTop : 0
  panelStyle.value = floatingPanelStyle(
    { left: r.left, top: r.top, bottom: r.bottom, width: r.width },
    { top, bottom: top + (vv ? vv.height : window.innerHeight), width: vv ? vv.width : window.innerWidth },
  )
}

// Пока список открыт: следим за прокруткой/ресайзом/клавиатурой и тапом мимо.
function onOutside(e: Event) {
  const target = e.target as Node | null
  if (target && (rootEl.value?.contains(target) || panelEl.value?.contains(target))) return
  open.value = false
}
function listen(on: boolean) {
  const m = on ? 'addEventListener' : 'removeEventListener'
  window[m]('resize', place)
  window[m]('scroll', place, true)
  window.visualViewport?.[m]('resize', place)
  window.visualViewport?.[m]('scroll', place)
  document[m]('pointerdown', onOutside, true)
}
watch(visible, async (v) => {
  listen(v)
  if (v) {
    await nextTick()
    place()
  }
})
onBeforeUnmount(() => listen(false))

function onInput() {
  showAll.value = false
  open.value = true
  place()
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
  place()
}
</script>

<template>
  <div ref="rootEl" class="flex items-center gap-1">
    <input
      ref="inputEl"
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
    <Teleport to="body">
      <div
        v-if="visible"
        ref="panelEl"
        class="variation-panel overflow-y-auto rounded-lg border"
        :style="{ position: 'fixed', zIndex: 200, background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 6px 20px rgba(0,0,0,0.3)', WebkitOverflowScrolling: 'touch', ...(panelStyle ?? { visibility: 'hidden' }) }"
      >
        <div v-for="label in matches" :key="label" class="flex items-center justify-between gap-2 px-2.5 py-2 text-sm">
          <span class="flex-1 cursor-pointer truncate" @mousedown.prevent="pick(label)">{{ label }}</span>
          <button type="button" class="danger" style="padding: 0 4px; min-height: 0" :title="t('dash_sets_variation_remove_title')" @mousedown.prevent.stop="emit('forget', label)">
            <Icon name="x" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
