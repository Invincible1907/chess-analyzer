import { Chess } from 'chess.js'

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function materialScore(game) {
  return game.board().reduce((score, row) => row.reduce((total, piece) => {
    if (!piece) return total
    const value = pieceValues[piece.type]
    return total + (piece.color === 'w' ? value : -value)
  }, score), 0)
}

function formatScore(score) {
  if (score === 0) return '0.0'
  return `${score > 0 ? '+' : ''}${score.toFixed(1)}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pgn } = req.body || {}
  if (!pgn || typeof pgn !== 'string') return res.status(400).json({ error: 'PGN (string) is required in request body' })

  try {
    const parser = new Chess()
    if (typeof parser.loadPgn === 'function') parser.loadPgn(pgn)
    else if (typeof parser.load_pgn === 'function') parser.load_pgn(pgn)
    else return res.status(500).json({ error: 'chess.js API mismatch on server' })

    const sans = parser.history()
    const replay = new Chess()
    let previousScore = 0
    let captures = 0
    let checks = 0
    let sacrifices = 0
    const moves = sans.map((san, index) => {
      const played = replay.move(san)
      const score = materialScore(replay)
      const capturedValue = played.captured ? pieceValues[played.captured] : 0
      if (capturedValue) captures += 1
      if (played.san.includes('+') || played.san.includes('#')) checks += 1
      const swing = score - previousScore
      if (capturedValue && swing < -capturedValue + 0.5) sacrifices += 1
      previousScore = score
      return {
        moveNumber: Math.ceil((index + 1) / 2),
        san,
        fen: replay.fen(),
        eval: formatScore(score),
        materialScore: score,
        captured: played.captured || null,
        isCheck: played.san.includes('+') || played.san.includes('#'),
        moment: played.san.includes('#') ? 'Checkmate' : played.san.includes('+') ? 'Check' : capturedValue ? `Captured ${played.captured}` : null
      }
    })

    return res.status(200).json({
      moves,
      review: {
        mode: 'quick',
        accuracy: null,
        performanceRating: null,
        bestMoves: 0,
        analyzedMoves: moves.length,
        captures,
        checks,
        sacrifices,
        keyMoments: moves.filter((move) => move.moment).length,
        materialScore: previousScore
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(400).json({ error: 'Failed to parse PGN', detail: String(err) })
  }
}
