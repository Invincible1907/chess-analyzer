import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const ChessBoard = dynamic(() => import('../components/ChessBoard'), { ssr: false })
const MoveList = dynamic(() => import('../components/MoveList'), { ssr: false })
const starterPgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

function gameLabel(game, index) {
  const white = game.white?.username || game.white?.name || game.white || 'White'
  const black = game.black?.username || game.black?.name || game.black || 'Black'
  return `${white} vs ${black} ${index + 1}`
}

function gameDate(game) {
  if (!game.endTime) return 'Recent game'
  return new Date(game.endTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Home() {
  const [pgn, setPgn] = useState(starterPgn)
  const [moves, setMoves] = useState(null)
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState('')
  const [history, setHistory] = useState([])
  const [activeView, setActiveView] = useState('review')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [editorPosition, setEditorPosition] = useState('start')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const savedTheme = globalThis.localStorage?.getItem('theme') || 'dark'
    const savedUsername = globalThis.localStorage?.getItem('chesslab-username') || ''
    setTheme(savedTheme)
    setUsername(savedUsername)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    globalThis.localStorage?.setItem('theme', nextTheme)
  }

  async function analyzePgn(nextPgn = pgn) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgn: nextPgn }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Analysis failed')
      setPgn(nextPgn)
      setMoves(data.moves)
      setReview(data.review || null)
      setSelectedIndex(0)
      setActiveView('review')
    } catch (err) {
      setError(err.message)
      setMoves(null)
      setReview(null)
    } finally {
      setLoading(false)
    }
  }

  async function importHistory() {
    if (!username.trim()) {
      setError('Enter a chess.com username')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import failed')
      setHistory(data.games || [])
      if (!data.games?.length) setError('No recent games found for this username')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openGame(game) {
    setPgn(game.pgn)
    analyzePgn(game.pgn)
  }

  function startEditor() {
    setActiveView('editor')
    setMoves(null)
    setReview(null)
    setError(null)
  }

  const moveCount = moves?.length || 0
  const fullMoves = Math.ceil(moveCount / 2)
  const opening = moves?.slice(0, 6).map((move) => move.san).join(' ') || 'Load a game to see its opening'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span className="brand-knight">N</span><span>ChessLab</span></div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={activeView === 'review' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('review')}><span>+</span> Game review</button>
          <button className={activeView === 'editor' ? 'nav-item active' : 'nav-item'} onClick={startEditor}><span>□</span> Board editor</button>
          <button className="nav-item" onClick={() => document.querySelector('.history-section')?.scrollIntoView({ behavior: 'smooth' })}><span>▤</span> Game history</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={toggleTheme}><span>{theme === 'dark' ? '☼' : '◐'}</span> {theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
          <div className="sidebar-note">Analyze your games.<br />Find your next move.</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">CHESSLAB / {activeView === 'review' ? 'GAME REVIEW' : 'BOARD EDITOR'}</p><h1>{activeView === 'review' ? 'Review your game' : 'Set up a position'}</h1></div>
          <div className="topbar-actions"><button className="ghost-button" onClick={() => { setPgn(starterPgn); setMoves(null) }}>New analysis</button><div className="avatar">I</div></div>
        </header>

        <section className="workspace-grid">
          <div className="board-panel panel-dark">
            <div className="panel-heading"><div><span className="live-dot" /> {activeView === 'review' ? 'Analysis board' : 'Position setup'}</div><span className="board-status">{activeView === 'review' ? (moves ? `${fullMoves} moves` : 'Ready to review') : 'Editor mode'}</span></div>
            <ChessBoard moves={moves || []} selectedIndex={selectedIndex} editMode={activeView === 'editor'} initialPosition={editorPosition} onPositionChange={setEditorPosition} />
            {activeView === 'editor' && <div className="editor-actions"><button className="button-primary" onClick={() => { setPgn(''); setActiveView('review'); setMoves(null) }}>Analyze this position</button><button className="ghost-button" onClick={() => setEditorPosition('start')}>Reset board</button></div>}
          </div>

          <div className="review-panel">
            <div className="tab-row"><button className="tab active">Overview</button><button className="tab" onClick={() => setActiveView('review')}>Moves</button><button className="tab">Details</button></div>
            {activeView === 'review' ? <>
              <div className="review-intro"><p className="eyebrow">GAME REVIEW</p><h2>{moves ? 'Your game is ready.' : 'Bring a game to the board.'}</h2><p>{moves ? 'Step through every move and inspect the position after it.' : 'Paste a PGN or choose a game from your chess.com history.'}</p><textarea className="pgn-input" value={pgn} onChange={(event) => setPgn(event.target.value)} placeholder="Paste PGN here" rows={3} /><button className="button-primary analyze-button" onClick={() => analyzePgn()} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze PGN'}</button></div>
              <div className="stat-grid"><div className="stat-card"><span>Performance</span><strong>{review?.performanceRating || '--'}</strong><small>{review ? 'estimated rating' : 'waiting'}</small></div><div className="stat-card"><span>Accuracy</span><strong>{review?.accuracy ? `${review.accuracy}%` : '--'}</strong><small>{review ? `${review.bestMoves} best moves` : 'not analyzed'}</small></div><div className="stat-card"><span>Moves</span><strong>{moveCount || '--'}</strong><small>{moves ? 'engine reviewed' : 'waiting'}</small></div></div>
              <div className="opening-line"><span>Opening sequence</span><code>{opening}</code></div>
              <div className="move-list-wrap"><div className="section-title"><span>Moves</span><span>{moveCount ? `${moveCount} plies` : 'No game loaded'}</span></div>{moves ? <MoveList moves={moves} onSelect={setSelectedIndex} selectedIndex={selectedIndex} /> : <div className="empty-state">Your move list will appear here after analysis.</div>}</div>
            </> : <div className="editor-copy"><p className="eyebrow">BOARD EDITOR</p><h2>Build a position.</h2><p>Choose a piece, click a square to place it, or drag pieces directly on the board.</p></div>}
          </div>
        </section>

        <section className="import-section panel-dark">
          <div className="section-heading"><div><p className="eyebrow">CHESS.COM CONNECT</p><h2>Recent games</h2></div><span className="section-hint">Import your latest games to review them here.</span></div>
          <div className="import-bar"><div className="username-field"><span>@</span><input value={username} onChange={(event) => { setUsername(event.target.value); globalThis.localStorage?.setItem('chesslab-username', event.target.value) }} onKeyDown={(event) => event.key === 'Enter' && importHistory()} placeholder="chess.com username" /></div><button className="button-primary" onClick={importHistory} disabled={loading}>{loading ? 'Loading...' : 'Load game history'}</button></div>
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="history-section">{history.length ? history.map((game, index) => <button className="history-card" key={`${game.url || index}-${index}`} onClick={() => openGame(game)}><span className="history-result">{gameDate(game)}</span><strong>{gameLabel(game, index)}</strong><small>{game.result || 'Game'} {game.white?.rating ? ` / ${game.white.rating} vs ${game.black?.rating || '?'}` : ''}</small><span className="history-arrow">&rarr;</span></button>) : <div className="history-empty">Enter a username to see up to 30 recent games.</div>}</div>
        </section>

        <footer className="footer"><span>CHESSLAB</span><span>Built for thoughtful analysis</span></footer>
      </main>
    </div>
  )
}
