<script setup lang="ts">
import { t } from '../lib/i18n'

// Кнопка-лупа «быстрый поиск» (BACKLOG 79.1, срез 2): открывает командную палитру касанием — на телефоне нет Ctrl+K и «/».
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="gh-badge" data-test="palette-button" :title="t('pal_open')" :aria-label="t('pal_open')" aria-haspopup="dialog" @click="emit('open')">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text, #ddd)" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  </button>
</template>
