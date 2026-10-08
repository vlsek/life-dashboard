<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { DeadlineGoal } from '../lib/goalDeadlineReminder'

// Плашка «скоро просрочка цели» (BACKLOG 47.2): названия целей со сроком сегодня (до трёх, остальные — «и ещё N»), ссылка в «Цели»,
// закрытие на день и «Не напоминать» (включается обратно на странице «Цели»).
const props = defineProps<{ goals: DeadlineGoal[] }>()
const emit = defineEmits<{ dismiss: []; disable: [] }>()

const MAX_SHOWN = 3
const shown = computed(() => props.goals.slice(0, MAX_SHOWN))
const more = computed(() => Math.max(0, props.goals.length - MAX_SHOWN))
</script>

<template>
  <div
    class="mb-3 rounded-lg border p-2.5"
    data-test="deadline-reminder"
    :style="{ borderColor: 'var(--border)', borderLeftColor: '#e0a93b', borderLeftWidth: '3px', background: 'var(--bg-card)' }"
  >
    <div class="flex items-start gap-2.5">
      <div class="flex-1 text-sm">
        <strong class="flex items-center gap-1"><Icon name="alert" />{{ t('deadline_reminder_title') }}</strong>
        <ul class="m-0 mt-1 list-none p-0">
          <li v-for="g in shown" :key="g.id" data-test="deadline-reminder-goal">{{ g.name }}</li>
        </ul>
        <div v-if="more" class="dim" data-test="deadline-reminder-more">{{ t('deadline_reminder_more') }} {{ more }}</div>
        <div class="dim mt-1">{{ t('deadline_reminder_text') }}</div>
        <div class="mt-1.5 flex flex-wrap gap-3 text-xs">
          <a href="/goals/" style="color: var(--accent)" data-test="deadline-reminder-link">{{ t('deadline_reminder_open') }}</a>
          <button type="button" class="dim" style="background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline" data-test="deadline-reminder-disable" @click="emit('disable')">{{ t('deadline_reminder_off') }}</button>
        </div>
      </div>
      <button type="button" class="secondary px-2" data-test="deadline-reminder-dismiss" :aria-label="t('dash_close_btn')" @click="emit('dismiss')">
        <Icon name="x" />
      </button>
    </div>
  </div>
</template>
