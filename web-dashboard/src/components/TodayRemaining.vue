<script setup lang="ts">
import MetricIcon from './MetricIcon.vue'
import { t } from '../lib/i18n'
import type { RemainingRow } from '../lib/todayRemaining'

// «Осталось на сегодня» (BACKLOG 75.2): компактный список над плашками метрик. Булева метрика и свой пункт плана закрываются одним касанием
// прямо отсюда (то же действие, что чекбокс), числовая показывает прогресс и «ведёт» к своей плашке, где вводится значение.
defineProps<{ rows: RemainingRow[] }>()
const emit = defineEmits<{ done: [id: string]; jump: [id: string] }>()
const fmt = (n: number | null) => (n == null ? '0' : String(Math.round(n * 100) / 100))
// Строкой, а не через <template>: Vue схлопывает пробел перед единицей («8ст.»)
const progressText = (r: RemainingRow) => `${fmt(r.value)} / ${fmt(r.goal)}${r.unit ? ' ' + r.unit : ''}`
</script>

<template>
  <div class="today-left" data-test="today-left" role="group" :aria-label="t('dash_today_left')">
    <div class="today-left-head">
      <span>{{ t('dash_today_left') }}</span>
      <span class="today-left-count dim" data-test="today-left-count">{{ rows.length }}</span>
    </div>
    <ul class="today-left-list">
      <li v-for="r in rows" :key="r.id" class="today-left-row" data-test="today-left-row">
        <button
          v-if="r.oneTap"
          type="button"
          class="today-left-check"
          :aria-label="t('dash_today_mark') + ' ' + r.name"
          data-test="today-left-check"
          @click="emit('done', r.id)"
        ></button>
        <span class="today-left-name"><MetricIcon v-if="r.kind !== 'plan'" :icon="r.icon" /> {{ r.name }}</span>
        <span v-if="r.kind === 'plan' && r.time" class="today-left-time dim" data-test="today-left-time">{{ r.time }}</span>
        <template v-if="!r.oneTap">
          <span v-if="r.goal != null" class="today-left-prog dim" data-test="today-left-prog">{{ progressText(r) }}</span>
          <button type="button" class="today-left-go" data-test="today-left-go" @click="emit('jump', r.id)">{{ t('dash_today_go') }}</button>
        </template>
        <span v-if="r.progress != null" class="today-left-bar" aria-hidden="true"><i :style="{ width: Math.round(r.progress * 100) + '%' }"></i></span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.today-left { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.today-left-head { display: flex; justify-content: space-between; align-items: baseline; font-weight: 600; margin-bottom: 6px; }
.today-left-list { list-style: none; margin: 0; padding: 0; }
.today-left-row { position: relative; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 2px 0 6px; flex-wrap: wrap; }
.today-left-name { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.today-left-check { flex: none; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--accent); background: transparent; cursor: pointer; padding: 0; }
.today-left-check:hover, .today-left-check:focus-visible { background: color-mix(in srgb, var(--accent) 25%, transparent); }
.today-left-time { flex: none; font-variant-numeric: tabular-nums; }
.today-left-go { flex: none; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: inherit; cursor: pointer; padding: 2px 10px; }
.today-left-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 2px; background: var(--border); overflow: hidden; }
.today-left-bar i { display: block; height: 100%; background: var(--accent); }
</style>
