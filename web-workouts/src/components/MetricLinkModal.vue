<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { LINKABLE_TYPES, type LinkedMetric } from '../lib/metricLink'
import type { Exercise } from '../lib/types'
import EmojiText from './EmojiText.vue'

// Связь упражнения с метриками дня (BACKLOG 19/30, миграция 054): подходы вводятся один раз — здесь, значение метрики на Дашборде заполняется
// само. Окно: связанные метрики (с «Отвязать»), список подходящих заведённых метрик, «Создать метрику».
const props = defineProps<{ exercise: Exercise; metrics: LinkedMetric[]; supported: boolean; busy?: boolean }>()
const emit = defineEmits<{ close: []; link: [LinkedMetric]; unlink: [LinkedMetric]; create: [] }>()

const linked = computed(() => props.metrics.filter((m) => m.source_exercise_id === props.exercise.id))
const candidates = computed(() => props.metrics.filter((m) => LINKABLE_TYPES.includes(m.type) && m.source_exercise_id !== props.exercise.id))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-test="metric-link-modal" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-2 text-lg font-bold">{{ t('workouts_ml_title').replace('{name}', exercise.name) }}</h3>
      <p class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('workouts_ml_intro') }}</p>

      <p v-if="!supported" class="rounded-lg border p-3 text-sm" style="border-color: var(--border)" data-test="ml-unsupported">{{ t('workouts_ml_unsupported') }}</p>

      <template v-else>
        <div v-if="linked.length" class="mb-3">
          <div class="mb-1.5 text-sm font-semibold">{{ t('workouts_ml_linked') }}</div>
          <div v-for="m in linked" :key="m.id" class="mb-1.5 flex items-center gap-2 rounded-lg border px-3 py-2" style="border-color: var(--border)" data-test="ml-linked">
            <EmojiText :text="(m.icon || '📌') + ' ' + m.name" class="flex-1" />
            <button type="button" class="rounded-lg border px-3 py-1 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" :disabled="busy" data-test="ml-unlink" @click="emit('unlink', m)">
              {{ t('workouts_ml_unlink') }}
            </button>
          </div>
        </div>

        <div class="mb-3">
          <div class="mb-1.5 text-sm font-semibold">{{ t('workouts_ml_pick') }}</div>
          <p v-if="!candidates.length" class="text-sm" style="color: var(--text-dim)" data-test="ml-none">{{ t('workouts_ml_none') }}</p>
          <div v-for="m in candidates" :key="m.id" class="mb-1.5 flex items-center gap-2 rounded-lg border px-3 py-2" style="border-color: var(--border)" data-test="ml-candidate">
            <EmojiText :text="(m.icon || '📌') + ' ' + m.name" class="flex-1" />
            <span v-if="m.source_exercise_id" class="text-xs" style="color: var(--text-dim)">{{ t('workouts_ml_taken') }}</span>
            <button
              type="button"
              class="rounded-lg border px-3 py-1 text-sm"
              style="border-color: var(--border); background: var(--bg); color: var(--text)"
              :disabled="busy || !!m.source_exercise_id"
              data-test="ml-link"
              @click="emit('link', m)"
            >
              <EmojiText :text="'🔗'" />
            </button>
          </div>
        </div>

        <button type="button" class="mb-2 w-full rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)" :disabled="busy" data-test="ml-create" @click="emit('create')">
          {{ t('workouts_ml_create').replace('{name}', exercise.name) }}
        </button>
        <p class="text-xs" style="color: var(--text-dim)">{{ t('workouts_ml_note') }}</p>
      </template>

      <div class="mt-3 flex justify-end">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">
          {{ t('cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>
