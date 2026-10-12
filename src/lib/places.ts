import { importLibrary } from '@googlemaps/js-api-loader'
import { configureGoogle } from './google'
import type { Category } from '@/types/itinerary'

export interface PlaceSuggestion {
  id: string
  title: string
  subtitle: string
  prediction: google.maps.places.PlacePrediction
}

export interface ResolvedPlace {
  place_id: string
  name: string
  lat: number
  lng: number
  address: string | null
  types: string[]
  utc_offset_minutes: number | null
}

// One token spans a search session (keystrokes plus the final details fetch), which Google bills
// as a single request.
let sessionToken: google.maps.places.AutocompleteSessionToken | undefined

export async function searchPlaces(
  input: string,
  bias?: google.maps.LatLngLiteral,
): Promise<PlaceSuggestion[]> {
  configureGoogle()
  const { AutocompleteSuggestion, AutocompleteSessionToken } = await importLibrary('places')
  sessionToken ??= new AutocompleteSessionToken()
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    locationBias: bias,
  })
  return suggestions.flatMap((s) => {
    const p = s.placePrediction
    if (!p) return []
    return [{ id: p.placeId, title: p.mainText?.text ?? p.text.text, subtitle: p.secondaryText?.text ?? '', prediction: p }]
  })
}

export async function resolvePlace(suggestion: PlaceSuggestion): Promise<ResolvedPlace> {
  const place = suggestion.prediction.toPlace()
  await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'types', 'utcOffsetMinutes'] })
  sessionToken = undefined
  if (!place.location) throw new Error(`Google returned no location for ${suggestion.title}`)
  return {
    place_id: place.id,
    name: place.displayName ?? suggestion.title,
    lat: place.location.lat(),
    lng: place.location.lng(),
    address: place.formattedAddress ?? null,
    types: place.types ?? [],
    utc_offset_minutes: place.utcOffsetMinutes ?? null,
  }
}

const typeCategories: [Category, string[]][] = [
  ['hotel', ['lodging', 'hotel', 'hostel', 'bed_and_breakfast', 'guest_house']],
  ['food', ['restaurant', 'cafe', 'bar', 'bakery', 'food', 'meal_takeaway', 'coffee_shop', 'ice_cream_shop']],
  ['museum', ['museum', 'art_gallery']],
  ['church', ['church', 'place_of_worship', 'mosque', 'synagogue', 'hindu_temple']],
  ['park', ['park', 'garden', 'national_park', 'botanical_garden', 'zoo', 'beach']],
  ['landmark', ['tourist_attraction', 'historical_landmark', 'historical_place', 'monument', 'cultural_landmark']],
]

export function categoryFromTypes(types: string[]): Category {
  for (const [category, matches] of typeCategories) {
    if (types.some((t) => matches.includes(t) || t.endsWith('_restaurant') && category === 'food')) return category
  }
  return 'other'
}
