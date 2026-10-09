<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { addDaysIso, todayStr } from '../lib/date'
import { sendOffer, validateOffer, type OfferInput, type OfferResult } from '../lib/goalOffer'

// Форма «Предложить другу цель / задачу» в окне профиля друга (миграция 063).
const props = defineProps<{ friendId: string; friendName: string }>()
const emit = defineEmits<{ sent: []; cancel: [] }>()

const form = ref<OfferInput>({ kind: 'goal', name: '', stages: 1, difficulty: '', deadline: '', planDate: addDaysIso(todayStr(), 1) })
const busy = ref(false)
const problem = ref('')

function textFor(r: OfferResult): string {
  switch (r.status) {
    case 'recipient_limit': return t('comm_offer_err_recipient_limit')
    case 'pending_limit': return t('comm_offer_err_pending_limit')
    case 'not_friend': return t('comm_offer_err_not_friend')
    case 'unsupported': return t('comm_offer_err_unsupported')
    case 'error': return r.message
    default: return ''
  }
}
const title = computed(() => t('comm_offer_title').replace('{name}', props.friendName))

async function submit() {
  if (busy.value) return
  const p = validateOffer(form.value)
  if (p) {
    problem.value = p === 'name' ? t('comm_offer_err_name') : t('comm_offer_err_date')
    return
  }
  problem.value = ''
  busy.value = true
  const r = await sendOffer(props.friendId, form.value)
  busy.value = false
  if (r.status === 'ok') emit('sent')
  else problem.value = textFor(r)
}
</script>

<template>
  <form class="mt-3 flex flex-col gap-2 rounded-lg border p-3" style="border-color: var(--border)" data-testid="offer-form" @submit.prevent="submit">
    <h4 class="m-0 text-sm font-medium" data-testid="offer-title">{{ title }}</h4>
    <div class="flex gap-2" role="radiogroup">
      <label class="flex items-center gap-1 text-sm"><input v-model="form.kind" type="radio" value="goal" data-testid="offer-kind-goal" /> {{ t('comm_offer_kind_goal') }}</label>
      <label class="flex items-center gap-1 text-sm"><input v-model="form.kind" type="radio" value="task" data-testid="offer-kind-task" /> {{ t('comm_offer_kind_task') }}</label>
    </div>
    <label class="flex flex-col gap-1 text-xs">
      <span class="dim">{{ t('comm_offer_name') }}</span>
      <input v-model="form.name" type="text" maxlength="120" data-testid="offer-name" />
    </label>
    <template v-if="form.kind === 'goal'">
      <div class="flex flex-wrap gap-2">
        <label class="flex flex-col gap-1 text-xs">
          <span class="dim">{{ t('comm_offer_stages') }}</span>
          <input v-model.number="form.stages" type="number" min="1" max="20" style="width: 5rem" data-testid="offer-stages" />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="dim">{{ t('comm_offer_difficulty') }}</span>
          <select v-model="form.difficulty" data-testid="offer-difficulty">
            <option value="">{{ t('comm_offer_diff_none') }}</option>
            <option value="easy">{{ t('comm_offer_diff_easy') }}</option>
            <option value="medium">{{ t('comm_offer_diff_medium') }}</option>
            <option value="hard">{{ t('comm_offer_diff_hard') }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="dim">{{ t('comm_offer_deadline') }}</span>
          <input v-model="form.deadline" type="date" data-testid="offer-deadline" />
        </label>
      </div>
    </template>
    <label v-else class="flex flex-col gap-1 text-xs">
      <span class="dim">{{ t('comm_offer_date') }}</span>
      <input v-model="form.planDate" type="date" data-testid="offer-date" />
    </label>
    <p class="dim m-0 text-xs">{{ t('comm_offer_note') }}</p>
    <p v-if="problem" class="m-0 text-sm" style="color: var(--danger, #e5484d)" role="alert" data-testid="offer-problem">{{ problem }}</p>
    <div class="flex gap-2">
      <button type="submit" :disabled="busy" data-testid="offer-send">{{ t('comm_offer_send') }}</button>
      <button type="button" class="secondary" :disabled="busy" data-testid="offer-cancel" @click="emit('cancel')">{{ t('comm_offer_cancel') }}</button>
    </div>
  </form>
</template>
