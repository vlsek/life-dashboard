<script setup lang="ts">
import { computed, ref } from 'vue'
import { drawShareCard, shareData } from '../lib/shareCard'
import { t, type DictKey } from '../lib/i18n'
import type { MuscleId } from '../lib/muscles'
import type { Exercise, WorkoutEntry } from '../lib/types'

// «Поделиться картинкой» (BACKLOG 80.10): превью PNG с подходами по группам за период; без имени и аватара. Сначала превью, потом «Скачать» / «Поделиться».
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today: string; since: string; days: number }>()
const data = computed(() => shareData(props.entries, props.exercises, props.today, props.since, props.days))
const url = ref<string | null>(null)
const blob = ref<Blob | null>(null)
const canShare = computed(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')
const cssVar = (n: string, fb: string) => {
  try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb } catch { return fb }
}

function build() {
  const d = data.value
  const canvas = document.createElement('canvas')
  drawShareCard(canvas, d, {
    title: t('workouts_share_title'),
    period: t('workouts_share_period').replace('{n}', String(d.days)),
    total: t('workouts_share_total'),
    daysLine: t('workouts_share_days').replace('{n}', String(d.workoutDays)),
    empty: t('workouts_share_empty'),
    muscle: (m: MuscleId) => t(('workouts_muscle_' + m) as DictKey),
  }, { bg: cssVar('--bg', '#121212'), text: cssVar('--text', '#ffffff'), dim: cssVar('--text-dim', '#9aa0a6'), accent: cssVar('--accent', '#5b8def') })
  canvas.toBlob((b) => {
    if (!b) return
    blob.value = b
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = URL.createObjectURL(b)
  }, 'image/png')
}
function close() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = null
  blob.value = null
}
async function share() {
  if (!blob.value) return
  const file = new File([blob.value], 'workouts-week.png', { type: 'image/png' })
  try {
    await navigator.share({ files: [file], title: t('workouts_share_title') })
  } catch {
    /* пользователь закрыл окно «Поделиться» — это не ошибка */
  }
}
</script>

<template>
  <div class="mt-3" data-testid="share-map">
    <button v-if="!url" type="button" class="rounded-lg border px-3 py-1.5 text-[0.85em]" style="border-color: var(--border); background: transparent; color: var(--accent)" data-testid="share-open" @click="build">{{ t('workouts_share_btn') }}</button>
    <div v-else class="rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="share-preview">
      <img :src="url" :alt="t('workouts_share_title')" class="mx-auto block max-h-96 w-auto rounded" />
      <p class="m-0 mt-2 text-[0.75em]" style="color: var(--text-dim)">{{ t('workouts_share_note') }}</p>
      <div class="mt-2 flex flex-wrap gap-2 text-[0.85em]">
        <a :href="url" download="workouts-week.png" class="rounded-lg border px-3 py-1.5 no-underline" style="border-color: var(--border); color: var(--accent)" data-testid="share-download">{{ t('workouts_share_download') }}</a>
        <button v-if="canShare" type="button" class="rounded-lg border px-3 py-1.5" style="border-color: var(--border); background: transparent; color: var(--accent)" data-testid="share-send" @click="share">{{ t('workouts_share_send') }}</button>
        <button type="button" class="rounded-lg border px-3 py-1.5" style="border-color: var(--border); background: transparent; color: var(--text-dim)" data-testid="share-close" @click="close">{{ t('workouts_share_close') }}</button>
      </div>
    </div>
  </div>
</template>
