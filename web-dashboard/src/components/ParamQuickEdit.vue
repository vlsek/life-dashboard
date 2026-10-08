<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { bodyValueInput, parseBodyValue } from '../lib/quickBodyValue'
import { unitSuffix } from '../lib/profile'

// Быстрый ввод значения параметра тела за сегодня прямо в строке профиля (BACKLOG 46.1). Enter/✓ — сохранить, Esc/✕ — отмена.
// Неверный ввод остаётся в поле с подсказкой; запись и ошибки сети — у родителя (`saving`, `error`).
const props = defineProps<{ initial: number | null; unit?: string | null; saving?: boolean; error?: string | null }>()
const emit = defineEmits<{ save: [value: number]; cancel: [] }>()

const raw = ref(bodyValueInput(props.initial))
const invalid = ref(false)
const input = ref<HTMLInputElement | null>(null)

onMounted(() => nextTick(() => { input.value?.focus(); input.value?.select() }))

function submit() {
  if (props.saving) return
  const n = parseBodyValue(raw.value)
  if (n === null) {
    invalid.value = true
    return
  }
  invalid.value = false
  emit('save', n)
}
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1" data-test="param-quick-edit">
    <input
      ref="input"
      v-model="raw"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      class="w-20 px-2 py-0.5 text-sm"
      :class="{ invalid }"
      :aria-invalid="invalid"
      :aria-label="t('dash_param_quick_label')"
      data-test="param-quick-input"
      @input="invalid = false"
      @keydown.enter.prevent="submit"
      @keydown.esc.prevent="emit('cancel')"
    />
    <span v-if="unitSuffix(unit)" class="dim text-xs">{{ unitSuffix(unit).trim() }}</span>
    <button type="button" class="px-2 py-0.5 text-xs" :disabled="saving" :title="t('save')" data-test="param-quick-save" @click="submit">✓</button>
    <button type="button" class="secondary px-2 py-0.5 text-xs" :title="t('cancel')" data-test="param-quick-cancel" @click="emit('cancel')">✕</button>
    <span v-if="invalid" class="w-full text-xs" style="color: var(--danger)" data-test="param-quick-invalid">{{ t('dash_param_quick_invalid') }}</span>
    <span v-else-if="error" class="w-full text-xs" style="color: var(--danger)" data-test="param-quick-error">{{ error }}</span>
  </span>
</template>
