<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from './components/AppShell.vue'
import { useMilestones } from './lib/useMilestones'
import { groupActiveByCategory, sortDone, summary, statusLevel } from './lib/milestones'
import { todayStr } from './lib/date'
import { t } from './lib/i18n'
import type { Milestone } from './lib/types'

const { auth, items, error, init, markDone, deleteMilestone } = useMilestones()
onMounted(init)

const noCategory = computed(() => t('ms_no_category'))
const active = computed(() => items.value.filter((m) => !m.done))
const done = computed(() => sortDone(items.value.filter((m) => m.done)))
const grouped = computed(() => groupActiveByCategory(active.value, noCategory.value))
const sum = computed(() => summary(active.value))

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function chipColor(level: ReturnType<typeof statusLevel>['level']): string {
  if (level === 'overdue' || level === 'today') return '#d6336c'
  if (level === 'soon') return '#e0a93b'
  return 'var(--text-dim)'
}

function chipText(m: Milestone): string | null {
  const { level, days } = statusLevel(m.due_date)
  if (level === null || days === null) return null
  if (level === 'overdue') return `${t('ms_overdue_by')} ${-days} ${t('ms_days_short')}`
  if (level === 'today') return t('ms_due_today')
  return `${t('ms_due_in')} ${days} ${t('ms_days_short')} · ${fmtRu(m.due_date)}`
}

// TODO(следующая итерация): полноценные модалки добавления/редактирования (все поля —
// интервал, км, история) и захват km/note при отметке "готово". Пока — быстрый путь на
// сегодняшнюю дату без доп. полей, чтобы страница уже была рабочей для чтения/базовых
// действий. См. ROADMAP.md, тикет "B-milestones: формы".
async function onMarkDone(m: Milestone) {
  if (!confirm(t('ms_mark_done_title') + ' — ' + m.name + '?')) return
  await markDone(m, todayStr(), null, null)
}

async function onDelete(m: Milestone) {
  if (!confirm(t('ms_confirm_delete'))) return
  await deleteMilestone(m.id)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <h1 class="mb-4 text-xl font-semibold">{{ t('nav_milestones') }}</h1>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>

      <template v-else>
        <p v-if="sum.overdue || sum.soon" class="mb-3 text-sm">
          <span v-if="sum.overdue" style="color: #d6336c">{{ t('ms_summary_overdue') }} {{ sum.overdue }}</span>
          <span v-if="sum.overdue && sum.soon"> · </span>
          <span v-if="sum.soon" style="color: #e0a93b">{{ t('ms_summary_soon') }} {{ sum.soon }}</span>
        </p>

        <p v-if="active.length === 0" class="dim">{{ t('ms_no_active') }}</p>

        <div v-for="[cat, list] in grouped" :key="cat" class="mb-5">
          <h3 class="mb-2 text-base font-medium">{{ cat }}</h3>
          <table class="w-full">
            <tbody>
              <tr v-for="m in list" :key="m.id" class="align-top">
                <td class="w-8 pr-2">
                  <button class="secondary" :title="t('ms_mark_done_btn')" @click="onMarkDone(m)">✓</button>
                </td>
                <td>
                  <div>{{ m.name }}</div>
                  <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span
                      v-if="chipText(m)"
                      class="whitespace-nowrap rounded-full border px-2 py-0.5"
                      :style="{ borderColor: chipColor(statusLevel(m.due_date).level), color: chipColor(statusLevel(m.due_date).level) }"
                      >{{ chipText(m) }}</span
                    >
                  </div>
                  <div v-if="m.note" class="dim mt-1 text-xs">{{ m.note }}</div>
                </td>
                <td class="w-8 pl-2 text-right">
                  <button class="danger" @click="onDelete(m)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="mb-2 mt-6 text-base font-medium">{{ t('ms_done_h2') }}</h3>
        <p v-if="done.length === 0" class="dim">{{ t('ms_no_done') }}</p>
        <table v-else class="w-full">
          <tbody>
            <tr v-for="m in done" :key="m.id" class="align-top">
              <td class="done-text">{{ m.name }}</td>
              <td class="dim text-right text-xs">{{ fmtRu(m.last_date) }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>
  </main>
</template>
