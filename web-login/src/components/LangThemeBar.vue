<script setup lang="ts">
import { ref } from 'vue'
import { getLang, setLang, t, type DictKey } from '../lib/i18n'
import { getTheme, setTheme, LOGIN_THEMES, type ThemeKey } from '../lib/theme'

// Вход (BACKLOG 49.8): вместо выпадашки из 23 тем — язык и два переключателя «Светлая / Тёмная».
// Весь остальной выбор тем — в «Кастомизации» после входа. Если у человека уже выбрана другая тема, ни одна кнопка не подсвечена.
const lang = getLang()
const themeVal = ref<ThemeKey>(getTheme())

function pickTheme(k: ThemeKey) {
  themeVal.value = k
  setTheme(k)
}
</script>

<template>
  <div class="mb-3.5 flex items-center justify-center gap-2" data-testid="lang-theme-bar">
    <div class="flex gap-1.5" data-testid="lang-switch">
      <button
        v-for="l in (['en', 'ru'] as const)"
        :key="l"
        type="button"
        class="cursor-pointer rounded-lg border px-3 py-1 text-sm"
        :style="{
          borderColor: 'var(--border)',
          background: lang === l ? 'var(--accent)' : 'transparent',
          color: lang === l ? 'var(--accent-text)' : 'var(--text)',
        }"
        @click="setLang(l)"
      >
        {{ l.toUpperCase() }}
      </button>
    </div>
    <div class="flex gap-1.5" role="group" :aria-label="t('theme_label' as DictKey)" data-testid="theme-switch">
      <button
        v-for="k in LOGIN_THEMES"
        :key="k"
        type="button"
        class="cursor-pointer rounded-lg border px-3 py-1 text-sm"
        :aria-pressed="themeVal === k"
        :data-theme-btn="k"
        :style="{
          borderColor: 'var(--border)',
          background: themeVal === k ? 'var(--accent)' : 'transparent',
          color: themeVal === k ? 'var(--accent-text)' : 'var(--text)',
        }"
        @click="pickTheme(k)"
      >
        {{ t(('theme_' + k) as DictKey) }}
      </button>
    </div>
  </div>
</template>
