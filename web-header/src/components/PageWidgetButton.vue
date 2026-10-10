<script setup lang="ts">
import { t } from '../lib/i18n'

// Кнопка наверху страницы рядом с сердечком: «Добавить виджет этой страницы на главную» / «Убрать с главной» (BACKLOG 54.3).
// Значок — окошко-виджет: плюс, если виджета на главной нет; галочка, если есть. Цвета как у сердечка (контур — основной текст, «включено» — акцент).
defineProps<{ on: boolean; busy?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="gh-badge"
    data-test="page-widget"
    :aria-pressed="on"
    :disabled="busy"
    :title="on ? t('hdr_widget_remove') : t('hdr_widget_add')"
    :aria-label="on ? t('hdr_widget_remove') : t('hdr_widget_add')"
    @click="emit('toggle')"
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :data-state="on ? 'on' : 'off'" :style="{ stroke: on ? 'var(--accent, #6c8cff)' : 'var(--text, #ddd)' }">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path v-if="on" d="M8 12.5l2.7 2.7L16 9.8" />
      <path v-else d="M12 8v8M8 12h8" />
    </svg>
  </button>
</template>
