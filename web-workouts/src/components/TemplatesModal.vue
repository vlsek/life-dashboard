<script setup lang="ts">
import { ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { workoutTemplates } from '../lib/templates'
import type { WorkoutTemplate } from '../lib/types'

// Порт openTemplatesModal() из workouts.js: список типовых программ → предпросмотр
// (по дням) → "Добавить в мои упражнения". Само добавление делает родитель (save).
const emit = defineEmits<{ close: []; apply: [WorkoutTemplate] }>()

const templates = workoutTemplates(getLang())
const selected = ref<WorkoutTemplate | null>(null)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-1 text-lg font-bold">{{ t('workouts_templates_title') }}</h3>
      <p class="mb-3 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_templates_hint') }}</p>

      <div v-if="!selected">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          class="mb-2.5 cursor-pointer rounded-xl border p-3"
          style="border-color: var(--border); background: var(--bg)"
          @click="selected = tpl"
        >
          <strong>{{ tpl.title }}</strong> <span class="text-[0.85em]" style="color: var(--text-dim)">— {{ tpl.goalTag }}</span>
          <div class="mt-1 text-[0.8em]" style="color: var(--text-dim)">{{ tpl.meta }}</div>
        </div>
      </div>

      <div v-else>
        <button
          type="button"
          class="mb-2.5 rounded-lg border px-3 py-1.5 text-sm"
          style="border-color: var(--border); background: var(--bg); color: var(--text)"
          @click="selected = null"
        >
          ← {{ t('workouts_templates_title') }}
        </button>
        <div v-for="day in selected.days" :key="day.label">
          <div class="mb-1 mt-2.5 font-bold">{{ day.label }}</div>
          <ul class="mb-1.5 pl-5">
            <li v-for="ex in day.exercises" :key="ex.name" class="text-[0.9em]" style="color: var(--text-dim)">
              {{ ex.name }} — {{ ex.scheme }}
            </li>
          </ul>
        </div>
        <div v-if="selected.weeks?.length" class="mt-3 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="template-weeks">
          <div class="mb-1 font-bold">{{ t('workouts_templates_weeks_title') }}</div>
          <p class="mb-2 text-[0.8em]" style="color: var(--text-dim)">{{ t('workouts_templates_weeks_hint') }}</p>
          <ul class="m-0 list-none p-0">
            <li v-for="w in selected.weeks" :key="w.label" class="flex justify-between gap-3 border-t py-1 text-[0.9em]" style="border-color: var(--border)">
              <span style="color: var(--text-dim)">{{ w.label }}</span>
              <span class="font-medium">{{ w.scheme }}</span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          class="mt-2.5 rounded-lg px-4 py-2 text-sm"
          style="background: var(--accent); color: var(--accent-text)"
          @click="emit('apply', selected)"
        >
          {{ t('workouts_templates_apply_btn') }}
        </button>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm"
          style="border-color: var(--border); background: var(--bg); color: var(--text)"
          @click="emit('close')"
        >
          {{ t('dash_close_btn') }}
        </button>
      </div>
    </div>
  </div>
</template>
