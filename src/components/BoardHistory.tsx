// History tab list with board stats and rename/open actions.
import { useRef, useState } from 'react'
import type { Board, Frequency, GoalTemplate, UiState } from '../types'

type StoredData = {
  boards: Board[]
  currentBoardId: string | null
  customGoals: GoalTemplate[]
  dismissedRecentGoals?: string[]
  uiState?: UiState
}

type BoardHistoryProps = {
  boards: Board[]
  titleEdits: Record<string, string>
  onTitleEditChange: (id: string, value: string) => void
  onOpenBoard: (id: string) => void
  onSaveTitle: (id: string) => void
  onDeleteBoard: (id: string) => void
  onExportData: () => void
  onImportData: (data: StoredData) => void
  maxBoardTitleLength: number
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
  onDeleteBoard,
  onExportData,
  onImportData,
  maxBoardTitleLength,
  frequencyLabel,
  getBoardSize,
  hasBingo,
}: BoardHistoryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const confirmMatches = deleteConfirm.trim().toLowerCase() === 'confirm delete'

  return (
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
            const completionClass =
              completedCount === 0
                ? 'unique-zero'
                : completedCount < totalCount
                ? 'unique-partial'
                : 'unique-full'
            const isEditing = editingId === item.id
            const titleValue = titleEdits[item.id] ?? item.title
            return (
              <div key={item.id} className="history-card">
                <div className="history-meta">
                  {isEditing ? (
                    <input
                      className="history-title-input"
                      type="text"
                      value={titleValue}
                      onChange={(event) => onTitleEditChange(item.id, event.target.value)}
                      maxLength={maxBoardTitleLength}
                    />
                  ) : (
                    <div className="history-title">{item.title}</div>
                  )}
                  {isEditing && titleValue.length >= Math.ceil(maxBoardTitleLength * 0.8) && (
                    <span className="muted small-text">
                      {titleValue.length}/{maxBoardTitleLength}
                    </span>
                  )}
                  <span className="muted">
                    {boardFrequency ? frequencyLabel[boardFrequency] : 'Unknown frequency'} •{' '}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <div className="history-status">
                    <span className={`pill unique-pill history-completion ${completionClass}`}>
                      {completedCount}/{totalCount} complete
                    </span>
                    {historyBingo && <span className="history-bingo">Bingo!</span>}
                  </div>
                </div>
                <div className="history-actions">
                  <div className="history-actions-left">
                    <button className="secondary" onClick={() => onOpenBoard(item.id)}>
                      Open
                    </button>
                    {!isEditing && (
                      <button
                        className="ghost"
                        onClick={() => {
                          setEditingId(item.id)
                          if (!titleEdits[item.id]) {
                            onTitleEditChange(item.id, item.title)
                          }
                        }}
                      >
                        Edit Title
                      </button>
                    )}
                    {isEditing && (
                      <button
                        className="ghost"
                        onClick={() => {
                          onSaveTitle(item.id)
                          setEditingId(null)
                        }}
                      >
                        Save name
                      </button>
                    )}
                    {isEditing && (
                      <button
                        className="ghost"
                        onClick={() => {
                          onTitleEditChange(item.id, item.title)
                          setEditingId(null)
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="history-actions-right">
                    <button
                      className="ghost danger"
                      onClick={() => {
                        setDeleteTarget(item)
                        setDeleteConfirm('')
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Deleting {deleteTarget.title} board. Are you sure you want to delete it?</h3>
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
                  onDeleteBoard(deleteTarget.id)
                  setDeletedNotice(deleteTarget.title)
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
      {deletedNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>{deletedNotice} board deleted</h3>
            <div className="modal-actions">
              <button className="primary" onClick={() => setDeletedNotice(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="history-transfer">
        <h3>Import / export</h3>
        <p className="muted">Move your full board history between devices or installs.</p>
        <div className="history-transfer-actions">
          <button className="secondary" onClick={onExportData}>
            Export data
          </button>
          <button
            className="ghost"
            onClick={() => {
              setImportMessage(null)
              setImportError(false)
              fileInputRef.current?.click()
            }}
          >
            Import data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                try {
                  const parsed = JSON.parse(String(reader.result ?? '')) as StoredData
                  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.boards)) {
                    throw new Error('Invalid data')
                  }
                  onImportData(parsed)
                  setImportMessage('Import complete.')
                  setImportError(false)
                } catch {
                  setImportMessage('Import failed. Please use a valid export file.')
                  setImportError(true)
                }
                event.target.value = ''
              }
              reader.readAsText(file)
            }}
          />
        </div>
        {importMessage && (
          <p className={importError ? 'error' : 'muted'}>{importMessage}</p>
        )}
      </div>
    </section>
  )
}

export default BoardHistory
