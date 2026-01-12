// Current board UI, progress, and rearranging mode.
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Board, Goal } from '../types'
import SortableTile from './SortableTile'

type CurrentBoardProps = {
  board: Board
  currentBoardSize: number
  shareUrl: string
  bingoLine: number[] | null
  isRearranging: boolean
  draftGoals: Goal[]
  boardFrequencyLabel: string
  isEditingTitle: boolean
  currentTitleDraft: string
  maxBoardTitleLength: number
  onTitleDraftChange: (value: string) => void
  onStartEditTitle: () => void
  onCancelEditTitle: () => void
  onSaveTitle: () => void
  onToggleGoal: (goalId: string) => void
  onEditGoal: (goalId: string) => void
  onResetProgress: () => void
  onFillEmptyTiles: () => void
  hasEmptyTiles: boolean
  onCopyShareLink: () => void
  onEnterRearrange: () => void
  onSaveRearrange: () => void
  onCancelRearrange: () => void
  onRearrangeRandomize: () => void
  onReorder: (activeId: string, overId: string) => void
  getGoalProgress: (goal: Goal) => number
}

const CurrentBoard = ({
  board,
  currentBoardSize,
  shareUrl,
  bingoLine,
  isRearranging,
  draftGoals,
  boardFrequencyLabel,
  isEditingTitle,
  currentTitleDraft,
  maxBoardTitleLength,
  onTitleDraftChange,
  onStartEditTitle,
  onCancelEditTitle,
  onSaveTitle,
  onToggleGoal,
  onEditGoal,
  onResetProgress,
  onFillEmptyTiles,
  hasEmptyTiles,
  onCopyShareLink,
  onEnterRearrange,
  onSaveRearrange,
  onCancelRearrange,
  onRearrangeRandomize,
  onReorder,
  getGoalProgress,
}: CurrentBoardProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  return (
    <section className={`board ${isRearranging ? 'is-rearranging' : ''}`}>
      <div className="board-header">
        <div>
          {isEditingTitle ? (
            <div className="title-edit">
              <input
                type="text"
                value={currentTitleDraft}
                onChange={(event) => onTitleDraftChange(event.target.value)}
                maxLength={maxBoardTitleLength}
              />
              {currentTitleDraft.length >= Math.ceil(maxBoardTitleLength * 0.8) && (
                <span className="muted small-text">
                  {currentTitleDraft.length}/{maxBoardTitleLength}
                </span>
              )}
              <div className="title-actions">
                <button className="secondary small" onClick={onSaveTitle}>
                  Save
                </button>
                <button className="ghost small" onClick={onCancelEditTitle}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="title-row">
              <h2>{board.title}</h2>
              <button className="ghost small" onClick={onStartEditTitle}>
                Edit name
              </button>
            </div>
          )}
          <div className="board-frequency">{boardFrequencyLabel}</div>
          <p>Tap goals to mark them complete. Get five in a row for Bingo.</p>
        </div>
        <div className="board-actions">
          {isRearranging ? (
            <>
              <button className="ghost" onClick={onRearrangeRandomize}>
                Randomize
              </button>
              <button className="secondary" onClick={onSaveRearrange}>
                Save
              </button>
              <button className="ghost" onClick={onCancelRearrange}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="ghost" onClick={onResetProgress}>
                Reset progress
              </button>
              {hasEmptyTiles && (
                <button className="ghost" onClick={onFillEmptyTiles}>
                  Fill empty tiles
                </button>
              )}
              <button className="ghost" onClick={onEnterRearrange}>
                Edit
              </button>
              <button className="primary" onClick={onCopyShareLink}>
                Share board
              </button>
            </>
          )}
        </div>
      </div>
      {shareUrl && (
        <div className="share">
          <input type="text" value={shareUrl} readOnly />
          <span>Link copied if clipboard is allowed.</span>
        </div>
      )}
      {isRearranging ? (
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return
            onReorder(String(active.id), String(over.id))
          }}
        >
          <SortableContext items={draftGoals.map((goal) => goal.id)} strategy={rectSortingStrategy}>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${currentBoardSize}, minmax(0, 1fr))` }}
            >
              {draftGoals.map((goal, index) => {
                const isBingoTile = bingoLine?.includes(index) ?? false
                const progress = getGoalProgress(goal)
                const fillPercent = Math.round(progress * 100)
                return (
                  <SortableTile
                    key={goal.id}
                    goal={goal}
                    index={index}
                    isBingoTile={isBingoTile}
                    fillPercent={fillPercent}
                    showEditButton
                    onEditGoal={onEditGoal}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${currentBoardSize}, minmax(0, 1fr))` }}
        >
          {board.goals.map((goal, index) => {
            const isBingoTile = bingoLine?.includes(index) ?? false
            const progress = getGoalProgress(goal)
            const fillPercent = Math.round(progress * 100)
            return (
              <div
                key={goal.id}
                className={`cell ${goal.completed ? 'completed' : ''} ${
                  isBingoTile ? 'bingo-glow' : ''
                }`}
                style={{
                  background: `linear-gradient(to top, #bfead0 ${fillPercent}%, #ffffff ${fillPercent}%)`,
                }}
              >
                <button className="cell-button" onClick={() => onToggleGoal(goal.id)} aria-pressed={goal.completed}>
                  <span className="cell-index">{index + 1}</span>
                  {goal.text ? (
                    <span className="cell-text">{goal.text}</span>
                  ) : (
                    <span className="cell-placeholder">Empty tile</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default CurrentBoard
