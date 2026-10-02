<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import MetricIcon from './MetricIcon.vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { BodyParam } from '../lib/profile'

// Список параметров тела с настройкой/удалением/добавлением. В оригинале эти кнопки живут в
// карточке дня рядом с полями ввода; пока блок дня не перенесён — доступны отсюда.
defineProps<{ params: BodyParam[] }>()
const emit = defineEmits<{ close: []; add: []; edit: [p: BodyParam]; remove: [p: BodyParam] }>()
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ t('dash_body_params_title') }}</h3>
      <p v-if="params.length === 0" class="dim mt-2 text-sm">{{ t('dash_body_params_empty') }}</p>
      <ul class="mt-2">
        <li v-for="p in params" :key="p.id" class="flex items-center gap-2 py-1">
          <span class="flex-1">
            <MetricIcon :icon="p.icon" extra-style="margin-right:0.3em;" />{{ p.name }}<span v-if="p.unit" class="dim"> ({{ p.unit }})</span>
          </span>
          <button type="button" class="secondary px-2" :title="t('dash_gear_configure_param_title')" @click="emit('edit', p)"><Icon name="gear" /></button>
          <button type="button" class="secondary px-2" :title="t('dash_gear_delete_param_title')" @click="emit('remove', p)"><Icon name="trash" /></button>
        </li>
      </ul>
      <button type="button" class="secondary mt-2" @click="emit('add')"><EmojiText :text="t('dash_add_body_param_btn')" /></button>
      <div class="modal-actions">
        <button type="button" class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>
