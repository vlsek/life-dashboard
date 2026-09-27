<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { fieldsEnabledForType } from '../lib/challenges'
import type { ChallengeType, CustomChallengeFormInput } from '../lib/types'

const emit = defineEmits<{ close: []; save: [res: CustomChallengeFormInput] }>()

const title = ref('')
const icon = ref('🏆')
const type = ref<ChallengeType>('daily_fixed')
const duration = ref(30)
const dailyTarget = ref(0)
const startValue = ref(0)
const increment = ref(1)
const unit = ref('')
const targetCount = ref(10)
const itemLabel = ref('')

const enabled = computed(() => fieldsEnabledForType(type.value))

const typeOptions: { value: ChallengeType; labelKey: 'ch_type_daily_fixed' | 'ch_type_daily_progressive' | 'ch_type_daily_boolean' | 'ch_type_cumulative' }[] = [
  { value: 'daily_fixed', labelKey: 'ch_type_daily_fixed' },
  { value: 'daily_progressive', labelKey: 'ch_type_daily_progressive' },
  { value: 'daily_boolean', labelKey: 'ch_type_daily_boolean' },
  { value: 'cumulative_count', labelKey: 'ch_type_cumulative' },
]

function save() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value,
    icon: icon.value,
    type: type.value,
    duration: duration.value,
    dailyTarget: dailyTarget.value,
    startValue: startValue.value,
    increment: increment.value,
    unit: unit.value,
    targetCount: targetCount.value,
    itemLabel: itemLabel.value,
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('ch_custom_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('ch_field_title') }}</label>
      <input v-model="title" type="text" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('ch_field_icon') }}</label>
      <input v-model="icon" type="text" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('ch_field_type') }}</label>
      <select v-model="type" class="w-full">
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
      </select>

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.duration ? 1 : 0.4 }">{{ t('ch_field_duration') }}</label>
      <input v-model.number="duration" type="number" class="w-full" :disabled="!enabled.duration" :style="{ opacity: enabled.duration ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.dailyTarget ? 1 : 0.4 }">{{ t('ch_field_daily_target') }}</label>
      <input v-model.number="dailyTarget" type="number" class="w-full" :disabled="!enabled.dailyTarget" :style="{ opacity: enabled.dailyTarget ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.startValue ? 1 : 0.4 }">{{ t('ch_field_start_value') }}</label>
      <input v-model.number="startValue" type="number" class="w-full" :disabled="!enabled.startValue" :style="{ opacity: enabled.startValue ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.increment ? 1 : 0.4 }">{{ t('ch_field_increment') }}</label>
      <input v-model.number="increment" type="number" class="w-full" :disabled="!enabled.increment" :style="{ opacity: enabled.increment ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.unit ? 1 : 0.4 }">{{ t('ch_field_unit') }}</label>
      <input v-model="unit" type="text" class="w-full" :disabled="!enabled.unit" :style="{ opacity: enabled.unit ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.targetCount ? 1 : 0.4 }">{{ t('ch_field_target_count') }}</label>
      <input v-model.number="targetCount" type="number" class="w-full" :disabled="!enabled.targetCount" :style="{ opacity: enabled.targetCount ? 1 : 0.4 }" />

      <label class="mt-2 block text-sm" :style="{ opacity: enabled.itemLabel ? 1 : 0.4 }">{{ t('ch_field_item_label') }}</label>
      <input v-model="itemLabel" type="text" class="w-full" :disabled="!enabled.itemLabel" :style="{ opacity: enabled.itemLabel ? 1 : 0.4 }" />

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
