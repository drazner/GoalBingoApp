// Main app container wiring state, hooks, and UI tabs.
import { useEffect, useRef, useState } from 'react'
import './styles/app.css'
import Hero from './components/Hero'
import GoalsTab from './components/GoalsTab'
import CurrentBoard from './components/CurrentBoard'
import BoardHistory from './components/BoardHistory'
import GoalModals from './components/GoalModals'
import useBoardSettings from './hooks/useBoardSettings'
import useBoardState from './hooks/useBoardState'
import useGoalLibrary from './hooks/useGoalLibrary'
import useGoalTextLimit from './hooks/useGoalTextLimit'
import { suggestedGoals } from './data/suggestedGoals'
import {
  defaultBoardSizeByFrequency,
  frequencyLabel,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
} from './constants'
import type {
  Board,
  EditGoalModalState,
  Frequency,
  Goal,
  GoalTemplate,
  PendingGoalSave,
  Subgoal,
  SubgoalModalState,
  UiState,
} from './types'
import { sanitizeGoalText } from './utils/text'
import { getGoalKey } from './utils/goalKeys'
import {
  auth,
  db,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInAnonymously,
  doc,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from './firebase'
type StoredData = {
  boards: Board[]
  currentBoardId: string | null
  customGoals: GoalTemplate[]
  dismissedRecentGoals?: string[]
  uiState?: UiState
}

const isFrequency = (value: unknown): value is Frequency =>
  value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly'

const isLibrarySource = (value: unknown): value is UiState['librarySource'] =>
  value === 'suggested' || value === 'custom' || value === 'generated'

const isBoardSize = (value: unknown): value is number => value === 3 || value === 4 || value === 5

const serializeGoal = (goal: Goal) => ({
  id: goal.id,
  text: goal.text,
  frequency: goal.frequency,
  completed: goal.completed,
  ...(goal.subgoals ? { subgoals: goal.subgoals } : {}),
  ...(goal.sourceGoalId ? { sourceGoalId: goal.sourceGoalId } : {}),
})

const serializeCustomGoal = (goal: GoalTemplate) => ({
  id: goal.id,
  text: goal.text,
  frequency: goal.frequency,
  ...(goal.subgoals ? { subgoals: goal.subgoals } : {}),
})

const serializeBoard = (board: Board) => ({
  id: board.id,
  title: board.title,
  createdAt: board.createdAt,
  size: board.size,
  celebrated: board.celebrated,
  goals: board.goals.map(serializeGoal),
})

const serializeUiState = (state: UiState) => ({
  generationFrequency: state.generationFrequency,
  boardSize: state.boardSize,
  customOnly: state.customOnly,
  customFrequency: state.customFrequency,
  libraryFrequency: state.libraryFrequency,
  librarySource: state.librarySource,
})


const getGoalProgress = (goal: Goal) => {
  if (goal.subgoals && goal.subgoals.length > 0) {
    const completedCount = goal.subgoals.filter((subgoal) => subgoal.done).length
    return completedCount / goal.subgoals.length
  }
  return goal.completed ? 1 : 0
}


// Utility to generate IDs in browsers without crypto.randomUUID.
const safeRandomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

// Shuffle an array for random goal selection.
const shuffle = <T,>(items: T[]) => {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

// Turn a board into a shareable URL-safe payload.
const encodeBoard = (board: Board) => {
  const json = JSON.stringify(board)
  return btoa(encodeURIComponent(json))
}

// Parse a shared board from the URL.
const decodeBoard = (encoded: string) => {
  try {
    const json = decodeURIComponent(atob(encoded))
    return JSON.parse(json) as Board
  } catch {
    return null
  }
}

// Determine board size from stored data or inferred from goal count.
const getBoardSize = (board: Board | null) => {
  if (!board) return 5
  if (board.size) return board.size
  return Math.round(Math.sqrt(board.goals.length)) || 5
}

// Ensure custom goals always have IDs (for older saved data).
const normalizeCustomGoals = (goals: GoalTemplate[]) =>
  goals.map((goal) => (goal.id ? goal : { ...goal, id: safeRandomId() }))

// Ensure board has a size (for older saved data).
const normalizeBoard = (board: Board): Board => ({
  ...board,
  size: board.size || Math.round(Math.sqrt(board.goals.length)) || 5,
})

const cloneSubgoals = (subgoals?: Subgoal[]) =>
  subgoals?.map((subgoal) => ({ ...subgoal, done: false }))

const areSubgoalsEqual = (left?: Subgoal[], right?: Subgoal[]) => {
  if (!left?.length && !right?.length) return true
  if (!left || !right || left.length !== right.length) return false
  return left.every((item, index) => {
    const other = right[index]
    return item.id === other.id && item.text === other.text && item.done === other.done
  })
}

// Compute all possible winning lines for an NxN board.
const getBingoLines = (size: number) => {
  const lines: number[][] = []
  for (let row = 0; row < size; row += 1) {
    lines.push(Array.from({ length: size }, (_, col) => row * size + col))
  }
  for (let col = 0; col < size; col += 1) {
    lines.push(Array.from({ length: size }, (_, row) => row * size + col))
  }
  lines.push(Array.from({ length: size }, (_, idx) => idx * (size + 1)))
  lines.push(Array.from({ length: size }, (_, idx) => (idx + 1) * (size - 1)))
  return lines
}

// Check if any row/column/diagonal is fully completed.
const getBingoLine = (goals: Goal[], size: number) => {
  const lines = getBingoLines(size)
  for (const line of lines) {
    if (line.every((index) => goals[index]?.completed)) {
      return line
    }
  }
  return null
}

const hasBingo = (goals: Goal[], size: number) => Boolean(getBingoLine(goals, size))

// Play a quick celebration tone when a board gets a Bingo.
const playCelebrationTone = () => {
  if (typeof window === 'undefined') return
  const audioContext = new (window.AudioContext ||
    (window as unknown as Window & { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)()
  const now = audioContext.currentTime
  const gain = audioContext.createGain()
  gain.gain.value = 0.0001
  gain.connect(audioContext.destination)

  const playNote = (frequency: number, start: number, duration: number) => {
    const osc = audioContext.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = frequency
    osc.connect(gain)
    osc.start(start)
    osc.stop(start + duration)
  }

  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
  playNote(523.25, now, 0.3)
  playNote(659.25, now + 0.12, 0.3)
  playNote(783.99, now + 0.24, 0.35)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
}

function App() {
  // Core app state.
  const [sharedBoard, setSharedBoard] = useState<Board | null>(null)
  const [dismissedRecentGoals, setDismissedRecentGoals] = useState<string[]>([])
  const maxGoalTextLength = useGoalTextLimit()
  const {
    boardTitle,
    setBoardTitle,
    generationFrequency,
    setGenerationFrequency,
    boardSize,
    setBoardSize,
    setBoardSizeTouched,
    customOnly,
    setCustomOnly,
  } = useBoardSettings()
  const {
    boards,
    setBoards,
    currentBoardId,
    setCurrentBoardId,
    titleEdits,
    setTitleEdits,
    board,
    currentBoardSize,
    currentBoardTotal,
    updateCurrentBoard,
    handleOpenBoard,
    handleSaveTitle,
    handleDeleteBoard,
  } = useBoardState({ getBoardSize, maxBoardTitleLength: maxGoalTextLength })
  const {
    customText,
    setCustomText,
    customFrequency,
    setCustomFrequency,
    customGoals,
    setCustomGoals,
    customSubgoals,
    setCustomSubgoals,
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
    handleDeleteCustomGoal,
    handleToggleCustomSelection,
    handleToggleSuggestedSelection,
    handleSelectAllCustom,
    handleClearCustom,
    handleSelectAllSuggested,
    handleClearSuggested,
    selectedRecentIds,
    recentIncompleteAvailable,
    recentChecked,
    handleToggleRecentSelection,
    handleSelectAllRecent,
    handleClearRecent,
  } = useGoalLibrary({
    generationFrequency,
    board,
    boards,
    suggestedGoals,
    dismissedRecentGoals,
    maxGoalTextLength,
    createId: safeRandomId,
  })
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [bingoActive, setBingoActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'goals' | 'history'>('board')
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isEditingCurrentTitle, setIsEditingCurrentTitle] = useState(false)
  const [currentTitleDraft, setCurrentTitleDraft] = useState('')
  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured ? 'Connecting' : 'Local only'
  )
  const [pendingTab, setPendingTab] = useState<'board' | 'goals' | 'history' | null>(null)
  const remoteLoadedRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const syncingRef = useRef(false)
  const subgoalBaselineRef = useRef<Subgoal[] | null>(null)
  const subgoalBaselineGoalIdRef = useRef<string | null>(null)
  const editBaselineTextRef = useRef<string | null>(null)
  const editBaselineSubgoalsRef = useRef<Subgoal[] | null>(null)
  const editBaselineGoalIdRef = useRef<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [bingoLine, setBingoLine] = useState<number[] | null>(null)
  const [pendingGoalSave, setPendingGoalSave] = useState<PendingGoalSave | null>(null)
  const [editGoalModal, setEditGoalModal] = useState<EditGoalModalState | null>(null)
  const [subgoalModal, setSubgoalModal] = useState<SubgoalModalState | null>(null)
  const [subgoalsRemoved, setSubgoalsRemoved] = useState(false)
  const [isRearranging, setIsRearranging] = useState(false)
  const [draftGoals, setDraftGoals] = useState<Goal[]>([])
  const uniqueSelectedCount = (() => {
    const seen = new Set<string>()
    const addGoal = (goal: GoalTemplate) => {
      const text = goal.text.trim()
      if (!text) return
      seen.add(`${goal.frequency}:${text.toLowerCase()}`)
    }
    recentChecked.forEach(addGoal)
    customChecked.forEach(addGoal)
    suggestedChecked.forEach(addGoal)
    return seen.size
  })()

  // Load saved data and shared links on startup.
  // Detect Bingo and celebrate once.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object' && 'boards' in parsed) {
          const data = parsed as StoredData
          setBoards((data.boards ?? []).map(normalizeBoard))
          setCurrentBoardId(data.currentBoardId ?? null)
          setCustomGoals(normalizeCustomGoals(data.customGoals ?? []))
          if (Array.isArray(data.dismissedRecentGoals)) {
            setDismissedRecentGoals(data.dismissedRecentGoals.filter((item) => typeof item === 'string'))
          }
          if (data.uiState) {
            if (isFrequency(data.uiState.generationFrequency)) {
              setGenerationFrequency(data.uiState.generationFrequency)
            }
            if (isBoardSize(data.uiState.boardSize)) {
              setBoardSize(data.uiState.boardSize)
              setBoardSizeTouched(true)
            }
            if (typeof data.uiState.customOnly === 'boolean') {
              setCustomOnly(data.uiState.customOnly)
            }
            if (isFrequency(data.uiState.customFrequency)) {
              setCustomFrequency(data.uiState.customFrequency)
            }
            if (isFrequency(data.uiState.libraryFrequency)) {
              setLibraryFrequency(data.uiState.libraryFrequency)
            }
            if (isLibrarySource(data.uiState.librarySource)) {
              setLibrarySource(data.uiState.librarySource)
            }
          }
        } else if (parsed && typeof parsed === 'object' && 'goals' in parsed) {
          const legacyBoard = normalizeBoard(parsed as Board)
          setBoards([legacyBoard])
          setCurrentBoardId(legacyBoard.id)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }
    setHasLoaded(true)

    const params = new URLSearchParams(window.location.search)
    const sharedId = params.get('share')
    const encoded = params.get('board')
    if (sharedId && isFirebaseConfigured && db) {
      getDoc(doc(db, 'sharedBoards', sharedId))
        .then((snapshot) => {
          if (!snapshot.exists()) return
          const data = snapshot.data() as Board | undefined
          if (data?.goals?.length) {
            setSharedBoard(normalizeBoard(data))
          }
        })
        .catch(() => {})
    } else if (encoded) {
      const decoded = decodeBoard(encoded)
      if (decoded && decoded.goals?.length) {
        setSharedBoard(normalizeBoard(decoded))
      }
    }
  }, [])

  // Persist data after initial load (localStorage fallback).
  useEffect(() => {
    if (!hasLoaded) return
    const payload: StoredData = {
      boards,
      currentBoardId,
      customGoals: customGoals.map(serializeCustomGoal),
      dismissedRecentGoals,
      uiState: {
        generationFrequency,
        boardSize,
        customOnly,
        customFrequency,
        libraryFrequency,
        librarySource,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    boards,
    currentBoardId,
    customGoals,
    dismissedRecentGoals,
    generationFrequency,
    boardSize,
    customOnly,
    customFrequency,
    libraryFrequency,
    librarySource,
    hasLoaded,
  ])

  // Sign in anonymously and subscribe to cloud data.
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) return
    const authInstance = auth
    const dbInstance = db
    let unsubscribeSnapshot: (() => void) | null = null
    const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
      if (!user) {
        setSyncStatus('Connecting')
        signInAnonymously(authInstance).catch(() => {})
        return
      }
      userIdRef.current = user.uid
      const userDoc = doc(dbInstance, 'users', user.uid)
      unsubscribeSnapshot = onSnapshot(userDoc, (snapshot) => {
        if (!snapshot.exists()) {
          remoteLoadedRef.current = true
          if (!syncingRef.current) setSyncStatus('Connected')
          return
        }
        const data = snapshot.data() as Partial<StoredData> | undefined
        if (!data) return
        applyingRemoteRef.current = true
        setBoards((data.boards ?? []).map(normalizeBoard))
        setCustomGoals(normalizeCustomGoals(data.customGoals ?? []))
        setCurrentBoardId(data.currentBoardId ?? null)
        if (Array.isArray(data.dismissedRecentGoals)) {
          setDismissedRecentGoals(data.dismissedRecentGoals.filter((item) => typeof item === 'string'))
        }
        if (data.uiState) {
          if (isFrequency(data.uiState.generationFrequency)) {
            setGenerationFrequency(data.uiState.generationFrequency)
          }
          if (isBoardSize(data.uiState.boardSize)) {
            setBoardSize(data.uiState.boardSize)
            setBoardSizeTouched(true)
          }
          if (typeof data.uiState.customOnly === 'boolean') {
            setCustomOnly(data.uiState.customOnly)
          }
          if (isFrequency(data.uiState.customFrequency)) {
            setCustomFrequency(data.uiState.customFrequency)
          }
          if (isFrequency(data.uiState.libraryFrequency)) {
            setLibraryFrequency(data.uiState.libraryFrequency)
          }
          if (isLibrarySource(data.uiState.librarySource)) {
            setLibrarySource(data.uiState.librarySource)
          }
        }
        remoteLoadedRef.current = true
        if (!syncingRef.current) setSyncStatus('Connected')
        setTimeout(() => {
          applyingRemoteRef.current = false
        }, 50)
      })
    })
    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot()
      unsubscribeAuth()
    }
  }, [])

  // Sync local changes to Firestore after the first cloud load.
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) return
    const dbInstance = db
    if (!hasLoaded || !remoteLoadedRef.current) return
    if (applyingRemoteRef.current) return
    const userId = userIdRef.current
    if (!userId) return
    const uiStatePayload = isFrequency(generationFrequency) &&
      isBoardSize(boardSize) &&
      typeof customOnly === 'boolean' &&
      isFrequency(customFrequency) &&
      isFrequency(libraryFrequency) &&
      isLibrarySource(librarySource)
      ? serializeUiState({
          generationFrequency,
          boardSize,
          customOnly,
          customFrequency,
          libraryFrequency,
          librarySource,
        })
      : null
    const payload: StoredData = {
      boards: boards.map(serializeBoard),
      currentBoardId,
      customGoals: customGoals.map(serializeCustomGoal),
      dismissedRecentGoals,
      ...(uiStatePayload ? { uiState: uiStatePayload } : {}),
    }
    setSyncStatus('Syncing...')
    syncingRef.current = true
    setDoc(doc(dbInstance, 'users', userId), { ...payload, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => {
        setSyncStatus('Synced')
        syncingRef.current = false
      })
      .catch(() => {
        setSyncStatus('Sync error')
        syncingRef.current = false
      })
  }, [
    boards,
    currentBoardId,
    customGoals,
    dismissedRecentGoals,
    generationFrequency,
    boardSize,
    customOnly,
    customFrequency,
    libraryFrequency,
    librarySource,
    hasLoaded,
  ])

  // Reset the title editor when switching boards.
  useEffect(() => {
    setCurrentTitleDraft(board?.title ?? '')
    setIsEditingCurrentTitle(false)
  }, [board?.id])

  useEffect(() => {
    if (!board) return
    const line = getBingoLine(board.goals, getBoardSize(board))
    const bingo = Boolean(line)
    if (bingo && !board.celebrated) {
      playCelebrationTone()
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 2500)
      setBoards((prev) =>
        prev.map((item) =>
          item.id === board.id
            ? {
                ...item,
                celebrated: true,
              }
            : item
        )
      )
    }
    setBingoActive(bingo)
    setBingoLine(line)
  }, [board])

  const handleDismissRecentGoals = () => {
    if (recentChecked.length === 0) return
    const next = new Set(dismissedRecentGoals)
    recentChecked.forEach((goal) => {
      next.add(getGoalKey(goal.frequency, goal.text))
    })
    setDismissedRecentGoals(Array.from(next))
    handleClearRecent()
  }

  // Build a new board from the selected goals and save it to history.
  const handleGenerateBoard = () => {
    setError(null)
    const safeSize = isBoardSize(boardSize)
      ? boardSize
      : defaultBoardSizeByFrequency[generationFrequency]
    const totalTiles = safeSize * safeSize
    const makeKey = (goal: GoalTemplate) => `${goal.frequency}:${goal.text.trim().toLowerCase()}`
    const buildMap = (items: GoalTemplate[]) => {
      const map = new Map<string, GoalTemplate>()
      items.forEach((goal) => {
        const text = goal.text.trim()
        if (!text) return
        map.set(makeKey(goal), goal)
      })
      return map
    }

    const recentMap = buildMap(recentChecked)
    const customMap = buildMap(customChecked)
    const suggestedMap = buildMap(suggestedChecked)

    const recentCustomKeys = Array.from(recentMap.keys()).filter((key) => customMap.has(key))
    const recentSuggestedKeys = Array.from(recentMap.keys()).filter(
      (key) => suggestedMap.has(key) && !customMap.has(key)
    )
    const recentOnlyKeys = Array.from(recentMap.keys()).filter(
      (key) => !customMap.has(key) && !suggestedMap.has(key)
    )
    const customOnlyKeys = Array.from(customMap.keys()).filter((key) => !recentMap.has(key))
    const suggestedOnlyKeys = Array.from(suggestedMap.keys()).filter(
      (key) => !recentMap.has(key) && !customMap.has(key)
    )

    const selectedKeys: string[] = []
    const seen = new Set<string>()
    const addKeys = (keys: string[]) => {
      shuffle(keys).forEach((key) => {
        if (seen.has(key)) return
        seen.add(key)
        selectedKeys.push(key)
      })
    }

    addKeys(recentCustomKeys)
    addKeys(recentSuggestedKeys)
    addKeys(recentOnlyKeys)
    addKeys(customOnlyKeys)
    if (!customOnly) {
      addKeys(suggestedOnlyKeys)
    }

    if (
      selectedKeys.length === 0 &&
      (recentChecked.length > 0 || customChecked.length > 0 || suggestedChecked.length > 0)
    ) {
      const fallbackSeen = new Set<string>()
      const fallbackAdd = (goal: GoalTemplate) => {
        const text = goal.text.trim()
        if (!text) return
        const key = makeKey(goal)
        if (fallbackSeen.has(key)) return
        fallbackSeen.add(key)
        selectedKeys.push(key)
      }
      shuffle(recentChecked).forEach(fallbackAdd)
      shuffle(customChecked).forEach(fallbackAdd)
      shuffle(suggestedChecked).forEach(fallbackAdd)
    }

    const trimmedSelected = selectedKeys.slice(0, totalTiles)
    const goals = trimmedSelected.map((key) => {
      const goal = recentMap.get(key) ?? customMap.get(key) ?? suggestedMap.get(key)
      if (!goal) {
        return {
          id: safeRandomId(),
          text: '',
          frequency: generationFrequency,
          completed: false,
          sourceGoalId: undefined,
        }
      }
      const templateSubgoals = 'subgoals' in goal ? goal.subgoals : undefined
      return {
        id: safeRandomId(),
        text: goal.text,
        frequency: goal.frequency,
        completed: false,
        subgoals: cloneSubgoals(templateSubgoals),
        sourceGoalId: customGoals.some((custom) => custom.id === goal.id) ? goal.id : undefined,
      }
    })
    while (goals.length < totalTiles) {
      goals.push({
        id: safeRandomId(),
        text: '',
        frequency: generationFrequency,
        completed: false,
        sourceGoalId: undefined,
      })
    }
    const newBoard: Board = {
      id: safeRandomId(),
      title: sanitizeGoalText(boardTitle, maxGoalTextLength) || 'Goal Bingo',
      createdAt: new Date().toISOString(),
      goals,
      size: safeSize,
      celebrated: false,
    }
    setBoards((prev) => [newBoard, ...prev])
    setCurrentBoardId(newBoard.id)
    setShareUrl('')
    setActiveTab('board')
  }

  const toggleGoal = (goalId: string) => {
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map((goal) => {
        if (goal.id !== goalId) return goal
        if (goal.subgoals && goal.subgoals.length > 0) {
          const shouldComplete = !goal.subgoals.every((subgoal) => subgoal.done)
          const updatedSubgoals = goal.subgoals.map((subgoal) => ({
            ...subgoal,
            done: shouldComplete,
          }))
          return {
            ...goal,
            subgoals: updatedSubgoals,
            completed: shouldComplete,
          }
        }
        return { ...goal, completed: !goal.completed }
      }),
    }))
  }

  const updateDraftSubgoals = (goalId: string, subgoals: Subgoal[]) => {
    const allDone = subgoals.length > 0 && subgoals.every((subgoal) => subgoal.done)
    setDraftGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId ? { ...goal, subgoals, completed: allDone } : goal
      )
    )
  }

  const removeDraftSubgoals = (goalId: string) => {
    setDraftGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId ? { ...goal, subgoals: undefined, completed: false } : goal
      )
    )
  }

  const resetSubgoalBaseline = () => {
    subgoalBaselineRef.current = null
    subgoalBaselineGoalIdRef.current = null
  }

  const resetEditBaseline = () => {
    editBaselineTextRef.current = null
    editBaselineSubgoalsRef.current = null
    editBaselineGoalIdRef.current = null
  }

  const restoreSubgoalBaseline = () => {
    const goalId = subgoalBaselineGoalIdRef.current
    if (!isRearranging || !goalId) return
    const baseline = subgoalBaselineRef.current
    if (baseline && baseline.length > 0) {
      updateDraftSubgoals(goalId, baseline.map((subgoal) => ({ ...subgoal })))
    } else {
      removeDraftSubgoals(goalId)
    }
    resetSubgoalBaseline()
  }

  const handleEditGoal = (goalId: string) => {
    if (!board) return
    const sourceGoals = isRearranging ? draftGoals : board.goals
    const target = sourceGoals.find((goal) => goal.id === goalId)
    if (!target) return
    setEditGoalModal({ goalId: target.id, text: target.text, scope: 'board' })
    editBaselineTextRef.current = target.text
    editBaselineSubgoalsRef.current = target.subgoals ? target.subgoals.map((subgoal) => ({ ...subgoal })) : null
    editBaselineGoalIdRef.current = target.id
    if (target.subgoals && target.subgoals.length > 0) {
      if (isRearranging) {
        subgoalBaselineRef.current = target.subgoals.map((subgoal) => ({ ...subgoal }))
        subgoalBaselineGoalIdRef.current = target.id
      } else {
        resetSubgoalBaseline()
      }
      setSubgoalModal({
        goalId: target.id,
        subgoals: target.subgoals.map((subgoal) => ({ ...subgoal })),
      })
      setSubgoalsRemoved(false)
    } else {
      setSubgoalModal(null)
      resetSubgoalBaseline()
      setSubgoalsRemoved(false)
    }
  }

  const handleEditLibraryGoal = (goalId: string) => {
    const target = customGoals.find((goal) => goal.id === goalId)
    if (!target) return
    setEditGoalModal({ goalId: target.id, text: target.text, scope: 'library' })
    editBaselineTextRef.current = target.text
    editBaselineSubgoalsRef.current = target.subgoals
      ? target.subgoals.map((subgoal) => ({ ...subgoal, done: false }))
      : null
    editBaselineGoalIdRef.current = target.id
    if (target.subgoals && target.subgoals.length > 0) {
      resetSubgoalBaseline()
      setSubgoalModal({
        goalId: target.id,
        subgoals: target.subgoals.map((subgoal) => ({ ...subgoal, done: false })),
      })
      setSubgoalsRemoved(false)
    } else {
      setSubgoalModal(null)
      resetSubgoalBaseline()
      setSubgoalsRemoved(false)
    }
  }

  const handleDeleteBoardGoal = (goalId: string) => {
    const clearGoal = (goal: Goal) =>
      goal.id === goalId
        ? {
            ...goal,
            text: '',
            completed: false,
            subgoals: undefined,
          }
        : goal
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map(clearGoal),
    }))
    if (isRearranging) {
      setDraftGoals((prev) => prev.map(clearGoal))
    }
  }

  const handleResetProgress = () => {
    const resetGoal = (goal: Goal) => ({
      ...goal,
      completed: false,
      ...(goal.subgoals
        ? { subgoals: goal.subgoals.map((subgoal) => ({ ...subgoal, done: false })) }
        : {}),
    })
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map(resetGoal),
      celebrated: false,
    }))
    if (isRearranging) {
      setDraftGoals((prev) => prev.map(resetGoal))
    }
  }

  const handleFillEmptyTiles = () => {
    if (!board) return
    const boardFrequency = board.goals[0]?.frequency ?? generationFrequency
    const existingTexts = new Set(
      board.goals
        .map((goal) => goal.text.trim().toLowerCase())
        .filter((text) => text.length > 0)
    )
    const customPool = customGoals
      .filter((goal) => goal.frequency === boardFrequency)
      .filter((goal) => !existingTexts.has(goal.text.trim().toLowerCase()))
    const suggestedPool = suggestedGoals
      .filter((goal) => goal.frequency === boardFrequency)
      .filter((goal) => !existingTexts.has(goal.text.trim().toLowerCase()))
    const candidates = [...shuffle(customPool), ...shuffle(suggestedPool)]

    updateCurrentBoard((current) => {
      let candidateIndex = 0
      const nextGoals = current.goals.map((goal) => {
        if (goal.text.trim()) return goal
        const candidate = candidates[candidateIndex]
        if (!candidate) return goal
        candidateIndex += 1
        return {
          ...goal,
          text: candidate.text,
          frequency: candidate.frequency,
          subgoals: cloneSubgoals(candidate.subgoals),
          sourceGoalId: customGoals.some((custom) => custom.id === candidate.id)
            ? candidate.id
            : undefined,
        }
      })
      return {
        ...current,
        goals: nextGoals,
      }
    })
  }

  const handleSaveCurrentTitle = () => {
    if (!board) return
    const nextTitle = sanitizeGoalText(currentTitleDraft, maxGoalTextLength)
    if (!nextTitle) return
    updateCurrentBoard((current) => ({
      ...current,
      title: nextTitle,
    }))
    setIsEditingCurrentTitle(false)
  }

  const handleEnterRearrange = () => {
    if (!board) return
    setDraftGoals(board.goals.map((goal) => ({ ...goal })))
    setIsRearranging(true)
  }

  const handleCancelRearrange = () => {
    setDraftGoals([])
    setIsRearranging(false)
  }

  const handleSaveRearrange = () => {
    if (!board) return
    const boardById = new Map(board.goals.map((goal) => [goal.id, goal]))
    updateCurrentBoard((current) => ({
      ...current,
      goals: draftGoals.map((goal) => ({ ...(boardById.get(goal.id) ?? {}), ...goal })),
    }))
    setDraftGoals([])
    setIsRearranging(false)
  }

  const handleRearrangeRandomize = () => {
    setDraftGoals((prev) => shuffle(prev))
  }

  const handleReorder = (activeId: string, overId: string) => {
    setDraftGoals((prev) => {
      const oldIndex = prev.findIndex((goal) => goal.id === activeId)
      const newIndex = prev.findIndex((goal) => goal.id === overId)
      if (oldIndex === -1 || newIndex === -1) return prev
      return moveItem(prev, oldIndex, newIndex)
    })
  }

  const handleSaveEditedGoal = (mode: 'new' | 'update' | 'skip') => {
    if (!pendingGoalSave) return
    if (mode === 'new') {
      setCustomGoals((prev) => [
        ...prev,
        {
          id: safeRandomId(),
          text: pendingGoalSave.text,
          frequency: pendingGoalSave.frequency,
        },
      ])
    }
    if (mode === 'update' && pendingGoalSave.sourceGoalId) {
      setCustomGoals((prev) =>
        prev.map((goal) =>
          goal.id === pendingGoalSave.sourceGoalId
            ? { ...goal, text: pendingGoalSave.text }
            : goal
        )
      )
    }
    setPendingGoalSave(null)
  }

  const handleApplyGoalEdit = () => {
    if (!editGoalModal) return
    const cleanedText = sanitizeGoalText(editGoalModal.text, maxGoalTextLength)
    if (!cleanedText) return
    if (editGoalModal.scope === 'library') {
      const target = customGoals.find((goal) => goal.id === editGoalModal.goalId)
      if (!target) {
        setEditGoalModal(null)
        setSubgoalModal(null)
        setSubgoalsRemoved(false)
        resetSubgoalBaseline()
        resetEditBaseline()
        return
      }
      const baselineSubgoals = target.subgoals ?? []
      let nextSubgoals: Subgoal[] | undefined
      let subgoalsChanged = false

      if (subgoalsRemoved) {
        nextSubgoals = undefined
        subgoalsChanged = baselineSubgoals.length > 0
      } else if (subgoalModal && subgoalModal.goalId === target.id) {
        const cleaned = subgoalModal.subgoals
          .map((subgoal) => ({
            ...subgoal,
            text: sanitizeGoalText(subgoal.text, maxGoalTextLength),
            done: false,
          }))
          .filter((subgoal) => subgoal.text)
        nextSubgoals =
          cleaned.length >= 2
            ? cleaned
            : [
                { id: safeRandomId(), text: 'Subgoal 1', done: false },
                { id: safeRandomId(), text: 'Subgoal 2', done: false },
              ]
        subgoalsChanged = !areSubgoalsEqual(nextSubgoals, baselineSubgoals)
      }

      const textChanged = cleanedText !== target.text
      if (!textChanged && !subgoalsChanged) {
        setEditGoalModal(null)
        setSubgoalModal(null)
        setSubgoalsRemoved(false)
        resetSubgoalBaseline()
        resetEditBaseline()
        return
      }

      setCustomGoals((prev) =>
        prev.map((goal) =>
          goal.id === target.id
            ? {
                ...goal,
                text: cleanedText,
                subgoals: subgoalsRemoved ? undefined : subgoalsChanged ? nextSubgoals : goal.subgoals,
              }
            : goal
        )
      )

      setEditGoalModal(null)
      setSubgoalModal(null)
      setSubgoalsRemoved(false)
      resetSubgoalBaseline()
      resetEditBaseline()
      return
    }
    if (!board) return
    const sourceGoals = isRearranging ? draftGoals : board.goals
    const target = sourceGoals.find((goal) => goal.id === editGoalModal.goalId)
    if (!target) {
      setEditGoalModal(null)
      setSubgoalModal(null)
      setSubgoalsRemoved(false)
      resetSubgoalBaseline()
      resetEditBaseline()
      return
    }
    const baselineSubgoals = target.subgoals ?? []
    let nextSubgoals: Subgoal[] | undefined
    let subgoalsChanged = false

    if (subgoalsRemoved) {
      nextSubgoals = undefined
      subgoalsChanged = baselineSubgoals.length > 0
    } else if (subgoalModal && subgoalModal.goalId === target.id) {
      const cleaned = subgoalModal.subgoals
        .map((subgoal) => ({
          ...subgoal,
          text: sanitizeGoalText(subgoal.text, maxGoalTextLength),
        }))
        .filter((subgoal) => subgoal.text)
      nextSubgoals =
        cleaned.length >= 2
          ? cleaned
          : [
              { id: safeRandomId(), text: 'Subgoal 1', done: false },
              { id: safeRandomId(), text: 'Subgoal 2', done: false },
            ]
      subgoalsChanged = !areSubgoalsEqual(nextSubgoals, baselineSubgoals)
    }

    const textChanged = cleanedText !== target.text
    if (!textChanged && !subgoalsChanged) {
      setEditGoalModal(null)
      setSubgoalModal(null)
      setSubgoalsRemoved(false)
      resetSubgoalBaseline()
      resetEditBaseline()
      return
    }

    if (textChanged) {
      if (isRearranging) {
        setDraftGoals((prev) =>
          prev.map((goal) =>
            goal.id === editGoalModal.goalId ? { ...goal, text: cleanedText } : goal
          )
        )
      } else {
        updateCurrentBoard((current) => ({
          ...current,
          goals: current.goals.map((goal) =>
            goal.id === editGoalModal.goalId ? { ...goal, text: cleanedText } : goal
          ),
        }))
      }
      setPendingGoalSave({
        text: cleanedText,
        frequency: target.frequency,
        sourceGoalId: target.sourceGoalId,
      })
    }

    if (subgoalsChanged) {
      const allDone = nextSubgoals ? nextSubgoals.every((subgoal) => subgoal.done) : false
      if (isRearranging) {
        if (nextSubgoals) {
          updateDraftSubgoals(target.id, nextSubgoals)
        } else {
          removeDraftSubgoals(target.id)
        }
      }
      if (!isRearranging) {
        updateCurrentBoard((current) => ({
          ...current,
          goals: current.goals.map((goal) =>
            goal.id === target.id
              ? {
                  ...goal,
                  subgoals: nextSubgoals,
                  completed: nextSubgoals ? allDone : false,
                }
              : goal
          ),
        }))
      }
      setCustomGoals((prev) => {
        const fallbackMatch = prev.find(
          (goal) =>
            goal.text.trim().toLowerCase() === cleanedText.toLowerCase() &&
            goal.frequency === target.frequency
        )
        const matchId = target.sourceGoalId ?? fallbackMatch?.id
        if (matchId) {
          return prev.map((goal) =>
            goal.id === matchId ? { ...goal, subgoals: nextSubgoals } : goal
          )
        }
        return [
          ...prev,
          {
            id: safeRandomId(),
            text: cleanedText,
            frequency: target.frequency,
            subgoals: nextSubgoals,
          },
        ]
      })
    }

    setEditGoalModal(null)
    setSubgoalModal(null)
    setSubgoalsRemoved(false)
    resetSubgoalBaseline()
    resetEditBaseline()
  }

  const handleOpenSubgoals = () => {
    if (!editGoalModal) return
    if (editGoalModal.scope === 'library') {
      const target = customGoals.find((goal) => goal.id === editGoalModal.goalId)
      if (!target) return
      const existing = target.subgoals ?? []
      const base = existing.length >= 2 ? existing : [
        { id: safeRandomId(), text: 'Subgoal 1', done: false },
        { id: safeRandomId(), text: 'Subgoal 2', done: false },
      ]
      resetSubgoalBaseline()
      setSubgoalsRemoved(false)
      setSubgoalModal({
        goalId: target.id,
        subgoals: base.map((subgoal) => ({ ...subgoal, done: false })),
      })
      return
    }
    if (!board) return
    const sourceGoals = isRearranging ? draftGoals : board.goals
    const target = sourceGoals.find((goal) => goal.id === editGoalModal.goalId)
    if (!target) return
    const existing = target.subgoals ?? []
    const base = existing.length >= 2 ? existing : [
      { id: safeRandomId(), text: 'Subgoal 1', done: false },
      { id: safeRandomId(), text: 'Subgoal 2', done: false },
    ]
    if (isRearranging) {
      subgoalBaselineRef.current = existing.map((subgoal) => ({ ...subgoal }))
      subgoalBaselineGoalIdRef.current = target.id
    } else {
      resetSubgoalBaseline()
    }
    setSubgoalsRemoved(false)
    setSubgoalModal({
      goalId: target.id,
      subgoals: base,
    })
  }

  const handleUpdateSubgoalText = (id: string, value: string) => {
    setSubgoalModal((prev) =>
      prev
        ? (() => {
            const nextSubgoals = prev.subgoals.map((subgoal) =>
              subgoal.id === id ? { ...subgoal, text: value } : subgoal
            )
            if (isRearranging) updateDraftSubgoals(prev.goalId, nextSubgoals)
            return { ...prev, subgoals: nextSubgoals }
          })()
        : prev
    )
    setSubgoalsRemoved(false)
  }

  const handleToggleSubgoal = (id: string) => {
    setSubgoalModal((prev) =>
      prev
        ? (() => {
            const nextSubgoals = prev.subgoals.map((subgoal) =>
              subgoal.id === id ? { ...subgoal, done: !subgoal.done } : subgoal
            )
            if (isRearranging) updateDraftSubgoals(prev.goalId, nextSubgoals)
            return { ...prev, subgoals: nextSubgoals }
          })()
        : prev
    )
    setSubgoalsRemoved(false)
  }

  const handleAddSubgoal = () => {
    setSubgoalModal((prev) => {
      if (!prev) return prev
      if (prev.subgoals.length >= 24) return prev
      const next = {
        ...prev,
        subgoals: [
          ...prev.subgoals,
          { id: safeRandomId(), text: `Subgoal ${prev.subgoals.length + 1}`, done: false },
        ],
      }
      if (isRearranging) updateDraftSubgoals(prev.goalId, next.subgoals)
      return next
    })
    setSubgoalsRemoved(false)
  }

  const handleDeleteSubgoal = (id: string) => {
    setSubgoalModal((prev) => {
      if (!prev) return prev
      if (prev.subgoals.length <= 2) return prev
      const next = {
        ...prev,
        subgoals: prev.subgoals.filter((subgoal) => subgoal.id !== id),
      }
      if (isRearranging) updateDraftSubgoals(prev.goalId, next.subgoals)
      return next
    })
    setSubgoalsRemoved(false)
  }

  const handleCancelSubgoals = () => {
    restoreSubgoalBaseline()
    setSubgoalModal(null)
    setSubgoalsRemoved(false)
  }

  const handleRemoveSubgoals = () => {
    if (!subgoalModal) return
    const goalId = subgoalModal.goalId
    if (isRearranging) {
      removeDraftSubgoals(goalId)
    }
    setSubgoalsRemoved(true)
    setSubgoalModal(null)
    resetSubgoalBaseline()
  }

  const handleCancelGoalEdit = () => {
    if (subgoalModal) {
      handleCancelSubgoals()
    }
    setEditGoalModal(null)
    setSubgoalsRemoved(false)
    resetEditBaseline()
  }

  const handleExportData = () => {
    const uiStatePayload = isFrequency(generationFrequency) &&
      isBoardSize(boardSize) &&
      typeof customOnly === 'boolean' &&
      isFrequency(customFrequency) &&
      isFrequency(libraryFrequency) &&
      isLibrarySource(librarySource)
      ? serializeUiState({
          generationFrequency,
          boardSize,
          customOnly,
          customFrequency,
          libraryFrequency,
          librarySource,
        })
      : null
    const payload: StoredData = {
      boards: boards.map(serializeBoard),
      currentBoardId,
      customGoals: customGoals.map(serializeCustomGoal),
      dismissedRecentGoals,
      ...(uiStatePayload ? { uiState: uiStatePayload } : {}),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `goalbingo-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportData = (data: StoredData) => {
    setBoards((data.boards ?? []).map(normalizeBoard))
    setCurrentBoardId(data.currentBoardId ?? null)
    setCustomGoals(normalizeCustomGoals(data.customGoals ?? []))
    setTitleEdits({})
    if (Array.isArray(data.dismissedRecentGoals)) {
      setDismissedRecentGoals(data.dismissedRecentGoals.filter((item) => typeof item === 'string'))
    } else {
      setDismissedRecentGoals([])
    }
    if (data.uiState) {
      if (isFrequency(data.uiState.generationFrequency)) {
        setGenerationFrequency(data.uiState.generationFrequency)
      }
      if (isBoardSize(data.uiState.boardSize)) {
        setBoardSize(data.uiState.boardSize)
        setBoardSizeTouched(true)
      }
      if (typeof data.uiState.customOnly === 'boolean') {
        setCustomOnly(data.uiState.customOnly)
      }
      if (isFrequency(data.uiState.customFrequency)) {
        setCustomFrequency(data.uiState.customFrequency)
      }
      if (isFrequency(data.uiState.libraryFrequency)) {
        setLibraryFrequency(data.uiState.libraryFrequency)
      }
      if (isLibrarySource(data.uiState.librarySource)) {
        setLibrarySource(data.uiState.librarySource)
      }
    }
  }

  // Create and copy a share link for the current board.
  const handleCopyShareLink = async () => {
    if (!board) return
    const url = new URL(window.location.href)
    let shareLink = ''
    if (isFirebaseConfigured && db) {
      try {
        const sharedBoard = serializeBoard(board)
        const docRef = await addDoc(collection(db, 'sharedBoards'), {
          ...sharedBoard,
          sharedAt: serverTimestamp(),
        })
        url.searchParams.set('share', docRef.id)
        url.searchParams.delete('board')
        shareLink = url.toString()
      } catch {
        shareLink = ''
      }
    }
    if (!shareLink) {
      url.searchParams.set('board', encodeBoard(board))
      url.searchParams.delete('share')
      shareLink = url.toString()
    }
    setShareUrl(shareLink)
    try {
      await navigator.clipboard.writeText(shareLink)
    } catch {
      // Clipboard might be blocked; the input stays populated.
    }
  }

  const handleUseSharedBoard = () => {
    if (!sharedBoard) return
    const newBoard = normalizeBoard({
      ...sharedBoard,
      id: safeRandomId(),
      createdAt: new Date().toISOString(),
      celebrated: false,
    })
    setBoards((prev) => [newBoard, ...prev])
    setCurrentBoardId(newBoard.id)
    setShareUrl('')
    setActiveTab('board')
  }

  const handleTabChange = (nextTab: 'board' | 'goals' | 'history') => {
    if (nextTab === activeTab) return
    if (isRearranging && nextTab !== 'board') {
      setPendingTab(nextTab)
      return
    }
    setActiveTab(nextTab)
  }

  const handleResolvePendingTab = (action: 'save' | 'cancel') => {
    if (!pendingTab) return
    if (action === 'save') {
      handleSaveRearrange()
    } else {
      handleCancelRearrange()
    }
    setActiveTab(pendingTab)
    setPendingTab(null)
  }

  const hasUnsavedChanges = (() => {
    if (!editGoalModal) return false
    const baselineText = editBaselineTextRef.current ?? editGoalModal.text
    const textChanged = editGoalModal.text !== baselineText
    const baselineSubgoals =
      editBaselineGoalIdRef.current === editGoalModal.goalId
        ? editBaselineSubgoalsRef.current ?? undefined
        : undefined
    let subgoalsChanged = false
    if (subgoalsRemoved) {
      subgoalsChanged = (baselineSubgoals?.length ?? 0) > 0
    } else if (subgoalModal && subgoalModal.goalId === editGoalModal.goalId) {
      subgoalsChanged = !areSubgoalsEqual(subgoalModal.subgoals, baselineSubgoals)
    }
    return textChanged || subgoalsChanged
  })()

  return (
    <div className="app">
      {showCelebration && (
        <div className="celebration" aria-hidden="true">
          {Array.from({ length: 36 }, (_, index) => (
            <span key={index} className="confetti" />
          ))}
        </div>
      )}
      <GoalModals
        pendingGoalSave={pendingGoalSave}
        editGoalModal={editGoalModal}
        subgoalModal={subgoalModal}
        hasUnsavedChanges={hasUnsavedChanges}
        maxGoalTextLength={maxGoalTextLength}
        onSaveEditedGoal={handleSaveEditedGoal}
        onEditGoalChange={(value) =>
          setEditGoalModal((prev) => (prev ? { ...prev, text: value } : prev))
        }
        onApplyGoalEdit={handleApplyGoalEdit}
        onCancelGoalEdit={handleCancelGoalEdit}
        onOpenSubgoals={handleOpenSubgoals}
        onToggleSubgoal={handleToggleSubgoal}
        onUpdateSubgoalText={handleUpdateSubgoalText}
        onDeleteSubgoal={handleDeleteSubgoal}
        onRemoveSubgoals={handleRemoveSubgoals}
        onAddSubgoal={handleAddSubgoal}
      />
      <Hero
        board={board}
        completedCount={board ? board.goals.filter((goal) => goal.completed).length : 0}
        totalCount={currentBoardTotal}
        bingoActive={bingoActive}
        syncStatus={syncStatus}
      />

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'board' ? 'active' : ''}`}
          onClick={() => handleTabChange('board')}
        >
          Current board
        </button>
        <button
          className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => handleTabChange('goals')}
        >
          Goals
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          Board history
        </button>
      </div>

      {sharedBoard && (
        <section className="panel accent">
          <div>
            <h2>Shared board detected</h2>
            <p>Load this shared board into your own space.</p>
          </div>
          <button className="primary" onClick={handleUseSharedBoard}>
            Use shared board
          </button>
        </section>
      )}

      {activeTab === 'goals' && (
        <GoalsTab
          boardTitle={boardTitle}
          onBoardTitleChange={setBoardTitle}
          maxBoardTitleLength={maxGoalTextLength}
          generationFrequency={generationFrequency}
          onGenerationFrequencyChange={setGenerationFrequency}
          boardSize={boardSize}
          onBoardSizeChange={(value) => {
            setBoardSizeTouched(true)
            setBoardSize(value)
          }}
          customOnly={customOnly}
          onCustomOnlyChange={setCustomOnly}
          customText={customText}
          onCustomTextChange={setCustomText}
          maxGoalTextLength={maxGoalTextLength}
          customFrequency={customFrequency}
          onCustomFrequencyChange={setCustomFrequency}
          customSubgoals={customSubgoals}
          onCustomSubgoalsChange={setCustomSubgoals}
          onAddCustomGoal={handleAddCustomGoal}
          onGenerateBoard={handleGenerateBoard}
          uniqueSelectedCount={uniqueSelectedCount}
          onDismissRecentGoals={handleDismissRecentGoals}
          error={error}
          suggestedGoalsCount={suggestedGoals.length}
          customGoalsCount={customGoals.length}
          customAvailable={customAvailable}
          suggestedAvailable={suggestedAvailable}
          recentIncompleteAvailable={recentIncompleteAvailable}
          selectedCustomIds={selectedCustomIds}
          selectedSuggestedIds={selectedSuggestedIds}
          selectedRecentIds={selectedRecentIds}
          onToggleCustomSelection={handleToggleCustomSelection}
          onToggleSuggestedSelection={handleToggleSuggestedSelection}
          onToggleRecentSelection={handleToggleRecentSelection}
          onSelectAllCustom={handleSelectAllCustom}
          onClearCustom={handleClearCustom}
          onSelectAllSuggested={handleSelectAllSuggested}
          onClearSuggested={handleClearSuggested}
          onSelectAllRecent={handleSelectAllRecent}
          onClearRecent={handleClearRecent}
          libraryFrequency={libraryFrequency}
          onLibraryFrequencyChange={setLibraryFrequency}
          librarySource={librarySource}
          onLibrarySourceChange={setLibrarySource}
          filteredLibraryGoals={filteredLibraryGoals}
          customLibraryGoals={customLibraryGoals}
          frequencyLabel={frequencyLabel}
          onDeleteCustomGoal={handleDeleteCustomGoal}
          onEditLibraryGoal={handleEditLibraryGoal}
          onEditBoardGoal={handleEditGoal}
          onDeleteBoardGoal={handleDeleteBoardGoal}
        />
      )}

      {activeTab === 'board' && (
        <>
          {board ? (
            <CurrentBoard
              board={board}
              currentBoardSize={currentBoardSize}
              shareUrl={shareUrl}
              bingoLine={bingoLine}
              isRearranging={isRearranging}
              draftGoals={draftGoals}
              boardFrequencyLabel={frequencyLabel[board.goals[0]?.frequency ?? generationFrequency]}
              isEditingTitle={isEditingCurrentTitle}
              currentTitleDraft={currentTitleDraft}
              maxBoardTitleLength={maxGoalTextLength}
              onTitleDraftChange={setCurrentTitleDraft}
              onStartEditTitle={() => setIsEditingCurrentTitle(true)}
              onCancelEditTitle={() => {
                setIsEditingCurrentTitle(false)
                setCurrentTitleDraft(board.title)
              }}
              onSaveTitle={handleSaveCurrentTitle}
              onToggleGoal={toggleGoal}
              onEditGoal={handleEditGoal}
              onResetProgress={handleResetProgress}
              onFillEmptyTiles={handleFillEmptyTiles}
              hasEmptyTiles={board.goals.some((goal) => !goal.text.trim())}
              onCopyShareLink={handleCopyShareLink}
              onEnterRearrange={handleEnterRearrange}
              onSaveRearrange={handleSaveRearrange}
              onCancelRearrange={handleCancelRearrange}
              onRearrangeRandomize={handleRearrangeRandomize}
              onReorder={handleReorder}
              getGoalProgress={getGoalProgress}
            />
          ) : (
            <section className="panel">
              <div className="panel-header">
                <h2>No board yet</h2>
                <p>Create a board from the Goals tab to get started.</p>
              </div>
              <button className="secondary" onClick={() => setActiveTab('goals')}>
                Go to Goals
              </button>
            </section>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <BoardHistory
          boards={boards}
          titleEdits={titleEdits}
          onTitleEditChange={(id, value) =>
            setTitleEdits((prev) => ({ ...prev, [id]: value }))
          }
          onOpenBoard={(id) => {
            handleOpenBoard(id)
            setActiveTab('board')
          }}
          onSaveTitle={handleSaveTitle}
          onDeleteBoard={handleDeleteBoard}
          onExportData={handleExportData}
          onImportData={handleImportData}
          maxBoardTitleLength={maxGoalTextLength}
          frequencyLabel={frequencyLabel}
          getBoardSize={getBoardSize}
          hasBingo={hasBingo}
        />
      )}

      {pendingTab && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Would you like to save changes to the board?</h3>
            <div className="modal-actions">
              <button className="primary" onClick={() => handleResolvePendingTab('save')}>
                Save changes
              </button>
              <button className="ghost" onClick={() => handleResolvePendingTab('cancel')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel info">
        <h2>Reminders & alerts</h2>
        <p>
          This starter build keeps everything free and local. For push reminders, we can add browser
          notifications next. iOS has limits, but Android works well for PWA notifications.
        </p>
      </section>

      <footer className="footer">
        <p>Built for free hosting. Your data stays on your device unless you share a link.</p>
      </footer>
    </div>
  )
}

export default App
