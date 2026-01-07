import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

type GoalTemplate = {
  id: string
  text: string
  frequency: Frequency
}

type Goal = {
  id: string
  text: string
  frequency: Frequency
  completed: boolean
}

type Board = {
  id: string
  title: string
  createdAt: string
  goals: Goal[]
  size: number
  celebrated: boolean
}

type StoredData = {
  boards: Board[]
  currentBoardId: string | null
  customGoals: GoalTemplate[]
}

const LEGACY_STORAGE_KEY = 'bingo-board-v1'
const STORAGE_KEY = 'bingo-board-v2'

const frequencyLabel: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

const defaultBoardSizeByFrequency: Record<Frequency, number> = {
  daily: 3,
  weekly: 3,
  monthly: 4,
  yearly: 5,
}

const buildSuggestedId = (frequency: Frequency, text: string) =>
  `suggested-${frequency}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`

const suggestedGoalTemplates: Omit<GoalTemplate, 'id'>[] = [
  { text: 'Drink 8 glasses of water', frequency: 'daily' },
  { text: 'Walk 6,000 steps', frequency: 'daily' },
  { text: 'Read for 20 minutes', frequency: 'daily' },
  { text: 'Stretch for 10 minutes', frequency: 'daily' },
  { text: 'Journal one gratitude', frequency: 'daily' },
  { text: 'Plan tomorrow in 5 minutes', frequency: 'daily' },
  { text: 'Cook a balanced meal', frequency: 'daily' },
  { text: 'Meditate for 5 minutes', frequency: 'daily' },
  { text: 'Do a 5-minute tidy', frequency: 'daily' },
  { text: 'Take a screen-free break', frequency: 'daily' },
  { text: 'Step outside for fresh air', frequency: 'daily' },
  { text: 'Write one priority for today', frequency: 'daily' },
  { text: 'Eat one extra serving of veggies', frequency: 'daily' },
  { text: 'Send one kind message', frequency: 'daily' },
  { text: 'Listen to a favorite song', frequency: 'daily' },
  { text: 'Practice posture check', frequency: 'daily' },
  { text: 'Drink a cup of herbal tea', frequency: 'daily' },
  { text: 'Do a short breathing exercise', frequency: 'daily' },
  { text: 'Review today’s schedule', frequency: 'daily' },
  { text: 'Set a 10-minute focus timer', frequency: 'daily' },
  { text: 'Celebrate one small win', frequency: 'daily' },
  { text: 'Tidy your workspace', frequency: 'daily' },
  { text: 'Read one page of a book', frequency: 'daily' },
  { text: 'Write down one idea', frequency: 'daily' },
  { text: 'End the day with a quick recap', frequency: 'daily' },
  { text: 'Inbox to zero (work or personal)', frequency: 'weekly' },
  { text: 'Declutter one small area', frequency: 'weekly' },
  { text: 'Try a new recipe', frequency: 'weekly' },
  { text: 'Call a friend or family member', frequency: 'weekly' },
  { text: 'Do one longer workout', frequency: 'weekly' },
  { text: 'Review your budget', frequency: 'weekly' },
  { text: 'Plan your week in advance', frequency: 'weekly' },
  { text: 'Batch cook one meal', frequency: 'weekly' },
  { text: 'Do a full grocery restock', frequency: 'weekly' },
  { text: 'Organize your calendar', frequency: 'weekly' },
  { text: 'Do laundry start-to-finish', frequency: 'weekly' },
  { text: 'Clean out your inbox', frequency: 'weekly' },
  { text: 'Take a long walk outside', frequency: 'weekly' },
  { text: 'Try a new workout class', frequency: 'weekly' },
  { text: 'Reflect on weekly wins', frequency: 'weekly' },
  { text: 'Plan one social meetup', frequency: 'weekly' },
  { text: 'Update your to-do list', frequency: 'weekly' },
  { text: 'Do a tech-free evening', frequency: 'weekly' },
  { text: 'Sort one drawer or shelf', frequency: 'weekly' },
  { text: 'Water plants', frequency: 'weekly' },
  { text: 'Review upcoming deadlines', frequency: 'weekly' },
  { text: 'Do a personal finance check-in', frequency: 'weekly' },
  { text: 'Prep outfits for the week', frequency: 'weekly' },
  { text: 'Make a weekly highlight note', frequency: 'weekly' },
  { text: 'Plan a weekend activity', frequency: 'weekly' },
  { text: 'Donate or give back in a small way', frequency: 'monthly' },
  { text: 'Update resume or portfolio', frequency: 'monthly' },
  { text: 'Organize digital files', frequency: 'monthly' },
  { text: 'Learn a new skill for 30 minutes', frequency: 'monthly' },
  { text: 'Schedule a self-care day', frequency: 'monthly' },
  { text: 'Write down 3 big wins', frequency: 'monthly' },
  { text: 'Plan a mini adventure', frequency: 'monthly' },
  { text: 'Review subscriptions', frequency: 'monthly' },
  { text: 'Deep clean one room', frequency: 'monthly' },
  { text: 'Plan next month goals', frequency: 'monthly' },
  { text: 'Back up your photos', frequency: 'monthly' },
  { text: 'Do a closet reset', frequency: 'monthly' },
  { text: 'Review recurring bills', frequency: 'monthly' },
  { text: 'Try a new hobby session', frequency: 'monthly' },
  { text: 'Schedule a catch-up brunch', frequency: 'monthly' },
  { text: 'Reassess your routines', frequency: 'monthly' },
  { text: 'Plan one community event', frequency: 'monthly' },
  { text: 'Refresh your playlists', frequency: 'monthly' },
  { text: 'Do a digital detox half-day', frequency: 'monthly' },
  { text: 'Audit your goals list', frequency: 'monthly' },
  { text: 'Replace one household supply', frequency: 'monthly' },
  { text: 'Create a mini reward plan', frequency: 'monthly' },
  { text: 'Log progress toward big goal', frequency: 'monthly' },
  { text: 'Plan next month finances', frequency: 'monthly' },
  { text: 'Create a vision board', frequency: 'monthly' },
  { text: 'Set a yearly theme word', frequency: 'yearly' },
  { text: 'Create a vision board', frequency: 'yearly' },
  { text: 'Review annual goals and reset', frequency: 'yearly' },
  { text: 'Take a class or workshop', frequency: 'yearly' },
  { text: 'Plan a meaningful trip', frequency: 'yearly' },
  { text: 'Give yourself a digital detox day', frequency: 'yearly' },
  { text: 'Write a letter to your future self', frequency: 'yearly' },
  { text: 'Set a career milestone', frequency: 'yearly' },
  { text: 'Plan a health checkup', frequency: 'yearly' },
  { text: 'Volunteer for a cause', frequency: 'yearly' },
  { text: 'Update long-term financial goals', frequency: 'yearly' },
  { text: 'Create a learning roadmap', frequency: 'yearly' },
  { text: 'Take a weekend getaway', frequency: 'yearly' },
  { text: 'Review and refresh relationships', frequency: 'yearly' },
  { text: 'Do a home inventory', frequency: 'yearly' },
  { text: 'Plan a passion project', frequency: 'yearly' },
  { text: 'Set a reading list for the year', frequency: 'yearly' },
  { text: 'Create a wellness plan', frequency: 'yearly' },
  { text: 'Host a yearly celebration', frequency: 'yearly' },
  { text: 'Reflect on your growth', frequency: 'yearly' },
  { text: 'Audit your digital security', frequency: 'yearly' },
  { text: 'Set a giving goal', frequency: 'yearly' },
  { text: 'Write a personal mission statement', frequency: 'yearly' },
  { text: 'Choose a yearly creative theme', frequency: 'yearly' },
  { text: 'Review and archive memories', frequency: 'yearly' },
]

const suggestedGoals: GoalTemplate[] = suggestedGoalTemplates.map((goal) => ({
  ...goal,
  id: buildSuggestedId(goal.frequency, goal.text),
}))

const safeRandomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

const shuffle = <T,>(items: T[]) => {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

const encodeBoard = (board: Board) => {
  const json = JSON.stringify(board)
  return btoa(encodeURIComponent(json))
}

const decodeBoard = (encoded: string) => {
  try {
    const json = decodeURIComponent(atob(encoded))
    return JSON.parse(json) as Board
  } catch {
    return null
  }
}

const getBoardSize = (board: Board | null) => {
  if (!board) return 5
  if (board.size) return board.size
  return Math.round(Math.sqrt(board.goals.length)) || 5
}

const normalizeCustomGoals = (goals: GoalTemplate[]) =>
  goals.map((goal) => (goal.id ? goal : { ...goal, id: safeRandomId() }))

const normalizeBoard = (board: Board): Board => ({
  ...board,
  size: board.size || Math.round(Math.sqrt(board.goals.length)) || 5,
})

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

const hasBingo = (goals: Goal[], size: number) =>
  getBingoLines(size).some((line) => line.every((index) => goals[index]?.completed))

const playCelebrationTone = () => {
  if (typeof window === 'undefined') return
  const audioContext = new (window.AudioContext || (window as unknown as Window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.value = 659
  gain.gain.value = 0.08
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1)
  oscillator.stop(audioContext.currentTime + 1)
}

function App() {
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null)
  const [sharedBoard, setSharedBoard] = useState<Board | null>(null)
  const [boardTitle, setBoardTitle] = useState('Goal Bingo')
  const [customText, setCustomText] = useState('')
  const [customFrequency, setCustomFrequency] = useState<Frequency>('weekly')
  const [customGoals, setCustomGoals] = useState<GoalTemplate[]>([])
  const [generationFrequency, setGenerationFrequency] = useState<Frequency>('weekly')
  const [boardSize, setBoardSize] = useState(defaultBoardSizeByFrequency.weekly)
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

  const board = useMemo(
    () => boards.find((item) => item.id === currentBoardId) ?? null,
    [boards, currentBoardId]
  )
  const currentBoardSize = useMemo(() => getBoardSize(board), [board])
  const currentBoardTotal = board ? board.goals.length : 0

  const customAvailable = useMemo(
    () => customGoals.filter((goal) => goal.frequency === generationFrequency),
    [customGoals, generationFrequency]
  )

  const suggestedAvailable = useMemo(
    () => suggestedGoals.filter((goal) => goal.frequency === generationFrequency),
    [generationFrequency]
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
    const encoded = params.get('board')
    if (encoded) {
      const decoded = decodeBoard(encoded)
      if (decoded && decoded.goals?.length) {
        setSharedBoard(normalizeBoard(decoded))
      }
    }
  }, [])

  useEffect(() => {
    setBoardSize(defaultBoardSizeByFrequency[generationFrequency])
    setCustomSelectionTouched(false)
  }, [generationFrequency])

  useEffect(() => {
    setCurrentTitleDraft(board?.title ?? '')
    setIsEditingCurrentTitle(false)
  }, [board?.id])

  useEffect(() => {
    const suggestedIds = suggestedAvailable.map((goal) => goal.id)
    setSelectedSuggestedIds(new Set(suggestedIds))
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

  useEffect(() => {
    if (!hasLoaded) return
    const payload: StoredData = {
      boards,
      currentBoardId,
      customGoals,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [boards, currentBoardId, customGoals, hasLoaded])

  useEffect(() => {
    if (!board) return
    const bingo = hasBingo(board.goals, getBoardSize(board))
    if (bingo && !board.celebrated) {
      playCelebrationTone()
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
  }, [board])

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

  const handleGenerateBoard = () => {
    setError(null)
    const totalTiles = boardSize * boardSize
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
    }))
    while (goals.length < totalTiles) {
      goals.push({
        id: safeRandomId(),
        text: '',
        frequency: generationFrequency,
        completed: false,
      })
    }
    const newBoard: Board = {
      id: safeRandomId(),
      title: boardTitle.trim() || 'Goal Bingo',
      createdAt: new Date().toISOString(),
      goals,
      size: boardSize,
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
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
      ),
    }))
  }

  const handleEditGoal = (goalId: string) => {
    if (!board) return
    const target = board.goals.find((goal) => goal.id === goalId)
    if (!target) return
    const nextText = window.prompt('Edit goal text', target.text)
    if (!nextText || !nextText.trim()) return
    updateCurrentBoard((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, text: nextText.trim() } : goal
      ),
    }))
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

  const handleCopyShareLink = async () => {
    if (!board) return
    const url = new URL(window.location.href)
    url.searchParams.set('board', encodeBoard(board))
    const shareLink = url.toString()
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

  const handleRandomizeBoard = () => {
    updateCurrentBoard((current) => ({
      ...current,
      goals: shuffle(current.goals),
    }))
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
      <header className="hero">
        <div>
          <p className="eyebrow">Goal-setting bingo</p>
          <h1>Play your way to momentum.</h1>
          <p className="subtitle">
            Build a board of goals. Tap to complete. Share the board with a link.
          </p>
        </div>
        <div className="hero-card">
          <div className="hero-card-header">Your board</div>
          <div className="hero-card-title">{board?.title ?? 'No board yet'}</div>
          <div className="hero-card-meta">
            {board
              ? `${board.goals.filter((goal) => goal.completed).length}/${currentBoardTotal} complete`
              : 'Ready to start'}
          </div>
          {bingoActive && <div className="hero-badge">Bingo!</div>}
        </div>
      </header>

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
        <>
          <section className="panel">
            <div className="panel-header">
              <h2>Create your board</h2>
              <p>Pick a frequency and mix suggested goals with your own ideas.</p>
            </div>
            <div className="form-grid">
              <label>
                Board title
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(event) => setBoardTitle(event.target.value)}
                  placeholder="Goal Bingo"
                />
              </label>
              <label>
                Board frequency
                <select
                  value={generationFrequency}
                  onChange={(event) => setGenerationFrequency(event.target.value as Frequency)}
                >
                  {Object.entries(frequencyLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Board size
                <select
                  value={boardSize}
                  onChange={(event) => setBoardSize(Number(event.target.value))}
                >
                  <option value={3}>3x3</option>
                  <option value={4}>4x4</option>
                  <option value={5}>5x5</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={customOnly}
                  onChange={(event) => setCustomOnly(event.target.checked)}
                />
                Custom goals only
              </label>
            </div>
            <div className="checklist-row">
              <details className="checklist">
                <summary>
                  Custom goals ({customChecked.length}/{customAvailable.length})
                </summary>
                <div className="checklist-controls">
                  <button className="ghost small" type="button" onClick={handleSelectAllCustom}>
                    Select all
                  </button>
                  <button className="ghost small" type="button" onClick={handleClearCustom}>
                    Clear
                  </button>
                </div>
                <div className="checklist-items">
                  {customAvailable.length === 0 ? (
                    <p className="muted">No custom goals for this frequency yet.</p>
                  ) : (
                    customAvailable.map((goal) => (
                      <label key={goal.id} className="check-item">
                        <input
                          type="checkbox"
                          checked={selectedCustomIds.has(goal.id)}
                          onChange={() => handleToggleCustomSelection(goal.id)}
                        />
                        <span>{goal.text}</span>
                      </label>
                    ))
                  )}
                </div>
              </details>
              <details className="checklist">
                <summary>
                  Suggested goals ({suggestedChecked.length}/{suggestedAvailable.length})
                </summary>
                <div className="checklist-controls">
                  <button className="ghost small" type="button" onClick={handleSelectAllSuggested}>
                    Select all
                  </button>
                  <button className="ghost small" type="button" onClick={handleClearSuggested}>
                    Clear
                  </button>
                </div>
                <div className="checklist-items">
                  {suggestedAvailable.length === 0 ? (
                    <p className="muted">No suggested goals for this frequency yet.</p>
                  ) : (
                    suggestedAvailable.map((goal) => (
                      <label key={goal.id} className="check-item">
                        <input
                          type="checkbox"
                          checked={selectedSuggestedIds.has(goal.id)}
                          onChange={() => handleToggleSuggestedSelection(goal.id)}
                        />
                        <span>{goal.text}</span>
                      </label>
                    ))
                  )}
                </div>
              </details>
            </div>
            <div className="form-footer">
              <div>
                <span className="pill">Suggested: {suggestedGoals.length}</span>
                <span className="pill">Custom: {customGoals.length}</span>
                <span className="pill">
                  Custom {frequencyLabel[generationFrequency]}: {customAvailable.length}
                </span>
                <span className="pill">
                  Suggested {frequencyLabel[generationFrequency]}: {suggestedAvailable.length}
                </span>
              </div>
              <button className="primary" type="button" onClick={handleGenerateBoard}>
                Generate {boardSize}x{boardSize} board
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Create your goal</h2>
              <p>Add a new custom goal to use in your boards.</p>
            </div>
            <div className="form-grid">
              <label>
                Custom goal
                <input
                  type="text"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder="Run 3 miles"
                />
              </label>
              <label>
                Frequency
                <select
                  value={customFrequency}
                  onChange={(event) => setCustomFrequency(event.target.value as Frequency)}
                >
                  {Object.entries(frequencyLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary" type="button" onClick={handleAddCustomGoal}>
                Add custom goal
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Goal library</h2>
              <p>Browse goals by frequency and source.</p>
            </div>
            <div className="form-grid">
              <label>
                Frequency
                <select
                  value={libraryFrequency}
                  onChange={(event) => setLibraryFrequency(event.target.value as Frequency)}
                >
                  {Object.entries(frequencyLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source
                <select
                  value={librarySource}
                  onChange={(event) =>
                    setLibrarySource(event.target.value as 'suggested' | 'custom' | 'generated')
                  }
                >
                  <option value="suggested">Suggested goals</option>
                  <option value="custom">Custom goals</option>
                  <option value="generated">Generated board goals</option>
                </select>
              </label>
            </div>
            <div className="goal-list">
              {librarySource === 'custom' ? (
                customLibraryGoals.length === 0 ? (
                  <p className="muted">No goals found for this filter yet.</p>
                ) : (
                  customLibraryGoals.map((goal) => (
                    <div key={goal.id} className="goal-list-item">
                      <span>{goal.text}</span>
                      <div className="goal-actions">
                        <span className="goal-chip">{frequencyLabel[goal.frequency]}</span>
                        <button
                          className="ghost small"
                          type="button"
                          onClick={() => handleEditCustomGoal(goal.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="ghost small danger"
                          type="button"
                          onClick={() => handleDeleteCustomGoal(goal.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : filteredLibraryGoals.length === 0 ? (
                <p className="muted">No goals found for this filter yet.</p>
              ) : (
                filteredLibraryGoals.map((goal, index) => (
                  <div key={goal.id ?? `${goal.text}-${index}`} className="goal-list-item">
                    <span>{goal.text}</span>
                    <span className="goal-chip">{frequencyLabel[goal.frequency]}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'board' && (
        <>
          {board ? (
            <section className="board">
              <div className="board-header">
                <div>
                  {isEditingCurrentTitle ? (
                    <div className="title-edit">
                      <input
                        type="text"
                        value={currentTitleDraft}
                        onChange={(event) => setCurrentTitleDraft(event.target.value)}
                      />
                      <div className="title-actions">
                        <button className="secondary small" onClick={handleSaveCurrentTitle}>
                          Save
                        </button>
                        <button
                          className="ghost small"
                          onClick={() => {
                            setIsEditingCurrentTitle(false)
                            setCurrentTitleDraft(board.title)
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="title-row">
                      <h2>{board.title}</h2>
                      <button
                        className="ghost small"
                        onClick={() => setIsEditingCurrentTitle(true)}
                      >
                        Edit name
                      </button>
                    </div>
                  )}
                  <div className="board-frequency">
                    {frequencyLabel[board.goals[0]?.frequency ?? generationFrequency]}
                  </div>
                  <p>Tap goals to mark them complete. Get five in a row for Bingo.</p>
                </div>
                <div className="board-actions">
                  <button className="ghost" onClick={handleResetProgress}>
                    Reset progress
                  </button>
                  <button className="ghost" onClick={handleRandomizeBoard}>
                    Randomize
                  </button>
                  <button className="primary" onClick={handleCopyShareLink}>
                    Share board
                  </button>
                </div>
              </div>
              {shareUrl && (
                <div className="share">
                  <input type="text" value={shareUrl} readOnly />
                  <span>Link copied if clipboard is allowed.</span>
                </div>
              )}
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${currentBoardSize}, minmax(0, 1fr))` }}
              >
                {board.goals.map((goal, index) => (
                  <div key={goal.id} className={`cell ${goal.completed ? 'completed' : ''}`}>
                    <button
                      className="cell-button"
                      onClick={() => toggleGoal(goal.id)}
                      aria-pressed={goal.completed}
                    >
                      <span className="cell-index">{index + 1}</span>
                      {goal.text ? (
                        <span className="cell-text">{goal.text}</span>
                      ) : (
                        <span className="cell-placeholder">Empty tile</span>
                      )}
                    </button>
                    <button className="edit-button" onClick={() => handleEditGoal(goal.id)}>
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </section>
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
        <section className="panel">
          <div className="panel-header">
            <h2>Board history</h2>
            <p>Every generated board is saved here. Rename or reopen any board.</p>
          </div>
          {boards.length === 0 ? (
            <p className="muted">No boards yet. Generate your first board to get started.</p>
          ) : (
            <div className="history-list">
              {boards.map((item) => {
                const boardFrequency = item.goals[0]?.frequency
                const completedCount = item.goals.filter((goal) => goal.completed).length
                const totalCount = item.goals.length
                const historyBingo = hasBingo(item.goals, getBoardSize(item))
                return (
                  <div key={item.id} className="history-card">
                    <div className="history-meta">
                      <input
                        type="text"
                        value={titleEdits[item.id] ?? item.title}
                        onChange={(event) =>
                          setTitleEdits((prev) => ({ ...prev, [item.id]: event.target.value }))
                        }
                      />
                      <span className="muted">
                        {boardFrequency ? frequencyLabel[boardFrequency] : 'Unknown frequency'} •{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="muted">
                        {completedCount}/{totalCount} complete
                        {historyBingo ? ' • Bingo!' : ''}
                      </span>
                    </div>
                    <div className="history-actions">
                      <button className="secondary" onClick={() => handleOpenBoard(item.id)}>
                        Open
                      </button>
                      <button className="ghost" onClick={() => handleSaveTitle(item.id)}>
                        Save name
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
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
