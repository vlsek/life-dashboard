<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import { DEFAULT_SPARKS_COST, rubPerSpark, rubToSparks, sparksMode } from '../lib/sparks'
import type { ShopItem, ShopItemFormInput } from '../lib/types'

const props = defineProps<{ existing: ShopItem | null; uploadImage: (file: File) => Promise<string | null> }>()
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
  emit('save', { name: name.value, link: link.value, cost: cost.value, image_url: imageUrl.value })
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

      <label class="mt-2 block text-sm">{{ sparksMode ? t('shop_field_cost_sparks') : t('shop_field_cost') }}</label>
      <input v-model.number="cost" type="number" class="w-full" data-testid="cost-input" />
      <div v-if="sparksMode" class="mt-1.5 flex flex-wrap items-center gap-2 text-sm" data-testid="calc-row">
        <label class="dim">{{ t('shop_calc_label') }}</label>
        <input v-model.number="rub" type="number" min="0" class="w-28" placeholder="₽" data-testid="rub-input" @input="onRub" />
        <span class="dim text-xs">{{ t('shop_calc_hint').replace('{rate}', String(rubPerSpark)) }}</span>
      </div>

      <label class="mt-2 block text-sm">{{ t('shop_field_image') }}</label>
      <input v-model="imageUrl" type="text" class="w-full" placeholder="https://..." />
      <input type="file" accept="image/*" class="mt-2 block text-sm" @change="onFileChange" />
      <p v-if="uploading" class="dim mt-1 text-xs" data-test="shop-uploading">{{ t('shop_uploading') }}</p>
      <p v-if="uploadError" class="mt-1 text-xs" style="color: var(--danger)" role="alert" data-test="shop-upload-error">{{ uploadError }}</p>
      <img v-if="imageUrl" :src="imageUrl" class="mt-2 max-h-32 max-w-full rounded-lg object-cover" />

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
