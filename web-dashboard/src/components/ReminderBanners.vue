<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { MilestoneReminderCounts } from '../lib/reminders'

defineProps<{
  milestonesReminder: MilestoneReminderCounts | null
  weekendReminderVisible: boolean
  weekTotalPct: number
}>()
const emit = defineEmits<{ dismissMilestones: []; dismissWeekend: [] }>()
</script>

<template>
  <div
    v-if="milestonesReminder"
    class="mb-3 flex items-center gap-2.5 rounded-lg border p-2.5"
    :style="{ borderLeftColor: milestonesReminder.overdue ? '#d6336c' : '#e0a93b', borderLeftWidth: '3px', borderColor: 'var(--border)', background: 'var(--bg-card)' }"
  >
    <div class="flex-1 text-sm">
      <strong class="inline-flex items-center gap-1"><Icon name="milestones" />{{ t('ms_reminder_title') }}</strong> ·
      <span v-if="milestonesReminder.overdue" style="color: #d6336c">{{ milestonesReminder.overdue }} {{ t('ms_reminder_overdue') }}</span>
      <span v-if="milestonesReminder.overdue && milestonesReminder.soon"> · </span>
      <span v-if="milestonesReminder.soon" style="color: #e0a93b">{{ milestonesReminder.soon }} {{ t('ms_reminder_soon') }}</span>
      <br />
      <a href="/milestones/" style="color: var(--accent); text-decoration: none; font-size: 0.9em">{{ t('ms_reminder_open') }} →</a>
    </div>
    <button type="button" class="secondary px-2" @click="emit('dismissMilestones')"><Icon name="x" /></button>
  </div>

  <div v-if="weekendReminderVisible" class="mb-3 flex items-center justify-between gap-3 rounded-lg border p-2.5" style="border-color: var(--accent); background: var(--bg-card)">
    <div class="text-sm">
      <strong><EmojiText :text="t('dash_week_reminder_title')" /></strong>
      <span class="dim" style="font-size: 0.9em"> · {{ t('dash_week_reminder_currently') }} {{ weekTotalPct }}%</span>
      <br />
      <a href="/goals/" style="color: var(--accent); text-decoration: none; font-size: 0.9em">{{ t('dash_week_reminder_link') }}</a>
    </div>
    <button type="button" class="secondary px-2" @click="emit('dismissWeekend')"><Icon name="x" /></button>
  </div>
</template>
