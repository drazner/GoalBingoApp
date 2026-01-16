// Goals tab UI for creating boards and managing goals.
import type { Frequency, Goal, GoalTemplate, Subgoal } from '../types'
import { useState } from 'react'

type GoalsTabProps = {
  boardTitle: string
  onBoardTitleChange: (value: string) => void
  maxBoardTitleLength: number
  generationFrequency: Frequency
  onGenerationFrequencyChange: (value: Frequency) => void
  boardSize: number
  onBoardSizeChange: (value: number) => void
  customOnly: boolean
  onCustomOnlyChange: (value: boolean) => void
  customText: string
  onCustomTextChange: (value: string) => void
  maxGoalTextLength: number
  customFrequency: Frequency
  onCustomFrequencyChange: (value: Frequency) => void
  customSubgoals: Subgoal[]
  onCustomSubgoalsChange: (value: Subgoal[]) => void
  customSortOption: SortOption
  onCustomSortOptionChange: (value: SortOption) => void
  suggestedSortOption: SortOption
  onSuggestedSortOptionChange: (value: SortOption) => void
  recentSortOption: SortOption
  onRecentSortOptionChange: (value: SortOption) => void
  librarySortOption: SortOption
  onLibrarySortOptionChange: (value: SortOption) => void
  onAddCustomGoal: () => void
  onGenerateBoard: () => void
  uniqueSelectedCount: number
  onDismissRecentGoals: () => void
  error: string | null
  suggestedGoalsCount: number
  customGoalsCount: number
  customAvailable: GoalTemplate[]
  suggestedAvailable: GoalTemplate[]
  recentIncompleteAvailable: GoalTemplate[]
  selectedCustomIds: Set<string>
  selectedSuggestedIds: Set<string>
  selectedRecentIds: Set<string>
  onToggleCustomSelection: (id: string) => void
  onToggleSuggestedSelection: (id: string) => void
  onToggleRecentSelection: (id: string) => void
  onSelectAllCustom: () => void
  onClearCustom: () => void
  onSelectAllSuggested: () => void
  onClearSuggested: () => void
  onSelectAllRecent: () => void
  onClearRecent: () => void
  libraryFrequency: Frequency
  onLibraryFrequencyChange: (value: Frequency) => void
  librarySource: 'suggested' | 'custom' | 'generated'
  onLibrarySourceChange: (value: 'suggested' | 'custom' | 'generated') => void
  filteredLibraryGoals: GoalTemplate[] | Goal[]
  customLibraryGoals: GoalTemplate[]
  frequencyLabel: Record<Frequency, string>
  onDeleteCustomGoal: (id: string) => void
  onEditLibraryGoal: (id: string) => void
  onEditBoardGoal: (id: string) => void
  onDeleteBoardGoal: (id: string) => void
}

type SortOption =
  | 'alpha-asc'
  | 'alpha-desc'
  | 'date-used-asc'
  | 'date-used-desc'
  | 'date-created-asc'
  | 'date-created-desc'

const baseSortOptions: { value: SortOption; label: string }[] = [
  { value: 'alpha-asc', label: 'Alphabetical Asc' },
  { value: 'alpha-desc', label: 'Alphabetical Desc' },
  { value: 'date-used-asc', label: 'Date Used Asc' },
  { value: 'date-used-desc', label: 'Date Used Desc' },
]

const customSortOptions: { value: SortOption; label: string }[] = [
  ...baseSortOptions,
  { value: 'date-created-asc', label: 'Date Created Asc' },
  { value: 'date-created-desc', label: 'Date Created Desc' },
]

const GoalsTab = ({
  boardTitle,
  onBoardTitleChange,
  maxBoardTitleLength,
  generationFrequency,
  onGenerationFrequencyChange,
  boardSize,
  onBoardSizeChange,
  customOnly,
  onCustomOnlyChange,
  customText,
  onCustomTextChange,
  maxGoalTextLength,
  customFrequency,
  onCustomFrequencyChange,
  customSubgoals,
  onCustomSubgoalsChange,
  customSortOption,
  onCustomSortOptionChange,
  suggestedSortOption,
  onSuggestedSortOptionChange,
  recentSortOption,
  onRecentSortOptionChange,
  librarySortOption,
  onLibrarySortOptionChange,
  onAddCustomGoal,
  onGenerateBoard,
  uniqueSelectedCount,
  onDismissRecentGoals,
  error,
  suggestedGoalsCount,
  customGoalsCount,
  customAvailable,
  suggestedAvailable,
  recentIncompleteAvailable,
  selectedCustomIds,
  selectedSuggestedIds,
  selectedRecentIds,
  onToggleCustomSelection,
  onToggleSuggestedSelection,
  onToggleRecentSelection,
  onSelectAllCustom,
  onClearCustom,
  onSelectAllSuggested,
  onClearSuggested,
  onSelectAllRecent,
  onClearRecent,
  libraryFrequency,
  onLibraryFrequencyChange,
  librarySource,
  onLibrarySourceChange,
  filteredLibraryGoals,
  customLibraryGoals,
  frequencyLabel,
  onDeleteCustomGoal,
  onEditLibraryGoal,
  onEditBoardGoal,
  onDeleteBoardGoal,
}: GoalsTabProps) => (
  <GoalsTabView
    boardTitle={boardTitle}
    onBoardTitleChange={onBoardTitleChange}
    maxBoardTitleLength={maxBoardTitleLength}
    generationFrequency={generationFrequency}
    onGenerationFrequencyChange={onGenerationFrequencyChange}
    boardSize={boardSize}
    onBoardSizeChange={onBoardSizeChange}
    customOnly={customOnly}
    onCustomOnlyChange={onCustomOnlyChange}
    customText={customText}
    onCustomTextChange={onCustomTextChange}
    maxGoalTextLength={maxGoalTextLength}
    customFrequency={customFrequency}
    onCustomFrequencyChange={onCustomFrequencyChange}
    customSubgoals={customSubgoals}
    onCustomSubgoalsChange={onCustomSubgoalsChange}
    customSortOption={customSortOption}
    onCustomSortOptionChange={onCustomSortOptionChange}
    suggestedSortOption={suggestedSortOption}
    onSuggestedSortOptionChange={onSuggestedSortOptionChange}
    recentSortOption={recentSortOption}
    onRecentSortOptionChange={onRecentSortOptionChange}
    librarySortOption={librarySortOption}
    onLibrarySortOptionChange={onLibrarySortOptionChange}
    onAddCustomGoal={onAddCustomGoal}
    onGenerateBoard={onGenerateBoard}
    uniqueSelectedCount={uniqueSelectedCount}
    onDismissRecentGoals={onDismissRecentGoals}
    error={error}
    suggestedGoalsCount={suggestedGoalsCount}
    customGoalsCount={customGoalsCount}
    customAvailable={customAvailable}
    suggestedAvailable={suggestedAvailable}
    recentIncompleteAvailable={recentIncompleteAvailable}
    selectedCustomIds={selectedCustomIds}
    selectedSuggestedIds={selectedSuggestedIds}
    selectedRecentIds={selectedRecentIds}
    onToggleCustomSelection={onToggleCustomSelection}
    onToggleSuggestedSelection={onToggleSuggestedSelection}
    onToggleRecentSelection={onToggleRecentSelection}
    onSelectAllCustom={onSelectAllCustom}
    onClearCustom={onClearCustom}
    onSelectAllSuggested={onSelectAllSuggested}
    onClearSuggested={onClearSuggested}
    onSelectAllRecent={onSelectAllRecent}
    onClearRecent={onClearRecent}
    libraryFrequency={libraryFrequency}
    onLibraryFrequencyChange={onLibraryFrequencyChange}
    librarySource={librarySource}
    onLibrarySourceChange={onLibrarySourceChange}
    filteredLibraryGoals={filteredLibraryGoals}
    customLibraryGoals={customLibraryGoals}
    frequencyLabel={frequencyLabel}
    onDeleteCustomGoal={onDeleteCustomGoal}
    onEditLibraryGoal={onEditLibraryGoal}
    onEditBoardGoal={onEditBoardGoal}
    onDeleteBoardGoal={onDeleteBoardGoal}
  />
)

const GoalsTabView = ({
  boardTitle,
  onBoardTitleChange,
  maxBoardTitleLength,
  generationFrequency,
  onGenerationFrequencyChange,
  boardSize,
  onBoardSizeChange,
  customOnly,
  onCustomOnlyChange,
  customText,
  onCustomTextChange,
  maxGoalTextLength,
  customFrequency,
  onCustomFrequencyChange,
  customSubgoals,
  onCustomSubgoalsChange,
  customSortOption,
  onCustomSortOptionChange,
  suggestedSortOption,
  onSuggestedSortOptionChange,
  recentSortOption,
  onRecentSortOptionChange,
  librarySortOption,
  onLibrarySortOptionChange,
  onAddCustomGoal,
  onGenerateBoard,
  uniqueSelectedCount,
  onDismissRecentGoals,
  error,
  suggestedGoalsCount,
  customGoalsCount,
  customAvailable,
  suggestedAvailable,
  recentIncompleteAvailable,
  selectedCustomIds,
  selectedSuggestedIds,
  selectedRecentIds,
  onToggleCustomSelection,
  onToggleSuggestedSelection,
  onToggleRecentSelection,
  onSelectAllCustom,
  onClearCustom,
  onSelectAllSuggested,
  onClearSuggested,
  onSelectAllRecent,
  onClearRecent,
  libraryFrequency,
  onLibraryFrequencyChange,
  librarySource,
  onLibrarySourceChange,
  filteredLibraryGoals,
  customLibraryGoals,
  frequencyLabel,
  onDeleteCustomGoal,
  onEditLibraryGoal,
  onEditBoardGoal,
  onDeleteBoardGoal,
}: GoalsTabProps) => {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    text: string
    source: 'custom' | 'board'
  } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showCustomSubgoals, setShowCustomSubgoals] = useState(false)
  const confirmMatches = deleteConfirm.trim().toLowerCase() === 'confirm delete'
  const draftSubgoals = customSubgoals ?? []
  const createSubgoalId = () => `subgoal-${Date.now()}-${Math.random().toString(16).slice(2)}`

  const ensureDefaultSubgoals = () => {
    if (draftSubgoals.length > 0) return
    onCustomSubgoalsChange([
      { id: createSubgoalId(), text: 'Subgoal 1', done: false },
      { id: createSubgoalId(), text: 'Subgoal 2', done: false },
    ])
  }

  return (
    <>
    <section className="panel">
      <div className="panel-header">
        <h2>Create your board</h2>
        <p>Pick a frequency and mix suggested goals with your own ideas.</p>
      </div>
      <div className="form-grid">
        <label>
          Board title
          <input
            type="text"
            value={boardTitle}
            onChange={(event) => onBoardTitleChange(event.target.value)}
            placeholder="Goal Bingo"
            maxLength={maxBoardTitleLength}
          />
          {boardTitle.length >= Math.ceil(maxBoardTitleLength * 0.8) && (
            <span className="muted small-text">
              {boardTitle.length}/{maxBoardTitleLength}
            </span>
          )}
        </label>
        <label>
          Board frequency
          <select
            value={generationFrequency}
            onChange={(event) => onGenerationFrequencyChange(event.target.value as Frequency)}
          >
            {Object.entries(frequencyLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Board size
          <select
            value={boardSize}
            onChange={(event) => onBoardSizeChange(Number(event.target.value))}
          >
            <option value={3}>3x3</option>
            <option value={4}>4x4</option>
            <option value={5}>5x5</option>
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={customOnly}
            onChange={(event) => onCustomOnlyChange(event.target.checked)}
          />
          Custom goals only
        </label>
      </div>
      <div className="checklist-row">
        <details className="checklist">
          <summary>
            Custom goals ({customAvailable.filter((goal) => selectedCustomIds.has(goal.id)).length}/
            {customAvailable.length})
          </summary>
          <div className="checklist-controls">
            <button className="ghost small" type="button" onClick={onSelectAllCustom}>
              Select all
            </button>
            <button className="ghost small" type="button" onClick={onClearCustom}>
              Clear
            </button>
            <label className="sort-control">
              Sort
              <select
                value={customSortOption}
                onChange={(event) => onCustomSortOptionChange(event.target.value as SortOption)}
              >
                {customSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="checklist-items">
            {customAvailable.length === 0 ? (
              <p className="muted">No custom goals for this frequency yet.</p>
            ) : (
              customAvailable.map((goal) => (
                <label key={goal.id} className="check-item">
                  <input
                    type="checkbox"
                    checked={selectedCustomIds.has(goal.id)}
                    onChange={() => onToggleCustomSelection(goal.id)}
                  />
                  <span>{goal.text}</span>
                </label>
              ))
            )}
          </div>
        </details>
        <details className="checklist">
          <summary>
            Suggested goals (
            {suggestedAvailable.filter((goal) => selectedSuggestedIds.has(goal.id)).length}/
            {suggestedAvailable.length})
          </summary>
          <div className="checklist-controls">
            <button className="ghost small" type="button" onClick={onSelectAllSuggested}>
              Select all
            </button>
            <button className="ghost small" type="button" onClick={onClearSuggested}>
              Clear
            </button>
            <label className="sort-control">
              Sort
              <select
                value={suggestedSortOption}
                onChange={(event) => onSuggestedSortOptionChange(event.target.value as SortOption)}
              >
                {baseSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="checklist-items">
            {suggestedAvailable.length === 0 ? (
              <p className="muted">No suggested goals for this frequency yet.</p>
            ) : (
              suggestedAvailable.map((goal) => (
                <label key={goal.id} className="check-item">
                  <input
                    type="checkbox"
                    checked={selectedSuggestedIds.has(goal.id)}
                    onChange={() => onToggleSuggestedSelection(goal.id)}
                  />
                  <span>{goal.text}</span>
                </label>
              ))
            )}
          </div>
        </details>
        <details className="checklist">
          <summary>
            Recently incomplete goals (
            {recentIncompleteAvailable.filter((goal) => selectedRecentIds.has(goal.id)).length}/
            {recentIncompleteAvailable.length})
          </summary>
          <div className="checklist-controls">
            <button className="ghost small" type="button" onClick={onSelectAllRecent}>
              Select all
            </button>
            <button className="ghost small" type="button" onClick={onClearRecent}>
              Clear
            </button>
            <label className="sort-control">
              Sort
              <select
                value={recentSortOption}
                onChange={(event) => onRecentSortOptionChange(event.target.value as SortOption)}
              >
                {baseSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="ghost small"
              type="button"
              onClick={onDismissRecentGoals}
              disabled={selectedRecentIds.size === 0}
            >
              Dismiss selected
            </button>
          </div>
          <div className="checklist-items">
            {recentIncompleteAvailable.length === 0 ? (
              <p className="muted">No incomplete goals from recent boards yet.</p>
            ) : (
              recentIncompleteAvailable.map((goal) => (
                <label key={goal.id} className="check-item">
                  <input
                    type="checkbox"
                    checked={selectedRecentIds.has(goal.id)}
                    onChange={() => onToggleRecentSelection(goal.id)}
                  />
                  <span>{goal.text}</span>
                </label>
              ))
            )}
          </div>
        </details>
      </div>
      <div className="form-footer">
        <div>
          <span
            className={`pill unique-pill ${
              uniqueSelectedCount === 0
                ? 'unique-zero'
                : uniqueSelectedCount < boardSize * boardSize
                ? 'unique-partial'
                : uniqueSelectedCount === boardSize * boardSize
                ? 'unique-full'
                : 'unique-over'
            }`}
          >
            Unique goals selected: {uniqueSelectedCount}/{boardSize * boardSize}
          </span>
          <span className="pill">Suggested: {suggestedGoalsCount}</span>
          <span className="pill">Custom: {customGoalsCount}</span>
          <span className="pill">Recent incomplete: {recentIncompleteAvailable.length}</span>
          <span className="pill">
            Custom {frequencyLabel[generationFrequency]}: {customAvailable.length}
          </span>
          <span className="pill">
            Suggested {frequencyLabel[generationFrequency]}: {suggestedAvailable.length}
          </span>
        </div>
        <button className="primary" type="button" onClick={onGenerateBoard}>
          Generate {boardSize}x{boardSize} board
        </button>
      </div>
      <p className="muted small-text">
        Tip: If you select fewer unique goals than the board size, empty tiles will fill the
        remaining spots. If you select more, a random subset is used with priority for recently
        incomplete and custom goals.
      </p>
      {error && <p className="error">{error}</p>}
    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>Create your goal</h2>
        <p>Add a new custom goal to use in your boards.</p>
      </div>
      <div className="form-grid">
        <label>
          Custom goal
          <input
            type="text"
            value={customText}
            onChange={(event) => onCustomTextChange(event.target.value)}
            placeholder="Run 3 miles"
            maxLength={maxGoalTextLength}
          />
          {customText.length >= Math.ceil(maxGoalTextLength * 0.8) && (
            <span className="muted small-text">
              {customText.length}/{maxGoalTextLength}
            </span>
          )}
        </label>
        <label>
          Frequency
          <select
            value={customFrequency}
            onChange={(event) => onCustomFrequencyChange(event.target.value as Frequency)}
          >
            {Object.entries(frequencyLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            onAddCustomGoal()
            setShowCustomSubgoals(false)
          }}
        >
          Add custom goal
        </button>
      </div>
      <button
        className="secondary"
        type="button"
        onClick={() => {
          setShowCustomSubgoals((prev) => {
            const next = !prev
            if (next) ensureDefaultSubgoals()
            return next
          })
        }}
      >
        {showCustomSubgoals ? 'Hide subgoals' : 'Break down goal'}
      </button>
      {showCustomSubgoals && (
        <div className="edit-goal-subgoals">
          <div className="edit-goal-subgoals-header">
            <div>
              <h3>Break down goal</h3>
              <p>Track subgoals to show partial progress on the tile.</p>
            </div>
          </div>
          <div className="subgoal-list">
            {draftSubgoals.map((subgoal, index) => (
              <div key={subgoal.id} className="subgoal-row no-subgoal-toggle">
                <div className="subgoal-text">
                  <input
                    type="text"
                    value={subgoal.text}
                    onChange={(event) =>
                      onCustomSubgoalsChange(
                        draftSubgoals.map((item) =>
                          item.id === subgoal.id ? { ...item, text: event.target.value } : item
                        )
                      )
                    }
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
                    if (draftSubgoals.length <= 2) {
                      onCustomSubgoalsChange([])
                      setShowCustomSubgoals(false)
                      return
                    }
                    onCustomSubgoalsChange(draftSubgoals.filter((item) => item.id !== subgoal.id))
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="subgoal-actions">
            <button
              className="secondary small"
              type="button"
              onClick={() => {
                onCustomSubgoalsChange([
                  ...draftSubgoals,
                  { id: createSubgoalId(), text: `Subgoal ${draftSubgoals.length + 1}`, done: false },
                ])
              }}
            >
              Add subgoal
            </button>
          </div>
        </div>
      )}
    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>Goal library</h2>
        <p>Browse goals by frequency and source.</p>
      </div>
      <div className="form-grid">
        <label>
          Frequency
          <select
            value={libraryFrequency}
            onChange={(event) => onLibraryFrequencyChange(event.target.value as Frequency)}
          >
            {Object.entries(frequencyLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select
            value={librarySource}
            onChange={(event) =>
              onLibrarySourceChange(event.target.value as 'suggested' | 'custom' | 'generated')
            }
          >
            <option value="suggested">Suggested goals</option>
            <option value="custom">Custom goals</option>
            <option value="generated">Generated board goals</option>
          </select>
        </label>
        <label className="sort-control sort-control--form">
          Sort
          <select
            value={librarySource === 'custom' ? customSortOption : librarySortOption}
            onChange={(event) =>
              (librarySource === 'custom'
                ? onCustomSortOptionChange
                : onLibrarySortOptionChange)(event.target.value as SortOption)
            }
          >
            {(librarySource === 'custom' ? customSortOptions : baseSortOptions).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="goal-list">
        {librarySource === 'custom' ? (
          customLibraryGoals.length === 0 ? (
            <p className="muted">No goals found for this filter yet.</p>
          ) : (
            customLibraryGoals.map((goal) => (
              <div key={goal.id} className="goal-list-item">
                <div className="goal-text">
                  <span>{goal.text}</span>
                </div>
                <div className="goal-actions">
                  {(goal.subgoals?.length ?? 0) > 0 && (
                    <span className="goal-subgoal-indicator" aria-hidden="true">
                      <span className="goal-subgoal-dot" />
                      <span className="goal-subgoal-dot" />
                      <span className="goal-subgoal-dot" />
                    </span>
                  )}
                  <span className="goal-chip">{frequencyLabel[goal.frequency]}</span>
                  <button className="ghost small" type="button" onClick={() => onEditLibraryGoal(goal.id)}>
                    Edit
                  </button>
                  <button
                    className="ghost small danger"
                    type="button"
                    onClick={() => {
                      setDeleteTarget({ id: goal.id, text: goal.text, source: 'custom' })
                      setDeleteConfirm('')
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )
        ) : filteredLibraryGoals.length === 0 ? (
          <p className="muted">No goals found for this filter yet.</p>
        ) : (
          filteredLibraryGoals.map((goal, index) => (
            <div
              key={(goal as GoalTemplate).id ?? `${(goal as GoalTemplate).text}-${index}`}
              className="goal-list-item"
            >
              <div className="goal-text">
                <span>{(goal as GoalTemplate).text}</span>
              </div>
              <div className="goal-meta">
                {('subgoals' in goal ? (goal as Goal).subgoals?.length ?? 0 : 0) > 0 && (
                  <span className="goal-subgoal-indicator" aria-hidden="true">
                    <span className="goal-subgoal-dot" />
                    <span className="goal-subgoal-dot" />
                    <span className="goal-subgoal-dot" />
                  </span>
                )}
                <span className="goal-chip">
                  {frequencyLabel[(goal as GoalTemplate).frequency as Frequency]}
                </span>
                {librarySource === 'generated' && 'id' in goal && (
                  <>
                    <button
                      className="ghost small"
                      type="button"
                      onClick={() => onEditBoardGoal(goal.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="ghost small danger"
                      type="button"
                      onClick={() => {
                        setDeleteTarget({
                          id: goal.id,
                          text: (goal as GoalTemplate).text,
                          source: 'board',
                        })
                        setDeleteConfirm('')
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
    {deleteTarget && (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <h3>Deleting {deleteTarget.text} goal. Are you sure you want to delete it?</h3>
          <input
            type="text"
            placeholder="confirm delete"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
          />
          <div className="modal-actions">
            <button
              className="danger"
              onClick={() => {
                if (!confirmMatches) return
                if (deleteTarget.source === 'custom') {
                  onDeleteCustomGoal(deleteTarget.id)
                } else {
                  onDeleteBoardGoal(deleteTarget.id)
                }
                setDeleteTarget(null)
              }}
            >
              Delete
            </button>
            <button className="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)

}

export default GoalsTab
