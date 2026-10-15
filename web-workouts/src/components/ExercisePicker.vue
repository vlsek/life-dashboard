<script setup lang="ts">
import { t, getLang, type DictKey } from '../lib/i18n'
import type { MuscleId } from '../lib/muscles'
import type { BodyModel } from '../lib/bodyModel'
import ExercisePickerView from '../../../shared/body-picker/ExercisePickerView.vue'

// Тонкая обёртка: сам компонент вынесен в shared/body-picker (BACKLOG 762 срез 2, вариант Б) и получает тексты пропсами из словаря Тренировок.
defineProps<{ recent: readonly MuscleId[]; model?: BodyModel }>()
const emit = defineEmits<{ pick: [name: string, baseId: string | null]; close: [] }>()
const labels = () => ({
  title: t('workouts_pick_body_title'),
  hint: t('workouts_pick_body_hint'),
  front: t('workouts_muscles_front'),
  back: t('workouts_muscles_back'),
  legendDone: t('workouts_muscles_legend_done'),
  legendIdle: t('workouts_muscles_legend_idle'),
  untrained: t('workouts_pick_body_untrained'),
  clear: t('workouts_pick_body_clear'),
  none: t('workouts_pick_body_none'),
  close: t('workouts_pick_body_close'),
})
const muscleName = (m: MuscleId) => t(`workouts_muscle_${m}` as DictKey)
</script>

<template>
  <ExercisePickerView
    :recent="recent"
    :model="model"
    :lang="getLang()"
    :labels="labels()"
    :muscle-name="muscleName"
    @pick="(n, b) => emit('pick', n, b)"
    @close="emit('close')"
  />
</template>
