<script setup lang="ts">
// Вид огонька серии «Факел» (BACKLOG 44.18в, срез 3): факел с деревянной рукоятью, обмотанной лентой, и широким пламенем; ступень серии
// (data-tier 1/2/3 = 7+/30+/100+ дней) увеличивает ореол и ускоряет мерцание, со ступени 2 появляются искры. Чистый SVG + CSS (style.css, .sf-torch);
// размер задаёт родитель (width/height).
// КОПИЯ лежит в web-dashboard и web-customization (менять ВМЕСТЕ — страж streakFlameMoreVariants.test.ts).
</script>

<template>
  <svg class="sf-torch" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="torch-glow" cx="32" cy="20" r="19" />
    <path class="torch-handle" d="M28 34H36L34.5 59Q34.3 60.5 32.8 60.5H31.2Q29.7 60.5 29.5 59Z" />
    <rect class="torch-band" x="25" y="31" width="14" height="6" rx="2" />
    <g class="torch-flame">
      <path class="torch-flame-out" d="M32 4C37 11 43 15 43 22C43 28 38.5 32 32 32C25.5 32 21 28 21 22C21 15 27 11 32 4Z" />
      <path class="torch-flame-in" d="M32 15C35 19 37.5 21 37.5 25C37.5 28.5 35 31 32 31C29 31 26.5 28.5 26.5 25C26.5 21 29 19 32 15Z" />
    </g>
    <circle class="spark" cx="24" cy="12" r="1.5" style="--dx: -4px; --d: 2.2s; --o: 0s" />
    <circle class="spark" cx="41" cy="13" r="1.5" style="--dx: 5px; --d: 2.5s; --o: -1.2s" />
    <circle class="spark spark-b" cx="32" cy="5" r="1.2" style="--dx: 2px; --d: 1.8s; --o: -0.7s" />
  </svg>
</template>
