<script setup lang="ts">
import { ref } from 'vue'
import { t, getLang } from '../lib/i18n'
import { addDaysIso } from '../lib/date'
import type { GoalDeadline, PlannedItem } from '../lib/types'
import { hasEvents, type LifeEvents } from '../lib/lifeEvents'
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'

const props = defineProps<{ dateStr: string; initial: PlannedItem[]; deadlines?: GoalDeadline[]; events?: LifeEvents | null; hasSummary?: boolean; moveError?: string | null }>()
const emit = defineEmits<{ close: []; save: [items: PlannedItem[]]; summary: []; move: [payload: { items: PlannedItem[]; index: number; to: string }] }>()

const items = ref<PlannedItem[]>(props.initial.map((p) => ({ ...p })))
const newText = ref('')

function fmtHeader(iso: string): string {
  const [y, m, d] = iso.split('-')
  const dm = getLang() === 'en' ? `${m}/${d}/${y}` : `${d}.${m}.${y}`
  return `${t('cal_plan_for')} ${dm}`
}

function addItem() {
  const text = newText.value.trim()
  if (!text) return
  items.value.push({ type: 'custom', text, done: false })
  newText.value = ''
}

// Перенос пункта на другой день (76.4): «Завтра», «+7 дней» или своя дата; пункты-цели не переносятся (это сроки целей)
const moving = ref<number | null>(null)
const moveDate = ref('')
const ISO = /^\d{4}-\d{2}-\d{2}$/
const moveValid = (to: string) => ISO.test(to) && to !== props.dateStr
function startMove(idx: number) {
  moving.value = moving.value === idx ? null : idx
  moveDate.value = ''
}
function doMove(to: string) {
  if (moving.value === null || !moveValid(to)) return
  emit('move', { items: items.value.map((i) => ({ ...i })), index: moving.value, to })
}

function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

// 🐞 BACKLOG раздел 35: «когда план в календаре пишешь и жмёшь «Сохранить», он не добавляется, только на «+»».
// Недописанный текст в поле — тоже план: при «Сохранить» он добавляется пунктом автоматически (как если бы нажали «+»).
function save() {
  addItem()
  emit('save', items.value)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ fmtHeader(props.dateStr) }}</h3>

      <!-- цели, у которых срок выпадает на этот день (BACKLOG 940): только чтение, правятся в «Целях» -->
      <div v-if="deadlines?.length" class="mb-2" data-test="day-deadlines">
        <p class="dim mb-1 text-xs">{{ t('cal_deadlines_h') }}</p>
        <div v-for="g in deadlines" :key="g.id" class="flex items-center gap-2 py-0.5 text-sm" data-test="day-deadline">
          <Icon name="goals" />
          <span :class="{ 'line-through opacity-60': g.done }">{{ g.name }}</span>
        </div>
      </div>

      <!-- события жизни (76.1): тренировка, день челленджа, срок вехи; только чтение, правятся в своих разделах -->
      <div v-if="hasEvents(events)" class="mb-2" data-test="day-events">
        <p class="dim mb-1 text-xs">{{ t('cal_events_h') }}</p>
        <div v-if="events!.workouts > 0" class="flex items-center gap-2 py-0.5 text-sm" data-test="day-event-workout"><span class="cal-dot cal-dot-workout"></span>{{ t('cal_ev_workout') }}: {{ events!.workouts }} {{ t('cal_ev_workout_n') }}</div>
        <div v-for="c in events!.challenges" :key="c.id" class="flex items-center gap-2 py-0.5 text-sm" data-test="day-event-challenge"><span class="cal-dot cal-dot-challenge"></span>{{ t('cal_ev_challenge') }}: {{ c.title }}<template v-if="c.day"> ({{ t('cal_ev_day') }} {{ c.day }})</template></div>
        <div v-for="m in events!.milestones" :key="m.id" class="flex items-center gap-2 py-0.5 text-sm" data-test="day-event-milestone"><span class="cal-dot cal-dot-milestone"></span>{{ t('cal_ev_milestone') }}: {{ m.name }}</div>
      </div>

      <p v-if="items.length === 0" class="dim">{{ t('cal_empty') }}</p>
      <div v-for="(item, idx) in items" :key="idx" class="flex flex-wrap items-center gap-2 py-1">
        <input type="checkbox" v-model="item.done" :disabled="item.type === 'goal'" />
        <span class="flex-1" :class="{ 'line-through opacity-60': item.done }">
          {{ item.text }}<template v-if="item.type === 'goal'"> ({{ t('cal_goal_suffix') }})</template>
        </span>
        <button v-if="item.type !== 'goal'" type="button" class="secondary" :aria-label="t('cal_move')" :title="t('cal_move')" :aria-expanded="moving === idx" data-test="plan-move-btn" @click="startMove(idx)">→</button>
        <button class="danger" @click="removeItem(idx)">✕</button>
        <div v-if="moving === idx" class="flex w-full flex-wrap items-center gap-2 pb-1 pl-6" data-test="plan-move-row" style="flex-basis: 100%">
          <span class="dim text-xs">{{ t('cal_move_to') }}</span>
          <button type="button" class="secondary" data-test="plan-move-tomorrow" @click="doMove(addDaysIso(dateStr, 1))">{{ t('cal_move_tomorrow') }}</button>
          <button type="button" class="secondary" data-test="plan-move-week" @click="doMove(addDaysIso(dateStr, 7))">{{ t('cal_move_week') }}</button>
          <input v-model="moveDate" type="date" data-test="plan-move-date" :aria-label="t('cal_move_pick')" />
          <button type="button" :disabled="!moveValid(moveDate)" data-test="plan-move-go" @click="doMove(moveDate)">{{ t('cal_move_go') }}</button>
        </div>
      </div>
      <p v-if="moveError" class="mt-1 text-sm" style="color: var(--danger)" role="alert" data-test="plan-move-error">{{ moveError }}</p>

      <div class="mt-2.5 flex gap-2">
        <input
          v-model="newText"
          type="text"
          class="flex-1"
          :placeholder="t('cal_new_item_placeholder')"
          @keydown.enter.prevent="addItem"
        />
        <button class="secondary" @click="addItem">+</button>
      </div>
      <p class="dim mt-1.5 text-xs"><EmojiText :text="t('cal_hint')" /></p>

      <!-- итоги этого дня (как в «Истории») открываются поверх формы; правки планов при этом не теряются -->
      <button v-if="hasSummary" type="button" class="secondary mt-2 w-full" data-test="day-summary-btn" @click="emit('summary')">{{ t('cal_day_summary') }}</button>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
