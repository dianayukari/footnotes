import { setOptions } from '@googlemaps/js-api-loader'

export const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

let configured = false

/** Must run before the first importLibrary call. Safe to call repeatedly. */
export function configureGoogle() {
  if (configured || !googleMapsKey) return
  setOptions({ key: googleMapsKey, v: 'weekly' })
  configured = true
}
