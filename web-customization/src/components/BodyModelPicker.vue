<script setup lang="ts">
import { ref } from 'vue'
import { BODY_MODELS, bodyGeometry, clearBodyModelChoice, readBodyModelChoice, writeBodyModelChoice, type BodyModel } from '../lib/bodyModel'
import { t } from '../lib/i18n'

// Модель тела карты мышц (BACKLOG 59.2): пять моделей (мужская, женская, атлетичная, стройная, плотная) и «По полу профиля». Выбор лежит в localStorage
// (`workouts_body_model`) — тот же ключ, что у переключателя в «Тренировках», поэтому выбор общий: карта мышц в «Тренировках» и мини-карта в шапке.
const current = ref<BodyModel | 'auto'>(readBodyModelChoice() ?? 'auto')
const options: (BodyModel | 'auto')[] = ['auto', ...BODY_MODELS]
const label = (v: BodyModel | 'auto'): string => t(('cust_body_' + v) as never)
const geo = (v: BodyModel | 'auto') => bodyGeometry(v === 'auto' ? 'male' : v)
function choose(v: BodyModel | 'auto') {
  if (v === 'auto') clearBodyModelChoice()
  else writeBodyModelChoice(v)
  current.value = v
}
</script>

<template>
  <div data-testid="bodymodel-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_bodymodel_hint') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(8.5rem, 100%), 1fr))">
      <div
        v-for="v in options"
        :key="v"
        class="flex flex-col items-center gap-2 rounded-xl border p-3 text-center"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'bodymodel-' + v"
        :data-active="current === v"
      >
        <svg viewBox="0 0 100 190" class="h-28 w-auto" role="img" :aria-label="label(v)" data-testid="bodymodel-preview">
          <circle cx="50" cy="14" r="9" fill="none" stroke="var(--text-dim)" stroke-width="1.6" />
          <path :d="geo(v).outline" fill="none" stroke="var(--text-dim)" stroke-width="1.6" stroke-linejoin="round" />
          <path v-for="(s, i) in geo(v).front" :key="i" :d="String(s.attrs.d)" fill="var(--accent)" fill-opacity="0.45" />
        </svg>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="bodymodel-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
  </div>
</template>
