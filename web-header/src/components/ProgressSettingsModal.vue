<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { DayProgressSettings } from '../lib/progressSettings'

// Настройки прогресса дня/недели (копия ProgressSettingsModal.vue Дашборда на стилях gh-*). Те же настройки
// (localStorage `day_progress_settings`), что и на Дашборде.
const props = defineProps<{ initial: DayProgressSettings }>()
const emit = defineEmits<{ close: []; save: [DayProgressSettings] }>()

const enabled = ref(props.initial.enabled)
const includePlanned = ref(props.initial.includePlanned)
const includeMetrics = ref(props.initial.includeMetrics)
const dayPlace = ref(props.initial.dayPlace)
const weekPlace = ref(props.initial.weekPlace)
const weekShape = ref(props.initial.weekShape)

function onSave() {
  emit('save', { enabled: enabled.value, includePlanned: includePlanned.value, includeMetrics: includeMetrics.value, dayPlace: dayPlace.value, weekPlace: weekPlace.value, weekShape: weekShape.value })
}
</script>

<template>
  <div class="gh-backdrop" @click.self="emit('close')">
    <div class="gh-modal" data-test="settings-modal">
      <h3><EmojiText :text="t('dash_day_progress_settings_title')" /></h3>
      <label class="gh-check"><input v-model="enabled" type="checkbox" /> {{ t('dash_day_progress_show') }}</label>
      <label class="gh-check" style="margin-top: 10px"><input v-model="includePlanned" type="checkbox" /> {{ t('dash_day_progress_include_planned') }}</label>
      <label class="gh-check" style="margin-top: 10px"><input v-model="includeMetrics" type="checkbox" /> {{ t('dash_day_progress_include_metrics') }}</label>

      <label class="gh-field" style="margin-top: 14px">
        <span class="gh-dim" style="font-size: 12px">{{ t('dash_progress_day_place_label') }}</span>
        <select v-model="dayPlace" class="gh-input">
          <option value="avatar">{{ t('dash_place_avatar') }}</option>
          <option value="header">{{ t('dash_place_header') }}</option>
          <option value="off">{{ t('dash_place_off') }}</option>
        </select>
      </label>
      <label class="gh-field">
        <span class="gh-dim" style="font-size: 12px">{{ t('dash_progress_week_place_label') }}</span>
        <select v-model="weekPlace" class="gh-input">
          <option value="profile">{{ t('dash_place_profile') }}</option>
          <option value="header">{{ t('dash_place_header') }}</option>
          <option value="off">{{ t('dash_place_off') }}</option>
        </select>
      </label>

      <label class="gh-field">
        <span class="gh-dim" style="font-size: 12px">{{ t('hdr_week_shape_label') }}</span>
        <select v-model="weekShape" class="gh-input" data-test="week-shape">
          <option value="heptagon">{{ t('hdr_week_shape_heptagon') }}</option>
          <option value="classic">{{ t('hdr_week_shape_classic') }}</option>
        </select>
      </label>

      <div class="gh-actions">
        <button type="button" class="gh-btn" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" class="gh-btn gh-btn-primary" @click="onSave">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
