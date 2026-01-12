// Normalizes goal text for comparisons across lists.
import type { Frequency } from '../types'

export const getGoalKey = (frequency: Frequency, text: string) =>
  `${frequency}:${text.trim().toLowerCase()}`
