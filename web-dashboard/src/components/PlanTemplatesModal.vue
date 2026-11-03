<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { MAX_TEMPLATE_NAME, cleanTemplateName, type PlanTemplate } from '../lib/planTemplates'

// Окно шаблонов дня (BACKLOG 75.12): список с «Применить» и удалением (в два шага), ниже — сохранить план этого дня как шаблон.
// Окно ничего не пишет само: сохранение и удаление отдаёт родителю и показывает его ответ.
const props = defineProps<{ templates: PlanTemplate[]; savableCount: number; save: (name: string) => Promise<'ok' | 'duplicate' | 'limit' | 'other'>; remove: (id: string) => Promise<boolean> }>()
const emit = defineEmits<{ close: []; apply: [PlanTemplate] }>()

const name = ref('')
const problem = ref<'name' | 'duplicate' | 'limit' | 'other' | null>(null)
const busy = ref(false)
const confirmId = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)
onMounted(() => nextTick(() => root.value?.querySelector<HTMLElement>('button, input')?.focus()))

const PROBLEM_KEY = { name: 'pt_err_name', duplicate: 'pt_err_duplicate', limit: 'pt_err_limit', other: 'pt_err_other' } as const
const problemText = computed(() => (problem.value ? t(PROBLEM_KEY[problem.value]) : ''))

async function submit() {
  if (busy.value) return
  const clean = cleanTemplateName(name.value)
  if (!clean) {
    problem.value = 'name'
    return
  }
  busy.value = true
  const r = await props.save(clean)
  busy.value = false
  if (r === 'ok') {
    name.value = ''
    problem.value = null
  } else problem.value = r
}
async function doRemove(id: string) {
  if (busy.value) return
  busy.value = true
  const ok = await props.remove(id)
  busy.value = false
  confirmId.value = null
  if (!ok) problem.value = 'other'
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
    <div ref="root" class="modal" role="dialog" aria-modal="true" :aria-label="t('pt_title')" data-test="templates-modal">
      <h3>{{ t('pt_title') }}</h3>

      <p v-if="!templates.length" class="dim mt-2 text-sm" data-test="pt-empty">{{ t('pt_empty') }}</p>
      <ul v-else class="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-sm" data-test="pt-list">
        <li v-for="tpl in templates" :key="tpl.id" class="flex flex-wrap items-center gap-2" data-test="pt-row">
          <span class="min-w-0 flex-1 break-words"><strong>{{ tpl.name }}</strong> <span class="dim">· {{ tpl.items.length }} {{ t('pt_items') }}</span></span>
          <template v-if="confirmId !== tpl.id">
            <button type="button" class="secondary" data-test="pt-apply" @click="emit('apply', tpl)">{{ t('pt_apply') }}</button>
            <button type="button" class="secondary" :aria-label="t('pt_delete') + ': ' + tpl.name" data-test="pt-delete" @click="confirmId = tpl.id">✕</button>
          </template>
          <template v-else>
            <span class="w-full" role="alert" data-test="pt-confirm">{{ t('pt_delete_confirm') }}</span>
            <button type="button" class="secondary" :disabled="busy" data-test="pt-delete-yes" @click="doRemove(tpl.id)">{{ t('pt_delete_yes') }}</button>
            <button type="button" class="secondary" :disabled="busy" data-test="pt-delete-no" @click="confirmId = null">{{ t('cancel') }}</button>
          </template>
        </li>
      </ul>

      <label class="mt-3 block text-sm" for="pt-name">{{ t('pt_save_label') }}</label>
      <p v-if="savableCount === 0" class="dim mb-0 mt-1 text-xs" data-test="pt-no-items">{{ t('pt_no_items') }}</p>
      <div class="mt-1 flex gap-2">
        <input id="pt-name" v-model="name" type="text" class="min-w-0 flex-1" :maxlength="MAX_TEMPLATE_NAME" :placeholder="t('pt_name_ph')" :disabled="savableCount === 0" data-test="pt-name" @input="problem = null" @keydown.enter.prevent="submit" />
        <button type="button" class="secondary" :disabled="busy || savableCount === 0" data-test="pt-save" @click="submit">{{ t('save') }}</button>
      </div>
      <p v-if="problem" class="mb-0 mt-2 text-sm" style="color: var(--danger)" role="alert" data-test="pt-problem">{{ problemText }}</p>

      <div class="mt-3 flex justify-end">
        <button type="button" class="secondary" data-test="pt-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
