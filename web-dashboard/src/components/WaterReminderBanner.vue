<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'

// Мягкая плашка «пора выпить воды» (BACKLOG 18.5). Показывается только при открытии страницы, не чаще раза в 3 часа
// (логика — lib/waterReminder.ts), закрывается крестиком. Цвет — синий воды (--water-line), не акцент темы.
const props = defineProps<{ ml: number; goal: number }>()
const emit = defineEmits<{ dismiss: [] }>()
const left = computed(() => Math.max(0, Math.round(props.goal - props.ml)))
const text = computed(() =>
  t('water_reminder_text')
    .replace('{ml}', String(Math.round(props.ml)))
    .replace('{goal}', String(Math.round(props.goal)))
    .replace('{left}', String(left.value)),
)
</script>

<template>
  <div
    class="mb-3 rounded-lg border p-2.5"
    data-test="water-reminder"
    :style="{ borderColor: 'var(--border)', borderLeftColor: 'var(--water-line, #1359b0)', borderLeftWidth: '3px', background: 'var(--bg-card)' }"
  >
    <div class="flex items-center gap-2.5">
      <div class="flex-1 text-sm">
        <strong class="flex items-center gap-1"><Icon name="droplet" />{{ t('water_reminder_title') }}</strong>
        <span class="dim mt-0.5 block" data-test="water-reminder-text">{{ text }}</span>
      </div>
      <button type="button" class="secondary px-2" data-test="water-reminder-dismiss" :aria-label="t('dash_close_btn')" @click="emit('dismiss')">
        <Icon name="x" />
      </button>
    </div>
  </div>
</template>
