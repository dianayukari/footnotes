import type { Component } from 'vue'
import { BedDouble, Church, Landmark, MapPin, Palette, Trees, Utensils } from 'lucide-vue-next'
import type { Category } from '@/types/itinerary'

export const categories: Record<Category, { icon: Component; color: string }> = {
  landmark: { icon: Landmark, color: '#e8973a' },
  museum: { icon: Palette, color: '#8b6fd6' },
  church: { icon: Church, color: '#4a8fd8' },
  food: { icon: Utensils, color: '#e2605b' },
  park: { icon: Trees, color: '#3fae5f' },
  hotel: { icon: BedDouble, color: '#22b39a' },
  other: { icon: MapPin, color: '#8e8e93' },
}
