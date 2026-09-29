<script setup lang="ts">
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { DueReminder } from '../lib/planReminders'

// Плашка «пора по плану»: пункты плана на сегодня, у которых время наступило, а сами они не
// выполнены. Крестик закрывает конкретное напоминание до конца дня.
defineProps<{ items: DueReminder[] }>()
const emit = defineEmits<{ dismiss: [key: string] }>()
</script>

<template>
  <div v-if="items.length" class="mb-3 rounded-lg border p-2.5" data-test="plan-reminder" style="border-color: var(--border); border-left: 3px solid var(--accent); background: var(--bg-card)">
    <strong class="inline-flex items-center gap-1 text-sm"><Icon name="clock" />{{ t('plan_reminder_title') }}</strong>
    <ul class="m-0 mt-1 list-none p-0">
      <li v-for="it in items" :key="it.key" class="flex items-center gap-2 py-0.5 text-sm" data-test="plan-reminder-item">
        <span class="dim">{{ it.time }}</span>
        <span class="flex-1">{{ it.text }}</span>
        <button type="button" class="secondary px-2 py-0.5" data-test="plan-reminder-dismiss" :aria-label="t('dash_close_btn')" @click="emit('dismiss', it.key)"><Icon name="x" /></button>
      </li>
    </ul>
  </div>
</template>
