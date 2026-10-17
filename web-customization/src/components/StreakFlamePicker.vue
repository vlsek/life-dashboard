<script setup lang="ts">
import { ref } from 'vue'
import SplashFireRing from './splash/SplashFireRing.vue'
import SplashFlameLive from './splash/SplashFlameLive.vue'
import SplashFlameTongues from './splash/SplashFlameTongues.vue'
import StreakCandle from './splash/StreakCandle.vue'
import StreakEmber from './splash/StreakEmber.vue'
import { STREAK_FLAME_VARIANTS, readStreakFlameVariant, writeStreakFlameVariant, type StreakFlameVariant } from '../lib/streakFlameVariant'
import { t } from '../lib/i18n'

// Выбор вида огонька серии (BACKLOG 44.18в): «Единое пламя» (как сейчас), «Три языка» (прежнее пламя с искрами), срез 2 — «Огненное кольцо»,
// «Уголёк» и «Свеча» (у них в предпросмотре ступень серии 3: видны и свечение, и искры). Все бесплатные; выбор запоминается в localStorage (`streak_flame_variant`) и виден на Дашборде со следующей загрузки.
// Предпросмотр живой (те же компоненты и CSS, что у заставки), без анимации при «уменьшить движение».
const current = ref<StreakFlameVariant>(readStreakFlameVariant())
const saved = ref(true)
const label = (v: StreakFlameVariant): string => t(('cust_streakflame_' + v) as never)
const choose = (v: StreakFlameVariant) => {
  saved.value = writeStreakFlameVariant(v)
  if (saved.value) current.value = v
}
</script>

<template>
  <div data-testid="streakflame-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_streakflame_hint') }}</p>
    <p v-if="!saved" class="mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="streakflame-save-error">{{ t('cust_splash_save_error') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
      <div
        v-for="v in STREAK_FLAME_VARIANTS"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'streakflame-' + v"
        :data-active="current === v"
      >
        <div class="sf-prev flex items-center justify-center rounded-lg" style="height: 4.5rem" aria-hidden="true">
          <SplashFlameLive v-if="v === 'flame'" :size="48" />
          <SplashFireRing v-else-if="v === 'ring'" />
          <StreakEmber v-else-if="v === 'ember'" data-tier="3" />
          <StreakCandle v-else-if="v === 'candle'" data-tier="3" />
          <SplashFlameTongues v-else :size="48" />
        </div>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="streakflame-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sf-prev :deep(svg) {
  width: 3.4rem;
  height: 3.4rem;
}
</style>
