// Custom goal library state, filters, and selection handlers.
import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Board, Frequency, Goal, GoalTemplate } from '../types'

type UseGoalLibraryOptions = {
  generationFrequency: Frequency
  board: Board | null
  suggestedGoals: GoalTemplate[]
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
  customAvailable: GoalTemplate[]
  suggestedAvailable: GoalTemplate[]
  customChecked: GoalTemplate[]
  suggestedChecked: GoalTemplate[]
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
}

const useGoalLibrary = ({
  generationFrequency,
  board,
  suggestedGoals,
  createId,
}: UseGoalLibraryOptions): UseGoalLibraryReturn => {
  const [customText, setCustomText] = useState('')
  const [customFrequency, setCustomFrequency] = useState<Frequency>('weekly')
  const [customGoals, setCustomGoals] = useState<GoalTemplate[]>([])
  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(new Set())
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(new Set())
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

  const customChecked = useMemo(
    () => customAvailable.filter((goal) => selectedCustomIds.has(goal.id)),
    [customAvailable, selectedCustomIds]
  )

  const suggestedChecked = useMemo(
    () => suggestedAvailable.filter((goal) => selectedSuggestedIds.has(goal.id)),
    [suggestedAvailable, selectedSuggestedIds]
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
    if (!customText.trim()) return
    setCustomGoals((prev) => [
      ...prev,
      {
        id: createId(),
        text: customText.trim(),
        frequency: customFrequency,
      },
    ])
    setCustomText('')
  }

  const handleEditCustomGoal = (id: string) => {
    const target = customGoals.find((goal) => goal.id === id)
    if (!target) return
    const nextText = window.prompt('Edit custom goal', target.text)
    if (!nextText || !nextText.trim()) return
    setCustomGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, text: nextText.trim() } : goal))
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
    customAvailable,
    suggestedAvailable,
    customChecked,
    suggestedChecked,
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
  }
}

export default useGoalLibrary
