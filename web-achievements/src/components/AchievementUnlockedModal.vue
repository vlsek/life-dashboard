<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'
import { achievementCondition, achievementTitle, rewardText } from '../lib/achievementText'
import { RARITY_COLOR, rewardFor, rewardIcon, rewardRarity } from '../lib/rewards'
import type { AchievementState } from '../lib/achievements'

// Поздравление «Новое достижение» (BACKLOG 19:06, по образцу StreakMilestoneModal Дашборда): значок крупно, название, за что,
// тёплая строка по группе. Если открыто сразу несколько — показываем по одному кнопкой «Дальше» («1 из 3»).
// Анимация гасится и общим выключателем (html[data-motion=off] в style.css), и системным prefers-reduced-motion.
const props = defineProps<{ states: AchievementState[] }>()
const emit = defineEmits<{ close: [] }>()

const index = ref(0)
const current = computed(() => props.states[index.value])
const many = computed(() => props.states.length > 1)
const isLast = computed(() => index.value >= props.states.length - 1)
const title = computed(() => (many.value ? t('ach_new_title_many') : t('ach_new_title')))
const counter = computed(() => t('ach_new_counter').replace('{i}', String(index.value + 1)).replace('{n}', String(props.states.length)))
const reward = computed(() => (current.value ? rewardFor(current.value.def.key) : null))
const rarity = computed(() => (reward.value && current.value ? rewardRarity(current.value.def.key) : null))
const message = computed(() => (current.value ? t(('ach_new_msg_' + current.value.def.group) as DictKey) : ''))

function advance() {
  if (isLast.value) emit('close')
  else index.value++
}

const button = ref<HTMLButtonElement | null>(null)
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  button.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="current" class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" data-testid="unlocked-backdrop" @click.self="emit('close')">
    <div
      class="unlock-card w-full max-w-xs rounded-2xl border p-6 text-center"
      style="background: var(--bg-card); border-color: var(--border); color: var(--text)"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      data-testid="achievement-unlocked"
    >
      <div class="dim text-xs" data-testid="unlocked-title">{{ title }}</div>

      <div class="unlock-badge-wrap mt-3">
        <span class="unlock-ring" aria-hidden="true"></span>
        <span class="unlock-ring unlock-ring-2" aria-hidden="true"></span>
        <div class="unlock-badge flex h-24 w-24 items-center justify-center rounded-full text-5xl" :key="current.def.key" data-testid="unlocked-badge">
          <Icon :name="current.def.icon" />
        </div>
      </div>

      <div class="mt-3 text-xl font-bold" style="color: var(--accent)" data-testid="unlocked-name">{{ achievementTitle(current.def) }}</div>
      <div class="dim mt-0.5 text-sm" data-testid="unlocked-condition">{{ achievementCondition(current.def) }}</div>
      <p class="mt-3 text-sm" data-testid="unlocked-message">{{ message }}</p>
      <div v-if="reward" class="mt-2 flex items-center justify-center gap-1 text-sm" style="color: var(--accent)" data-testid="unlocked-reward">
        <Icon :name="rewardIcon(reward)" />
        <span>{{ rewardText(reward) }}</span>
      </div>
      <div v-if="rarity" class="dim mt-0.5 flex items-center justify-center gap-1 text-xs" :data-rarity="rarity" data-testid="unlocked-rarity">
        <span class="inline-block h-2 w-2 rounded-full" :style="{ background: RARITY_COLOR[rarity] }" aria-hidden="true"></span>
        <span>{{ t(('ach_rarity_' + rarity) as DictKey) }}</span>
      </div>
      <div v-if="many" class="dim mt-2 text-xs" data-testid="unlocked-counter">{{ counter }}</div>

      <button ref="button" type="button" class="mt-4 w-full rounded-lg px-4 py-2" style="background: var(--accent); color: var(--accent-text)" data-testid="unlocked-next" @click="advance">
        {{ isLast ? t('ach_new_close') : t('ach_new_next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.unlock-card {
  animation: unlock-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.unlock-badge-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
}
.unlock-badge {
  position: relative;
  border: 3px solid var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 60%, transparent));
  animation: unlock-stamp 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
}
.unlock-ring {
  position: absolute;
  inset: 8px;
  border-radius: 9999px;
  border: 2px solid var(--accent);
  opacity: 0;
  animation: unlock-ring 1.6s ease-out 0.4s 2 both;
}
.unlock-ring-2 {
  animation-delay: 1s;
}
@keyframes unlock-pop {
  from { opacity: 0; transform: scale(0.85) translateY(12px); }
  to { opacity: 1; transform: none; }
}
@keyframes unlock-stamp {
  0% { opacity: 0; transform: scale(0.3) rotate(-12deg); }
  60% { opacity: 1; transform: scale(1.15) rotate(3deg); }
  100% { opacity: 1; transform: none; }
}
@keyframes unlock-ring {
  0% { opacity: 0.7; transform: scale(0.7); }
  100% { opacity: 0; transform: scale(1.4); }
}
@media (prefers-reduced-motion: reduce) {
  .unlock-card,
  .unlock-badge {
    animation: none;
  }
  .unlock-ring {
    display: none;
  }
}
</style>
