<script setup lang="ts">
import { ref } from 'vue'
import IconPicker from './IconPicker.vue'
import { t } from '../lib/i18n'
import { emptyParamForm, paramFormFrom, type BodyParam, type BodyParamForm } from '../lib/profile'

// Портировано из bodyParamFormFields() + addBodyParameter()/editBodyParameter() в dashboard.js:
// название, иконка (выбор SVG или своё эмодзи), единица измерения.
const props = defineProps<{ existing: BodyParam | null; error?: string | null }>()
const emit = defineEmits<{ close: []; save: [form: BodyParamForm] }>()
const form = ref<BodyParamForm>(props.existing ? paramFormFrom(props.existing) : emptyParamForm())

function save() {
  if (!form.value.name.trim()) return
  emit('save', form.value)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ existing ? t('dash_body_param_edit_title') : t('dash_body_param_new_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('dash_metric_field_name') }}</label>
      <input v-model="form.name" type="text" class="w-full" autofocus />

      <div class="dim mt-2 text-sm">{{ t('dash_metric_field_icon') }}</div>
      <IconPicker v-model="form.icon" />

      <label class="mt-2 block text-sm">{{ t('dash_body_param_unit_label') }}</label>
      <input v-model="form.unit" type="text" class="w-full" />

      <p v-if="props.error" class="mt-2 text-sm" style="color: var(--danger)">{{ props.error }}</p>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
