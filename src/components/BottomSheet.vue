<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useViewport } from '@/lib/layout'

const emit = defineEmits<{ height: [px: number] }>()

const PEEK = 172
const DRAG_THRESHOLD = 4

const { isDesktop, height: viewportHeight } = useViewport()

const snaps = computed(() => [PEEK, Math.round(viewportHeight.value * 0.5), Math.round(viewportHeight.value * 0.92)])
const height = ref(snaps.value[1]!)
const dragging = ref(false)

let startY = 0
let startHeight = 0

function nearestSnap(px: number) {
  return snaps.value.reduce((best, s) => (Math.abs(s - px) < Math.abs(best - px) ? s : best))
}

function onPointerDown(e: PointerEvent) {
  if (isDesktop.value) return
  startY = e.clientY
  startHeight = height.value
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  const delta = startY - e.clientY
  // Small movements stay clicks, so buttons in the header keep working.
  if (!dragging.value && Math.abs(delta) < DRAG_THRESHOLD) return
  dragging.value = true
  const [min, , max] = snaps.value
  height.value = Math.min(max!, Math.max(min!, startHeight + delta))
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (!dragging.value) return
  dragging.value = false
  height.value = nearestSnap(height.value)
}

function expand() {
  height.value = snaps.value[2]!
}

defineExpose({ expand })

watch(viewportHeight, () => (height.value = nearestSnap(height.value)))
watch([height, dragging, isDesktop], () => {
  if (!dragging.value) emit('height', isDesktop.value ? 0 : height.value)
}, { immediate: true })

onBeforeUnmount(onPointerUp)
</script>

<template>
  <section
    class="sheet"
    :class="{ dragging }"
    :style="isDesktop ? undefined : { height: `${height}px` }"
  >
    <div class="grab" @pointerdown="onPointerDown">
      <div class="handle" />
      <slot name="header" />
    </div>
    <div class="body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.sheet {
  position: absolute;
  right: 8px;
  bottom: 0;
  left: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-radius: 28px 28px 0 0;
  background: var(--glass);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow);
  transition: height 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sheet.dragging {
  transition: none;
}

.grab {
  flex: none;
  padding: 0 20px;
  touch-action: none;
  user-select: none;
}

.handle {
  width: 36px;
  height: 5px;
  margin: 8px auto 6px;
  border-radius: 3px;
  background: rgb(60 60 67 / 30%);
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  /* Clear the floating tab bar. */
  padding: 0 20px 104px;
}

@media (min-width: 900px) {
  .sheet {
    top: 92px;
    right: auto;
    bottom: 16px;
    left: 16px;
    width: var(--panel-width);
    border-radius: 28px;
  }

  .grab {
    padding-top: 14px;
    touch-action: auto;
  }

  .handle {
    display: none;
  }

  .body {
    padding-bottom: 20px;
  }
}
</style>
