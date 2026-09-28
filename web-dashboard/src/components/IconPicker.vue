<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { METRIC_ICON_CHOICES, iconSearchMatches, metricIconKey } from '../lib/icons'
import { t } from '../lib/i18n'

// Портировано из buildIconPicker() в config.js: поиск по названию/ключевым словам, сетка иконок,
// поле для своего эмодзи. Значение — 'svg:<имя>' или эмодзи-строка.
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const query = ref('')
const custom = ref(metricIconKey(props.modelValue) ? '' : props.modelValue)
const selectedKey = computed(() => metricIconKey(props.modelValue))
const visible = computed(() => METRIC_ICON_CHOICES.filter((n) => iconSearchMatches(n, query.value)))

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
  <div>
    <input v-model="query" type="text" class="w-full" :placeholder="t('icon_picker_search')" />
    <div class="my-2 flex max-h-36 flex-wrap gap-1 overflow-y-auto">
      <button
        v-for="name in visible"
        :key="name"
        type="button"
        class="secondary"
        :class="{ 'ring-2': selectedKey === name }"
        style="padding: 4px 6px; min-height: 0"
        :style="selectedKey === name ? 'border-color: var(--accent)' : ''"
        :title="name"
        @click="pick(name)"
      >
        <Icon :name="name" />
      </button>
      <p v-if="visible.length === 0" class="dim w-full py-2 text-center text-sm">{{ t('icon_picker_no_results') }}</p>
    </div>
    <input v-model="custom" type="text" maxlength="8" class="w-full" :placeholder="t('icon_picker_custom')" @input="onCustom" />
  </div>
</template>
