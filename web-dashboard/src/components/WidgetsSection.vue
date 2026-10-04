<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SectionHeading from './SectionHeading.vue'
import SavingsWidget from './SavingsWidget.vue'
import SkillsWidget from './SkillsWidget.vue'
import LanguagesWidget from './LanguagesWidget.vue'
import { t } from '../lib/i18n'
import type { WidgetsConfig } from '../lib/layout'

// Блок «Виджеты» главной: показывает выбранные в окне раскладки виджеты («Навыки», «Коплю на товар», «Изучение языков»). Пока ни один виджет не готов
// (грузится, товар куплен/удалён, навыков нет, ошибка), блока нет вообще (v-show: виджеты остаются смонтированными и загружаются).
// Состояние наверх (`shown`) — App учитывает его в перетаскивании блоков. Ручка перетаскивания приходит слотом `actions`.
const props = defineProps<{ userId: string; config: WidgetsConfig }>()
const emit = defineEmits<{ shown: [boolean] }>()

const collapsed = ref(false)
const states = ref<Record<string, string>>({})
const shown = computed(() => {
  const c = props.config
  return (!!c.skills?.length && states.value.skills === 'ready') || (!!c.savings && states.value.savings === 'ready') || (!!c.languages && states.value.languages === 'ready')
})
watch(shown, (v) => emit('shown', v), { immediate: true })
onBeforeUnmount(() => emit('shown', false))
</script>

<template>
  <section v-show="shown" data-test="widgets-section">
    <SectionHeading v-model:collapsed="collapsed" :title="t('dash_block_widgets')" storage-key="widgets">
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </SectionHeading>
    <div v-show="!collapsed" class="mb-5 flex flex-col gap-3">
      <SkillsWidget v-if="config.skills?.length" :user-id="userId" :ids="config.skills" @state="states = { ...states, skills: $event }" />
      <LanguagesWidget v-if="config.languages" :user-id="userId" :lang="config.languages" @state="states = { ...states, languages: $event }" />
      <SavingsWidget v-if="config.savings" :user-id="userId" :item-id="config.savings" @state="states = { ...states, savings: $event }" />
    </div>
  </section>
</template>
