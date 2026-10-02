<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { DayProgressSettings } from '../lib/progressSettings'

const props = defineProps<{ initial: DayProgressSettings }>()
const emit = defineEmits<{ close: []; save: [DayProgressSettings] }>()

const enabled = ref(props.initial.enabled)
const includePlanned = ref(props.initial.includePlanned)
const includeMetrics = ref(props.initial.includeMetrics)
const dayPlace = ref(props.initial.dayPlace)
const weekPlace = ref(props.initial.weekPlace)

function onSave() {
  emit('save', {
    enabled: enabled.value,
    includePlanned: includePlanned.value,
    includeMetrics: includeMetrics.value,
    dayPlace: dayPlace.value,
    weekPlace: weekPlace.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold"><EmojiText :text="t('dash_day_progress_settings_title')" /></h3>

      <div class="flex flex-col gap-2.5 text-sm">
        <label class="flex items-center gap-2"><input v-model="enabled" type="checkbox" /> {{ t('dash_day_progress_show') }}</label>
        <label class="flex items-center gap-2"><input v-model="includePlanned" type="checkbox" /> {{ t('dash_day_progress_include_planned') }}</label>
        <label class="flex items-center gap-2"><input v-model="includeMetrics" type="checkbox" /> {{ t('dash_day_progress_include_metrics') }}</label>

        <label class="mt-2 flex flex-col gap-1">
          <span class="dim text-xs">{{ t('dash_progress_day_place_label') }}</span>
          <select v-model="dayPlace" class="modal-input">
            <option value="avatar">{{ t('dash_place_avatar') }}</option>
            <option value="header">{{ t('dash_place_header') }}</option>
            <option value="off">{{ t('dash_place_off') }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="dim text-xs">{{ t('dash_progress_week_place_label') }}</span>
          <select v-model="weekPlace" class="modal-input">
            <option value="profile">{{ t('dash_place_profile') }}</option>
            <option value="header">{{ t('dash_place_header') }}</option>
            <option value="off">{{ t('dash_place_off') }}</option>
          </select>
        </label>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">
          {{ t('cancel') }}
        </button>
        <button type="button" class="rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)" @click="onSave">
          {{ t('save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-input {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
}
</style>
