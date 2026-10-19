<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { MAX_LOOKS, NAME_MAX, type Look } from '../lib/looks'

// «Образы» (BACKLOG 64.1, срез 5b): список сохранённых сочетаний и «Сохранить текущий вид». Сам ничего не пишет — только сообщает наверх.
const props = defineProps<{ looks: Look[]; busy: boolean; error: string | null }>()
const emit = defineEmits<{ save: [name: string]; wear: [id: string]; rename: [id: string, name: string]; remove: [id: string] }>()
const name = ref('')
const renaming = ref<string | null>(null)
const renameText = ref('')
const sure = ref<string | null>(null)
const full = computed(() => props.looks.length >= MAX_LOOKS)
function save() {
  if (full.value || props.busy) return
  emit('save', name.value)
  name.value = ''
}
function startRename(l: Look) {
  renaming.value = l.id
  renameText.value = l.name
  sure.value = null
}
function doRename() {
  if (renaming.value && renameText.value.trim()) emit('rename', renaming.value, renameText.value)
  renaming.value = null
}
function remove(id: string) {
  if (sure.value !== id) {
    sure.value = id // первое нажатие — «Точно?», второе — удаляет
    return
  }
  sure.value = null
  emit('remove', id)
}
</script>

<template>
  <div data-testid="looks-panel">
    <p class="dim mb-3 text-xs">{{ t('cust_looks_hint') }}</p>
    <div class="mb-3 flex gap-2">
      <input
        v-model="name"
        type="text"
        class="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm"
        style="background: var(--bg-card); color: var(--text); border-color: var(--border)"
        :maxlength="NAME_MAX"
        :placeholder="t('cust_look_name_ph')"
        :aria-label="t('cust_look_name_ph')"
        :disabled="full"
        data-testid="look-name"
        @keyup.enter="save"
      />
      <button type="button" class="shrink-0 px-3 py-1.5 text-sm" :disabled="full || busy" data-testid="look-save" @click="save">{{ t('cust_look_save') }}</button>
    </div>
    <p v-if="full" class="dim mb-3 text-xs" data-testid="look-full">{{ t('cust_look_full') }}</p>
    <p v-if="error" class="mb-3 text-sm" style="color: var(--danger)" role="alert" data-testid="look-error">{{ error }}</p>
    <p v-if="!looks.length" class="dim text-sm" data-testid="look-empty">{{ t('cust_look_empty') }}</p>
    <ul class="m-0 flex list-none flex-col gap-2 p-0">
      <li v-for="l in looks" :key="l.id" class="rounded-xl border p-3" style="background: var(--bg-card); border-color: var(--border)" :data-testid="'look-' + l.id">
        <div v-if="renaming === l.id" class="flex gap-2">
          <input v-model="renameText" type="text" class="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm" style="background: var(--bg-card); color: var(--text); border-color: var(--border)" :maxlength="NAME_MAX" data-testid="look-rename-input" @keyup.enter="doRename" />
          <button type="button" class="shrink-0 px-3 py-1.5 text-sm" data-testid="look-rename-ok" @click="doRename">{{ t('cust_look_ok') }}</button>
        </div>
        <p v-else class="m-0 mb-2 text-sm font-medium" data-testid="look-title">{{ l.name }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="px-3 py-1.5 text-sm" :disabled="busy" data-testid="look-wear" @click="emit('wear', l.id)">{{ t('cust_look_wear') }}</button>
          <button type="button" class="secondary px-3 py-1.5 text-sm" data-testid="look-rename" @click="startRename(l)">{{ t('cust_look_rename') }}</button>
          <button type="button" class="secondary px-3 py-1.5 text-sm" data-testid="look-delete" @click="remove(l.id)">{{ sure === l.id ? t('cust_look_delete_sure') : t('cust_look_delete') }}</button>
        </div>
      </li>
    </ul>
  </div>
</template>
