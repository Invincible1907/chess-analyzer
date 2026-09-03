import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const ChessBoard = dynamic(() => import('../components/ChessBoard'), { ssr: false })
const MoveList = dynamic(() => import('../components/MoveList'), { ssr: false })

export default function Home() {
  const [pgn, setPgn] = useState('');
  const [moves, setMoves] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [theme, setTheme] = useState('light');
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const t = globalThis.localStorage?.getItem('theme') || 'light'
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  function toggleTheme() {
    const t = theme === 'light' ? 'dark' : 'light'
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    globalThis.localStorage?.setItem('theme', t)
  }

  async function analyze() {
    setLoading(true)
    setError(null)
    setMoves(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setMoves(data.moves)
      setSelectedIndex(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function importFromChesscom() {
    if (!username) return setError('Enter a chess.com username')
    setLoading(true)
    setError(null)
    setMoves(null)
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      const firstGame = data.games && data.games[0]
      if (!firstGame) throw new Error('No games found')
      setPgn(firstGame.pgn)
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: firstGame.pgn })
      })
      const ad = await r.json()
      if (!r.ok) throw new Error(ad.error || 'Analysis failed')
      setMoves(ad.moves)
      setSelectedIndex(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">Chess Analyzer</div>
        <div className="controls">
          <label className="panel" style={{ padding: '6px 10px' }}>
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} /> <span style={{ marginLeft: 8 }}>Dark</span>
          </label>
          <a className="secondary panel" href="#" style={{ textDecoration: 'none' }}>Docs</a>
        </div>
      </header>

      <section className="row">
        <div className="left panel">
          <div className="board-wrap">
            <div style={{ width: 460 }}>
              <ChessBoard moves={moves || []} selectedIndex={selectedIndex} />
            </div>
            <div className="toolbar" style={{ marginTop: 12 }}>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="chess.com username" />
              <button onClick={importFromChesscom} disabled={loading}>Import</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <textarea className="input" rows={6} value={pgn} onChange={(e) => setPgn(e.target.value)} placeholder="Paste PGN here" />
              {error && <div role="alert" style={{ marginTop: 8, color: 'var(--danger, #b42318)' }}>{error}</div>}
              <div style={{ marginTop: 8 }}>
                <button onClick={analyze} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze'}</button>
                <button className="secondary" style={{ marginLeft: 8 }}>Export PGN</button>
              </div>
            </div>
          </div>
        </div>

        <div className="right panel">
          <h3>Moves & evaluation</h3>
          <div className="move-list">
            {moves ? (
              <MoveList moves={moves} onSelect={(i) => setSelectedIndex(i)} selectedIndex={selectedIndex} />
            ) : (
              <small>Paste a PGN or import a game to see the move list and evaluations.</small>
            )}
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 18 }}>
        <small>UI inspired by modern chess sites — board on the left, move list + evals on the right. For further polish, add animations and icons.</small>
      </footer>
    </div>
  )
}
