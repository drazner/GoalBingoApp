// Shared TypeScript types for boards, goals, and UI state.
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type GoalTemplate = {
  id: string
  text: string
  frequency: Frequency
  subgoals?: Subgoal[]
  dateCreated?: string
}

export type Subgoal = {
  id: string
  text: string
  done: boolean
}

export type Goal = {
  id: string
  text: string
  frequency: Frequency
  completed: boolean
  sourceGoalId?: string
  subgoals?: Subgoal[]
  saveSubgoalsToLibrary?: boolean
}

export type Board = {
  id: string
  title: string
  createdAt: string
  goals: Goal[]
  size: number
  celebrated: boolean
}

export type PendingGoalSave = {
  text: string
  frequency: Frequency
  sourceGoalId?: string
}

export type EditGoalModalState = {
  goalId: string
  text: string
  scope: 'board' | 'library'
}

export type SubgoalModalState = {
  goalId: string
  subgoals: Subgoal[]
  saveToLibrary: boolean
}

export type UiState = {
  generationFrequency: Frequency
  boardSize: number
  customOnly: boolean
  customFrequency: Frequency
  libraryFrequency: Frequency
  librarySource: 'suggested' | 'custom' | 'generated'
}
