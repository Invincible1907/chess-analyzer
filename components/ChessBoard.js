import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

export default function ChessBoard({ moves = [], selectedIndex = 0 }) {
  const [game] = useState(new Chess())
  const [position, setPosition] = useState('start')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    game.reset()
    setIndex(0)
    setPosition('start')
  }, [moves])

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

  return (
    <div>
      <div style={{ marginBottom: 8 }} className="toolbar">
        <button onClick={() => goto(0)}>Start</button>
        <button onClick={() => goto(Math.max(0, index - 1))}>Prev</button>
        <button onClick={() => goto(Math.min(moves.length, index + 1))}>Next</button>
        <button onClick={() => goto(moves.length)}>End</button>
      </div>
      <Chessboard position={position === 'start' ? 'start' : position} arePiecesDraggable={false} boardWidth={460} />
      <div style={{ marginTop: 8 }}>
        <strong>Current move:</strong> {moves[index - 1]?.san ?? 'start'}
        <div style={{ fontFamily: 'monospace' }}>{position}</div>
      </div>
    </div>
  )
}
