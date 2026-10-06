<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getLang, t } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { monthCells, useCalendarWidget, type CalendarWidgetState } from '../lib/useCalendarWidget'

// Виджет «Календарь» (BACKLOG 940, часть 2; решение владельца 2026-10-06: блок-виджет на Дашборде рядом с «Изучением языков» и «Навыками»).
// Месяц с отметками: ● — в этот день есть план (пустой кружок, если всё выполнено), ◆ — срок цели (приглушённый, если цели выполнены).
// Только чтение: править план и цели — в разделе «Календарь» / «Цели» (ссылка в заголовке). Стрелки листают месяцы.
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ state: [CalendarWidgetState] }>()

const { state, marks, load } = useCalendarWidget()
const view = ref(new Date())
view.value.setDate(1)
watch(() => [props.userId, view.value.getTime()], () => void load(props.userId, view.value.getFullYear(), view.value.getMonth()), { immediate: true })
watch(state, (s) => emit('state', s), { immediate: true })

const WEEKDAYS = computed(() => (getLang() === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']))
const MONTHS = computed(() =>
  getLang() === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
)
const label = computed(() => `${MONTHS.value[view.value.getMonth()]} ${view.value.getFullYear()}`)
const cells = computed(() => monthCells(view.value.getFullYear(), view.value.getMonth(), marks.value, todayStr()))

function shift(delta: number) {
  const d = new Date(view.value)
  d.setMonth(d.getMonth() + delta)
  view.value = d
}
</script>

<template>
  <div v-if="state === 'ready'" class="rounded-2xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-test="calendar-widget">
    <div class="mb-2 flex items-center gap-2">
      <span class="dim text-xs">{{ t('dash_widget_calendar') }}</span>
      <a href="/calendar/" class="ml-auto text-xs" style="color: var(--accent)" data-test="calendar-link">{{ t('dash_widget_calendar_open') }}</a>
    </div>
    <div class="mb-1 flex items-center justify-between" data-no-swipe>
      <button type="button" class="secondary px-2 py-0.5" :aria-label="t('dash_widget_calendar_prev')" data-test="calendar-prev" @click="shift(-1)">‹</button>
      <span class="text-sm font-medium" data-test="calendar-label">{{ label }}</span>
      <button type="button" class="secondary px-2 py-0.5" :aria-label="t('dash_widget_calendar_next')" data-test="calendar-next" @click="shift(1)">›</button>
    </div>
    <div class="cw-grid grid grid-cols-7 gap-0.5 text-center text-xs" data-no-swipe data-test="calendar-grid">
      <div v-for="(w, i) in WEEKDAYS" :key="'w' + i" class="dim">{{ w }}</div>
      <template v-for="(c, i) in cells" :key="i">
        <div v-if="!c"></div>
        <div v-else class="cw-cell rounded py-0.5" :class="{ 'cw-today': c.isToday }" data-test="calendar-day" :data-date="c.dateStr">
          <div>{{ c.day }}</div>
          <div class="cw-marks" aria-hidden="true">
            <span v-if="c.mark?.plan" class="cw-plan" :class="{ 'cw-plan-done': c.mark.planDone === c.mark.plan }" data-test="calendar-plan">{{ c.mark.planDone === c.mark.plan ? '○' : '●' }}</span>
            <span v-if="c.mark?.deadlines" class="cw-deadline" :class="{ 'cw-deadline-done': c.mark.deadlinesOpen === 0 }" data-test="calendar-deadline">◆</span>
          </div>
        </div>
      </template>
    </div>
    <p class="dim mt-1.5 text-xs">{{ t('dash_widget_calendar_legend') }}</p>
  </div>
</template>

<style scoped>
.cw-cell {
  border: 1px solid transparent;
  min-height: 2.1rem;
}
.cw-today {
  border-color: var(--accent);
}
.cw-marks {
  min-height: 0.9rem;
  line-height: 0.9rem;
  font-size: 0.6rem;
}
.cw-plan {
  color: var(--accent);
}
.cw-deadline {
  color: #e0a93b;
  margin-left: 1px;
}
.cw-deadline-done {
  opacity: 0.4;
}
</style>
