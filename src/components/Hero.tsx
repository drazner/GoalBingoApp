import type { Board } from '../types'

type HeroProps = {
  board: Board | null
  completedCount: number
  totalCount: number
  bingoActive: boolean
  syncStatus: string
}

const Hero = ({ board, completedCount, totalCount, bingoActive, syncStatus }: HeroProps) => (
  <header className="hero">
    <div>
      <p className="eyebrow">GoalBingo</p>
      <h1>Gamify your goals!</h1>
      <p className="subtitle">Build a board of goals | Tap to complete | Share the board with a link</p>
    </div>
    <div className="hero-card">
      <div className="hero-card-header">Your board</div>
      <div className="hero-card-title">{board?.title ?? 'No board yet'}</div>
      <div className="hero-card-meta">
        {board ? `${completedCount}/${totalCount} complete` : 'Ready to start'}
      </div>
      <div className="sync-status">Sync status: {syncStatus}</div>
      {bingoActive && <div className="hero-badge">Bingo!</div>}
    </div>
  </header>
)

export default Hero
