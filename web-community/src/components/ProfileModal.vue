<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { badgeDef } from '../lib/badges'
import { FEED_MAX, canPickMore, normalizeFeedPick, togglePick } from '../lib/achievementFeed'
import { t } from '../lib/i18n'
import type { PublicProfile } from '../lib/types'
import { NAME_MAX, cleanProfileName } from '../lib/profileName'

// feedApi — есть ли миграция 052 (без неё выбор для ленты скрыт); unlocked — мои открытые значки; feedPick — уже выбранные для ленты.
const props = defineProps<{ initial: PublicProfile; unlocked?: string[]; feedPick?: string[]; feedApi?: boolean }>()
const emit = defineEmits<{ close: []; save: [name: string, visible: boolean, feedPick: string[]] }>()

// Выбор для ленты (BACKLOG 395): до 5 своих открытых достижений; остальные видны только в раскрытом публичном профиле.
const pick = ref<string[]>(normalizeFeedPick(props.feedPick))
const titleOf = (key: string) => t(('comm_badge_' + key) as never)
const full = computed(() => !canPickMore(pick.value))
const pickable = computed(() => (props.unlocked ?? []).filter((k) => !!badgeDef(k)))
function onPick(key: string) {
  pick.value = togglePick(pick.value, key)
}

const name = ref(props.initial.display_name ?? '')
const visible = ref(props.initial.leaderboard_visible !== false)
// Имя обязательно (BACKLOG 841): пустое не сохраняем
const nameError = ref(false)
function onSave() {
  const clean = cleanProfileName(name.value)
  if (!clean) {
    nameError.value = true
    return
  }
  emit('save', clean, visible.value, pick.value)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('comm_public_profile_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('comm_display_name_label') }}</label>
      <input v-model="name" type="text" :maxlength="NAME_MAX" class="w-full" data-testid="profile-name-input" @input="nameError = false" />
      <p v-if="nameError" class="mb-0 mt-1 text-xs" style="color: var(--danger)" data-testid="profile-name-error">{{ t('comm_name_required') }}</p>

      <label class="mt-3.5 flex items-center gap-2 text-sm">
        <input v-model="visible" type="checkbox" />
        {{ t('comm_visibility_label') }}
      </label>
      <p class="dim mt-1.5 text-xs">{{ t('comm_visibility_hint') }}</p>

      <template v-if="feedApi">
        <h4 class="mb-1 mt-4 text-sm font-medium">{{ t('comm_feed_pick_h') }}</h4>
        <p class="dim mb-2 mt-0 text-xs">{{ t('comm_feed_pick_hint') }}</p>
        <p v-if="pickable.length === 0" class="dim m-0 text-xs" data-testid="feed-pick-none">{{ t('comm_feed_pick_none') }}</p>
        <template v-else>
          <div class="flex flex-wrap gap-1.5" style="max-height: 38vh; overflow-y: auto" data-testid="feed-pick-list">
            <label
              v-for="k in pickable"
              :key="k"
              class="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs"
              :style="{ borderColor: pick.includes(k) ? 'var(--accent)' : 'var(--border)', opacity: !pick.includes(k) && full ? 0.5 : 1 }"
              :data-testid="'feed-pick-' + k"
            >
              <input type="checkbox" :checked="pick.includes(k)" :disabled="!pick.includes(k) && full" @change="onPick(k)" />
              <Icon :name="badgeDef(k)?.icon ?? 'trophy'" />{{ titleOf(k) }}
            </label>
          </div>
          <p class="dim mb-0 mt-1.5 text-xs" data-testid="feed-pick-count">{{ t('comm_feed_pick_count') }} {{ pick.length }} / {{ FEED_MAX }}<span v-if="full"> · {{ t('comm_feed_pick_max') }}</span></p>
        </template>
      </template>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button data-testid="profile-save" @click="onSave">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
