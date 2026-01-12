// Goals tab UI for creating boards and managing goals.
import type { Frequency, Goal, GoalTemplate } from '../types'

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
  onAddCustomGoal: () => void
  onGenerateBoard: () => void
  uniqueSelectedCount: number
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
  onEditCustomGoal: (id: string) => void
  onDeleteCustomGoal: (id: string) => void
}

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
  onAddCustomGoal,
  onGenerateBoard,
  uniqueSelectedCount,
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
  onEditCustomGoal,
  onDeleteCustomGoal,
}: GoalsTabProps) => (
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
        <button className="secondary" type="button" onClick={onAddCustomGoal}>
          Add custom goal
        </button>
      </div>
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
      </div>
      <div className="goal-list">
        {librarySource === 'custom' ? (
          customLibraryGoals.length === 0 ? (
            <p className="muted">No goals found for this filter yet.</p>
          ) : (
            customLibraryGoals.map((goal) => (
              <div key={goal.id} className="goal-list-item">
                <span>{goal.text}</span>
                <div className="goal-actions">
                  <span className="goal-chip">{frequencyLabel[goal.frequency]}</span>
                  <button className="ghost small" type="button" onClick={() => onEditCustomGoal(goal.id)}>
                    Edit
                  </button>
                  <button className="ghost small danger" type="button" onClick={() => onDeleteCustomGoal(goal.id)}>
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
            <div key={(goal as GoalTemplate).id ?? `${(goal as GoalTemplate).text}-${index}`} className="goal-list-item">
              <span>{(goal as GoalTemplate).text}</span>
              <span className="goal-chip">{frequencyLabel[(goal as GoalTemplate).frequency as Frequency]}</span>
            </div>
          ))
        )}
      </div>
    </section>
  </>
)

export default GoalsTab
