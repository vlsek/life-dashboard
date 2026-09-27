<script setup lang="ts">
import { ref, watch } from 'vue'
import WaterBadge from './WaterBadge.vue'
import WaterModal from './WaterModal.vue'
import Icon from './Icon.vue'
import { useWater } from '../lib/useWater'
import { t } from '../lib/i18n'

// Единственная точка подключения блока «Вода» в App.vue — сам разбор состояний (нет метрики /
// есть метрика) и вся сеть спрятаны здесь, чтобы у App.vue было минимум изменений при
// параллельном переносе других блоков дашборда (см. ROADMAP.md).
const props = defineProps<{ userId: string | null }>()

const { metric, normMl, autoNormMl, weightKg, todayMl, loaded, error, init, addMl, getMlForDate, saveGoal, createWaterMetric } = useWater()

watch(
  () => props.userId,
  (uid) => {
    if (uid) init(uid)
  },
  { immediate: true },
)

const modalOpen = ref(false)

async function onSetupClick() {
  await createWaterMetric()
  modalOpen.value = true
}

async function onAdd(ml: number, dateStr: string) {
  await addMl(ml, dateStr)
}
</script>

<template>
  <template v-if="loaded">
    <p v-if="error" class="dim text-sm">{{ t('comm_load_error') }} {{ error }}</p>

    <button
      v-if="!error && !metric"
      type="button"
      class="secondary inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5"
      style="border-color: var(--border)"
      :title="t('dash_water_setup_prompt')"
      @click="onSetupClick"
    >
      <Icon name="droplet" />
    </button>

    <WaterBadge v-else-if="!error" :current-ml="todayMl" :norm-ml="normMl" @click="modalOpen = true" />

    <WaterModal
      v-if="modalOpen && metric"
      :metric="metric"
      :current-ml="todayMl"
      :norm-ml="normMl"
      :auto-norm-ml="autoNormMl"
      :weight-kg="weightKg"
      :get-ml-for-date="getMlForDate"
      @close="modalOpen = false"
      @add="onAdd"
      @save-goal="saveGoal"
    />
  </template>
</template>
