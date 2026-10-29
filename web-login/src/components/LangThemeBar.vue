<script setup lang="ts">
import { ref } from 'vue'
import { getLang, setLang, t, type DictKey } from '../lib/i18n'
import { getTheme, setTheme, LOGIN_THEMES, type ThemeKey } from '../lib/theme'

// Вход (BACKLOG 49.8, оформление — BACKLOG 68.1): вместо выпадашки из 23 тем — язык и выбор «Светлая / Тёмная». Теперь это ДВЕ компактные пилюли
// (язык слева, тема справа) вместо ряда из четырёх одинаковых кнопок с эмодзи. Тема — солнце и луна в одной пилюле: выбор явный, у каждой кнопки есть
// aria-pressed и имя для скринридера. Весь остальной выбор тем — в «Кастомизации» после входа. Если у человека уже выбрана другая тема,
// ни одна из двух не подсвечена. Класс `secondary` — не стилевой, а сигнал темам («Чернильная бумага» и др.): это не обычная кнопка, не рисовать на ней свою рамку и не сбрасывать фон выбранной пилюли.
const lang = getLang()
const themeVal = ref<ThemeKey>(getTheme())

function pickTheme(k: ThemeKey) {
  themeVal.value = k
  setTheme(k)
}
</script>

<template>
  <div class="login-bar" data-testid="lang-theme-bar">
    <div class="seg" role="group" aria-label="Language" data-testid="lang-switch">
      <button
        v-for="l in (['en', 'ru'] as const)"
        :key="l"
        type="button"
        class="bar-btn seg-btn secondary cursor-pointer"
        :class="{ 'seg-on': lang === l }"
        :aria-pressed="lang === l"
        @click="setLang(l)"
      >
        {{ l.toUpperCase() }}
      </button>
    </div>
    <div class="seg" role="group" :aria-label="t('theme_label' as DictKey)" data-testid="theme-switch">
      <button
        v-for="k in LOGIN_THEMES"
        :key="k"
        type="button"
        class="bar-btn seg-btn seg-icon secondary cursor-pointer"
        :class="{ 'seg-on': themeVal === k }"
        :aria-pressed="themeVal === k"
        :aria-label="t(('theme_' + k) as DictKey)"
        :title="t(('theme_' + k) as DictKey)"
        :data-theme-btn="k"
        @click="pickTheme(k)"
      >
        <svg v-if="k === 'light'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </div>
  </div>
</template>
