// Custom goal library state, filters, and selection handlers.
import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { DESKTOP_GOAL_TEXT_LIMIT } from '../constants'
import type { Board, Frequency, Goal, GoalTemplate } from '../types'
import { getGoalKey } from '../utils/goalKeys'
import { sanitizeGoalText } from '../utils/text'

type UseGoalLibraryOptions = {
  generationFrequency: Frequency
  board: Board | null
  boards: Board[]
  suggestedGoals: GoalTemplate[]
  dismissedRecentGoals?: string[]
  maxGoalTextLength?: number
  createId: () => string
}

type UseGoalLibraryReturn = {
  customText: string
  setCustomText: (value: string) => void
  customFrequency: Frequency
  setCustomFrequency: (value: Frequency) => void
  customGoals: GoalTemplate[]
  setCustomGoals: Dispatch<SetStateAction<GoalTemplate[]>>
  libraryFrequency: Frequency
  setLibraryFrequency: (value: Frequency) => void
  librarySource: 'suggested' | 'custom' | 'generated'
  setLibrarySource: (value: 'suggested' | 'custom' | 'generated') => void
  selectedCustomIds: Set<string>
  selectedSuggestedIds: Set<string>
  selectedRecentIds: Set<string>
  customAvailable: GoalTemplate[]
  suggestedAvailable: GoalTemplate[]
  recentIncompleteAvailable: GoalTemplate[]
  customChecked: GoalTemplate[]
  suggestedChecked: GoalTemplate[]
  recentChecked: GoalTemplate[]
  filteredLibraryGoals: GoalTemplate[] | Goal[]
  customLibraryGoals: GoalTemplate[]
  handleAddCustomGoal: () => void
  handleEditCustomGoal: (id: string) => void
  handleDeleteCustomGoal: (id: string) => void
  handleToggleCustomSelection: (id: string) => void
  handleToggleSuggestedSelection: (id: string) => void
  handleSelectAllCustom: () => void
  handleClearCustom: () => void
  handleSelectAllSuggested: () => void
  handleClearSuggested: () => void
  handleToggleRecentSelection: (id: string) => void
  handleSelectAllRecent: () => void
  handleClearRecent: () => void
}

const useGoalLibrary = ({
  generationFrequency,
  board,
  boards,
  suggestedGoals,
  dismissedRecentGoals = [],
  maxGoalTextLength = DESKTOP_GOAL_TEXT_LIMIT,
  createId,
}: UseGoalLibraryOptions): UseGoalLibraryReturn => {
  const [customText, setCustomText] = useState('')
  const [customFrequency, setCustomFrequency] = useState<Frequency>('weekly')
  const [customGoals, setCustomGoals] = useState<GoalTemplate[]>([])
  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(new Set())
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(new Set())
  const [selectedRecentIds, setSelectedRecentIds] = useState<Set<string>>(new Set())
  const [customSelectionTouched, setCustomSelectionTouched] = useState(false)
  const [libraryFrequency, setLibraryFrequency] = useState<Frequency>('weekly')
  const [librarySource, setLibrarySource] = useState<'suggested' | 'custom' | 'generated'>(
    'suggested'
  )

  const customAvailable = useMemo(
    () => customGoals.filter((goal) => goal.frequency === generationFrequency),
    [customGoals, generationFrequency]
  )

  const suggestedAvailable = useMemo(
    () => suggestedGoals.filter((goal) => goal.frequency === generationFrequency),
    [generationFrequency, suggestedGoals]
  )

  const recentIncompleteAvailable = useMemo(() => {
    const isIncomplete = (goal: Goal) => {
      if (goal.subgoals && goal.subgoals.length > 0) {
        return goal.subgoals.some((subgoal) => !subgoal.done)
      }
      return !goal.completed
    }

    const seen = new Map<string, GoalTemplate>()
    const processed = new Set<string>()
    const dismissedSet = new Set(dismissedRecentGoals)
    const sortedBoards = [...boards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    sortedBoards.forEach((boardItem) => {
      boardItem.goals.forEach((goal) => {
        const text = goal.text.trim()
        if (!text) return
        if (goal.frequency !== generationFrequency) return
        const key = getGoalKey(goal.frequency, text)
        if (dismissedSet.has(key)) return
        if (processed.has(key)) return
        processed.add(key)
        if (!isIncomplete(goal)) return
        const encoded = encodeURIComponent(key)
        seen.set(key, {
          id: `recent-${goal.sourceGoalId ?? encoded}`,
          text,
          frequency: goal.frequency,
        })
      })
    })

    return Array.from(seen.values())
  }, [boards, generationFrequency])

  const customChecked = useMemo(
    () => customAvailable.filter((goal) => selectedCustomIds.has(goal.id)),
    [customAvailable, selectedCustomIds]
  )

  const suggestedChecked = useMemo(
    () => suggestedAvailable.filter((goal) => selectedSuggestedIds.has(goal.id)),
    [suggestedAvailable, selectedSuggestedIds]
  )

  const recentChecked = useMemo(
    () => recentIncompleteAvailable.filter((goal) => selectedRecentIds.has(goal.id)),
    [recentIncompleteAvailable, selectedRecentIds]
  )

  const libraryGoals = useMemo(() => {
    if (librarySource === 'custom') return customGoals
    if (librarySource === 'generated') return board ? board.goals : []
    return suggestedGoals
  }, [librarySource, customGoals, board, suggestedGoals])

  const filteredLibraryGoals = useMemo(
    () => libraryGoals.filter((goal) => goal.frequency === libraryFrequency),
    [libraryGoals, libraryFrequency]
  )

  const customLibraryGoals = useMemo(
    () =>
      customGoals
        .filter((goal) => goal.frequency === libraryFrequency)
        .map((goal) => ({ ...goal })),
    [customGoals, libraryFrequency]
  )

  useEffect(() => {
    const suggestedIds = suggestedAvailable.map((goal) => goal.id)
    setSelectedSuggestedIds(new Set(suggestedIds))
    setCustomSelectionTouched(false)
  }, [generationFrequency, suggestedAvailable])

  useEffect(() => {
    const recentIds = recentIncompleteAvailable.map((goal) => goal.id)
    setSelectedRecentIds(new Set(recentIds))
  }, [generationFrequency, recentIncompleteAvailable])

  useEffect(() => {
    setSelectedCustomIds((prev) => {
      const availableIds = customAvailable.map((goal) => goal.id)
      if (!customSelectionTouched) {
        return new Set(availableIds)
      }
      const availableSet = new Set(availableIds)
      const next = new Set<string>()
      prev.forEach((id) => {
        if (availableSet.has(id)) next.add(id)
      })
      return next
    })
  }, [customAvailable, customSelectionTouched])

  const handleAddCustomGoal = () => {
    const cleaned = sanitizeGoalText(customText, maxGoalTextLength)
    if (!cleaned) return
    setCustomGoals((prev) => [
      ...prev,
      {
        id: createId(),
        text: cleaned,
        frequency: customFrequency,
      },
    ])
    setCustomText('')
  }

  const handleEditCustomGoal = (id: string) => {
    const target = customGoals.find((goal) => goal.id === id)
    if (!target) return
    const nextText = window.prompt('Edit custom goal', target.text)
    if (!nextText) return
    const cleaned = sanitizeGoalText(nextText, maxGoalTextLength)
    if (!cleaned) return
    setCustomGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, text: cleaned } : goal))
    )
  }

  const handleDeleteCustomGoal = (id: string) => {
    const target = customGoals.find((goal) => goal.id === id)
    if (!target) return
    const confirmed = window.confirm('Are you sure you want to delete this goal?')
    if (!confirmed) return
    setCustomGoals((prev) => prev.filter((goal) => goal.id !== id))
  }

  const handleToggleCustomSelection = (id: string) => {
    setCustomSelectionTouched(true)
    setSelectedCustomIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleSuggestedSelection = (id: string) => {
    setSelectedSuggestedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleRecentSelection = (id: string) => {
    setSelectedRecentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllCustom = () => {
    setCustomSelectionTouched(true)
    setSelectedCustomIds(new Set(customAvailable.map((goal) => goal.id)))
  }

  const handleClearCustom = () => {
    setCustomSelectionTouched(true)
    setSelectedCustomIds(new Set())
  }

  const handleSelectAllSuggested = () => {
    setSelectedSuggestedIds(new Set(suggestedAvailable.map((goal) => goal.id)))
  }

  const handleClearSuggested = () => {
    setSelectedSuggestedIds(new Set())
  }

  const handleSelectAllRecent = () => {
    setSelectedRecentIds(new Set(recentIncompleteAvailable.map((goal) => goal.id)))
  }

  const handleClearRecent = () => {
    setSelectedRecentIds(new Set())
  }

  return {
    customText,
    setCustomText,
    customFrequency,
    setCustomFrequency,
    customGoals,
    setCustomGoals,
    libraryFrequency,
    setLibraryFrequency,
    librarySource,
    setLibrarySource,
    selectedCustomIds,
    selectedSuggestedIds,
    selectedRecentIds,
    customAvailable,
    suggestedAvailable,
    recentIncompleteAvailable,
    customChecked,
    suggestedChecked,
    recentChecked,
    filteredLibraryGoals,
    customLibraryGoals,
    handleAddCustomGoal,
    handleEditCustomGoal,
    handleDeleteCustomGoal,
    handleToggleCustomSelection,
    handleToggleSuggestedSelection,
    handleSelectAllCustom,
    handleClearCustom,
    handleSelectAllSuggested,
    handleClearSuggested,
    handleToggleRecentSelection,
    handleSelectAllRecent,
    handleClearRecent,
  }
}

export default useGoalLibrary
