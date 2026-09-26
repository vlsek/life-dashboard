<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import MilestoneFormModal from './components/MilestoneFormModal.vue'
import MarkDoneModal from './components/MarkDoneModal.vue'
import { useMilestones } from './lib/useMilestones'
import { buildRow, groupActiveByCategory, sortDone, summary, statusLevel } from './lib/milestones'
import { t } from './lib/i18n'
import type { Milestone, MilestoneFormInput } from './lib/types'

const { auth, items, error, init, addMilestone, updateMilestone, markDone, deleteMilestone } = useMilestones()
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

const errorHint = computed(() => (error.value && /milestones|relation|schema cache/i.test(error.value) ? ' — ' + t('ms_migration_hint') : ''))

function chipText(m: Milestone): string | null {
  const { level, days } = statusLevel(m.due_date)
  if (level === null || days === null) return null
  if (level === 'overdue') return `${t('ms_overdue_by')} ${-days} ${t('ms_days_short')}`
  if (level === 'today') return t('ms_due_today')
  return `${t('ms_due_in')} ${days} ${t('ms_days_short')} · ${fmtRu(m.due_date)}`
}

// ---- Форма создания/редактирования (все поля — см. MilestoneFormModal.vue) ----
const formTarget = ref<Milestone | 'new' | null>(null)
const saveError = ref<string | null>(null)

function openAddForm() {
  saveError.value = null
  formTarget.value = 'new'
}
function openEditForm(m: Milestone) {
  saveError.value = null
  formTarget.value = m
}
function closeForm() {
  formTarget.value = null
}

async function onFormSubmit(input: MilestoneFormInput) {
  const target = formTarget.value
  closeForm()
  try {
    const row = buildRow(input, noCategory.value)
    if (target === 'new') {
      if (auth.value.status !== 'ready') return
      await addMilestone(auth.value.userId, row)
    } else if (target) {
      await updateMilestone(target.id, row)
    }
  } catch (e) {
    saveError.value = t('dash_save_error_generic') + (e as Error).message
  }
}

// ---- Отметить "сделано" (дата/км/заметка — см. MarkDoneModal.vue) ----
const markDoneTarget = ref<Milestone | null>(null)

function openMarkDone(m: Milestone) {
  saveError.value = null
  markDoneTarget.value = m
}
function closeMarkDone() {
  markDoneTarget.value = null
}

async function onMarkDoneSubmit(res: { date: string; km: number | null; note: string | null }) {
  const m = markDoneTarget.value
  closeMarkDone()
  if (!m) return
  try {
    await markDone(m, res.date, res.km, res.note)
  } catch (e) {
    saveError.value = t('dash_save_error_generic') + (e as Error).message
  }
}

async function onDelete(m: Milestone) {
  if (!confirm(t('ms_confirm_delete'))) return
  try {
    await deleteMilestone(m.id)
  } catch (e) {
    saveError.value = t('dash_delete_error_generic') + (e as Error).message
  }
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ t('nav_milestones') }}</h1>
      <button
        v-if="auth.status === 'ready'"
        class="rounded-lg px-3 py-1.5 text-sm"
        style="background: var(--accent); color: var(--accent-text)"
        @click="openAddForm"
      >
        {{ t('ms_add_btn') }}
      </button>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}{{ errorHint }}</p>
      <p v-if="saveError" class="mb-3 text-sm" style="color: var(--danger)">{{ saveError }}</p>

      <template v-if="!error">
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
                  <button class="secondary" :title="t('ms_mark_done_btn')" @click="openMarkDone(m)">✓</button>
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
                <td class="w-16 pl-2 text-right whitespace-nowrap">
                  <button class="secondary" :title="t('ms_edit_btn')" @click="openEditForm(m)">✎</button>
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
              <td class="dim text-xs">{{ fmtRu(m.last_date) }}</td>
              <td class="w-16 pl-2 text-right whitespace-nowrap">
                <button class="secondary" :title="t('ms_edit_btn')" @click="openEditForm(m)">✎</button>
                <button class="danger" @click="onDelete(m)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <MilestoneFormModal
      v-if="formTarget"
      :existing="formTarget === 'new' ? null : formTarget"
      @submit="onFormSubmit"
      @close="closeForm"
    />
    <MarkDoneModal v-if="markDoneTarget" :milestone="markDoneTarget" @submit="onMarkDoneSubmit" @close="closeMarkDone" />
  </main>
</template>
