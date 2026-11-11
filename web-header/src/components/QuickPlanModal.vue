<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { MAX_PLAN_TEXT, addPlanItemToday, type PlanAddResult } from '../lib/planQuickAdd'

// Окно «Пункт в план на сегодня» (BACKLOG 79.6, срез 1). Ничего лишнего: текст, необязательное время, «Добавить». Esc и фон закрывают.
// При ошибке (в том числе «нет сети») окно остаётся открытым, введённый текст сохраняется — можно повторить.
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ close: [] }>()

const text = ref('')
const time = ref('')
const busy = ref(false)
const done = ref<'added' | 'duplicate' | null>(null)
const problem = ref<'text' | 'time' | 'offline' | 'other' | null>(null)
const input = ref<HTMLInputElement | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null
onMounted(() => nextTick(() => input.value?.focus()))
onBeforeUnmount(() => { if (closeTimer) clearTimeout(closeTimer) })

const PROBLEM_KEY = { text: 'qp_err_text', time: 'qp_err_time', offline: 'qp_err_offline', other: 'qp_err_other' } as const

async function submit() {
  if (busy.value || done.value) return
  busy.value = true
  problem.value = null
  const r: PlanAddResult = await addPlanItemToday(props.userId, text.value, time.value)
  busy.value = false
  if (r.ok) {
    done.value = r.duplicate ? 'duplicate' : 'added'
    closeTimer = setTimeout(() => emit('close'), 900)
  } else problem.value = r.reason
}
</script>

<template>
  <div class="gh-backdrop" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
    <div class="gh-modal" role="dialog" aria-modal="true" :aria-label="t('qp_title')" data-test="quick-plan-modal">
      <h3>{{ t('qp_title') }}</h3>
      <div v-if="done" role="status" data-test="qp-done">{{ done === 'duplicate' ? t('qp_dup') : t('qp_added') }}</div>
      <template v-else>
        <input ref="input" v-model="text" type="text" :maxlength="MAX_PLAN_TEXT" :placeholder="t('qp_text_ph')" :aria-label="t('qp_text_ph')" style="width: 100%; box-sizing: border-box" data-test="qp-text" @keydown.enter.prevent="submit" />
        <label class="gh-dim" style="display: block; margin-top: 8px; font-size: 12px" for="qp-time">{{ t('qp_time') }}</label>
        <input id="qp-time" v-model="time" type="time" data-test="qp-time" @keydown.enter.prevent="submit" />
        <p v-if="problem" role="alert" style="margin: 8px 0 0; color: var(--danger, #e66)" data-test="qp-problem">{{ t(PROBLEM_KEY[problem]) }}</p>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px">
          <button type="button" data-test="qp-cancel" @click="emit('close')">{{ t('cancel') }}</button>
          <button type="button" :disabled="busy" data-test="qp-add" @click="submit">{{ t('qp_add') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>
