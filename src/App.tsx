import { useEffect, useMemo, useRef, useState } from 'react'
import './styles/app.css'
import Hero from './components/Hero'
import GoalsTab from './components/GoalsTab'
import CurrentBoard from './components/CurrentBoard'
import BoardHistory from './components/BoardHistory'
import GoalModals from './components/GoalModals'
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
  SubgoalModalState,
  UiState,
} from './types'
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
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null)
  const [sharedBoard, setSharedBoard] = useState<Board | null>(null)
  const [boardTitle, setBoardTitle] = useState('Goal Bingo')
  const [customText, setCustomText] = useState('')
  const [customFrequency, setCustomFrequency] = useState<Frequency>('weekly')
  const [customGoals, setCustomGoals] = useState<GoalTemplate[]>([])
  const [generationFrequency, setGenerationFrequency] = useState<Frequency>('weekly')
  const [boardSize, setBoardSize] = useState(defaultBoardSizeByFrequency.weekly)
  const [boardSizeTouched, setBoardSizeTouched] = useState(false)
  const [customOnly, setCustomOnly] = useState(false)
  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(new Set())
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(new Set())
  const [customSelectionTouched, setCustomSelectionTouched] = useState(false)
  const [libraryFrequency, setLibraryFrequency] = useState<Frequency>('weekly')
  const [librarySource, setLibrarySource] = useState<'suggested' | 'custom' | 'generated'>(
    'suggested'
  )
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [bingoActive, setBingoActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'goals' | 'history'>('board')
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({})
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isEditingCurrentTitle, setIsEditingCurrentTitle] = useState(false)
  const [currentTitleDraft, setCurrentTitleDraft] = useState('')
  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured ? 'Connecting' : 'Local only'
  )
  const remoteLoadedRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const syncingRef = useRef(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [bingoLine, setBingoLine] = useState<number[] | null>(null)
  const [pendingGoalSave, setPendingGoalSave] = useState<PendingGoalSave | null>(null)
  const [editGoalModal, setEditGoalModal] = useState<EditGoalModalState | null>(null)
  const [subgoalModal, setSubgoalModal] = useState<SubgoalModalState | null>(null)
  const [isRearranging, setIsRearranging] = useState(false)
  const [draftGoals, setDraftGoals] = useState<Goal[]>([])

  // Derived state for quick lookups.
  const board = useMemo(
    () => boards.find((item) => item.id === currentBoardId) ?? null,
    [boards, currentBoardId]
  )
  const currentBoardSize = useMemo(() => getBoardSize(board), [board])
  const currentBoardTotal = board ? board.goals.length : 0

  // Goal lists filtered by the currently selected board frequency.
  const customAvailable = useMemo(
    () => customGoals.filter((goal) => goal.frequency === generationFrequency),
    [customGoals, generationFrequency]
  )

  const suggestedAvailable = useMemo(
    () => suggestedGoals.filter((goal) => goal.frequency === generationFrequency),
    [generationFrequency]
  )

  // What the user has checked in the goal pickers.
  const customChecked = useMemo(
    () => customAvailable.filter((goal) => selectedCustomIds.has(goal.id)),
    [customAvailable, selectedCustomIds]
  )

  const suggestedChecked = useMemo(
    () => suggestedAvailable.filter((goal) => selectedSuggestedIds.has(goal.id)),
    [suggestedAvailable, selectedSuggestedIds]
  )

  // Library data shown in the Goals tab.
  const libraryGoals = useMemo(() => {
    if (librarySource === 'custom') return customGoals
    if (librarySource === 'generated') return board ? board.goals : []
    return suggestedGoals
  }, [librarySource, customGoals, board])

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
      customGoals,
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
      customGoals,
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
    generationFrequency,
    boardSize,
    customOnly,
    customFrequency,
    libraryFrequency,
    librarySource,
    hasLoaded,
  ])

  // Use frequency-based defaults for new boards.
  useEffect(() => {
    if (!boardSizeTouched) {
      setBoardSize(defaultBoardSizeByFrequency[generationFrequency])
    }
    setCustomSelectionTouched(false)
  }, [generationFrequency, boardSizeTouched])

  // Reset the title editor when switching boards.
  useEffect(() => {
    setCurrentTitleDraft(board?.title ?? '')
    setIsEditingCurrentTitle(false)
  }, [board?.id])

  // Suggested goals default to all selected for the current frequency.
  useEffect(() => {
    const suggestedIds = suggestedAvailable.map((goal) => goal.id)
    setSelectedSuggestedIds(new Set(suggestedIds))
  }, [generationFrequency, suggestedAvailable])

  // Preserve custom selections if the user already made edits.
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

  // Create a new custom goal.
  const handleAddCustomGoal = () => {
    if (!customText.trim()) return
    setCustomGoals((prev) => [
      ...prev,
      {
        id: safeRandomId(),
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

  // Build a new board from the selected goals and save it to history.
  const handleGenerateBoard = () => {
    setError(null)
    const safeSize = isBoardSize(boardSize)
      ? boardSize
      : defaultBoardSizeByFrequency[generationFrequency]
    const totalTiles = safeSize * safeSize
    const shuffledCustom = shuffle(customChecked)
    const trimmedCustom = shuffledCustom.slice(0, totalTiles)
    const selected = [...trimmedCustom]
    if (!customOnly && selected.length < totalTiles) {
      const remaining = totalTiles - selected.length
      const suggestedPick = shuffle(suggestedChecked).slice(0, remaining)
      selected.push(...suggestedPick)
    }
    const goals = selected.map((goal) => ({
      id: safeRandomId(),
      text: goal.text,
      frequency: goal.frequency,
      completed: false,
      sourceGoalId: customGoals.some((custom) => custom.id === goal.id) ? goal.id : undefined,
    }))
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
      title: boardTitle.trim() || 'Goal Bingo',
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

  const updateCurrentBoard = (updater: (current: Board) => Board) => {
    if (!board) return
    setBoards((prev) => prev.map((item) => (item.id === board.id ? updater(item) : item)))
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

  const handleEditGoal = (goalId: string) => {
    if (!board) return
    const target = board.goals.find((goal) => goal.id === goalId)
    if (!target) return
    setEditGoalModal({ goalId: target.id, text: target.text })
  }

  const handleResetProgress = () => {
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map((goal) => ({ ...goal, completed: false })),
      celebrated: false,
    }))
  }

  const handleSaveCurrentTitle = () => {
    if (!board) return
    const nextTitle = currentTitleDraft.trim()
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
    updateCurrentBoard((current) => ({
      ...current,
      goals: draftGoals.map((goal) => ({ ...goal })),
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
    if (!board || !editGoalModal) return
    const trimmedText = editGoalModal.text.trim()
    if (!trimmedText) return
    const target = board.goals.find((goal) => goal.id === editGoalModal.goalId)
    if (!target) {
      setEditGoalModal(null)
      return
    }
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === editGoalModal.goalId ? { ...goal, text: trimmedText } : goal
      ),
    }))
    setPendingGoalSave({
      text: trimmedText,
      frequency: target.frequency,
      sourceGoalId: target.sourceGoalId,
    })
    setEditGoalModal(null)
  }

  const handleOpenSubgoals = () => {
    if (!board || !editGoalModal) return
    const target = board.goals.find((goal) => goal.id === editGoalModal.goalId)
    if (!target) return
    const existing = target.subgoals ?? []
    const base = existing.length >= 2 ? existing : [
      { id: safeRandomId(), text: 'Subgoal 1', done: false },
      { id: safeRandomId(), text: 'Subgoal 2', done: false },
    ]
    setSubgoalModal({
      goalId: target.id,
      subgoals: base,
    })
    setEditGoalModal(null)
  }

  const handleUpdateSubgoalText = (id: string, value: string) => {
    setSubgoalModal((prev) =>
      prev
        ? { ...prev, subgoals: prev.subgoals.map((subgoal) => (subgoal.id === id ? { ...subgoal, text: value } : subgoal)) }
        : prev
    )
  }

  const handleToggleSubgoal = (id: string) => {
    setSubgoalModal((prev) =>
      prev
        ? {
            ...prev,
            subgoals: prev.subgoals.map((subgoal) =>
              subgoal.id === id ? { ...subgoal, done: !subgoal.done } : subgoal
            ),
          }
        : prev
    )
  }

  const handleAddSubgoal = () => {
    setSubgoalModal((prev) => {
      if (!prev) return prev
      if (prev.subgoals.length >= 24) return prev
      return {
        ...prev,
        subgoals: [
          ...prev.subgoals,
          { id: safeRandomId(), text: `Subgoal ${prev.subgoals.length + 1}`, done: false },
        ],
      }
    })
  }

  const handleDeleteSubgoal = (id: string) => {
    setSubgoalModal((prev) => {
      if (!prev) return prev
      if (prev.subgoals.length <= 2) return prev
      return {
        ...prev,
        subgoals: prev.subgoals.filter((subgoal) => subgoal.id !== id),
      }
    })
  }

  const handleSaveSubgoals = () => {
    if (!board || !subgoalModal) return
    const cleaned = subgoalModal.subgoals
      .map((subgoal) => ({ ...subgoal, text: subgoal.text.trim() }))
      .filter((subgoal) => subgoal.text)
    const finalList =
      cleaned.length >= 2
        ? cleaned
        : [
            { id: safeRandomId(), text: 'Subgoal 1', done: false },
            { id: safeRandomId(), text: 'Subgoal 2', done: false },
          ]
    const allDone = finalList.every((subgoal) => subgoal.done)
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === subgoalModal.goalId
          ? { ...goal, subgoals: finalList, completed: allDone }
          : goal
      ),
    }))
    setSubgoalModal(null)
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

  const handleOpenBoard = (id: string) => {
    setCurrentBoardId(id)
    setActiveTab('board')
  }

  const handleSaveTitle = (id: string) => {
    setBoards((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const nextTitle = (titleEdits[id] ?? item.title).trim()
        return nextTitle ? { ...item, title: nextTitle } : item
      })
    )
  }

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
        onSaveEditedGoal={handleSaveEditedGoal}
        onEditGoalChange={(value) =>
          setEditGoalModal((prev) => (prev ? { ...prev, text: value } : prev))
        }
        onApplyGoalEdit={handleApplyGoalEdit}
        onCancelGoalEdit={() => setEditGoalModal(null)}
        onOpenSubgoals={handleOpenSubgoals}
        onToggleSubgoal={handleToggleSubgoal}
        onUpdateSubgoalText={handleUpdateSubgoalText}
        onDeleteSubgoal={handleDeleteSubgoal}
        onAddSubgoal={handleAddSubgoal}
        onSaveSubgoals={handleSaveSubgoals}
        onCancelSubgoals={() => setSubgoalModal(null)}
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
          onClick={() => setActiveTab('board')}
        >
          Current board
        </button>
        <button
          className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
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
          customFrequency={customFrequency}
          onCustomFrequencyChange={setCustomFrequency}
          onAddCustomGoal={handleAddCustomGoal}
          onGenerateBoard={handleGenerateBoard}
          error={error}
          suggestedGoalsCount={suggestedGoals.length}
          customGoalsCount={customGoals.length}
          customAvailable={customAvailable}
          suggestedAvailable={suggestedAvailable}
          selectedCustomIds={selectedCustomIds}
          selectedSuggestedIds={selectedSuggestedIds}
          onToggleCustomSelection={handleToggleCustomSelection}
          onToggleSuggestedSelection={handleToggleSuggestedSelection}
          onSelectAllCustom={handleSelectAllCustom}
          onClearCustom={handleClearCustom}
          onSelectAllSuggested={handleSelectAllSuggested}
          onClearSuggested={handleClearSuggested}
          libraryFrequency={libraryFrequency}
          onLibraryFrequencyChange={setLibraryFrequency}
          librarySource={librarySource}
          onLibrarySourceChange={setLibrarySource}
          filteredLibraryGoals={filteredLibraryGoals}
          customLibraryGoals={customLibraryGoals}
          frequencyLabel={frequencyLabel}
          onEditCustomGoal={handleEditCustomGoal}
          onDeleteCustomGoal={handleDeleteCustomGoal}
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
          onOpenBoard={handleOpenBoard}
          onSaveTitle={handleSaveTitle}
          frequencyLabel={frequencyLabel}
          getBoardSize={getBoardSize}
          hasBingo={hasBingo}
        />
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
