<script setup lang="ts">
// Чип человека (аватар + имя + необязательная пометка) со слотом под кнопки действий.
defineProps<{ name: string; avatarUrl: string | null; note?: string }>()
</script>

<template>
  <div class="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm" style="border-color: var(--border)">
    <img v-if="avatarUrl" :src="avatarUrl" class="rounded-full object-cover" style="width: 26px; height: 26px" />
    <span>{{ name }}</span>
    <span v-if="note" class="dim text-xs">{{ note }}</span>
    <slot />
  </div>
</template>
