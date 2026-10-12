<script setup lang="ts">
import { ref } from 'vue'
import SplashFlameLive from './splash/SplashFlameLive.vue'
import SplashFlameTongues from './splash/SplashFlameTongues.vue'
import SplashFireRing from './splash/SplashFireRing.vue'
import SplashClassic from './splash/SplashClassic.vue'
import SplashOrbit from './splash/SplashOrbit.vue'
import SplashBars from './splash/SplashBars.vue'
import SplashPulse from './splash/SplashPulse.vue'
import { SPLASH_VARIANTS, readSplashChoice, readSplashVariant, writeSplashVariant, type SplashVariant } from '../lib/splashVariant'
import { t } from '../lib/i18n'

// Выбор заставки загрузки (BACKLOG 16, срез 2; просьба владельца 2026-10-10: вернуть старое пламя из трёх языков и дать выбор).
// Все четыре варианта бесплатные; выбор запоминается в localStorage (`splash_variant`) и действует на всех страницах сайта со
// следующей загрузки. Предпросмотр живой (те же компоненты и CSS, что у заставки), без анимации при «уменьшить движение».
const current = ref<SplashVariant | 'auto'>(readSplashChoice()) // 'auto' — «По теме» (BACKLOG 55.5, срез 2): идёт заставка большой темы, иначе «живое пламя»
const effective = ref<SplashVariant>(readSplashVariant()) // какая заставка играет сейчас (для предпросмотра плитки «По теме»)
const saved = ref(true)
const label = (v: SplashVariant): string => t(('splash_variant_' + v) as never)
const items: (SplashVariant | 'auto')[] = ['auto', ...SPLASH_VARIANTS]
const shown = (v: SplashVariant | 'auto'): SplashVariant => (v === 'auto' ? effective.value : v)
const choose = (v: SplashVariant | 'auto') => {
  saved.value = writeSplashVariant(v)
  if (saved.value) {
    current.value = v
    effective.value = readSplashVariant()
  }
}
</script>

<template>
  <div data-testid="splash-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_splash_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="splash-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
      <div
        v-for="v in items"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'splash-' + v"
        :data-active="current === v"
      >
        <div class="sp-prev flex items-center justify-center rounded-lg" style="height: 5.5rem" aria-hidden="true">
          <SplashFlameLive v-if="shown(v) === 'flame'" :size="56" />
          <SplashFlameTongues v-else-if="shown(v) === 'tongues'" />
          <SplashFireRing v-else-if="shown(v) === 'ring'" />
          <SplashOrbit v-else-if="shown(v) === 'orbit'" />
          <SplashBars v-else-if="shown(v) === 'bars'" />
          <SplashPulse v-else-if="shown(v) === 'pulse'" />
          <SplashClassic v-else />
        </div>
        <p class="m-0 text-sm font-medium">{{ v === 'auto' ? t('cust_splash_auto') : label(v) }}</p>
        <p v-if="v === 'auto'" class="dim m-0 text-xs" data-testid="splash-auto-now">{{ t('cust_splash_auto_now') }} {{ label(effective) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="(v === 'auto' ? t('cust_splash_auto') : label(v)) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
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
