<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import type { Milestone } from '../lib/types'

const props = defineProps<{ milestone: Milestone }>()
const emit = defineEmits<{ submit: [{ date: string; km: number | null; note: string | null }]; close: [] }>()

const today = todayStr()
const date = ref(today)
const km = ref(0)
const note = ref('')

const dateInput = ref<HTMLInputElement | null>(null)
onMounted(() => dateInput.value?.focus())

function onSubmit() {
  emit('submit', {
    date: date.value || today,
    km: Number(km.value) || null,
    note: note.value.trim() || null,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ t('ms_mark_done_title') }} — {{ milestone.name }}</h3>

      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_done_date') }}
          <input ref="dateInput" v-model="date" type="date" :max="today" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_done_km') }}
          <input v-model.number="km" type="number" min="0" class="modal-input" />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          {{ t('ms_field_note') }}
          <input v-model="note" type="text" class="modal-input" />
        </label>

        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border px-4 py-2 text-sm"
            style="border-color: var(--border); background: var(--bg); color: var(--text)"
            @click="emit('close')"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="submit"
            class="rounded-lg px-4 py-2 text-sm"
            style="background: var(--accent); color: var(--accent-text)"
          >
            {{ t('save') }}
          </button>
        </div>
      </form>
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
