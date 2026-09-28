<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { circleGeometry } from '../lib/ringPlacement'
import type { RingData } from '../lib/ringPlacement'
import { t } from '../lib/i18n'

// Колонка аватарки: фото 44px внутри кольца прогресса дня 52px (пустое, если кольца нет), процент
// под ней и шестерёнка настроек в углу — портировано из loadProfileInner() в dashboard.js.
const props = defineProps<{ avatarUrl: string | null | undefined; ring: RingData | null }>()
const emit = defineEmits<{ pick: []; settings: [] }>()

const geo = computed(() => (props.ring ? circleGeometry(24, props.ring.basePct, props.ring.bonusPct) : null))
</script>

<template>
  <div class="flex flex-col items-center gap-[3px]">
    <div class="relative shrink-0" style="width: 52px; height: 52px" :title="ring?.title ?? ''">
      <button
        type="button"
        class="absolute rounded-full p-0"
        style="top: 4px; left: 4px; width: 44px; height: 44px; background: transparent; border: 0; min-height: 0"
        :title="t('dash_photo_btn')"
        @click="emit('pick')"
      >
        <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-11 w-11 rounded-full border-2 object-cover" style="border-color: var(--border); background: var(--bg)" />
        <span v-else class="flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl" style="border-color: var(--border); background: var(--bg)"><Icon name="user" /></span>
      </button>

      <svg v-if="ring && geo" class="pointer-events-none absolute inset-0" width="52" height="52" viewBox="0 0 52 52" style="transform: rotate(-90deg)" data-test="avatar-ring">
        <circle cx="26" cy="26" r="24" fill="none" stroke="var(--border)" stroke-width="3" />
        <circle cx="26" cy="26" r="24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" :stroke-dasharray="geo.circumference" :stroke-dashoffset="geo.offsetBase" />
        <circle v-if="ring.bonusPct > 0" cx="26" cy="26" r="24" fill="none" stroke="#d6336c" stroke-width="3" stroke-linecap="round" :stroke-dasharray="geo.circumference" :stroke-dashoffset="geo.offsetBonus" />
      </svg>

      <button
        type="button"
        class="absolute flex items-center justify-center rounded-full p-0"
        style="bottom: -3px; right: -3px; width: 19px; height: 19px; min-height: 0; background: var(--accent); color: var(--accent-text); border: 2px solid var(--bg); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45); font-size: 11px; line-height: 1"
        :title="t('dash_day_progress_settings_title')"
        data-test="avatar-gear"
        @click.stop="emit('settings')"
      >
        <Icon name="gear" />
      </button>
    </div>
    <div v-if="ring" class="dim whitespace-nowrap text-center" style="font-size: 0.72em">{{ ring.totalPct }}%</div>
  </div>
</template>
