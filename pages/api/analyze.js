import { Chess } from 'chess.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pgn } = req.body || {}
  if (!pgn || typeof pgn !== 'string') {
    return res.status(400).json({ error: 'PGN (string) is required in request body' })
  }

  try {
    // Load PGN into chess.js and produce move-by-move FENs
    const parser = new Chess()
    if (typeof parser.loadPgn === 'function') {
      parser.loadPgn(pgn)
    } else if (typeof parser.load_pgn === 'function') {
      parser.load_pgn(pgn)
    } else {
      return res.status(500).json({ error: 'chess.js API mismatch on server' })
    }

    const allMoves = parser.history()
    const replay = new Chess()
    const moves = []
    for (let i = 0; i < allMoves.length; i++) {
      const san = allMoves[i]
      replay.move(san)
      const fen = replay.fen()
      moves.push({ moveNumber: Math.ceil((i + 1) / 2), san, fen })
    }

    return res.status(200).json({ moves })
  } catch (err) {
    console.error(err)
    return res.status(400).json({ error: 'Failed to parse PGN', detail: String(err) })
  }
}
