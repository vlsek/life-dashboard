<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SectionHeading from './SectionHeading.vue'
import SavingsWidget from './SavingsWidget.vue'
import { t } from '../lib/i18n'
import type { WidgetsConfig } from '../lib/layout'
import type { SavingsState } from '../lib/savingsWidget'

// Блок «Виджеты» главной: показывает выбранные в окне раскладки виджеты (сейчас — «Коплю на товар»). Пока ни один виджет не готов
// (грузится, товар куплен/удалён, ошибка), блока нет вообще (v-show: виджеты остаются смонтированными и загружаются).
// Состояние наверх (`shown`) — App учитывает его в перетаскивании блоков. Ручка перетаскивания приходит слотом `actions`.
const props = defineProps<{ userId: string; config: WidgetsConfig }>()
const emit = defineEmits<{ shown: [boolean] }>()

const collapsed = ref(false)
const savingsState = ref<SavingsState>('loading')
const shown = computed(() => !!props.config.savings && savingsState.value === 'ready')
watch(shown, (v) => emit('shown', v), { immediate: true })
onBeforeUnmount(() => emit('shown', false))
</script>

<template>
  <section v-show="shown" data-test="widgets-section">
    <SectionHeading v-model:collapsed="collapsed" :title="t('dash_block_widgets')" storage-key="widgets">
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </SectionHeading>
    <div v-show="!collapsed" class="mb-5 flex flex-col gap-3">
      <SavingsWidget v-if="config.savings" :user-id="userId" :item-id="config.savings" @state="savingsState = $event" />
    </div>
  </section>
</template>
