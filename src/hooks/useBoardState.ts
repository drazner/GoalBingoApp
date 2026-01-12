// Board history and current board state helpers.
import { useCallback, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { DESKTOP_GOAL_TEXT_LIMIT } from '../constants'
import type { Board } from '../types'
import { sanitizeGoalText } from '../utils/text'

type UseBoardStateReturn = {
  boards: Board[]
  setBoards: Dispatch<SetStateAction<Board[]>>
  currentBoardId: string | null
  setCurrentBoardId: Dispatch<SetStateAction<string | null>>
  titleEdits: Record<string, string>
  setTitleEdits: Dispatch<SetStateAction<Record<string, string>>>
  board: Board | null
  currentBoardSize: number
  currentBoardTotal: number
  updateCurrentBoard: (updater: (current: Board) => Board) => void
  handleOpenBoard: (id: string) => void
  handleSaveTitle: (id: string) => void
}

type UseBoardStateOptions = {
  getBoardSize: (board: Board | null) => number
  maxBoardTitleLength?: number
}

const useBoardState = ({
  getBoardSize,
  maxBoardTitleLength = DESKTOP_GOAL_TEXT_LIMIT,
}: UseBoardStateOptions): UseBoardStateReturn => {
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null)
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({})

  const board = useMemo(
    () => boards.find((item) => item.id === currentBoardId) ?? null,
    [boards, currentBoardId]
  )

  const currentBoardSize = useMemo(() => getBoardSize(board), [board, getBoardSize])
  const currentBoardTotal = board ? board.goals.length : 0

  const updateCurrentBoard = useCallback(
    (updater: (current: Board) => Board) => {
      if (!currentBoardId) return
      setBoards((prev) => prev.map((item) => (item.id === currentBoardId ? updater(item) : item)))
    },
    [currentBoardId]
  )

  const handleOpenBoard = useCallback((id: string) => {
    setCurrentBoardId(id)
  }, [])

  const handleSaveTitle = useCallback(
    (id: string) => {
      setBoards((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          const nextTitle = sanitizeGoalText(titleEdits[id] ?? item.title, maxBoardTitleLength)
          return nextTitle ? { ...item, title: nextTitle } : item
        })
      )
    },
    [titleEdits]
  )

  return {
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
  }
}

export default useBoardState
