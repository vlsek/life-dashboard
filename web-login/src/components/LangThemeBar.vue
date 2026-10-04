<script setup lang="ts">
import { ref } from 'vue'
import { getLang, setLang, t, type DictKey } from '../lib/i18n'
import { getTheme, setTheme, THEME_KEYS, type ThemeKey } from '../lib/theme'

// Порт renderLangSwitcher()/renderThemeSwitcher() из config.js для страниц без сайдбара
// (вход, онбординг): кнопки RU/EN + выбор темы в одну строку над формой.
const lang = getLang()
const themeVal = ref<ThemeKey>(getTheme())

function onThemeChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as ThemeKey
  themeVal.value = v
  setTheme(v)
}
</script>

<template>
  <div class="mb-3.5 flex items-center justify-center gap-2">
    <div class="flex gap-1.5">
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
    <select
      class="rounded-lg border px-2 py-1 text-sm"
      style="background: var(--bg); color: var(--text); border-color: var(--border)"
      :value="themeVal"
      @change="onThemeChange"
    >
      <option v-for="(labelKey, key) in THEME_KEYS" :key="key" :value="key">{{ t(labelKey as DictKey) }}</option>
    </select>
  </div>
</template>
