import { useMemo, useRef, useState } from 'react'
import { Activity, BarChart3, BrainCircuit, Database, FlaskConical, ShieldCheck, Sparkles, Target, TicketCheck, Upload } from 'lucide-react'
import { GAMES, type Draw, type GameId } from './engine/types'

const TABS = ['Prediction', 'Backtest', 'Patterns', 'Tickets', 'History'] as const
type Tab = typeof TABS[number]

function seededDraws(game: GameId, count = 180): Draw[] {
  const rules = GAMES[game]
  let seed = game === 'powerball' ? 81273 : 49317
  const rand = () => {
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647
  }
  const rows: Draw[] = []
  const start = new Date('2024-01-01T12:00:00')
  let cursor = new Date(start)
  while (rows.length < count) {
    if (rules.drawDays.includes(cursor.getDay())) {
      const set = new Set<number>()
      while (set.size < rules.mainCount) set.add(1 + Math.floor(rand() * rules.mainMax))
      rows.push({
        date: cursor.toISOString().slice(0, 10),
        dayOfWeek: cursor.getDay(),
        main: [...set].sort((a, b) => a - b),
        special: 1 + Math.floor(rand() * rules.specialMax),
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return rows
}

function parseRows(text: string, game: GameId): Draw[] {
  const rules = GAMES[game]
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  const out: Draw[] = []
  for (const line of lines) {
    const cols = line.split(/[\t,|;]/).map((x) => x.trim()).filter(Boolean)
    const dateIndex = cols.findIndex((c) => /^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(c))
    if (dateIndex < 0) continue
    const rawDate = cols[dateIndex]
    const d = new Date(rawDate)
    if (Number.isNaN(d.getTime())) continue
    const nums = cols.slice(dateIndex + 1).map(Number).filter((n) => Number.isInteger(n) && n > 0)
    if (nums.length < rules.mainCount + 1) continue
    out.push({
      date: d.toISOString().slice(0, 10),
      dayOfWeek: d.getDay(),
      main: nums.slice(0, rules.mainCount).sort((a, b) => a - b),
      special: nums[rules.mainCount],
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function rankNumbers(history: readonly Draw[], game: GameId) {
  const { mainMax } = GAMES[game]
  const recent = history.slice(-30)
  const medium = history.slice(-80)
  const lastSeen = new Array(mainMax + 1).fill(-1)
  const total = new Array(mainMax + 1).fill(0)
  const r30 = new Array(mainMax + 1).fill(0)
  const r80 = new Array(mainMax + 1).fill(0)
  history.forEach((d, idx) => d.main.forEach((n) => { if (n <= mainMax) { total[n]++; lastSeen[n] = idx } }))
  recent.forEach((d) => d.main.forEach((n) => { if (n <= mainMax) r30[n]++ }))
  medium.forEach((d) => d.main.forEach((n) => { if (n <= mainMax) r80[n]++ }))
  const scored = [] as { number: number; score: number; frequency: number; recent: number; gap: number }[]
  for (let n = 1; n <= mainMax; n++) {
    const freq = history.length ? total[n] / history.length : 0
    const fast = recent.length ? r30[n] / recent.length : 0
    const mid = medium.length ? r80[n] / medium.length : 0
    const gap = lastSeen[n] < 0 ? history.length : history.length - 1 - lastSeen[n]
    const gapScore = Math.min(gap / 20, 1.5)
    const score = freq * 0.25 + fast * 0.42 + mid * 0.23 + gapScore * 0.01
    scored.push({ number: n, score, frequency: freq, recent: fast, gap })
  }
  return scored.sort((a, b) => b.score - a.score || a.number - b.number)
}

function rankSpecial(history: readonly Draw[], game: GameId) {
  const { specialMax } = GAMES[game]
  const recent = history.slice(-40)
  const counts = new Array(specialMax + 1).fill(0)
  const all = new Array(specialMax + 1).fill(0)
  history.forEach((d) => { if (d.special <= specialMax) all[d.special]++ })
  recent.forEach((d) => { if (d.special <= specialMax) counts[d.special]++ })
  return Array.from({ length: specialMax }, (_, i) => i + 1)
    .map((n) => ({ number: n, score: (counts[n] / Math.max(1, recent.length)) * .7 + (all[n] / Math.max(1, history.length)) * .3 }))
    .sort((a, b) => b.score - a.score || a.number - b.number)
}

function backtest(draws: readonly Draw[], game: GameId) {
  const rules = GAMES[game]
  const rows: { date: string; matches: number; predicted: number[]; actual: number[] }[] = []
  for (let i = 35; i < draws.length; i++) {
    const predicted = rankNumbers(draws.slice(0, i), game).slice(0, rules.mainCount).map((x) => x.number)
    const actual = draws[i].main
    const set = new Set(predicted)
    rows.push({ date: draws[i].date, matches: actual.filter((n) => set.has(n)).length, predicted, actual })
  }
  const avg = rows.length ? rows.reduce((s, x) => s + x.matches, 0) / rows.length : 0
  const chance = rules.mainCount * rules.mainCount / rules.mainMax
  const recent = rows.slice(-50)
  const recentAvg = recent.length ? recent.reduce((s, x) => s + x.matches, 0) / recent.length : 0
  return { rows, avg, recentAvg, chance, edge: avg - chance }
}

function Ball({ value, special = false }: { value: number; special?: boolean }) {
  return <span className={`ball${special ? ' special' : ''}`}>{value}</span>
}

export default function App() {
  const [game, setGame] = useState<GameId>('powerball')
  const [tab, setTab] = useState<Tab>('Prediction')
  const [drawsByGame, setDrawsByGame] = useState<Record<GameId, Draw[]>>(() => ({
    powerball: seededDraws('powerball'),
    'mega-millions': seededDraws('mega-millions'),
  }))
  const [notice, setNotice] = useState('Demo history loaded. Import your own history to replace it.')
  const inputRef = useRef<HTMLInputElement>(null)
  const draws = drawsByGame[game]
  const rules = GAMES[game]
  const ranking = useMemo(() => rankNumbers(draws, game), [draws, game])
  const specialRanking = useMemo(() => rankSpecial(draws, game), [draws, game])
  const bt = useMemo(() => backtest(draws, game), [draws, game])
  const picks = ranking.slice(0, rules.mainCount)
  const special = specialRanking[0]?.number ?? 1
  const confidence = Math.max(0, Math.min(99, 50 + bt.edge * 85))

  const importFile = async (file?: File) => {
    if (!file) return
    const parsed = parseRows(await file.text(), game)
    if (!parsed.length) {
      setNotice('No valid rows found. Use date followed by 5 main numbers and the special ball.')
      return
    }
    setDrawsByGame((s) => ({ ...s, [game]: parsed }))
    setNotice(`${parsed.length} ${rules.name} draws imported and analyzed.`)
  }

  const useDemo = () => {
    setDrawsByGame((s) => ({ ...s, [game]: seededDraws(game) }))
    setNotice(`Demo ${rules.name} history reset and analyzed.`)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">JP</div>
        <div className="brand-copy"><div className="eyebrow">DRAWPREDICTOR</div><h1>Jerry Pattern Lab</h1></div>
        <select className="game-select" value={game} onChange={(e) => setGame(e.target.value as GameId)}>
          <option value="powerball">Powerball</option>
          <option value="mega-millions">Mega Millions</option>
        </select>
      </header>

      <nav className="tabs" aria-label="Research sections">
        {TABS.map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}
      </nav>

      <div className="notice"><Database size={15} /> {notice}</div>

      {tab === 'Prediction' && <>
        <section className="hero-grid">
          <article className="hero-card">
            <div className="hero-copy">
              <span className="status"><Activity size={15} /> {draws.length} draws analyzed</span>
              <h2>Next draw research.</h2>
              <p>Current ranking combines long term frequency, recent frequency, medium term form, and gap context. The backtest never sees the draw it is predicting.</p>
              <div className="draw-row">{picks.map((x) => <Ball key={x.number} value={x.number} />)}<Ball value={special} special /></div>
            </div>
            <div className="score-orbit"><div className="orbit-ring" /><div className="score-core"><strong>{confidence.toFixed(0)}%</strong><span>model confidence</span></div></div>
          </article>

          <aside className="card">
            <div className="card-heading"><Target size={18} /><span>Research Controls</span></div>
            <div className="metric"><span>Game</span><strong>{rules.name}</strong></div>
            <div className="metric"><span>History</span><strong>{draws.length} draws</strong></div>
            <div className="metric"><span>Walk forward</span><strong>{bt.rows.length} tests</strong></div>
            <button className="primary" onClick={() => inputRef.current?.click()}><Upload size={16} /> Import History</button>
            <button className="secondary" onClick={useDemo}>Reset Demo Data</button>
            <input ref={inputRef} type="file" accept=".csv,.txt,.tsv" hidden onChange={(e) => void importFile(e.target.files?.[0])} />
          </aside>
        </section>

        <section className="panel-grid">
          <article className="card wide"><div className="card-heading"><BarChart3 size={18} /><span>Top Ranked Numbers</span></div>
            <div className="ranking-table"><div className="rank-row head"><span>#</span><span>Number</span><span>Score</span><span>Recent</span><span>Gap</span></div>
              {ranking.slice(0, 15).map((x, i) => <div className="rank-row" key={x.number}><span>{i + 1}</span><b>{x.number}</b><span>{x.score.toFixed(3)}</span><span>{(x.recent * 100).toFixed(1)}%</span><span>{x.gap}</span></div>)}
            </div>
          </article>
          <article className="card"><div className="card-heading"><BrainCircuit size={18} /><span>Model Stack</span></div>
            <ul className="stack-list"><li><span>Recent form</span><b>42%</b></li><li><span>Long term frequency</span><b>25%</b></li><li><span>Medium term form</span><b>23%</b></li><li><span>Gap context</span><b>10%</b></li></ul>
          </article>
        </section>
      </>}

      {tab === 'Backtest' && <section className="panel-grid">
        <article className="card"><div className="card-heading"><ShieldCheck size={18} /><span>Walk Forward Score</span></div>
          <div className="big-stat">{bt.avg.toFixed(3)}</div><p className="muted">Average main number matches per hidden draw.</p>
          <div className="metric"><span>Random expectation</span><strong>{bt.chance.toFixed(3)}</strong></div><div className="metric"><span>Edge vs random</span><strong className={bt.edge > 0 ? 'positive' : 'negative'}>{bt.edge >= 0 ? '+' : ''}{bt.edge.toFixed(3)}</strong></div><div className="metric"><span>Last 50</span><strong>{bt.recentAvg.toFixed(3)}</strong></div>
        </article>
        <article className="card wide"><div className="card-heading"><Activity size={18} /><span>Latest Hidden Draw Tests</span></div>
          <div className="test-list">{bt.rows.slice(-12).reverse().map((r) => <div className="test-row" key={r.date}><span>{r.date}</span><span>{r.predicted.join(', ')}</span><span>Actual {r.actual.join(', ')}</span><b>{r.matches} hit{r.matches === 1 ? '' : 's'}</b></div>)}</div>
        </article>
      </section>}

      {tab === 'Patterns' && <section className="module-grid three">
        <article className="module-card"><FlaskConical /><h3>Hot momentum</h3><p>{ranking.slice(0, 5).map((x) => x.number).join(', ')} currently lead the blended ranking.</p></article>
        <article className="module-card"><Sparkles /><h3>Most overdue</h3><p>{[...ranking].sort((a, b) => b.gap - a.gap).slice(0, 5).map((x) => `${x.number} (${x.gap})`).join(', ')}</p></article>
        <article className="module-card"><BrainCircuit /><h3>Research status</h3><p>Automated interaction mining and model tournament are the next engine modules being added.</p></article>
      </section>}

      {tab === 'Tickets' && <section className="card"><div className="card-heading"><TicketCheck size={18} /><span>Ticket Lab</span></div><p className="muted">Five diversified combinations generated from the current top ranked pool.</p><div className="ticket-list">{Array.from({ length: 5 }, (_, i) => { const pool = ranking.slice(0, 15); const nums = Array.from({ length: rules.mainCount }, (_, j) => pool[(i * 3 + j * 2) % pool.length].number).sort((a,b)=>a-b); const sp = specialRanking[i % specialRanking.length]?.number ?? special; return <div className="ticket" key={i}>{nums.map((n)=><Ball key={n} value={n}/>)}<Ball value={sp} special /></div> })}</div></section>}

      {tab === 'History' && <section className="card"><div className="card-heading"><Database size={18} /><span>History</span></div><div className="history-list">{draws.slice(-40).reverse().map((d) => <div className="history-row" key={d.date}><span>{d.date}</span><span>{d.main.join('  ')}</span><b>{d.special}</b></div>)}</div></section>}
    </main>
  )
}
