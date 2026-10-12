<script setup lang="ts">
import { h, onBeforeUnmount, onMounted, ref, render, shallowRef, watch } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import ModeBadge from './ModeBadge.vue'
import StopMarker from './StopMarker.vue'
import type { ItineraryDay } from '@/types/itinerary'

export interface MapPadding {
  top: number
  right: number
  bottom: number
  left: number
}

const props = defineProps<{ day: ItineraryDay; padding: MapPadding }>()
const emit = defineEmits<{ selectStop: [id: string] }>()

const ROUTE_COLOR = '#1a73ff'
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

const el = ref<HTMLDivElement>()
const error = ref(apiKey ? '' : 'Google Maps key is missing. Set VITE_GOOGLE_MAPS_KEY in .env.local.')
const map = shallowRef<google.maps.Map>()

let markers: google.maps.marker.AdvancedMarkerElement[] = []
let lines: google.maps.Polyline[] = []

function clear() {
  for (const m of markers) {
    if (m.content) render(null, m.content as HTMLElement)
    m.map = null
  }
  for (const l of lines) l.setMap(null)
  markers = []
  lines = []
}

function mount(component: Parameters<typeof h>[0], componentProps: Record<string, unknown>) {
  const node = document.createElement('div')
  render(h(component, componentProps), node)
  return node
}

function draw() {
  const m = map.value
  if (!m) return
  clear()

  const path = props.day.stops.map((s) => ({ lat: s.lat, lng: s.lng }))
  // White casing under the route so it reads on any map colour.
  lines.push(
    new google.maps.Polyline({ map: m, path, strokeColor: '#fff', strokeWeight: 9, strokeOpacity: 0.9, zIndex: 1 }),
    new google.maps.Polyline({ map: m, path, strokeColor: ROUTE_COLOR, strokeWeight: 5, zIndex: 2 }),
  )

  props.day.legs.forEach((leg, i) => {
    const a = props.day.stops[i]
    const b = props.day.stops[i + 1]
    // Legs this short have no room for a badge between the two pins.
    if (!a || !b || leg.km < 0.3) return
    markers.push(
      new google.maps.marker.AdvancedMarkerElement({
        map: m,
        position: { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 },
        content: mount(ModeBadge, { mode: leg.mode }),
        zIndex: 1,
      }),
    )
  })

  for (const stop of props.day.stops) {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: m,
      position: { lat: stop.lat, lng: stop.lng },
      content: mount(StopMarker, { stop }),
      title: stop.name,
      zIndex: 2,
    })
    marker.addEventListener('gmp-click', () => emit('selectStop', stop.id))
    markers.push(marker)
  }
}

function fitRoute() {
  const m = map.value
  if (!m || props.day.stops.length === 0) return
  const bounds = new google.maps.LatLngBounds()
  for (const s of props.day.stops) bounds.extend({ lat: s.lat, lng: s.lng })
  m.fitBounds(bounds, props.padding)
}

function panTo(position: google.maps.LatLngLiteral) {
  map.value?.panTo(position)
}

function locate() {
  navigator.geolocation?.getCurrentPosition(({ coords }) => {
    panTo({ lat: coords.latitude, lng: coords.longitude })
    map.value?.setZoom(15)
  })
}

defineExpose({ fitRoute, panTo, locate })

onMounted(async () => {
  if (!apiKey || !el.value) return
  try {
    setOptions({ key: apiKey, v: 'weekly' })
    const [{ Map }] = await Promise.all([importLibrary('maps'), importLibrary('marker')])
    map.value = new Map(el.value, {
      center: { lat: 41.8986, lng: 12.4769 },
      zoom: 13,
      mapId: import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
    })
    draw()
    fitRoute()
  } catch (e) {
    error.value = `Google Maps failed to load: ${e instanceof Error ? e.message : String(e)}`
  }
})

watch(() => props.day, () => {
  draw()
  fitRoute()
})

onBeforeUnmount(clear)
</script>

<template>
  <div class="map-canvas">
    <div ref="el" class="map" />
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.map-canvas,
.map {
  position: absolute;
  inset: 0;
}

.map-canvas {
  background: #e8ece4;
}

.error {
  position: absolute;
  top: 40%;
  left: 50%;
  width: min(80%, 360px);
  margin: 0;
  padding: 12px 16px;
  border-radius: 14px;
  text-align: center;
  font-size: 14px;
  background: #fff;
  box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
  transform: translate(-50%, -50%);
}
</style>
