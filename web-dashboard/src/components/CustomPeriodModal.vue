<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import { todayStr } from '../lib/date'

const props = defineProps<{ initialFrom: string | null; initialTo: string | null }>()
const emit = defineEmits<{ close: []; apply: [from: string | null, to: string | null] }>()

const from = ref(props.initialFrom ?? '')
const to = ref(props.initialTo ?? '')
const today = todayStr()
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('period_custom') }}</h3>

      <label class="mt-2 block text-sm">{{ t('period_from') }}</label>
      <input v-model="from" type="date" :max="today" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('period_to') }}</label>
      <input v-model="to" type="date" :max="today" class="w-full" />

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="emit('apply', from || null, to || null)">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
