<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useAchievements } from './lib/useAchievements'
import { achievementTitle, rewardText } from './lib/achievementText'
import { rewardFor } from './lib/rewards'
import { BG_MSG_DONE, BG_MSG_NEW, postToParent, type BgItem } from './lib/bgMode'

// Невидимая «версия» страницы для фоновой проверки (BACKLOG 52.1 срез 2): ничего не рисует, по окончании загрузки сообщает шапке-родителю новое.
const { states, hiddenStates, newlyUnlocked, error, loading, init } = useAchievements()
onMounted(init)

watch(loading, (isLoading) => {
  if (isLoading) return
  if (!error.value && newlyUnlocked.value.length) {
    const all = [...states.value, ...hiddenStates.value]
    const items: BgItem[] = newlyUnlocked.value
      .map((k) => all.find((s) => s.def.key === k))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => {
        const r = rewardFor(s.def.key)
        return { key: s.def.key, title: achievementTitle(s.def), reward: r ? rewardText(r) : null }
      })
    if (items.length) postToParent({ type: BG_MSG_NEW, items })
  }
  postToParent({ type: BG_MSG_DONE })
})
</script>

<template>
  <div aria-hidden="true" data-testid="bg-app"></div>
</template>
