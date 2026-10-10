<script setup lang="ts">
import { computed, ref } from 'vue'
import { SECTION_LADDERS } from '../lib/sectionAchievements'
import { t, type DictKey } from '../lib/i18n'

// Сворачиваемый блок внизу страницы раздела (BACKLOG 49.6): лесенки раздела, какие ступени получены. По умолчанию свёрнут.
const props = defineProps<{ section: string; unlocked: ReadonlySet<string> }>()
const open = ref(false)
const ladders = computed(() => SECTION_LADDERS[props.section] || [])
const all = computed(() => ladders.value.flatMap((l) => l.steps))
const got = computed(() => all.value.filter((st) => props.unlocked.has(st.key)).length)
const label = (group: string, n: number) => t(('gh_secach_c_' + group) as DictKey).replace('{n}', String(n))
</script>

<template>
  <section class="gh-secach" data-test="section-achievements">
    <button type="button" class="gh-secach-head" :aria-expanded="open" data-test="secach-toggle" @click="open = !open">
      <span class="gh-secach-chev" :class="{ 'gh-secach-open': open }" aria-hidden="true">▸</span>
      <span class="gh-secach-title">{{ t('gh_secach_title') }}</span>
      <span class="gh-secach-count" data-test="secach-count">{{ got }} / {{ all.length }}</span>
    </button>
    <div v-if="open" class="gh-secach-body" data-test="secach-body">
      <div v-for="l in ladders" :key="l.group" class="gh-secach-ladder">
        <div class="gh-secach-group">{{ t(('gh_secach_g_' + l.group) as DictKey) }}</div>
        <ul class="gh-secach-steps">
          <li v-for="st in l.steps" :key="st.key" :class="{ 'gh-secach-done': unlocked.has(st.key) }" :data-key="st.key" data-test="secach-step">
            <span aria-hidden="true">{{ unlocked.has(st.key) ? '✓' : '○' }}</span> {{ label(l.group, st.target) }}
          </li>
        </ul>
      </div>
      <a class="gh-secach-link" href="/achievements/">{{ t('gh_secach_all') }}</a>
    </div>
  </section>
</template>
