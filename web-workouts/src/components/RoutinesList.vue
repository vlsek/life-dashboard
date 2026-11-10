<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { useRoutines } from '../lib/useRoutines'
import { confirmDialog } from '../lib/confirmDialog'
import { archivedRoutines, routineGroups, type Routine } from '../lib/routines'
import type { Exercise } from '../lib/types'

// Список рутин на странице (BACKLOG 69.7, срез 1): карточка = название, упражнения кратко, «Начать». Старт из рутины делает App.vue.
const props = defineProps<{ exercises: Exercise[]; disabled: boolean }>()
const emit = defineEmits<{ start: [Routine] }>()
const rt = useRoutines()
const names = computed(() => new Map(props.exercises.map((e) => [e.id, e.name])))
const brief = (r: Routine) => r.items.map((i) => names.value.get(i.exercise_id)).filter(Boolean).slice(0, 3).join(' · ')
const groups = computed(() => routineGroups(rt.routines.value))
const archived = computed(() => archivedRoutines(rt.routines.value))
const showArchive = ref(false)
const menuFor = ref<string | null>(null) // карточка с открытым меню «⋯» (69.17, срез 7): копировать/папка/архив/удалить не рядом с «Начать»
const toggleMenu = (id: string) => (menuFor.value = menuFor.value === id ? null : id)
const folderFor = ref<string | null>(null)
const folderText = ref('')
const knownFolders = computed(() => [...new Set(rt.routines.value.map((r) => r.folder).filter((f): f is string => !!f))])
function openFolder(r: Routine) { menuFor.value = null; folderFor.value = folderFor.value === r.id ? null : r.id; folderText.value = r.folder ?? '' }
function saveFolder(r: Routine) { rt.setFolder(r.id, folderText.value); folderFor.value = null }
async function remove(r: Routine) {
  menuFor.value = null
  if (await confirmDialog(t('rt_confirm_delete').replace('{name}', r.name))) rt.remove(r.id)
}
</script>

<template>
  <section v-if="rt.routines.value.length" class="mb-4" data-testid="routines">
    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">{{ t('rt_title') }}</h2>
    <div v-for="g in groups" :key="g.folder ?? '_none'" class="mb-2" :data-testid="'routine-group-' + (g.folder ?? 'none')">
      <h3 v-if="g.folder" class="mb-1 text-xs font-semibold" style="color: var(--text-dim)">📁 {{ g.folder }}</h3>
    <!-- карусель карточек (69.17, срез 3, макет v2): горизонтальная прокрутка с привязкой; на ПК карточки фиксированной ширины -->
      <div class="-mx-4 flex scroll-pl-4 snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1" data-testid="routines-carousel">
        <div v-for="r in g.routines" :key="r.id" class="flex w-[72%] shrink-0 snap-start flex-col rounded-xl border p-3 sm:w-64" style="border-color: var(--border); background: var(--bg-card)" :data-testid="'routine-' + r.id" @keydown.esc="menuFor = null">
          <div class="truncate font-semibold">{{ r.name }}</div>
          <div class="text-xs" style="color: var(--text-dim)">{{ t('rt_count').replace('{n}', String(r.items.length)) }}</div>
          <div class="mt-1 line-clamp-2 min-h-[2rem] text-xs" style="color: var(--text-dim)" data-testid="routine-brief">{{ brief(r) }}</div>
          <div class="mt-2 flex items-center gap-1">
            <button type="button" class="flex-1 rounded-lg px-4 py-2 text-sm font-bold" style="background: var(--accent); color: var(--accent-text); min-height: 44px" :disabled="disabled" :data-testid="'routine-start-' + r.id" @click="emit('start', r)">{{ t('rt_start') }}</button>
            <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_menu')" :aria-expanded="menuFor === r.id" :data-testid="'routine-menu-' + r.id" @click="toggleMenu(r.id)">⋯</button>
          </div>
          <div v-show="menuFor === r.id" class="mt-1 flex items-center justify-end gap-1 border-t pt-1" style="border-color: var(--border)" role="group" :aria-label="t('rt_menu')" :data-testid="'routine-menu-items-' + r.id">
              <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_duplicate')" :data-testid="'routine-dup-' + r.id" @click="menuFor = null; rt.duplicate(r.id, t('rt_copy_suffix'))">⧉</button>
              <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_folder')" :data-testid="'routine-folder-' + r.id" @click="openFolder(r)">📁</button>
              <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_archive')" :data-testid="'routine-archive-' + r.id" @click="menuFor = null; rt.setArchived(r.id, true)">▤</button>
              <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_delete')" :data-testid="'routine-del-' + r.id" @click="remove(r)">✕</button>
          </div>
          <form v-if="folderFor === r.id" class="mt-2 flex gap-1" @submit.prevent="saveFolder(r)">
            <input v-model="folderText" list="rt-folders" maxlength="60" class="min-w-0 flex-1 rounded border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" :placeholder="t('rt_folder_ph')" :data-testid="'routine-folder-input-' + r.id" />
            <button type="submit" class="rounded border px-2 text-sm" style="border-color: var(--border); color: var(--accent)" :data-testid="'routine-folder-save-' + r.id">OK</button>
          </form>
        </div>
      </div>
    </div>
    <datalist id="rt-folders"><option v-for="f in knownFolders" :key="f" :value="f" /></datalist>
    <div v-if="archived.length" class="mt-1" data-testid="routines-archive">
      <button type="button" class="text-xs underline" style="color: var(--text-dim); min-height: 32px" data-testid="routines-archive-toggle" @click="showArchive = !showArchive">{{ t('rt_archive_title').replace('{n}', String(archived.length)) }}</button>
      <ul v-if="showArchive" class="m-0 list-none p-0">
        <li v-for="r in archived" :key="r.id" class="flex items-center gap-2 py-1 text-sm" :data-testid="'routine-archived-' + r.id">
          <span class="min-w-0 flex-1 truncate">{{ r.name }}</span>
          <button type="button" class="text-xs underline" style="color: var(--accent); min-height: 36px" :data-testid="'routine-restore-' + r.id" @click="rt.setArchived(r.id, false)">{{ t('rt_restore') }}</button>
          <button type="button" class="px-2" style="color: var(--text-dim); min-height: 36px" :aria-label="t('rt_delete')" :data-testid="'routine-del-' + r.id" @click="remove(r)">✕</button>
        </li>
      </ul>
    </div>
    <p v-if="!rt.synced.value" class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('rt_device_note') }}</p>
  </section>
</template>
