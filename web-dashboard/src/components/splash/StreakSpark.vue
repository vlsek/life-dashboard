<script setup lang="ts">
// Вид огонька серии «Искра» (BACKLOG 44.18в, срез 3): сверкающая четырёхлучевая звезда с пульсирующим сердцем — две звезды вращаются навстречу друг другу;
// ступень серии (data-tier 1/2/3 = 7+/30+/100+ дней) делает свечение ярче и вращение быстрее, со ступени 2 вылетают искорки. Чистый SVG + CSS
// (style.css, .sf-star); размер задаёт родитель (width/height).
// КОПИЯ лежит в web-dashboard и web-customization (менять ВМЕСТЕ — страж streakFlameMoreVariants.test.ts).
</script>

<template>
  <svg class="sf-star" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="star-halo" cx="32" cy="32" r="22" />
    <path class="star-rays" d="M32 4C33.6 22 42 30.4 60 32C42 33.6 33.6 42 32 60C30.4 42 22 33.6 4 32C22 30.4 30.4 22 32 4Z" />
    <g transform="rotate(45 32 32)">
      <path class="star-rays star-rays-b" d="M32 14C32.9 25 39 31.1 50 32C39 32.9 32.9 39 32 50C31.1 39 25 32.9 14 32C25 31.1 31.1 25 32 14Z" />
    </g>
    <circle class="star-core" cx="32" cy="32" r="5" />
    <circle class="spark" cx="20" cy="14" r="1.5" style="--dx: -4px; --d: 2.2s; --o: 0s" />
    <circle class="spark" cx="46" cy="16" r="1.5" style="--dx: 5px; --d: 2.5s; --o: -1.1s" />
    <circle class="spark spark-b" cx="32" cy="6" r="1.2" style="--dx: 2px; --d: 1.8s; --o: -0.6s" />
  </svg>
</template>
