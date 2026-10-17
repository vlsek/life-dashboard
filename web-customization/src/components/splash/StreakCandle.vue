<script setup lang="ts">
// Вид огонька серии «Свеча» (BACKLOG 44.18в, срез 2): свеча с оплывшим воском и живым язычком пламени; ступень серии (data-tier 1/2/3 = 7+/30+/100+ дней)
// увеличивает ореол и ускоряет мерцание, со ступени 2 появляются искры. Чистый SVG + CSS (style.css, .sf-candle); размер задаёт родитель (width/height).
// КОПИЯ лежит в web-dashboard и web-customization (менять ВМЕСТЕ — страж streakFlamePicker.test.ts).
</script>

<template>
  <svg class="sf-candle" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="candle-glow" cx="32" cy="20" r="18" />
    <rect class="candle-body" x="23" y="31" width="18" height="27" rx="3" />
    <path class="candle-drip" d="M23 36Q27 38 27 44Q27 47 24 47Q23 47 23 44Z" />
    <line class="candle-wick" x1="32" y1="31" x2="32" y2="26" />
    <g class="candle-flame">
      <path class="candle-flame-out" d="M32 5C36 11 40 15 40 20C40 25 36 28 32 28C28 28 24 25 24 20C24 15 28 11 32 5Z" />
      <path class="candle-flame-in" d="M32 14C34 17 36 19 36 22C36 25 34 27 32 27C30 27 28 25 28 22C28 19 30 17 32 14Z" />
    </g>
    <circle class="spark" cx="25" cy="10" r="1.4" style="--dx: -4px; --d: 2.1s; --o: 0s" />
    <circle class="spark" cx="40" cy="12" r="1.5" style="--dx: 5px; --d: 2.4s; --o: -1.2s" />
    <circle class="spark spark-b" cx="32" cy="4" r="1.2" style="--dx: 2px; --d: 1.7s; --o: -0.7s" />
  </svg>
</template>
