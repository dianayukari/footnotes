import { onBeforeUnmount, onMounted, ref } from 'vue'

export const DESKTOP_QUERY = '(min-width: 900px)'

export function useViewport() {
  const isDesktop = ref(window.matchMedia(DESKTOP_QUERY).matches)
  const height = ref(window.innerHeight)

  function update() {
    isDesktop.value = window.matchMedia(DESKTOP_QUERY).matches
    height.value = window.innerHeight
  }

  onMounted(() => window.addEventListener('resize', update))
  onBeforeUnmount(() => window.removeEventListener('resize', update))

  return { isDesktop, height }
}
