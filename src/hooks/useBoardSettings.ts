// Board creation settings state and default size behavior.
import { useEffect, useState } from 'react'
import { defaultBoardSizeByFrequency } from '../constants'
import type { Frequency } from '../types'

type UseBoardSettingsReturn = {
  boardTitle: string
  setBoardTitle: (value: string) => void
  generationFrequency: Frequency
  setGenerationFrequency: (value: Frequency) => void
  boardSize: number
  setBoardSize: (value: number) => void
  boardSizeTouched: boolean
  setBoardSizeTouched: (value: boolean) => void
  customOnly: boolean
  setCustomOnly: (value: boolean) => void
}

const useBoardSettings = (): UseBoardSettingsReturn => {
  const [boardTitle, setBoardTitle] = useState('Goal Bingo')
  const [generationFrequency, setGenerationFrequency] = useState<Frequency>('weekly')
  const [boardSize, setBoardSize] = useState(defaultBoardSizeByFrequency.weekly)
  const [boardSizeTouched, setBoardSizeTouched] = useState(false)
  const [customOnly, setCustomOnly] = useState(false)

  useEffect(() => {
    if (!boardSizeTouched) {
      setBoardSize(defaultBoardSizeByFrequency[generationFrequency])
    }
  }, [generationFrequency, boardSizeTouched])

  return {
    boardTitle,
    setBoardTitle,
    generationFrequency,
    setGenerationFrequency,
    boardSize,
    setBoardSize,
    boardSizeTouched,
    setBoardSizeTouched,
    customOnly,
    setCustomOnly,
  }
}

export default useBoardSettings
