<script setup lang="ts">
import { MOODS, NOTE_MAX, type Mood } from '../lib/dayReflection'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'

// «Как прошёл день» (BACKLOG 75.3): самочувствие 1–5 и короткая заметка. Пишется вместе с «Сохранить день».
const mood = defineModel<Mood | null>('mood', { required: true })
const note = defineModel<string>('note', { required: true })
function pick(m: Mood) {
  mood.value = mood.value === m ? null : m // повторное нажатие снимает оценку
}
</script>

<template>
  <section class="mt-4 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-test="day-reflection">
    <h3 class="m-0 text-sm font-semibold">{{ t('dash_reflect_title') }}</h3>
    <div class="mt-2 flex flex-wrap items-center gap-2" role="group" :aria-label="t('dash_reflect_mood_label')">
      <button
        v-for="m in MOODS"
        :key="m"
        type="button"
        class="reflect-mood rounded-lg border px-3 py-2 text-sm"
        :class="{ 'is-on': mood === m }"
        :aria-pressed="mood === m"
        :title="t(('dash_reflect_mood_' + m) as DictKey)"
        :aria-label="m + ' — ' + t(('dash_reflect_mood_' + m) as DictKey)"
        :data-mood="m"
        data-test="mood-btn"
        @click="pick(m)"
      >{{ m }}</button>
      <span v-if="mood" class="text-xs" style="color: var(--text-dim)" data-test="mood-caption">{{ t(('dash_reflect_mood_' + mood) as DictKey) }}</span>
    </div>
    <textarea v-model="note" class="mt-2 w-full rounded-lg border p-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" rows="2" :maxlength="NOTE_MAX" :placeholder="t('dash_reflect_note_ph')" :aria-label="t('dash_reflect_note_ph')" data-test="day-note"></textarea>
  </section>
</template>

<style scoped>
.reflect-mood { min-width: 2.5rem; background: transparent; color: var(--text-dim); border-color: var(--border); }
.reflect-mood.is-on { border-color: var(--accent); color: var(--accent); font-weight: 600; }
</style>
