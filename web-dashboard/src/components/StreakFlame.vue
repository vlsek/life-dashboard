<script setup lang="ts">
// Иконка огонька стрика — два разных SVG (не один тусклый generic-icon), как в dashboard.js:
// STREAK_SOLID_ICON (lit, двухслойное пламя, окрашено через .fl-outer/.fl-inner + CSS-мерцание)
// и STREAK_OUTLINE_ICON (unlit, пунктирный контур). Разметка путей скопирована дословно.
//
// «Живое пламя» (BACKLOG 18): если передан days и серия ≥ 7 дней, вместо обычного огонька рисуется пламя заставки
// (splash/SplashFlameLive.vue: три языка + светлая сердцевина, те же keyframes tongue-*), а ступени 30 и 100 дней
// делают его ярче и добавляют искры (lib/streakFlameTier.ts, стили .streak-live в style.css). Без days — как раньше.
// Не засчитанный сегодня стрик остаётся тусклым пунктирным контуром на любой длине серии.
// prefers-reduced-motion и общий выключатель анимаций (html[data-motion="off"]) гасят анимацию — пламя остаётся статичным.
import { computed } from 'vue'
import { streakFlameTier } from '../lib/streakFlameTier'

const props = defineProps<{ lit: boolean; days?: number }>()
const tier = computed(() => (props.lit ? streakFlameTier(props.days) : 0))

const SPARKS = [
  { cx: 25, cy: 14, r: 1.6, dx: '-5px', d: '2.1s', o: '0s' },
  { cx: 41, cy: 16, r: 1.7, dx: '6px', d: '2.4s', o: '-1.2s' },
  { cx: 34, cy: 10, r: 1.4, dx: '3px', d: '1.7s', o: '-0.6s' },
  { cx: 30, cy: 12, r: 1.2, dx: '-2px', d: '1.9s', o: '-1.7s' },
]
const sparks = computed(() => SPARKS.slice(0, tier.value >= 3 ? 4 : tier.value >= 2 ? 2 : 0))
</script>

<template>
  <svg
    v-if="lit && tier > 0"
    class="streak-live"
    :data-tier="tier"
    viewBox="0 0 64 64"
    width="22"
    height="22"
    aria-hidden="true"
    data-test="streak-flame-live"
  >
    <path class="tongue tongue-l" d="M17 22C20 31 11 36 11 44C11 52 18 57 25 57C18 52 22 44 24 38C21 33 18 29 17 22Z" />
    <path class="tongue tongue-r" d="M47 22C44 31 53 36 53 44C53 52 46 57 39 57C46 52 42 44 40 38C43 33 46 29 47 22Z" />
    <path class="tongue tongue-c" d="M32 3C34 13 46 21 46 37C46 49 40 58 32 58C24 58 18 49 18 37C18 29 24 25 26 17C28 21 30 21 31 15C31.5 10 31.8 7 32 3Z" />
    <path class="tongue tongue-core" d="M32 30C33 36 40 40 40 47C40 53 36 58 32 58C28 58 24 53 24 47C24 40 31 36 32 30Z" />
    <circle
      v-for="(sp, i) in sparks"
      :key="i"
      class="spark"
      :cx="sp.cx"
      :cy="sp.cy"
      :r="sp.r"
      :style="{ '--dx': sp.dx, '--d': sp.d, '--o': sp.o }"
      data-test="streak-spark"
    />
  </svg>
  <svg
    v-else-if="lit"
    class="streak-flame"
    viewBox="0 0 32 32"
    width="18"
    height="18"
    aria-hidden="true"
  >
    <g transform="translate(16 16) scale(1.04) translate(-16 -16) translate(3.3 0.7)">
      <path
        class="fl-outer"
        d="M16.5 0.5c1.2 5.3-3.2 6.8-3.5 11a3.2 3.2 0 0 0 6.4 0.2c2.1 1.1 3.1 4.3 3.1 7.5a9.5 10.5 0 1 1-19.5 0.3c-0.1-6.4 4.2-9.7 6.3-14 1.1-2.2 2.1-3.5 7.2-5z"
      />
      <path
        class="fl-inner"
        d="M16.3 11.2c.6 3.2-1.6 3.8-1.6 6a1.6 1.6 0 0 0 3.2 0c1.1 3.2-.5 7-3.7 7a5.3 5.3 0 0 1-5.3-5.4c0-3.7 3.2-5.3 5.3-9 .4-.7.9-1.3 2.1-2.6z"
      />
    </g>
  </svg>
  <svg
    v-else
    viewBox="0 0 32 32"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-dasharray="2.6 2.2"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      d="M16 2c1 5-3 6-3 10a3 3 0 0 0 6 0c2 1 3 4 3 7a9 9 0 1 1-18 0c0-6 4-9 6-13 1-2 2-3 6-4z"
    />
  </svg>
</template>
