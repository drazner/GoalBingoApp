// Header section showing app branding and board summary.
import type { Board } from '../types'

type HeroProps = {
  board: Board | null
  completedCount: number
  totalCount: number
  bingoActive: boolean
  syncStatus: string
}

const Hero = ({ board, completedCount, totalCount, bingoActive, syncStatus }: HeroProps) => {
  const completionClass =
    completedCount === 0 ? 'unique-zero' : completedCount < totalCount ? 'unique-partial' : 'unique-full'
  const syncClass =
    syncStatus === 'Connected' || syncStatus === 'Synced'
      ? 'sync-ok'
      : syncStatus === 'Connecting' || syncStatus === 'Syncing...'
      ? 'sync-warn'
      : syncStatus === 'Local only' || syncStatus === 'Sync error'
      ? 'sync-error'
      : ''

  return (
    <header className="hero">
      <div>
        <p className="eyebrow">GoalBingo</p>
        <h1>Gamify your goals!</h1>
        <p className="subtitle">
          Build a board of goals | Tap to complete | Share the board with a link
        </p>
      </div>
      <div className="hero-card">
        <div className="hero-card-header">Your current board</div>
        <div className="hero-card-title">{board?.title ?? 'No board yet'}</div>
        <div className="hero-card-meta">
          {board ? (
            <span className={`pill unique-pill ${completionClass}`}>
              {completedCount}/{totalCount} complete
            </span>
          ) : (
            'Ready to start'
          )}
        </div>
        <div className="sync-status">
          <span className="sync-status-label">Sync status:</span>
          <span className={`sync-status-value ${syncClass}`}>{syncStatus}</span>
        </div>
        {bingoActive && <div className="hero-badge">Bingo!</div>}
      </div>
    </header>
  )
}

export default Hero
