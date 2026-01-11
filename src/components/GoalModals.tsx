// Modal dialogs for editing goals and subgoals.
import type { EditGoalModalState, PendingGoalSave, SubgoalModalState } from '../types'

type GoalModalsProps = {
  pendingGoalSave: PendingGoalSave | null
  editGoalModal: EditGoalModalState | null
  subgoalModal: SubgoalModalState | null
  onSaveEditedGoal: (mode: 'new' | 'update' | 'skip') => void
  onEditGoalChange: (value: string) => void
  onApplyGoalEdit: () => void
  onCancelGoalEdit: () => void
  onOpenSubgoals: () => void
  onToggleSubgoal: (id: string) => void
  onUpdateSubgoalText: (id: string, value: string) => void
  onDeleteSubgoal: (id: string) => void
  onAddSubgoal: () => void
  onSaveSubgoals: () => void
  onCancelSubgoals: () => void
}

const GoalModals = ({
  pendingGoalSave,
  editGoalModal,
  subgoalModal,
  onSaveEditedGoal,
  onEditGoalChange,
  onApplyGoalEdit,
  onCancelGoalEdit,
  onOpenSubgoals,
  onToggleSubgoal,
  onUpdateSubgoalText,
  onDeleteSubgoal,
  onAddSubgoal,
  onSaveSubgoals,
  onCancelSubgoals,
}: GoalModalsProps) => (
  <>
    {pendingGoalSave && (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <h3>Save to goal library?</h3>
          <p>Do you want to save this edit to your goal library as well?</p>
          <div className="modal-actions">
            <button className="primary" onClick={() => onSaveEditedGoal('new')}>
              Yes, as a new goal
            </button>
            {pendingGoalSave.sourceGoalId ? (
              <button className="secondary" onClick={() => onSaveEditedGoal('update')}>
                Yes, update original goal
              </button>
            ) : (
              <p className="muted small-text">No original custom goal to update.</p>
            )}
            <button className="ghost" onClick={() => onSaveEditedGoal('skip')}>
              No
            </button>
          </div>
        </div>
      </div>
    )}
    {editGoalModal && (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <h3>Edit goal</h3>
          <p>Update goal text:</p>
          <input
            type="text"
            value={editGoalModal.text}
            onChange={(event) => onEditGoalChange(event.target.value)}
          />
          <div className="modal-actions">
            <button className="primary" onClick={onApplyGoalEdit}>
              Save edit
            </button>
            <button className="secondary" onClick={onOpenSubgoals}>
              Break down goal
            </button>
            <button className="ghost" onClick={onCancelGoalEdit}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    {subgoalModal && (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal subgoal-modal">
          <h3>Break down goal</h3>
          <p>Track subgoals to show partial progress on the tile.</p>
          <div className="subgoal-list">
            {subgoalModal.subgoals.map((subgoal, index) => (
              <div key={subgoal.id} className="subgoal-row">
                <input
                  type="checkbox"
                  checked={subgoal.done}
                  onChange={() => onToggleSubgoal(subgoal.id)}
                />
                <input
                  type="text"
                  value={subgoal.text}
                  onChange={(event) => onUpdateSubgoalText(subgoal.id, event.target.value)}
                  placeholder={`Subgoal ${index + 1}`}
                />
                <button className="ghost small" type="button" onClick={() => onDeleteSubgoal(subgoal.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="secondary" type="button" onClick={onAddSubgoal}>
              Add subgoal
            </button>
            <button className="primary" type="button" onClick={onSaveSubgoals}>
              Save checklist
            </button>
            <button className="ghost" type="button" onClick={onCancelSubgoals}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)

export default GoalModals
