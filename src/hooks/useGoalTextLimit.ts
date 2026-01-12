// Chooses a max goal text length based on viewport width.
import { useEffect, useState } from 'react'
import { DESKTOP_GOAL_TEXT_LIMIT, MOBILE_GOAL_TEXT_LIMIT } from '../constants'

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches

const useGoalTextLimit = () => {
  const [maxLength, setMaxLength] = useState(
    isMobileViewport() ? MOBILE_GOAL_TEXT_LIMIT : DESKTOP_GOAL_TEXT_LIMIT
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 720px)')
    const handleChange = () => {
      setMaxLength(media.matches ? MOBILE_GOAL_TEXT_LIMIT : DESKTOP_GOAL_TEXT_LIMIT)
    }
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  return maxLength
}

export default useGoalTextLimit
