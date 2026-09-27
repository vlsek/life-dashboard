<script setup lang="ts">
import { computed, ref } from 'vue'
import { METRIC_ICON_CHOICES, iconSearchMatches, metricIconKey } from '../lib/icons'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'

// Порт buildIconPicker(current) из config.js: сетка SVG-иконок + поиск + поле для
// своего эмодзи. v-model отдаёт "svg:<имя>" или сам эмодзи, как и getValue() в оригинале.
const value = defineModel<string>({ required: true })

const query = ref('')
const customEmoji = ref(metricIconKey(value.value) ? '' : value.value || '')

const selectedKey = computed(() => metricIconKey(value.value))
const visibleChoices = computed(() => METRIC_ICON_CHOICES.filter((name) => iconSearchMatches(name, query.value)))

function pickIcon(name: string) {
  value.value = 'svg:' + name
  customEmoji.value = ''
}
function onCustomEmojiInput() {
  const v = customEmoji.value.trim()
  if (v) value.value = v
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <input
      v-model="query"
      type="text"
      :placeholder="t('icon_picker_search')"
      class="rounded-lg border px-2.5 py-1.5 text-sm"
      style="border-color: var(--border); background: var(--bg); color: var(--text)"
    />

    <div class="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
      <button
        v-for="name in visibleChoices"
        :key="name"
        type="button"
        :title="name"
        class="flex items-center justify-center rounded-lg border p-2 text-lg"
        :style="{
          borderColor: selectedKey === name ? 'var(--accent)' : 'var(--border)',
          background: selectedKey === name ? 'var(--accent)' : 'var(--bg)',
          color: selectedKey === name ? 'var(--accent-text)' : 'var(--text)',
        }"
        @click="pickIcon(name)"
      >
        <Icon :name="name" />
      </button>
    </div>
    <p v-if="visibleChoices.length === 0" class="py-2 text-center text-sm" style="color: var(--text-dim)">
      {{ t('icon_picker_no_results') }}
    </p>

    <input
      v-model="customEmoji"
      type="text"
      maxlength="8"
      :placeholder="t('icon_picker_custom')"
      class="rounded-lg border px-2.5 py-1.5 text-sm"
      style="border-color: var(--border); background: var(--bg); color: var(--text)"
      @input="onCustomEmojiInput"
    />
  </div>
</template>
