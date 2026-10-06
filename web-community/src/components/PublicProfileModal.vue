<script setup lang="ts">
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import { badgeDef } from '../lib/badges'
import { formatPoints } from '../lib/leaderboardView'
import { t } from '../lib/i18n'

// Раскрытый профиль (BACKLOG 395): ВСЕ открытые достижения человека — в ленте он показывает только выбранные (до 5).
// Данные приходят из RPC get_public_badges (миграция 047): только для тех, кто виден в лидерборде («публичный профиль»);
// у скрытого профиля достижений нет — показываем пояснение, а не пустую сетку.
defineProps<{ name: string; avatarUrl: string | null; frame?: string | null; keys: string[]; points: number | null; streak: number }>()
const emit = defineEmits<{ close: [] }>()
const title = (key: string) => t(('comm_badge_' + key) as never)
</script>

<template>
  <div class="modal-backdrop" data-testid="public-profile" @click.self="emit('close')">
    <div class="modal">
      <div class="flex items-center gap-3">
        <Avatar :name="name" :url="avatarUrl" :size="56" :frame="frame" />
        <div class="min-w-0 flex-1">
          <h3 class="m-0 truncate" data-testid="public-profile-name">{{ name }}</h3>
          <p v-if="points !== null" class="dim m-0 text-sm">
            <span v-if="streak > 0"><Icon name="flame" />{{ streak }} · </span>{{ formatPoints(points) }} <Icon name="star" />
          </p>
        </div>
      </div>

      <h4 class="mb-1 mt-4 text-sm font-medium">{{ t('comm_badges_title') }}<span v-if="keys.length" class="dim font-normal"> · {{ t('comm_profile_unlocked') }} {{ keys.length }}</span></h4>
      <p v-if="keys.length === 0" class="dim m-0 text-sm" data-testid="public-profile-empty">{{ t('comm_profile_no_badges') }}</p>
      <div v-else class="grid gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); max-height: 50vh; overflow-y: auto" data-testid="public-profile-badges">
        <div v-for="k in keys" :key="k" class="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm" style="border-color: var(--border)" data-testid="public-badge">
          <span class="inline-flex flex-shrink-0 items-center justify-center rounded-full" :style="{ width: '24px', height: '24px', fontSize: '14px', background: 'var(--bg-input, rgba(127,127,127,.15))', color: 'var(--accent)' }"><Icon :name="badgeDef(k)?.icon ?? 'trophy'" /></span>
          <span class="min-w-0 truncate">{{ title(k) }}</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="secondary" data-testid="public-profile-close" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
