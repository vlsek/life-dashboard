<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { reactive } from 'vue'
import PeriodPicker from './PeriodPicker.vue'
import { t } from '../lib/i18n'
import { clearOwnPeriod, loadOwnPeriod, saveOwnPeriod } from '../lib/chartPeriods'
import type { PeriodState } from '../lib/chart'

// Портировано из openChartPeriodModal() в dashboard.js: свой период для одного графика.
const props = defineProps<{ seriesKey: string; shared: PeriodState }>()
const emit = defineEmits<{ close: []; applied: [] }>()

const own = loadOwnPeriod(props.seriesKey)
const local = reactive<PeriodState>(own ? { ...own } : { ...props.shared })

function save() {
  saveOwnPeriod(props.seriesKey, local)
  emit('applied')
}
function reset() {
  clearOwnPeriod(props.seriesKey)
  emit('applied')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3><EmojiText :text="t('dash_chart_period_modal_title')" /></h3>
      <div class="mt-2"><PeriodPicker :state="local" @change="Object.assign(local, $event)" /></div>
      <p class="dim mt-3 text-xs">{{ own ? t('dash_chart_period_is_custom_hint') : t('dash_chart_period_uses_shared_hint') }}</p>
      <div class="modal-actions">
        <button v-if="own" type="button" class="secondary" data-test="reset" @click="reset">{{ t('dash_chart_period_reset_btn') }}</button>
        <button type="button" data-test="save" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
