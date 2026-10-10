<script setup lang="ts">
import { ref } from 'vue'
import SplashFlameLive from './splash/SplashFlameLive.vue'
import SplashFlameTongues from './splash/SplashFlameTongues.vue'
import SplashFireRing from './splash/SplashFireRing.vue'
import SplashClassic from './splash/SplashClassic.vue'
import { SPLASH_VARIANTS, readSplashVariant, writeSplashVariant, type SplashVariant } from '../lib/splashVariant'
import { t } from '../lib/i18n'

// Выбор заставки загрузки (BACKLOG 16, срез 2; просьба владельца 2026-10-10: вернуть старое пламя из трёх языков и дать выбор).
// Все четыре варианта бесплатные; выбор запоминается в localStorage (`splash_variant`) и действует на всех страницах сайта со
// следующей загрузки. Предпросмотр живой (те же компоненты и CSS, что у заставки), без анимации при «уменьшить движение».
const current = ref<SplashVariant>(readSplashVariant())
const saved = ref(true)
const label = (v: SplashVariant): string => t(('splash_variant_' + v) as never)
const choose = (v: SplashVariant) => {
  saved.value = writeSplashVariant(v)
  if (saved.value) current.value = v
}
</script>

<template>
  <div data-testid="splash-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_splash_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="splash-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
      <div
        v-for="v in SPLASH_VARIANTS"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'splash-' + v"
        :data-active="current === v"
      >
        <div class="sp-prev flex items-center justify-center rounded-lg" style="height: 5.5rem" aria-hidden="true">
          <SplashFlameLive v-if="v === 'flame'" :size="56" />
          <SplashFlameTongues v-else-if="v === 'tongues'" />
          <SplashFireRing v-else-if="v === 'ring'" />
          <SplashClassic v-else />
        </div>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="splash-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Предпросмотр одного размера для всех вариантов (у компонентов свои width/height в атрибутах). */
.sp-prev :deep(svg) {
  width: 4.2rem;
  height: 4.2rem;
}
</style>
