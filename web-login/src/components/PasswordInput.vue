<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'

// Порт attachPasswordToggle() из config.js: то же поведение (переключение type
// password/text + смена иконки глаза), но как контролируемый Vue-компонент вместо
// ручной сборки DOM-обёртки. Иконки те же по смыслу (eye/eyeoff из общего icons.ts),
// а не байт-в-байт те же EYE_ICON_OPEN/OFF константы — визуально эквивалентно.
const value = defineModel<string>({ required: true })
const shown = ref(false)
</script>

<template>
  <div class="relative">
    <input
      v-model="value"
      :type="shown ? 'text' : 'password'"
      class="w-full rounded-lg border px-2.5 py-1.5 pr-9 text-sm"
      style="border-color: var(--border); background: var(--bg); color: var(--text)"
    />
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2"
      style="color: var(--text-dim)"
      :aria-label="shown ? t('password_toggle_hide') : t('password_toggle_show')"
      @click="shown = !shown"
    >
      <Icon :name="shown ? 'eyeoff' : 'eye'" />
    </button>
  </div>
</template>
