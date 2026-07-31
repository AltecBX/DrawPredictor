import { Activity, BrainCircuit, ChartNoAxesCombined, FlaskConical, Layers3, ShieldCheck, Sparkles, Target, TicketCheck } from 'lucide-react'

const modules = [
  { icon: BrainCircuit, title: 'Model Tournament', text: 'Competing prediction models ranked by walk forward performance.' },
  { icon: FlaskConical, title: 'Pattern Discovery', text: 'Searches historical interactions and rejects patterns that fail out of sample.' },
  { icon: Sparkles, title: 'Prediction Simulator', text: 'Simulates future draws from the learned probability structure.' },
  { icon: TicketCheck, title: 'Ticket Optimizer', text: 'Builds ticket portfolios for coverage instead of isolated combinations.' },
  { icon: ShieldCheck, title: 'Edge Dashboard', text: 'Measures performance against chance, frequency, and simple baselines.' },
]

const numbers = [9, 13, 28, 45, 51]

export default function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">JP</div>
        <div>
          <div className="eyebrow">DRAWPREDICTOR</div>
          <h1>Jerry Pattern Lab</h1>
        </div>
        <button className="game-pill">Powerball</button>
      </header>

      <section className="hero-grid">
        <article className="hero-card">
          <div className="hero-copy">
            <span className="status"><Activity size={15} /> Research engine online</span>
            <h2>Find the pattern. Prove the edge.</h2>
            <p>Every prediction is scored against unseen historical draws before it earns influence.</p>
            <div className="draw-row" aria-label="example prediction">
              {numbers.map((number) => <span className="ball" key={number}>{number}</span>)}
              <span className="ball special">18</span>
            </div>
          </div>
          <div className="score-orbit">
            <div className="orbit-ring" />
            <div className="score-core"><strong>87%</strong><span>pattern strength</span></div>
          </div>
        </article>

        <aside className="next-prediction card">
          <div className="card-heading"><Target size={18} /><span>Next Prediction</span></div>
          <div className="metric"><span>Game</span><strong>Powerball</strong></div>
          <div className="metric"><span>Model</span><strong>Champion Ensemble</strong></div>
          <div className="metric"><span>Validation</span><strong>Walk Forward</strong></div>
          <button className="primary">Run Research</button>
        </aside>
      </section>

      <section className="module-grid">
        {modules.map(({ icon: Icon, title, text }) => (
          <article className="module-card" key={title}>
            <div className="icon-wrap"><Icon size={20} /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="research-grid">
        <article className="card wide">
          <div className="card-heading"><ChartNoAxesCombined size={18} /><span>Research Console</span></div>
          <div className="chart-placeholder">
            {[46, 62, 38, 76, 58, 84, 69, 92, 73, 88, 96].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </article>
        <article className="card">
          <div className="card-heading"><Layers3 size={18} /><span>Current Stack</span></div>
          <ul className="stack-list">
            <li><span>Walk forward engine</span><b>Active</b></li>
            <li><span>Pattern miner</span><b>Queued</b></li>
            <li><span>Simulator</span><b>Queued</b></li>
            <li><span>Portfolio optimizer</span><b>Queued</b></li>
          </ul>
        </article>
      </section>
    </main>
  )
}
