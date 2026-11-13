<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { useModalA11y } from '../lib/modalA11y'
import { friendlyError } from '../lib/friendlyError'
import { DEFAULT_SPARKS_COST, rubPerSpark, rubToSparks, sparksMode } from '../lib/sparks'
import { SCALES, suggestPrice, type ScaleId } from '../lib/priceScale'
import { selectableGoals, type GoalLite } from '../lib/goalReward'
import { searchImages, type FoundImage } from '../lib/imageSearch'
import type { ShopItem, ShopItemFormInput } from '../lib/types'

const props = defineProps<{ existing: ShopItem | null; uploadImage: (file: File) => Promise<string | null>; dailyRate?: number; goals?: GoalLite[]; error?: string | null; repeatSupported?: boolean }>()
const emit = defineEmits<{ close: []; save: [res: ShopItemFormInput] }>()

// Окно: фокус внутрь, ловушка Tab, Esc = «Отмена», возврат фокуса на кнопку (72.5)
const root = ref<HTMLElement | null>(null)
useModalA11y(root, { onClose: () => emit('close') })

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
const repeatable = ref(!!props.existing?.repeatable)
const showRepeat = computed(() => !!props.repeatSupported && sparksMode.value && !claimed.value && mode.value === 'cost')
const formError = ref<string | null>(null)
const imageUrl = ref<string | null>(props.existing?.image_url ?? null)
// «Найти фото» (BACKLOG 81.6): по названию ищем несколько картинок, тап ставит выбранную
const found = ref<FoundImage[] | null>(null) // null — ещё не искали
const searching = ref(false)
const searchFailed = ref(false)
async function findPhoto() {
  if (searching.value) return
  searching.value = true
  searchFailed.value = false
  const r = await searchImages(name.value)
  searching.value = false
  if (r.ok) found.value = r.images
  else {
    found.value = null
    searchFailed.value = true
  }
}
function pickFound(img: FoundImage) {
  imageUrl.value = img.url
  found.value = null
}
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
  emit('save', { name: name.value, link: link.value, cost: cost.value, image_url: imageUrl.value, goal_id: byGoal ? goalId.value : null, repeatable: showRepeat.value && repeatable.value })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div ref="root" class="modal" role="dialog" aria-modal="true" aria-labelledby="item-form-title">
      <h3 id="item-form-title">{{ props.existing ? t('shop_edit_title') : t('shop_new_title') }}</h3>

      <label class="mt-2 block text-sm" for="item-form-name">{{ t('shop_field_name') }}</label>
      <input id="item-form-name" v-model="name" type="text" class="w-full" />

      <label class="mt-2 block text-sm" for="item-form-link">{{ t('shop_field_link') }}</label>
      <input id="item-form-link" v-model="link" type="text" class="w-full" placeholder="https://..." />

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

      <label class="mt-2 block text-sm" for="item-form-cost">{{ sparksMode ? t('shop_field_cost_sparks') : t('shop_field_cost') }}</label>
      <input id="item-form-cost" v-model.number="cost" type="number" class="w-full" data-testid="cost-input" />
      <div v-if="sparksMode" class="mt-1.5 flex flex-wrap items-center gap-2 text-sm" data-testid="calc-row">
        <label class="dim" for="item-form-rub">{{ t('shop_calc_label') }}</label>
        <input id="item-form-rub" v-model.number="rub" type="number" min="0" class="w-28" placeholder="₽" data-testid="rub-input" @input="onRub" />
        <span class="dim text-xs">{{ t('shop_calc_hint').replace('{rate}', String(rubPerSpark)) }}</span>
      </div>
      <label v-if="showRepeat" class="mt-2 flex items-start gap-2 text-sm" data-testid="repeat-row">
        <input v-model="repeatable" type="checkbox" class="mt-0.5" data-testid="repeat-toggle" />
        <span>{{ t('shop_repeat_label') }}<span class="dim block text-xs">{{ t('shop_repeat_hint') }}</span></span>
      </label>
      </template>

      <label class="mt-2 block text-sm" for="item-form-image">{{ t('shop_field_image') }}</label>
      <input id="item-form-image" v-model="imageUrl" type="text" class="w-full" placeholder="https://..." />
      <input type="file" accept="image/*" class="mt-2 block text-sm" :aria-label="t('shop_field_image')" @change="onFileChange" />
      <p v-if="uploading" class="dim mt-1 text-xs" data-test="shop-uploading">{{ t('shop_uploading') }}</p>
      <p v-if="uploadError" class="mt-1 text-xs" style="color: var(--danger)" role="alert" data-test="shop-upload-error">{{ uploadError }}</p>
      <img v-if="imageUrl" :src="imageUrl" class="mt-2 max-h-32 max-w-full rounded-lg object-cover" />

      <button type="button" class="secondary mt-2 text-sm" :disabled="searching || name.trim().length < 2" data-testid="find-photo" @click="findPhoto">{{ searching ? t('shop_photo_searching') : t('shop_photo_find') }}</button>
      <p v-if="searchFailed" class="mt-1 text-xs" style="color: var(--danger)" role="alert" data-testid="find-photo-error">{{ t('shop_photo_failed') }}</p>
      <p v-else-if="found && !found.length" class="dim mt-1 text-xs" data-testid="find-photo-empty">{{ t('shop_photo_none') }}</p>
      <div v-if="found && found.length" class="mt-2" data-testid="find-photo-results">
        <p class="dim m-0 mb-1 text-xs">{{ t('shop_photo_pick') }}</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="img in found" :key="img.url" type="button" class="rounded-lg border p-0" style="border-color: var(--border); background: transparent" :aria-label="t('shop_photo_use').replace('{t}', img.title || '…')" data-testid="found-photo" @click="pickFound(img)">
            <img :src="img.url" :alt="img.title" class="block h-20 w-20 rounded-lg object-cover" loading="lazy" />
          </button>
        </div>
        <p class="dim m-0 mt-1 text-xs">{{ t('shop_photo_source') }}</p>
      </div>

      <p v-if="formError || props.error" class="mt-2 text-sm" style="color: var(--danger)" role="alert" data-testid="form-error">{{ formError || props.error }}</p>
      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
