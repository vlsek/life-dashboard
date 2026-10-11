<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { circleGeometry } from '../lib/ringPlacement'
import type { RingData } from '../lib/ringPlacement'
import { t } from '../lib/i18n'
import { stripEmoji } from '../lib/emojiText'
import { frameRing } from '../lib/frameRing'
import { daySegments, dayTicks, DAY_GLOW_FILTER, DAY_GRADIENT_STOPS } from '../lib/dayGauge'
import { dayGaugeStyle } from '../lib/useDayGauge'

// Колонка аватарки: фото 44px внутри кольца прогресса дня 52px (пустое, если кольца нет), процент
// под ней и шестерёнка настроек в углу — портировано из loadProfileInner() в dashboard.js.
// frame — ключ выбранной рамки: дуга прогресса рисуется её цветами (BACKLOG 43, 9:40); без рамки — обычное кольцо в акценте.
const props = defineProps<{ avatarUrl: string | null | undefined; ring: RingData | null; frame?: string | null }>()
const emit = defineEmits<{ pick: []; settings: [] }>()

const geo = computed(() => (props.ring ? circleGeometry(24, props.ring.basePct, props.ring.bonusPct) : null))
const fr = computed(() => frameRing(props.frame))
const GRAD_ID = 'avatar-ring-grad'
const arcStroke = computed(() => (!fr.value ? 'var(--accent)' : fr.value.stops.length > 1 ? `url(#${GRAD_ID})` : fr.value.stops[0]))
const arcFilter = computed(() => (fr.value?.glow ? `drop-shadow(0 0 3px ${fr.value.glow})` : dayGaugeStyle.value === 'glow' ? DAY_GLOW_FILTER : undefined)) // свечение вида «Кастомизации» уступает свечению рамки
const tickList = computed(() => (props.ring ? dayTicks(26, 26, 24, props.ring.basePct) : []))
const gradOn = computed(() => dayGaugeStyle.value === 'gradient' && !fr.value) // рамка со своими цветами главнее
const segs = computed(() => (props.ring ? daySegments(26, 26, 24, props.ring.basePct, props.ring.bonusPct) : []))
</script>

<template>
  <div class="flex flex-col items-center gap-[3px]">
    <div class="relative shrink-0" style="width: 52px; height: 52px" :title="ring?.title ?? ''">
      <button
        type="button"
        class="absolute rounded-full p-0"
        style="top: 4px; left: 4px; width: 44px; height: 44px; background: transparent; border: 0; min-height: 0"
        :title="stripEmoji(t('dash_photo_btn'))"
        @click="emit('pick')"
      >
        <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-11 w-11 rounded-full border-2 object-cover" style="border-color: var(--border); background: var(--bg)" />
        <span v-else class="flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl" style="border-color: var(--border); background: var(--bg)"><Icon name="user" /></span>
      </button>

      <svg v-if="ring && geo" class="pointer-events-none absolute inset-0" width="52" height="52" viewBox="0 0 52 52" style="transform: rotate(-90deg)" data-test="avatar-ring" :data-frame="fr ? frame : null">
        <defs v-if="fr && fr.stops.length > 1">
          <linearGradient :id="GRAD_ID" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="52" y2="52">
            <stop v-for="(c, i) in fr.stops" :key="i" :offset="`${Math.round((i / (fr.stops.length - 1)) * 100)}%`" :stop-color="c" />
          </linearGradient>
        </defs>
        <template v-if="dayGaugeStyle === 'dashed'">
          <g v-for="(sg, i) in segs" :key="i" data-test="avatar-ring-seg">
            <path :d="sg.d" fill="none" stroke="var(--border)" stroke-width="3" />
            <path v-if="sg.base" :d="sg.d" fill="none" :stroke="arcStroke" :class="fr?.anim" :style="arcFilter ? { filter: arcFilter } : undefined" stroke-width="3" data-test="avatar-ring-arc" />
            <path v-if="sg.bonus" :d="sg.d" fill="none" class="ring-bonus" stroke-width="1.4" />
          </g>
        </template>
        <template v-else>
          <defs v-if="gradOn"><linearGradient id="day-grad-a" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="52" y2="52"><stop offset="0%" :stop-color="DAY_GRADIENT_STOPS[0]" /><stop offset="100%" :stop-color="DAY_GRADIENT_STOPS[1]" /></linearGradient></defs>
          <circle cx="26" cy="26" r="24" fill="none" stroke="var(--border)" :stroke-width="dayGaugeStyle === 'ticks' ? 1.6 : 3" />
          <circle cx="26" cy="26" r="24" fill="none" :stroke="gradOn ? 'url(#day-grad-a)' : arcStroke" :class="fr?.anim" :style="arcFilter ? { filter: arcFilter } : undefined" :stroke-width="dayGaugeStyle === 'ticks' ? 2.4 : 3" stroke-linecap="round" :stroke-dasharray="geo.circumference" :stroke-dashoffset="geo.offsetBase" data-test="avatar-ring-arc" />
          <circle v-if="ring.bonusPct > 0" cx="26" cy="26" r="24" fill="none" class="ring-bonus" :stroke-width="dayGaugeStyle === 'ticks' ? 2.4 : 3" stroke-linecap="round" :stroke-dasharray="geo.circumference" :stroke-dashoffset="geo.offsetBonus" />
          <g v-if="dayGaugeStyle === 'ticks'" data-test="day-ticks"><line v-for="(tk, i) in tickList" :key="i" :x1="tk.x1" :y1="tk.y1" :x2="tk.x2" :y2="tk.y2" :stroke="tk.lit ? 'var(--accent)' : 'var(--border)'" stroke-width="1.4" /></g>
        </template>
      </svg>

      <button
        type="button"
        class="absolute flex items-center justify-center rounded-full p-0"
        style="bottom: -3px; right: -3px; width: 19px; height: 19px; min-height: 0; background: var(--accent); color: var(--accent-text); border: 2px solid var(--bg); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45); font-size: 11px; line-height: 1"
        :title="stripEmoji(t('dash_day_progress_settings_title'))"
        data-test="avatar-gear"
        @click.stop="emit('settings')"
      >
        <Icon name="gear" />
      </button>
    </div>
    <div v-if="ring" class="dim whitespace-nowrap text-center" style="font-size: 0.72em">{{ ring.totalPct }}%</div>
  </div>
</template>
