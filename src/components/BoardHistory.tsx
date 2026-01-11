import type { Board, Frequency } from '../types'

type BoardHistoryProps = {
  boards: Board[]
  titleEdits: Record<string, string>
  onTitleEditChange: (id: string, value: string) => void
  onOpenBoard: (id: string) => void
  onSaveTitle: (id: string) => void
  frequencyLabel: Record<Frequency, string>
  getBoardSize: (board: Board | null) => number
  hasBingo: (goals: Board['goals'], size: number) => boolean
}

const BoardHistory = ({
  boards,
  titleEdits,
  onTitleEditChange,
  onOpenBoard,
  onSaveTitle,
  frequencyLabel,
  getBoardSize,
  hasBingo,
}: BoardHistoryProps) => (
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
                  onChange={(event) => onTitleEditChange(item.id, event.target.value)}
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
                <button className="secondary" onClick={() => onOpenBoard(item.id)}>
                  Open
                </button>
                <button className="ghost" onClick={() => onSaveTitle(item.id)}>
                  Save name
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )}
  </section>
)

export default BoardHistory
