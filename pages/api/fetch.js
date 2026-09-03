import axios from 'axios'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username } = req.body || {}
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username is required' })
  }

  try {
    const requestOptions = {
      timeout: 10000,
      headers: { 'User-Agent': 'ChessAnalyzer/0.1 (local development)' }
    }
    const archivesRes = await axios.get(`https://api.chess.com/pub/player/${encodeURIComponent(username.trim())}/games/archives`, requestOptions)
    const archives = archivesRes.data.archives || []
    if (archives.length === 0) return res.status(200).json({ games: [] })

    let games = []
    for (const archive of archives.slice().reverse().slice(0, 3)) {
      const archiveRes = await axios.get(archive, requestOptions)
      const archiveGames = (archiveRes.data.games || [])
        .filter(g => typeof g.pgn === 'string' && g.pgn.trim())
        .map(g => ({ url: g.url, pgn: g.pgn, white: g.white, black: g.black }))
      games = games.concat(archiveGames)
    }

    return res.status(200).json({ games: games.slice(0, 30) })
  } catch (err) {
    console.error(err)
    if (err.response?.status === 404) return res.status(404).json({ error: 'Chess.com username not found' })
    return res.status(502).json({ error: 'Chess.com could not be reached. Check the username and try again.' })
  }
}
