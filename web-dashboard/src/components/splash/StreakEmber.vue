<script setup lang="ts">
// Вид огонька серии «Уголёк» (BACKLOG 44.18в, срез 2): тлеющий уголь с трещинками и светящимся сердцем; ступень серии (data-tier 1/2/3 = 7+/30+/100+ дней)
// делает свечение ярче и пульс быстрее, со ступени 2 вылетают искры. Чистый SVG + CSS (style.css, .sf-ember); размер задаёт родитель (width/height).
// КОПИЯ лежит в web-dashboard и web-customization (менять ВМЕСТЕ — страж streakFlamePicker.test.ts).
</script>

<template>
  <svg class="sf-ember" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="ember-halo" cx="32" cy="36" r="24" />
    <path class="ember-rock" d="M32 14C46 16 54 28 52 40C50 52 40 58 30 57C18 56 10 46 12 34C14 22 22 13 32 14Z" />
    <path class="ember-crack" d="M21 29L30 36L26 47M39 25L36 36L45 43" />
    <circle class="ember-core" cx="32" cy="38" r="7" />
    <circle class="spark" cx="26" cy="16" r="1.5" style="--dx: -4px; --d: 2.2s; --o: 0s" />
    <circle class="spark" cx="39" cy="14" r="1.6" style="--dx: 5px; --d: 2.5s; --o: -1.1s" />
    <circle class="spark spark-b" cx="32" cy="10" r="1.3" style="--dx: 2px; --d: 1.8s; --o: -0.6s" />
  </svg>
</template>
