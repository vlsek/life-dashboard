<script setup lang="ts">
import { ref } from 'vue'
import WaterSavedAnim from './WaterSavedAnim.vue'
import { DEFAULT_WATER_ANIM, WATER_ANIMS, getWaterAnimChoice, readCachedWaterItem, setWaterAnim, type WaterAnim } from '../lib/waterAnim'
import { THEME_WATER } from '../lib/themeWater'
import { t } from '../lib/i18n'

// Выбор анимации «выпитое записалось» (BACKLOG 54.8): «По теме» (по умолчанию: вариант большой темы, на обычных — волна) или один из шести
// бесплатных вариантов. Выбор лежит в localStorage (`water_saved_anim`) — тот же ключ, что у «Настроек» шапки, поэтому выбор общий и действует
// на всех страницах. После выбора анимация сразу проигрывается, чтобы увидеть, что получилось.
const current = ref<WaterAnim | 'auto'>(getWaterAnimChoice())
const tick = ref(0)
const itemOn = readCachedWaterItem() !== null // надета платная анимация из магазина — она главнее этого выбора
const options: (WaterAnim | 'auto')[] = ['auto', ...WATER_ANIMS]
const label = (v: WaterAnim | 'auto'): string => t(('cust_wateranim_' + v) as never)
const choose = (v: WaterAnim | 'auto') => {
  setWaterAnim(v)
  current.value = v
  tick.value++
}
// Примеры в плитках идут сами по кругу (BACKLOG 58.1, как у огоньков стрика) — кнопок «Показать» нет.
// что значит «По теме» сейчас: вариант большой темы из класса theme-<ключ> на <html>, иначе спокойная волна
const autoVariant = (): WaterAnim => {
  for (const c of Array.from(document.documentElement.classList)) {
    const m = /^theme-(\w+)$/.exec(c)
    const v = m ? THEME_WATER[m[1]] : undefined
    if (v) return v
  }
  return DEFAULT_WATER_ANIM
}
</script>

<template>
  <div data-testid="wateranim-picker">
    <p class="dim mb-2 text-xs">{{ t('cust_sec_wateranim_hint') }}</p>
    <p v-if="itemOn" class="mb-2 text-xs" style="color: var(--accent)" data-testid="wateranim-item-on">{{ t('cust_wateranim_item_on') }}</p>
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))">
      <div
        v-for="v in options"
        :key="v"
        class="flex flex-col gap-2 rounded-xl border p-3"
        :style="{ background: 'var(--bg-card)', borderColor: current === v ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'wateranim-' + v"
        :data-active="current === v"
      >
        <div class="flex justify-center" data-testid="wateranim-example">
          <WaterSavedAnim :tick="0" inline loop :demo="v === 'auto' ? autoVariant() : v" />
        </div>
        <p class="m-0 text-sm font-medium">{{ label(v) }}</p>
        <p class="dim m-0 text-xs">{{ t(('cust_wateranim_' + v + '_hint') as never) }}</p>
        <button
          type="button"
          class="secondary px-2 py-1 text-sm"
          :disabled="current === v"
          :aria-pressed="current === v"
          :aria-label="label(v) + ': ' + (current === v ? t('cust_splash_selected') : t('cust_splash_choose'))"
          data-testid="wateranim-choose"
          @click="choose(v)"
        >
          {{ current === v ? t('cust_splash_selected') : t('cust_splash_choose') }}
        </button>
      </div>
    </div>
    <WaterSavedAnim :tick="tick" />
  </div>
</template>
