<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { drawSummaryCard, summaryCardModel } from '../lib/summaryCard'
import { prSetText } from '../lib/records'
import { t, type DictKey } from '../lib/i18n'
import type { WorkoutSummaryData } from '../lib/summary'
import type { Exercise } from '../lib/types'

// «Поделиться картинкой» в итогах тренировки (BACKLOG 69.10): превью PNG → «Скачать» / «Отправить» (Web Share, если есть).
const props = defineProps<{ data: WorkoutSummaryData; exercises: Exercise[]; unit: string; date: string }>()
const url = ref<string | null>(null)
const blob = ref<Blob | null>(null)
const canShare = computed(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')
const cssVar = (n: string, fb: string) => {
  try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb } catch { return fb }
}
const labels = () => {
  const byId = new Map(props.exercises.map((e) => [e.id, e]))
  return {
    title: t('sm_title'), time: t('sm_time'), min: t('sm_min'), sets: t('sm_sets'), volume: t('sm_volume'), exercises: t('sm_exercises'), records: t('sm_records'),
    moreRecords: (n: number) => t('sm_share_more').replace('{n}', String(n)),
    recordLine: (r: WorkoutSummaryData['records'][number]) => {
      const ex = byId.get(r.exerciseId)
      return (ex?.name ?? '') + ' — ' + t(('aw_pr_' + r.kind) as DictKey) + ': ' + prSetText({ reps: r.reps, weight: r.weight, duration: r.duration, time: null, side: null }, ex?.unit || props.unit)
    },
    muscle: (m: string) => t(('workouts_muscle_' + m) as DictKey),
  }
}
function revoke() { if (url.value) URL.revokeObjectURL(url.value); url.value = null; blob.value = null }
function build() {
  const l = labels()
  const canvas = document.createElement('canvas')
  drawSummaryCard(canvas, summaryCardModel(props.data, props.unit, props.date, l), l, { bg: cssVar('--bg', '#121212'), text: cssVar('--text', '#ffffff'), dim: cssVar('--text-dim', '#9aa0a6'), accent: cssVar('--accent', '#5b8def') })
  canvas.toBlob((b) => {
    if (!b) return
    revoke()
    blob.value = b
    url.value = URL.createObjectURL(b)
  }, 'image/png')
}
async function share() {
  if (!blob.value) return
  try { await navigator.share({ files: [new File([blob.value], 'workout.png', { type: 'image/png' })], title: t('sm_title') }) } catch { /* окно «Поделиться» закрыто — не ошибка */ }
}
onBeforeUnmount(revoke)
</script>

<template>
  <div class="mb-4" data-testid="sm-share">
    <button v-if="!url" type="button" class="text-sm underline" style="color: var(--accent); min-height: 36px" data-testid="sm-share-open" @click="build">{{ t('sm_share_btn') }}</button>
    <div v-else class="rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="sm-share-preview">
      <img :src="url" :alt="t('sm_title')" class="mx-auto block max-h-80 w-auto rounded" />
      <p class="m-0 mt-2 text-xs" style="color: var(--text-dim)">{{ t('sm_share_note') }}</p>
      <div class="mt-2 flex flex-wrap gap-2 text-sm">
        <a :href="url" download="workout.png" class="rounded-lg border px-3 py-1.5 no-underline" style="border-color: var(--border); color: var(--accent)" data-testid="sm-share-download">{{ t('workouts_share_download') }}</a>
        <button v-if="canShare" type="button" class="rounded-lg border px-3 py-1.5" style="border-color: var(--border); background: transparent; color: var(--accent)" data-testid="sm-share-send" @click="share">{{ t('workouts_share_send') }}</button>
        <button type="button" class="rounded-lg border px-3 py-1.5" style="border-color: var(--border); background: transparent; color: var(--text-dim)" data-testid="sm-share-close" @click="revoke">{{ t('workouts_share_close') }}</button>
      </div>
    </div>
  </div>
</template>
