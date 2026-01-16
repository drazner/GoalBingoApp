// Modal dialogs for editing goals and subgoals.
import { useEffect, useState } from 'react'
import type { EditGoalModalState, PendingGoalSave, SubgoalModalState } from '../types'

type GoalModalsProps = {
  pendingGoalSave: PendingGoalSave | null
  editGoalModal: EditGoalModalState | null
  subgoalModal: SubgoalModalState | null
  hasUnsavedChanges: boolean
  maxGoalTextLength: number
  onSaveEditedGoal: (mode: 'new' | 'update' | 'skip') => void
  onEditGoalChange: (value: string) => void
  onApplyGoalEdit: () => void
  onCancelGoalEdit: () => void
  onOpenSubgoals: () => void
  onToggleSubgoal: (id: string) => void
  onUpdateSubgoalText: (id: string, value: string) => void
  onDeleteSubgoal: (id: string) => void
  onRemoveSubgoals: () => void
  onAddSubgoal: () => void
}

const GoalModals = ({
  pendingGoalSave,
  editGoalModal,
  subgoalModal,
  hasUnsavedChanges,
  maxGoalTextLength,
  onSaveEditedGoal,
  onEditGoalChange,
  onApplyGoalEdit,
  onCancelGoalEdit,
  onOpenSubgoals,
  onToggleSubgoal,
  onUpdateSubgoalText,
  onDeleteSubgoal,
  onRemoveSubgoals,
  onAddSubgoal,
}: GoalModalsProps) => {
  const [showRemovePrompt, setShowRemovePrompt] = useState(false)
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)
  const [showSubgoalsPanel, setShowSubgoalsPanel] = useState(Boolean(subgoalModal))
  const showSubgoals = Boolean(subgoalModal) && showSubgoalsPanel

  useEffect(() => {
    if (subgoalModal) setShowSubgoalsPanel(true)
  }, [subgoalModal])

  return (
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
          <div className="modal edit-goal-modal">
            <div className="edit-goal-main">
              <h3>Edit goal</h3>
              <p>Update goal text:</p>
              <input
                type="text"
                value={editGoalModal.text}
                onChange={(event) => onEditGoalChange(event.target.value)}
                maxLength={maxGoalTextLength}
              />
              {editGoalModal.text.length >= Math.ceil(maxGoalTextLength * 0.8) && (
                <span className="muted small-text">
                  {editGoalModal.text.length}/{maxGoalTextLength}
                </span>
              )}
              <button
                className="secondary"
                onClick={() => {
                  if (showSubgoalsPanel) {
                    setShowSubgoalsPanel(false)
                    return
                  }
                  if (subgoalModal && subgoalModal.subgoals.length > 0) {
                    setShowSubgoalsPanel(true)
                    return
                  }
                  onOpenSubgoals()
                  setShowSubgoalsPanel(true)
                }}
              >
                {showSubgoalsPanel ? 'Hide subgoals' : 'Break down goal'}
              </button>
              {showSubgoals && subgoalModal && (
                <div className="edit-goal-subgoals">
                  <div className="edit-goal-subgoals-header">
                    <div>
                      <h3>Break down goal</h3>
                      <p>Track subgoals to show partial progress on the tile.</p>
                    </div>
                  </div>
                  <div className="subgoal-list">
                    {subgoalModal.subgoals.map((subgoal, index) => (
                      <div
                        key={subgoal.id}
                        className={`subgoal-row ${editGoalModal.scope === 'board' ? '' : 'no-subgoal-toggle'}`}
                      >
                        {editGoalModal.scope === 'board' && (
                          <input
                            type="checkbox"
                            checked={subgoal.done}
                            onChange={() => onToggleSubgoal(subgoal.id)}
                          />
                        )}
                        <div className="subgoal-text">
                          <input
                            type="text"
                            value={subgoal.text}
                            onChange={(event) => onUpdateSubgoalText(subgoal.id, event.target.value)}
                            placeholder={`Subgoal ${index + 1}`}
                            maxLength={maxGoalTextLength}
                          />
                          {subgoal.text.length >= Math.ceil(maxGoalTextLength * 0.8) && (
                            <span className="muted small-text">
                              {subgoal.text.length}/{maxGoalTextLength}
                            </span>
                          )}
                        </div>
                        <button
                          className="ghost small"
                          type="button"
                          onClick={() => {
                            if (subgoalModal.subgoals.length <= 2) {
                              setShowRemovePrompt(true)
                              return
                            }
                            onDeleteSubgoal(subgoal.id)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="subgoal-actions">
                    <button className="secondary small" type="button" onClick={onAddSubgoal}>
                      Add subgoal
                    </button>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button className="primary" onClick={onApplyGoalEdit}>
                  Save edit
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      setShowCancelPrompt(true)
                      return
                    }
                    setShowRemovePrompt(false)
                    onCancelGoalEdit()
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRemovePrompt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Would you like to remove subgoals from this goal?</h3>
            <div className="modal-actions">
              <button
                className="danger"
                onClick={() => {
                  onRemoveSubgoals()
                  setShowSubgoalsPanel(false)
                  setShowRemovePrompt(false)
                }}
              >
                Delete subgoals
              </button>
              <button className="ghost" onClick={() => setShowRemovePrompt(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelPrompt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Are you sure you don't want to save changes?</h3>
            <div className="modal-actions">
              <button
                className="primary"
                onClick={() => {
                  setShowCancelPrompt(false)
                  onApplyGoalEdit()
                }}
              >
                Save changes
              </button>
              <button
                className="ghost"
                onClick={() => {
                  setShowCancelPrompt(false)
                  onCancelGoalEdit()
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GoalModals
