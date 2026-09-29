<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import MetricIcon from './MetricIcon.vue'
import { t } from '../lib/i18n'
import { metricProgressLabel } from '../lib/evening'
import type { EveningItem } from '../lib/useEveningReminder'

// Вечерняя плашка (BACKLOG 5.2): по клику раскрываются подробности — список того, что осталось
// сделать сегодня. Закрытие запоминается на день (см. useEveningReminder.dismiss). Ссылка
// внутрь не нужна: карточка дня с этими же метриками лежит на этой же странице ниже.
defineProps<{ items: EveningItem[] }>()
const emit = defineEmits<{ dismiss: [] }>()

const expanded = ref(false)
</script>

<template>
  <div
    class="mb-3 rounded-lg border p-2.5"
    data-test="evening-reminder"
    :style="{ borderColor: 'var(--border)', borderLeftColor: '#d6336c', borderLeftWidth: '3px', background: 'var(--bg-card)' }"
  >
    <div class="flex items-center gap-2.5">
      <button
        type="button"
        class="flex-1 text-left text-sm"
        style="background: none; border: none; padding: 0; color: inherit; cursor: pointer"
        data-test="evening-reminder-toggle"
        :aria-expanded="expanded"
        :title="expanded ? t('evening_reminder_details_hide') : t('evening_reminder_details_show')"
        @click="expanded = !expanded"
      >
        <strong class="flex items-center gap-1"><Icon name="flame" />{{ t('evening_reminder_title') }}</strong>
        <span class="dim mt-0.5 block" data-test="evening-reminder-text">{{ t('evening_reminder_text') }}
          <span class="ml-1 inline-flex items-center" style="font-size: 0.85em">
            <Icon :name="expanded ? 'chevron_left' : 'chevron_right'" :extra-style="expanded ? 'transform: rotate(-90deg)' : 'transform: rotate(90deg)'" />
          </span>
        </span>
      </button>
      <button type="button" class="secondary px-2" data-test="evening-reminder-dismiss" :aria-label="t('dash_close_btn')" @click="emit('dismiss')">
        <Icon name="x" />
      </button>
    </div>

    <div v-if="expanded" class="mt-2 text-sm" data-test="evening-reminder-details">
      <div class="dim mb-1" style="font-size: 0.9em">{{ t('evening_reminder_left') }} {{ items.length }}</div>
      <ul class="m-0 list-none p-0">
        <li v-for="it in items" :key="it.metric.id" class="flex items-center gap-2 py-0.5" data-test="evening-reminder-item">
          <MetricIcon :icon="it.metric.icon" />
          <span class="flex-1">{{ it.metric.name }}</span>
          <span v-if="metricProgressLabel(it.metric, it.value)" class="dim" style="font-size: 0.9em">{{ metricProgressLabel(it.metric, it.value) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
