<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getLang, t } from '../lib/i18n'
import { buildWeeklyReview, dismissWeekly, isWeeklyDismissed, loadWeeklyNote, reviewWeekStart, saveWeeklyNote } from '../lib/weeklyReview'
import type { YearGridData } from '../lib/yearGrid'

// Недельный ритуал (BACKLOG 75.6): карточка в воскресенье и понедельник за закрывающуюся неделю — три факта и одно поле «что изменить».
// Скрытие и заметка хранятся на устройстве (SQL нет). Видимость отдаём наверх: в воскресенье старый баннер «недоделанная неделя» не дублируем.
const props = defineProps<{ data: YearGridData | null }>()
const emit = defineEmits<{ visible: [v: boolean] }>()

const weekStart = computed(() => (props.data ? reviewWeekStart(props.data.today) : null))
const dismissedTick = ref(0)
const review = computed(() => {
  void dismissedTick.value
  if (!props.data || !weekStart.value || isWeeklyDismissed(weekStart.value)) return null
  return buildWeeklyReview(props.data.metrics, props.data.byDay, weekStart.value, props.data.today)
})
watch(() => !!review.value, (v) => emit('visible', v), { immediate: true })

const note = ref('')
const saved = ref(false)
watch(weekStart, (w) => { note.value = w ? loadWeeklyNote(w) : ''; saved.value = !!note.value }, { immediate: true })
function save() {
  if (!weekStart.value) return
  saveWeeklyNote(weekStart.value, note.value)
  saved.value = note.value.trim() !== ''
}
function close() {
  if (weekStart.value) dismissWeekly(weekStart.value)
  dismissedTick.value++
}

const fmtDay = (iso: string) => new Intl.DateTimeFormat(getLang() === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00'))
const doneLine = computed(() => (review.value ? `${t('wr_done_prefix')} ${review.value.done} ${t('wr_of')} ${review.value.total} ${t('wr_marks')}` : ''))
const bestDayLine = computed(() => (review.value?.bestDay ? `${fmtDay(review.value.bestDay.date)} — ${review.value.bestDay.done} ${t('wr_of')} ${review.value.bestDay.total}` : ''))
const bestMetricLine = computed(() => {
  const m = review.value?.bestMetric
  return m ? `${m.name}: ${m.thisDone} ${t('wr_of')} ${m.thisTotal} ${t('wr_days')} (${t('wr_prev')} — ${m.prevDone} ${t('wr_of')} ${m.prevTotal})` : ''
})
</script>

<template>
  <section v-if="review" class="wr mb-3 rounded-lg border p-3 text-sm" data-test="weekly-ritual" :aria-label="t('wr_title')">
    <div class="wr-head">
      <strong>{{ t('wr_title') }}</strong>
      <button type="button" class="secondary px-2" :aria-label="t('wr_dismiss')" data-test="wr-dismiss" @click="close">×</button>
    </div>
    <ul class="wr-list">
      <li data-test="wr-done">{{ doneLine }}</li>
      <li v-if="bestDayLine" data-test="wr-best-day"><span class="dim">{{ t('wr_best_day') }}:</span> {{ bestDayLine }}</li>
      <li v-if="bestMetricLine" data-test="wr-best-metric"><span class="dim">{{ t('wr_best_metric') }}:</span> {{ bestMetricLine }}</li>
    </ul>
    <label class="wr-label" for="wr-note">{{ t('wr_note_label') }}</label>
    <div class="wr-note">
      <input id="wr-note" v-model="note" type="text" maxlength="280" :placeholder="t('wr_note_ph')" data-test="wr-note" @input="saved = false" @keydown.enter.prevent="save" />
      <button type="button" class="secondary" data-test="wr-save" @click="save">{{ t('wr_save') }}</button>
    </div>
    <span v-if="saved" class="dim wr-saved" role="status" data-test="wr-saved">{{ t('wr_saved') }}</span>
  </section>
</template>

<style scoped>
.wr { border-color: var(--accent); background: var(--bg-card); }
.wr-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.wr-list { list-style: none; margin: 6px 0; padding: 0; display: grid; gap: 2px; }
.wr-label { display: block; margin-top: 6px; }
.wr-note { display: flex; gap: 6px; margin-top: 4px; }
.wr-note input { flex: 1 1 auto; min-width: 0; }
.wr-saved { display: inline-block; margin-top: 4px; }
</style>
