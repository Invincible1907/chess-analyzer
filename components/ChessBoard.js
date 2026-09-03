import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

const palette = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']
const startFen = new Chess().fen()

export default function ChessBoard({ moves = [], selectedIndex = 0, editMode = false, initialPosition = 'start', onPositionChange = () => {} }) {
  const [position, setPosition] = useState('start')
  const [index, setIndex] = useState(0)
  const [selectedPiece, setSelectedPiece] = useState(null)

  useEffect(() => {
    setIndex(0)
    setPosition(initialPosition)
  }, [moves, initialPosition, editMode])

  useEffect(() => {
    // respond to selectedIndex changes from parent
    goto(selectedIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex])

  function goto(i) {
    const c = new Chess()
    for (let k = 0; k < i; k++) {
      try { c.move(moves[k].san) } catch (e) {}
    }
    setIndex(i)
    setPosition(c.fen())
  }

  function updateEditor(square, piece) {
    const editor = new Chess(position === 'start' ? undefined : position)
    editor.remove(square)
    if (piece) editor.put({ type: piece[1].toLowerCase(), color: piece[0] === 'w' ? 'w' : 'b' }, square)
    const nextPosition = editor.fen()
    setPosition(nextPosition)
    onPositionChange(nextPosition)
  }

  function handleSquareClick({ square }) {
    if (editMode) updateEditor(square, selectedPiece)
  }

  function handlePieceDrop({ sourceSquare, targetSquare, piece }) {
    if (!editMode || !targetSquare) return false
    const editor = new Chess(position === 'start' ? undefined : position)
    const sourcePiece = editor.get(sourceSquare)
    editor.remove(sourceSquare)
    editor.remove(targetSquare)
    if (sourcePiece) editor.put(sourcePiece, targetSquare)
    const nextPosition = editor.fen()
    setPosition(nextPosition)
    onPositionChange(nextPosition)
    return true
  }

  const boardOptions = {
    position: position === 'start' ? startFen : position,
    allowDragging: editMode,
    onPieceDrop: handlePieceDrop,
    onSquareClick: handleSquareClick,
    boardStyle: { borderRadius: 4, overflow: 'hidden' },
    darkSquareStyle: { backgroundColor: '#769656' },
    lightSquareStyle: { backgroundColor: '#eeeed2' }
  }

  return (
    <div className="board-stage">
      {!editMode && <div className="board-controls">
        <button className="icon-button" onClick={() => goto(0)} aria-label="Go to start">|&lt;</button>
        <button className="icon-button" onClick={() => goto(Math.max(0, index - 1))} aria-label="Previous move">&lt;</button>
        <span className="move-counter">{index} / {moves.length}</span>
        <button className="icon-button" onClick={() => goto(Math.min(moves.length, index + 1))} aria-label="Next move">&gt;</button>
        <button className="icon-button" onClick={() => goto(moves.length)} aria-label="Go to end">&gt;|</button>
      </div>}
      <div className="chessboard-frame"><Chessboard options={boardOptions} /></div>
      {editMode && <div className="piece-palette" aria-label="Choose a piece">
        <button className={!selectedPiece ? 'palette-piece active' : 'palette-piece'} onClick={() => setSelectedPiece(null)} title="Erase piece">Erase</button>
        {palette.map((piece) => <button key={piece} className={selectedPiece === piece ? 'palette-piece active' : 'palette-piece'} onClick={() => setSelectedPiece(piece)} aria-label={`Place ${piece}`}>{piece}</button>)}
      </div>}
      <div className="board-caption">
        <strong>Current move:</strong> {moves[index - 1]?.san ?? 'start'}
        <code>{position}</code>
      </div>
    </div>
  )
}
