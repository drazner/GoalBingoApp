import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Goal } from '../types'

type SortableTileProps = {
  goal: Goal
  index: number
  isBingoTile: boolean
  fillPercent: number
}

const SortableTile = ({ goal, index, isBingoTile, fillPercent }: SortableTileProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`cell ${goal.completed ? 'completed' : ''} ${isBingoTile ? 'bingo-glow' : ''} rearranging ${
        isDragging ? 'dragging' : ''
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: `linear-gradient(to top, #bfead0 ${fillPercent}%, #ffffff ${fillPercent}%)`,
      }}
      {...attributes}
      {...listeners}
    >
      <button className="cell-button" type="button" aria-pressed={goal.completed}>
        <span className="cell-index">{index + 1}</span>
        {goal.text ? <span className="cell-text">{goal.text}</span> : <span className="cell-placeholder">Empty tile</span>}
      </button>
    </div>
  )
}

export default SortableTile
