<template>
  <div class="form-section">
    <div
      class="section-header"
      :class="{ 'collapsible': collapsible, 'collapsed': !isOpen }"
      @click="collapsible && toggle()"
    >
      <div class="header-left">
        <span v-if="icon" class="section-icon">{{ icon }}</span>
        <div>
          <h3 class="section-title">{{ title }}</h3>
          <p v-if="description" class="section-description">{{ description }}</p>
        </div>
      </div>
      <button
        v-if="collapsible"
        type="button"
        class="collapse-btn"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? 'Sbalit sekci' : 'Rozbalit sekci'"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          class="chevron"
          :class="{ 'rotated': isOpen }"
        >
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <Transition name="collapse">
      <div v-show="isOpen" class="section-content">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  title: string;
  description?: string;
  icon?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}>(), {
  collapsible: false,
  defaultOpen: true,
});

const isOpen = ref(props.defaultOpen);

function toggle() {
  if (props.collapsible) {
    isOpen.value = !isOpen.value;
  }
}
</script>

<style scoped>
.form-section {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.section-header.collapsible {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.section-header.collapsible:hover {
  background: #F3F4F6;
}

.section-header.collapsed {
  border-bottom: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-icon {
  font-size: 1.25rem;
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.section-description {
  font-size: 0.8125rem;
  color: #6B7280;
  margin: 0.125rem 0 0 0;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  background: transparent;
  border: none;
  color: #6B7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.15s;
}

.collapse-btn:hover {
  background: #E5E7EB;
  color: #374151;
}

.chevron {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.section-content {
  padding: 1.25rem;
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
