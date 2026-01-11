// App-wide constants like labels and storage keys.
import type { Frequency } from './types'

export const LEGACY_STORAGE_KEY = 'bingo-board-v1'
export const STORAGE_KEY = 'bingo-board-v2'

export const frequencyLabel: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export const defaultBoardSizeByFrequency: Record<Frequency, number> = {
  daily: 3,
  weekly: 3,
  monthly: 4,
  yearly: 5,
}
