<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import { DEFAULT_SPARKS_COST, rubPerSpark, rubToSparks, sparksMode } from '../lib/sparks'
import { SCALES, suggestPrice, type ScaleId } from '../lib/priceScale'
import { selectableGoals, type GoalLite } from '../lib/goalReward'
import type { ShopItem, ShopItemFormInput } from '../lib/types'

const props = defineProps<{ existing: ShopItem | null; uploadImage: (file: File) => Promise<string | null>; dailyRate?: number; goals?: GoalLite[]; error?: string | null }>()
const emit = defineEmits<{ close: []; save: [res: ShopItemFormInput] }>()

const name = ref(props.existing?.name ?? '')
const link = ref(props.existing?.link ?? '')
const cost = ref(props.existing?.cost ?? (sparksMode.value ? DEFAULT_SPARKS_COST : 100))
// Калькулятор (режим огоньков): цена в рублях → огоньки по курсу из настроек; поле цены можно поправить вручную
const rub = ref<number | null>(null)
function onRub() {
  const n = rubToSparks(Number(rub.value))
  if (n > 0) cost.value = n
}
// Масштаб покупки (58.4): только у НОВОЙ вещи; выбор подставляет «справедливую» цену, которую можно поправить руками
const scale = ref<ScaleId | null>(null)
function pickScale(id: ScaleId) {
  scale.value = id
  cost.value = suggestPrice(id, props.dailyRate ?? 0)
}
// BACKLOG 68.2: «За огоньки / За цель». За цель — привязать СВОЮ ещё не выполненную цель; цена не нужна. У полученной награды способ не меняется.
const claimed = computed(() => !!props.existing?.redeemed)
const mode = ref<'cost' | 'goal'>(props.existing?.goal_id ? 'goal' : 'cost')
const goalId = ref<string>(props.existing?.goal_id ?? '')
const goalList = computed(() => {
  const list = selectableGoals(props.goals ?? [])
  const cur = props.goals?.find((g) => g.id === props.existing?.goal_id)
  return cur && !list.some((g) => g.id === cur.id) ? [cur, ...list] : list // уже привязанную цель оставляем в списке, даже если она выполнена
})
const showMode = computed(() => !claimed.value && (goalList.value.length > 0 || mode.value === 'goal'))
const formError = ref<string | null>(null)
const imageUrl = ref<string | null>(props.existing?.image_url ?? null)
const uploading = ref(false)
const uploadError = ref<string | null>(null)

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = null
  try {
    const url = await props.uploadImage(file)
    if (url) imageUrl.value = url
  } catch (err) {
    // Понятный текст вместо сырого «Failed to fetch» / адреса Supabase; подробности — в консоль
    uploadError.value = friendlyError(err, 'upload')
  } finally {
    uploading.value = false
    input.value = '' // чтобы повторный выбор того же файла снова запускал загрузку
  }
}

function save() {
  if (!name.value.trim()) return
  formError.value = null
  const byGoal = !claimed.value && mode.value === 'goal'
  if (byGoal && !goalId.value) {
    formError.value = t('shop_goal_required')
    return
  }
  emit('save', { name: name.value, link: link.value, cost: cost.value, image_url: imageUrl.value, goal_id: byGoal ? goalId.value : null })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ props.existing ? t('shop_edit_title') : t('shop_new_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('shop_field_name') }}</label>
      <input v-model="name" type="text" class="w-full" />

      <label class="mt-2 block text-sm">{{ t('shop_field_link') }}</label>
      <input v-model="link" type="text" class="w-full" placeholder="https://..." />

      <div v-if="showMode" class="mt-2" data-testid="pay-mode">
        <label class="block text-sm">{{ t('shop_pay_label') }}</label>
        <div class="mt-1 flex gap-1" role="radiogroup" :aria-label="t('shop_pay_label')">
          <button type="button" role="radio" :aria-checked="mode === 'cost'" class="secondary min-h-11 flex-1 px-2 py-1 text-sm" :style="mode === 'cost' ? 'border-color: var(--accent); color: var(--accent)' : ''" data-testid="pay-cost" @click="mode = 'cost'">{{ sparksMode ? t('shop_pay_sparks') : t('shop_pay_points') }}</button>
          <button type="button" role="radio" :aria-checked="mode === 'goal'" class="secondary min-h-11 flex-1 px-2 py-1 text-sm" :style="mode === 'goal' ? 'border-color: var(--accent); color: var(--accent)' : ''" data-testid="pay-goal" @click="mode = 'goal'">{{ t('shop_pay_goal') }}</button>
        </div>
      </div>

      <div v-if="!claimed && mode === 'goal'" class="mt-2" data-testid="goal-pick">
        <label class="block text-sm" for="shop-goal-select">{{ t('shop_goal_pick_label') }}</label>
        <select id="shop-goal-select" v-model="goalId" class="w-full" data-testid="goal-select">
          <option value="" disabled>{{ t('shop_goal_pick_ph') }}</option>
          <option v-for="g in goalList" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <p v-if="goalList.length === 0" class="dim mb-0 mt-1 text-xs" data-testid="goal-none">{{ t('shop_goal_none') }}</p>
        <p class="dim mb-0 mt-1 text-xs">{{ t('shop_goal_hint') }}</p>
      </div>

      <template v-if="claimed || mode === 'cost'">
      <div v-if="!props.existing" class="mt-2" data-testid="scale">
        <label class="block text-sm">{{ t('shop_scale_label') }}</label>
        <div class="mt-1 flex flex-col gap-1" role="radiogroup" :aria-label="t('shop_scale_label')">
          <button v-for="s in SCALES" :key="s.id" type="button" role="radio" :aria-checked="scale === s.id" class="secondary flex items-center justify-between gap-2 px-2 py-1 text-left text-sm" :style="scale === s.id ? 'border-color: var(--accent); color: var(--accent)' : ''" :data-scale="s.id" data-testid="scale-step" @click="pickScale(s.id)">
            <span><b>{{ t(('shop_scale_' + s.id) as 'shop_scale_tiny') }}</b> <span class="dim text-xs">— {{ t(('shop_scale_' + s.id + '_ex') as 'shop_scale_tiny_ex') }}</span></span>
            <span class="dim whitespace-nowrap text-xs">{{ suggestPrice(s.id, props.dailyRate ?? 0) }}</span>
          </button>
        </div>
        <p class="dim mb-0 mt-1 text-xs">{{ t('shop_scale_hint') }}</p>
      </div>

      <label class="mt-2 block text-sm">{{ sparksMode ? t('shop_field_cost_sparks') : t('shop_field_cost') }}</label>
      <input v-model.number="cost" type="number" class="w-full" data-testid="cost-input" />
      <div v-if="sparksMode" class="mt-1.5 flex flex-wrap items-center gap-2 text-sm" data-testid="calc-row">
        <label class="dim">{{ t('shop_calc_label') }}</label>
        <input v-model.number="rub" type="number" min="0" class="w-28" placeholder="₽" data-testid="rub-input" @input="onRub" />
        <span class="dim text-xs">{{ t('shop_calc_hint').replace('{rate}', String(rubPerSpark)) }}</span>
      </div>
      </template>

      <label class="mt-2 block text-sm">{{ t('shop_field_image') }}</label>
      <input v-model="imageUrl" type="text" class="w-full" placeholder="https://..." />
      <input type="file" accept="image/*" class="mt-2 block text-sm" @change="onFileChange" />
      <p v-if="uploading" class="dim mt-1 text-xs" data-test="shop-uploading">{{ t('shop_uploading') }}</p>
      <p v-if="uploadError" class="mt-1 text-xs" style="color: var(--danger)" role="alert" data-test="shop-upload-error">{{ uploadError }}</p>
      <img v-if="imageUrl" :src="imageUrl" class="mt-2 max-h-32 max-w-full rounded-lg object-cover" />

      <p v-if="formError || props.error" class="mt-2 text-sm" style="color: var(--danger)" role="alert" data-testid="form-error">{{ formError || props.error }}</p>
      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
