<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { ICON_CATEGORIES, iconLabel, iconsForPicker, metricIconKey } from '../lib/icons'
import { getLang, t } from '../lib/i18n'

// Выбор иконки метрики/параметра тела (BACKLOG 1.3 «Библиотека и поиск SVG»). Без запроса показывается
// компактная подборка «Популярные»; редкие иконки — во вкладках-категориях и во «Всех». Запрос ищет по
// ВСЕМУ архиву (несколько слов — все должны совпасть). Выбранная иконка всегда видна отдельной строкой,
// даже если её нет в текущей вкладке. Значение — 'svg:<имя>' или эмодзи-строка (свой эмодзи — внизу).
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const lang = getLang()
const query = ref('')
const tab = ref('popular')
const custom = ref(metricIconKey(props.modelValue) ? '' : props.modelValue)
const selectedKey = computed(() => metricIconKey(props.modelValue))
const searching = computed(() => query.value.trim().length > 0)
const visible = computed(() => iconsForPicker(query.value, tab.value))

const tabs = computed(() => [
  { key: 'popular', label: t('icon_picker_popular') },
  ...ICON_CATEGORIES.map((c) => ({ key: c.key, label: lang === 'ru' ? c.ru : c.en })),
  { key: 'all', label: t('icon_picker_all') },
])

function pick(name: string) {
  custom.value = ''
  emit('update:modelValue', 'svg:' + name)
}
function onCustom() {
  const v = custom.value.trim()
  if (v) emit('update:modelValue', v)
}
</script>

<template>
  <div data-testid="icon-picker">
    <input v-model="query" type="text" class="w-full" :placeholder="t('icon_picker_search')" data-testid="icon-search" />

    <div v-if="selectedKey" class="mt-2 flex items-center gap-2 text-sm" data-testid="icon-selected">
      <span class="dim">{{ t('icon_picker_selected') }}</span>
      <Icon :name="selectedKey" />
      <span>{{ iconLabel(selectedKey, lang) }}</span>
    </div>

    <div v-if="!searching" class="mt-2 flex gap-1 overflow-x-auto pb-1" role="tablist" data-testid="icon-tabs">
      <button
        v-for="tb in tabs"
        :key="tb.key"
        type="button"
        role="tab"
        class="secondary shrink-0"
        :aria-selected="tab === tb.key"
        :data-tab="tb.key"
        :style="'padding: 3px 10px; min-height: 0; font-size: 0.8rem; border-radius: 9999px;' + (tab === tb.key ? ' border-color: var(--accent); color: var(--accent)' : '')"
        @click="tab = tb.key"
      >
        {{ tb.label }}
      </button>
    </div>
    <p v-else class="dim mt-2 text-xs" data-testid="icon-count">{{ t('icon_picker_found') }}: {{ visible.length }}</p>

    <div class="my-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto" data-testid="icon-grid">
      <button
        v-for="name in visible"
        :key="name"
        type="button"
        class="secondary"
        :class="{ 'ring-2': selectedKey === name }"
        style="padding: 4px 6px; min-height: 0"
        :style="selectedKey === name ? 'border-color: var(--accent)' : ''"
        :title="iconLabel(name, lang)"
        :aria-label="iconLabel(name, lang)"
        :aria-pressed="selectedKey === name"
        :data-icon="name"
        @click="pick(name)"
      >
        <Icon :name="name" />
      </button>
      <p v-if="visible.length === 0" class="dim w-full py-2 text-center text-sm">{{ t('icon_picker_no_results') }}</p>
    </div>
    <input v-model="custom" type="text" maxlength="8" class="w-full" :placeholder="t('icon_picker_custom')" @input="onCustom" />
  </div>
</template>
