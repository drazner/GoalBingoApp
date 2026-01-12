// Text sanitizers for user-provided strings.
import { DESKTOP_GOAL_TEXT_LIMIT } from '../constants'

export const sanitizeGoalText = (value: string, maxLength = DESKTOP_GOAL_TEXT_LIMIT) =>
  value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
