<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { sb } from '../lib/supabase'
import { loadPickerData, type PickerData } from '../lib/bodyPickerData'
import { readBodyModelChoice, resolveBodyModel } from '../../../shared/body-picker/bodyModel'
import { PICKER_TEXTS } from '../../../shared/body-picker/pickerTexts'
import type { MuscleId } from '../../../shared/body-picker/muscles'
import ExercisePickerView from '../../../shared/body-picker/ExercisePickerView.vue'

// Подбор названия метрики-упражнения по схеме тела (BACKLOG 762 срез 2, вариант Б): та же схема, что в форме «Добавить упражнение»
// в «Тренировках» (общий код shared/body-picker). Данные (зелёные мышцы, пол профиля) грузятся при первом открытии схемы.
// Выбор отдаёт только название — связь с упражнением «Тренировок» пользователь выбирает в форме как раньше.
const props = defineProps<{ exercises: { id: string; name: string }[] }>()
const emit = defineEmits<{ pick: [name: string] }>()

const open = ref(false)
const loading = ref(false)
const data = ref<PickerData | null>(null)

async function toggle() {
  open.value = !open.value
  if (open.value && !data.value && !loading.value) {
    loading.value = true
    data.value = await loadPickerData(sb, props.exercises)
    loading.value = false
  }
}
const lang = computed(() => getLang())
const texts = computed(() => PICKER_TEXTS[lang.value])
const model = computed(() => resolveBodyModel(readBodyModelChoice(), data.value?.gender ?? null))
const muscleName = (m: MuscleId) => texts.value.muscles[m]
function onPick(name: string) {
  emit('pick', name)
  open.value = false
}
</script>

<template>
  <div class="mt-1" data-test="body-picker-block">
    <button type="button" class="text-xs underline" style="background: none; padding: 0.25rem 0.5rem" :aria-expanded="open" data-test="body-picker-toggle" @click="toggle">{{ t('dash_metric_pick_body') }}</button>
    <p v-if="open && loading" class="dim m-0 text-xs" data-test="body-picker-loading">…</p>
    <ExercisePickerView
      v-else-if="open && data"
      :recent="data.recent"
      :model="model"
      :lang="lang"
      :labels="texts.labels"
      :muscle-name="muscleName"
      @pick="(name: string) => onPick(name)"
      @close="open = false"
    />
  </div>
</template>
