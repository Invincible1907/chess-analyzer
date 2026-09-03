export default function MoveList({ moves = [], onSelect = () => {}, selectedIndex = 0 }) {
  if (!moves || moves.length === 0) return <div><small>No moves</small></div>

  return (
    <div>
      {moves.map((m, i) => (
        <div key={i} className={`move-row ${selectedIndex === i ? 'selected' : ''}`} onClick={() => onSelect(i)}>
          <div style={{ width: 36, textAlign: 'right', color: 'var(--muted)' }}>{m.moveNumber}</div>
          <div className="move-name"><strong>{m.san}</strong><small>{m.moment || 'Position reviewed'}</small></div>
          <div className="eval-badge">{m.eval ?? '0.0'}</div>
        </div>
      ))}
    </div>
  )
}
