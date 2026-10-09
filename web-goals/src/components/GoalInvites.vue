<script setup lang="ts">
import { t } from '../lib/i18n'
import type { InviteNotice, InviteRow } from '../lib/goalInvites'

// Плашки предложений от друзей (миграция 063): входящие «Принять / Отклонить» и новости отправителю («друг выполнил / принял / отклонил»).
defineProps<{ incoming: InviteRow[]; notices: InviteNotice[]; busyId: string; error: string }>()
const emit = defineEmits<{ (e: 'accept', id: string): void; (e: 'decline', id: string): void; (e: 'dismiss', id: string): void }>()

function friend(r: InviteRow): string {
  return r.other_name || t('inv_friend')
}
function fmt(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d + '.' + m + '.' + y
}
function diffLabel(r: InviteRow): string {
  return r.difficulty === 'easy' ? t('goals_diff_easy') : r.difficulty === 'medium' ? t('goals_diff_medium') : r.difficulty === 'hard' ? t('goals_diff_hard') : ''
}
function details(r: InviteRow): string {
  if (r.kind === 'task') return ''
  const parts: string[] = []
  if (r.stages > 1) parts.push(r.stages + ' ' + t('inv_stages'))
  if (diffLabel(r)) parts.push(diffLabel(r))
  if (r.deadline) parts.push(t('inv_deadline') + ' ' + fmt(r.deadline))
  return parts.join(' · ')
}
function noticeVerb(n: InviteNotice): string {
  return n.event === 'completed' ? t('inv_done') : n.event === 'accepted' ? t('inv_accepted') : t('inv_declined')
}
</script>

<template>
  <section v-if="incoming.length || notices.length" class="mb-4 flex flex-col gap-2" :aria-label="t('inv_region')" data-test="goal-invites">
    <article
      v-for="r in incoming"
      :key="r.id"
      class="rounded-xl border p-3"
      style="border-color: var(--accent); background: var(--bg-card)"
      data-test="invite-incoming"
    >
      <p class="m-0 text-sm">
        <strong data-test="invite-from">{{ friend(r) }}</strong>
        {{ r.kind === 'task' ? t('inv_offers_task') + ' ' + fmt(r.plan_date) : t('inv_offers_goal') }}:
        <span data-test="invite-name">«{{ r.name }}»</span>
      </p>
      <p v-if="details(r)" class="dim m-0 mt-1 text-xs" data-test="invite-details">{{ details(r) }}</p>
      <div class="mt-2 flex gap-2">
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm" :disabled="busyId !== ''" data-test="invite-accept" @click="emit('accept', r.id)">{{ t('inv_accept') }}</button>
        <button type="button" class="secondary rounded-lg px-3 py-1.5 text-sm" :disabled="busyId !== ''" data-test="invite-decline" @click="emit('decline', r.id)">{{ t('inv_decline') }}</button>
      </div>
    </article>

    <article
      v-for="n in notices"
      :key="n.row.id"
      class="flex items-center gap-2 rounded-xl border px-3 py-2"
      style="border-color: var(--border); background: var(--bg-card)"
      data-test="invite-notice"
      :data-event="n.event"
    >
      <p class="m-0 min-w-0 flex-1 break-words text-sm">
        <strong>{{ friend(n.row) }}</strong> {{ noticeVerb(n) }} {{ t('inv_your_offer') }}: «{{ n.row.name }}»
      </p>
      <button type="button" class="secondary rounded-lg px-3 py-1 text-xs" data-test="invite-dismiss" @click="emit('dismiss', n.row.id)">{{ t('inv_ok') }}</button>
    </article>

    <p v-if="error" class="m-0 text-sm" style="color: var(--danger, #e5484d)" role="alert" data-test="invite-error">{{ error }}</p>
  </section>
</template>
