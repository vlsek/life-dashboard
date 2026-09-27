<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { PublicProfile } from '../lib/types'

const props = defineProps<{ initial: PublicProfile }>()
const emit = defineEmits<{ close: []; save: [name: string, visible: boolean] }>()

const name = ref(props.initial.display_name ?? '')
const visible = ref(props.initial.leaderboard_visible !== false)
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('comm_public_profile_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('comm_display_name_label') }}</label>
      <input v-model="name" type="text" class="w-full" />

      <label class="mt-3.5 flex items-center gap-2 text-sm">
        <input v-model="visible" type="checkbox" />
        {{ t('comm_visibility_label') }}
      </label>
      <p class="dim mt-1.5 text-xs">{{ t('comm_visibility_hint') }}</p>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="emit('save', name, visible)">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
