import { Chess } from 'chess.js'

const createStockfish = require('stockfish')
let engineQueue = Promise.resolve()
let enginePromise = null

function getEngine() {
  if (!enginePromise) enginePromise = createStockfish('asm')
  return enginePromise
}

function parseScore(line) {
  const match = line.match(/score (cp|mate) (-?\d+)/)
  if (!match) return null
  return { type: match[1], value: Number.parseInt(match[2], 10) }
}

function scoreToCp(score) {
  if (!score) return null
  return score.type === 'mate' ? Math.sign(score.value || 1) * 10000 : score.value
}

function analyzePosition(engine, fen) {
  return new Promise((resolve) => {
    let score = null
    let bestMove = null
    let settled = false
    const originalWrite = process.stdout.write
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      process.stdout.write = originalWrite
      resolve({ score, bestMove })
    }
    const timeout = setTimeout(finish, 8000)
    const captureLine = (line) => {
      if (typeof line !== 'string') return
      const parsed = parseScore(line)
      if (parsed) score = parsed
      if (line.startsWith('bestmove')) {
        bestMove = line.split(/\s+/)[1] || null
        finish()
      }
    }
    process.stdout.write = (chunk, ...args) => {
      const line = String(chunk).trim()
      if (/^(info |bestmove |id |option |uciok$|Stockfish )/.test(line)) captureLine(line)
      else return originalWrite.call(process.stdout, chunk, ...args)
      return true
    }
    engine.print = captureLine
    engine.sendCommand(`position fen ${fen}`)
    engine.sendCommand('go depth 5')
  })
}

async function analyzeMoves(moves) {
  let engine
  try {
    engine = await getEngine()
    engine.sendCommand('uci')
    await new Promise((resolve) => setTimeout(resolve, 100))

    const replay = new Chess()
    const positions = [replay.fen()]
    for (const move of moves) {
      replay.move(move.san)
      positions.push(replay.fen())
    }
    const evaluations = []
    for (const fen of positions) evaluations.push(await analyzePosition(engine, fen))

    const analyzed = moves.map((move, index) => {
      const engineBefore = evaluations[index]
      const engineAfter = evaluations[index + 1]
      const beforeFen = positions[index]
      const position = new Chess(beforeFen)
      const legalMoves = position.moves({ verbose: true })
      const playedMove = legalMoves.find((candidate) => candidate.san === move.san)
      const beforeCp = scoreToCp(engineBefore.score)
      const afterCpForMover = scoreToCp(engineAfter.score) === null ? null : -scoreToCp(engineAfter.score)
      const centipawnLoss = beforeCp === null || afterCpForMover === null ? null : Math.max(0, beforeCp - afterCpForMover)
      const accuracy = centipawnLoss === null ? null : Math.max(0, Math.min(100, Math.round(100 - centipawnLoss / 8)))
      let bestMoveSan = engineBefore.bestMove
      if (engineBefore.bestMove) {
        const bestCandidate = legalMoves.find((candidate) => `${candidate.from}${candidate.to}${candidate.promotion || ''}` === engineBefore.bestMove)
        bestMoveSan = bestCandidate?.san || engineBefore.bestMove
      }
      return { ...move, bestMove: engineBefore.bestMove, bestMoveSan, eval: engineAfter.score ? (engineAfter.score.type === 'mate' ? `M${engineAfter.score.value}` : (scoreToCp(engineAfter.score) / 100).toFixed(2)) : null, accuracy, centipawnLoss, isBest: Boolean(playedMove && engineBefore.bestMove === `${playedMove.from}${playedMove.to}${playedMove.promotion || ''}`) }
    })
    return analyzed
  } catch (error) {
    return moves
  }
}

function analyzeMovesSerially(moves) {
  const job = engineQueue.then(() => analyzeMoves(moves))
  engineQueue = job.catch(() => undefined)
  return job
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

    const allMoves = parser.history()
    const replay = new Chess()
    const parsedMoves = allMoves.map((san, index) => {
      replay.move(san)
      return { moveNumber: Math.ceil((index + 1) / 2), san, fen: replay.fen() }
    })
    const moves = await analyzeMovesSerially(parsedMoves)
    const ratedMoves = moves.filter((move) => typeof move.accuracy === 'number')
    const accuracy = ratedMoves.length ? Math.round(ratedMoves.reduce((sum, move) => sum + move.accuracy, 0) / ratedMoves.length) : null
    const performanceRating = accuracy === null ? null : Math.round(800 + accuracy * 16)
    const bestMoves = moves.filter((move) => move.isBest).length
    return res.status(200).json({ moves, review: { accuracy, performanceRating, bestMoves, analyzedMoves: ratedMoves.length } })
  } catch (err) {
    console.error(err)
    return res.status(400).json({ error: 'Failed to parse PGN', detail: String(err) })
  }
}
