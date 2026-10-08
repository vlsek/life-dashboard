<script setup lang="ts">
import Icon from './Icon.vue'
import { useSparks } from '../lib/useSparks'
import { formatPoints } from '../lib/pointsFloat'
import { getLang, t } from '../lib/i18n'

// Баланс «огоньков стриков» рядом с монетами в «Профиле» (BACKLOG 46.3). Клик — в Магазин, где огоньки тратятся. Скрыт, пока миграция 057 не применена.
const { sparks } = useSparks()
</script>

<template>
  <a v-if="sparks !== null" href="/shop/" class="flex items-center gap-1 font-bold" style="color: inherit; text-decoration: none" :title="t('dash_sparks_title')" data-test="sparks-balance">
    <Icon name="flame" extra-style="color: var(--accent);" /> {{ formatPoints(sparks, getLang()) }}
  </a>
</template>
