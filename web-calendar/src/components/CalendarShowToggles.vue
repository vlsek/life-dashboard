<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { CALENDAR_PARTS, HISTORY_PARTS, type CalendarShow, type ShowKey } from '../lib/calendarShow'

// «Показывать …» (BACKLOG 44.8 срез 2): свёрнутая строка над сеткой; чипы — части выбранной вкладки. Выключенное = нажатая-снятая кнопка (aria-pressed).
const props = defineProps<{ view: 'calendar' | 'history'; show: CalendarShow }>()
const emit = defineEmits<{ toggle: [key: ShowKey] }>()
const open = ref(false)
const parts = computed(() => (props.view === 'history' ? HISTORY_PARTS : CALENDAR_PARTS))
const hidden = computed(() => parts.value.filter((k) => !props.show[k]).length)
</script>

<template>
  <div class="mb-3" data-test="cal-show">
    <button
      type="button"
      class="rounded-lg border px-3 py-1.5 text-sm"
      style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
      :aria-expanded="open"
      data-test="cal-show-toggle"
      @click="open = !open"
    >
      {{ t('cal_show_title') }}<span v-if="hidden" class="ml-1" style="color: var(--text-dim)" data-test="cal-show-hidden">(−{{ hidden }})</span>
    </button>
    <div v-if="open" class="mt-2" data-test="cal-show-panel">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="k in parts"
          :key="k"
          type="button"
          class="rounded-full border px-3 py-1 text-sm"
          :style="{ borderColor: show[k] ? 'var(--accent)' : 'var(--border)', background: show[k] ? 'var(--accent)' : 'var(--bg-card)', color: show[k] ? 'var(--accent-text)' : 'var(--text-dim)' }"
          :aria-pressed="show[k]"
          :data-test="'cal-show-' + k"
          @click="emit('toggle', k)"
        >
          {{ t(('cal_show_' + k) as 'cal_show_plans') }}
        </button>
      </div>
      <p class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('cal_show_hint') }}</p>
    </div>
  </div>
</template>
