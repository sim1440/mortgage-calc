import { useState, useMemo } from 'react'

const fmt  = v => '$' + Math.round(v).toLocaleString('en-US')
const fmtK = v => { const k = Math.round(v / 1000); return k >= 1 ? '$' + k + 'k' : fmt(v) }

function amortize(loan, r, n, extra) {
  if (loan <= 0 || n <= 0) return { months: 0, totalInterest: 0 }
  let balance = loan, totalInterest = 0, months = 0
  const pi = r === 0 ? loan / n : loan * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1)
  while (balance > 0.01 && months < n) {
    const intCharge = balance * r
    totalInterest += intCharge
    let principal = pi - intCharge + (extra || 0)
    if (principal > balance) principal = balance
    balance -= principal
    months++
  }
  return { months, totalInterest }
}

function monthsToLabel(m) {
  const yrs = Math.floor(m/12), mos = m%12
  if (mos === 0) return yrs + ' yr' + (yrs !== 1 ? 's' : '')
  return yrs + ' yr ' + mos + ' mo'
}

function payoffDate(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month:'short', year:'numeric' })
}

function earlierLabel(diff) {
  const yrs = Math.floor(diff/12), mos = diff%12
  const parts = []
  if (yrs > 0) parts.push(yrs + ' yr' + (yrs > 1 ? 's' : ''))
  if (mos > 0) parts.push(mos + ' mo')
  return parts.join(' ') || 'none'
}

function calcMortgage(hp, dp, ann, loanTerm, tax, ins, pmiV, hoaV, extra) {
  const loan = Math.max(hp - dp, 0)
  const r    = ann / 100 / 12
  const n    = loanTerm * 12
  let pi = 0
  if (n > 0) pi = r === 0 ? loan / n : loan * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1)
  const mTax  = tax / 12
  const mIns  = ins / 12
  const total = pi + mTax + mIns + pmiV + hoaV
  const tPaid = pi * n
  const pct   = v => total > 0 ? (v/total*100).toFixed(1)+'%' : '0%'
  let savings = null
  if (extra > 0 && loan > 0 && r > 0) {
    const orig    = amortize(loan, r, n, 0)
    const newA    = amortize(loan, r, n, extra)
    const saved   = orig.totalInterest - newA.totalInterest
    const diffMos = orig.months - newA.months
    savings = {
      saved: Math.max(saved,0), earlier: earlierLabel(Math.max(diffMos,0)),
      newDate: payoffDate(newA.months), origDate: payoffDate(orig.months),
      newInt: newA.totalInterest, origInt: orig.totalInterest,
      origMonths: orig.months, newMonths: newA.months,
    }
  }
  return { loan, pi, mTax, mIns, total, interest: Math.max(tPaid-loan,0), tPaid: Math.max(tPaid,0),
    pctPI: pct(pi), pctTax: pct(mTax), pctIns: pct(mIns), pctPMI: pct(pmiV), pctHOA: pct(hoaV), savings }
}

function LoanInputs({ label, color, data, onChange }) {
  function handleDownPct(e) {
    const val = e.target.value
    const hp = parseFloat(data.homePrice) || 0
    onChange({ ...data, downPct: val, downDollar: hp > 0 && val !== '' ? String(Math.round(hp * parseFloat(val) / 100)) : '' })
  }
  function handleDownDollar(e) {
    const val = e.target.value
    const hp = parseFloat(data.homePrice) || 0
    onChange({ ...data, downDollar: val, downPct: hp > 0 && val !== '' ? ((parseFloat(val)/hp)*100).toFixed(1) : '' })
  }
  function handleDownPctBtn(p) {
    const hp = parseFloat(data.homePrice) || 0
    onChange({ ...data, downPct: String(p), downDollar: hp > 0 ? String(Math.round(hp * p / 100)) : '' })
  }
  function handleHomePrice(e) {
    const val = e.target.value
    const hp = parseFloat(val) || 0
    const pct = parseFloat(data.downPct) || 0
    onChange({ ...data, homePrice: val, downDollar: hp > 0 && pct > 0 ? String(Math.round(hp * pct / 100)) : data.downDollar })
  }

  return (
    <div className="card" style={{borderTop: `3px solid ${color}`}}>
      <p className="card-title" style={{color}}>{label}</p>
      <div className="form-grid">
        <div className="field">
          <label>Home price</label>
          <div className="input-wrap has-prefix">
            <span className="input-prefix">$</span>
            <input type="number" inputMode="numeric" value={data.homePrice} min="0" step="1000" placeholder="e.g. 400000" onChange={handleHomePrice} />
          </div>
        </div>
        <div className="field">
          <label>Down payment</label>
          <div style={{display:'flex', gap:'6px'}}>
            <div className="input-wrap has-suffix" style={{flex:'1'}}>
              <span className="input-suffix">%</span>
              <input type="number" inputMode="decimal" value={data.downPct} min="0" max="100" step="1" placeholder="e.g. 20" onChange={handleDownPct} />
            </div>
            <div className="input-wrap has-prefix" style={{flex:'1'}}>
              <span className="input-prefix">$</span>
              <input type="number" inputMode="numeric" value={data.downDollar} min="0" step="1000" placeholder="e.g. 80000" onChange={handleDownDollar} />
            </div>
          </div>
          <div className="term-buttons">
            {[5,10,15,20,25].map(p => (
              <button key={p} className={`term-btn${parseFloat(data.downPct)===p?' active':''}`} onClick={() => handleDownPctBtn(p)}>{p}%</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Interest rate</label>
          <div className="input-wrap has-suffix">
            <span className="input-suffix">%</span>
            <input type="number" inputMode="decimal" value={data.interestRate} min="0" max="30" step="0.05" placeholder="e.g. 6.5" onChange={e => onChange({...data, interestRate: e.target.value})} />
          </div>
        </div>
        <div className="field">
          <label>Loan term (years)</label>
          <div className="input-wrap">
            <input type="number" inputMode="numeric" value={data.loanTerm} min="1" max="50" step="1" onChange={e => onChange({...data, loanTerm: parseFloat(e.target.value)||30})} />
          </div>
          <div className="term-buttons">
            {[10,15,30].map(y => (
              <button key={y} className={`term-btn${data.loanTerm===y?' active':''}`} onClick={() => onChange({...data, loanTerm: y})}>{y} yr</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Property tax / year</label>
          <div className="input-wrap has-prefix">
            <span className="input-prefix">$</span>
            <input type="number" inputMode="numeric" value={data.propertyTax} min="0" placeholder="e.g. 4800" onChange={e => onChange({...data, propertyTax: e.target.value})} />
          </div>
        </div>
        <div className="field">
          <label>Home insurance / year</label>
          <div className="input-wrap has-prefix">
            <span className="input-prefix">$</span>
            <input type="number" inputMode="numeric" value={data.homeInsurance} min="0" placeholder="e.g. 1200" onChange={e => onChange({...data, homeInsurance: e.target.value})} />
          </div>
        </div>
        <div className="field">
          <label>PMI / month</label>
          <div className="input-wrap has-prefix">
            <span className="input-prefix">$</span>
            <input type="number" inputMode="numeric" value={data.pmi} min="0" placeholder="0" onChange={e => onChange({...data, pmi: e.target.value})} />
          </div>
        </div>
        <div className="field">
          <label>HOA / month</label>
          <div className="input-wrap has-prefix">
            <span className="input-prefix">$</span>
            <input type="number" inputMode="numeric" value={data.hoa} min="0" placeholder="0" onChange={e => onChange({...data, hoa: e.target.value})} />
          </div>
        </div>
      </div>
    </div>
  )
}

function emptyLoan() {
  return { homePrice:'', downPct:'', downDollar:'', interestRate:'', loanTerm:30, propertyTax:'', homeInsurance:'', pmi:'', hoa:'' }
}

function parseLoan(d) {
  const hp = parseFloat(d.homePrice)||0
  const dp = parseFloat(d.downDollar) || (hp * (parseFloat(d.downPct)||0) / 100)
  return {
    hp, dp,
    ann:  parseFloat(d.interestRate)||0,
    loanTerm: d.loanTerm,
    tax:  parseFloat(d.propertyTax)||0,
    ins:  parseFloat(d.homeInsurance)||0,
    pmiV: parseFloat(d.pmi)||0,
    hoaV: parseFloat(d.hoa)||0,
    extra: 0,
  }
}

export default function App() {
  const [mode, setMode] = useState('single') // 'single' | 'compare'

  // single mode
  const [homePrice,     setHomePrice]     = useState('')
  const [downPct,       setDownPct]       = useState('')
  const [downDollar,    setDownDollar]    = useState('')
  const [interestRate,  setInterestRate]  = useState('')
  const [loanTerm,      setLoanTerm]      = useState(30)
  const [propertyTax,   setPropertyTax]   = useState('')
  const [homeInsurance, setHomeInsurance] = useState('')
  const [pmi,           setPmi]           = useState('')
  const [hoa,           setHoa]           = useState('')
  const [extraPayment,  setExtraPayment]  = useState('')

  // compare mode
  const [loanA, setLoanA] = useState({...emptyLoan(), label:'Lender A'})
  const [loanB, setLoanB] = useState({...emptyLoan(), label:'Lender B'})

  const hp   = parseFloat(homePrice) || 0
  const dp   = parseFloat(downDollar) || (hp * (parseFloat(downPct)||0) / 100)
  const ann  = parseFloat(interestRate) || 0
  const tax  = parseFloat(propertyTax) || 0
  const ins  = parseFloat(homeInsurance) || 0
  const pmiV = parseFloat(pmi) || 0
  const hoaV = parseFloat(hoa) || 0
  const extra = parseFloat(extraPayment) || 0

  const calc = useMemo(() => calcMortgage(hp, dp, ann, loanTerm, tax, ins, pmiV, hoaV, extra),
    [hp, dp, ann, loanTerm, tax, ins, pmiV, hoaV, extra])

  const cmpA = useMemo(() => { const p = parseLoan(loanA); return calcMortgage(p.hp,p.dp,p.ann,p.loanTerm,p.tax,p.ins,p.pmiV,p.hoaV,0) }, [loanA])
  const cmpB = useMemo(() => { const p = parseLoan(loanB); return calcMortgage(p.hp,p.dp,p.ann,p.loanTerm,p.tax,p.ins,p.pmiV,p.hoaV,0) }, [loanB])

  function handleDownPct(e) {
    const val = e.target.value
    setDownPct(val)
    if (hp > 0 && val !== '') setDownDollar(String(Math.round(hp * parseFloat(val) / 100)))
    else setDownDollar('')
  }
  function handleDownDollar(e) {
    const val = e.target.value
    setDownDollar(val)
    if (hp > 0 && val !== '') setDownPct(((parseFloat(val)/hp)*100).toFixed(1))
    else setDownPct('')
  }
  function handleDownPctBtn(p) {
    setDownPct(String(p))
    if (hp > 0) setDownDollar(String(Math.round(hp * p / 100)))
  }
  function handleHomePrice(e) {
    const val = e.target.value
    setHomePrice(val)
    const newHp = parseFloat(val) || 0
    const pct = parseFloat(downPct) || 0
    if (newHp > 0 && pct > 0) setDownDollar(String(Math.round(newHp * pct / 100)))
  }

  const aWins = cmpA.total > 0 && cmpB.total > 0 && cmpA.total <= cmpB.total
  const bWins = cmpA.total > 0 && cmpB.total > 0 && cmpB.total < cmpA.total

  return (
    <>
      <header>
        <div className="header-inner">
          <a href="#" className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22" style={{fill:'none',stroke:'#fff',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}}/>
              </svg>
            </div>
            MortgageCalc
          </a>
          <nav>
            <a href="#calculator">Calculator</a>
            <a href="#payoff">Payoff</a>
            <a href="#guide">Guide</a>
          </nav>
        </div>
      </header>

      <div className="hero">
        <div className="hero-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Free &amp; instant
        </div>
        <h1>Free Mortgage Calculator</h1>
        <p>Estimate your monthly payment — or compare two lenders side by side to find the better deal.</p>
      </div>

      <main>
        {/* Mode toggle */}
        <div style={{display:'flex', gap:'8px', marginBottom:'1rem'}}>
          <button
            className={`term-btn${mode==='single'?' active':''}`}
            style={{flex:1, minHeight:'44px', fontSize:'14px'}}
            onClick={() => setMode('single')}
          >
            Single calculator
          </button>
          <button
            className={`term-btn${mode==='compare'?' active':''}`}
            style={{flex:1, minHeight:'44px', fontSize:'14px'}}
            onClick={() => setMode('compare')}
          >
            ⚖️ Compare lenders
          </button>
        </div>

        {/* ── COMPARE MODE ── */}
        {mode === 'compare' && (
          <div id="calculator">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem'}}>
              <div>
                <div style={{marginBottom:'6px'}}>
                  <input
                    type="text"
                    value={loanA.label}
                    onChange={e => setLoanA({...loanA, label: e.target.value})}
                    style={{width:'100%', padding:'6px 10px', border:'1px solid #E2E8F0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', fontWeight:'600', color:'#2563EB', background:'#EFF6FF'}}
                  />
                </div>
                <LoanInputs label={loanA.label} color="#2563EB" data={loanA} onChange={setLoanA} />
              </div>
              <div>
                <div style={{marginBottom:'6px'}}>
                  <input
                    type="text"
                    value={loanB.label}
                    onChange={e => setLoanB({...loanB, label: e.target.value})}
                    style={{width:'100%', padding:'6px 10px', border:'1px solid #E2E8F0', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px', fontWeight:'600', color:'#9333EA', background:'#FAF5FF'}}
                  />
                </div>
                <LoanInputs label={loanB.label} color="#9333EA" data={loanB} onChange={setLoanB} />
              </div>
            </div>

            {(cmpA.total > 0 || cmpB.total > 0) && (
              <div className="card">
                <p className="card-title">Side-by-side comparison</p>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid #E2E8F0'}}>
                        <th style={{textAlign:'left', padding:'8px 6px', color:'#94A3B8', fontWeight:'600', fontSize:'12px', textTransform:'uppercase', letterSpacing:'.05em'}}>Metric</th>
                        <th style={{textAlign:'right', padding:'8px 6px', color:'#2563EB', fontWeight:'600'}}>{loanA.label}</th>
                        <th style={{textAlign:'right', padding:'8px 6px', color:'#9333EA', fontWeight:'600'}}>{loanB.label}</th>
                        <th style={{textAlign:'right', padding:'8px 6px', color:'#94A3B8', fontWeight:'600', fontSize:'12px'}}>Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label:'Monthly payment', a: cmpA.total, b: cmpB.total },
                        { label:'Principal & interest', a: cmpA.pi, b: cmpB.pi },
                        { label:'Loan amount', a: cmpA.loan, b: cmpB.loan },
                        { label:'Total interest paid', a: cmpA.interest, b: cmpB.interest },
                        { label:'Total loan cost', a: cmpA.tPaid, b: cmpB.tPaid },
                      ].map((row, i) => {
                        const diff = row.a > 0 && row.b > 0 ? row.b - row.a : null
                        const diffColor = diff === null ? '#94A3B8' : diff > 0 ? '#16A34A' : diff < 0 ? '#DC2626' : '#94A3B8'
                        const diffLabel = diff === null ? '—' : (diff > 0 ? '+' : '') + fmt(diff)
                        return (
                          <tr key={i} style={{borderBottom:'1px solid #F1F5F9'}}>
                            <td style={{padding:'10px 6px', color:'#475569', fontWeight:'500'}}>{row.label}</td>
                            <td style={{padding:'10px 6px', textAlign:'right', fontWeight:'600', color: aWins && i===0 ? '#16A34A' : '#1E293B'}}>{row.a > 0 ? fmt(row.a) : '—'}{aWins && i===0 ? ' ✓' : ''}</td>
                            <td style={{padding:'10px 6px', textAlign:'right', fontWeight:'600', color: bWins && i===0 ? '#16A34A' : '#1E293B'}}>{row.b > 0 ? fmt(row.b) : '—'}{bWins && i===0 ? ' ✓' : ''}</td>
                            <td style={{padding:'10px 6px', textAlign:'right', fontWeight:'600', color: diffColor}}>{diffLabel}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {(aWins || bWins) && (
                  <div style={{marginTop:'1rem', background: aWins ? '#EFF6FF' : '#FAF5FF', border:`1px solid ${aWins ? '#BFDBFE' : '#E9D5FF'}`, borderRadius:'10px', padding:'1rem', display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{fontSize:'24px'}}>🏆</span>
                    <div>
                      <div style={{fontWeight:'600', color: aWins ? '#1D4ED8' : '#7E22CE', fontSize:'14px'}}>
                        {aWins ? loanA.label : loanB.label} saves you more
                      </div>
                      <div style={{fontSize:'13px', color:'#475569', marginTop:'2px'}}>
                        {fmt(Math.abs((cmpA.total||0) - (cmpB.total||0)))} less per month · {fmt(Math.abs((cmpA.tPaid||0) - (cmpB.tPaid||0)))} less overall
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="disclaimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Estimates only. Actual payments may vary based on lender fees, credit score, and local tax rates.
            </div>
          </div>
        )}

        {/* ── SINGLE MODE ── */}
        {mode === 'single' && (
          <div id="calculator">
            <div className="card">
              <p className="card-title">Home details</p>
              <div className="form-grid">
                <div className="field">
                  <label>Home price</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" inputMode="numeric" value={homePrice} min="0" step="1000" placeholder="e.g. 400000" onChange={handleHomePrice} />
                  </div>
                </div>
                <div className="field">
                  <label>Down payment</label>
                  <div style={{display:'flex', gap:'6px'}}>
                    <div className="input-wrap has-suffix" style={{flex:'1'}}>
                      <span className="input-suffix">%</span>
                      <input type="number" inputMode="decimal" value={downPct} min="0" max="100" step="1" placeholder="e.g. 20" onChange={handleDownPct} />
                    </div>
                    <div className="input-wrap has-prefix" style={{flex:'1'}}>
                      <span className="input-prefix">$</span>
                      <input type="number" inputMode="numeric" value={downDollar} min="0" step="1000" placeholder="e.g. 80000" onChange={handleDownDollar} />
                    </div>
                  </div>
                  <div className="term-buttons">
                    {[5,10,15,20,25].map(p => (
                      <button key={p} className={`term-btn${parseFloat(downPct)===p?' active':''}`} onClick={() => handleDownPctBtn(p)}>{p}%</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Interest rate</label>
                  <div className="input-wrap has-suffix">
                    <span className="input-suffix">%</span>
                    <input type="number" inputMode="decimal" value={interestRate} min="0" max="30" step="0.05" placeholder="e.g. 6.5" onChange={e => setInterestRate(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Loan term (years)</label>
                  <div className="input-wrap">
                    <input type="number" inputMode="numeric" value={loanTerm} min="1" max="50" step="1" onChange={e => setLoanTerm(parseFloat(e.target.value)||30)} />
                  </div>
                  <div className="term-buttons">
                    {[10,15,30].map(y => (
                      <button key={y} className={`term-btn${loanTerm===y?' active':''}`} onClick={() => setLoanTerm(y)}>{y} yr</button>
                    ))}
                  </div>
                </div>
              </div>
              <hr className="divider" />
              <p className="card-title">Additional costs</p>
              <div className="form-grid">
                <div className="field">
                  <label>Property tax / year</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" inputMode="numeric" value={propertyTax} min="0" placeholder="e.g. 4800" onChange={e => setPropertyTax(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Home insurance / year</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" inputMode="numeric" value={homeInsurance} min="0" placeholder="e.g. 1200" onChange={e => setHomeInsurance(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>PMI / month</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" inputMode="numeric" value={pmi} min="0" placeholder="0" onChange={e => setPmi(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>HOA / month</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" inputMode="numeric" value={hoa} min="0" placeholder="0" onChange={e => setHoa(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="extra-payment-card" id="payoff">
              <div className="extra-label-row">
                <p className="extra-title">Extra monthly payment</p>
                <span className="extra-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                  Pay off faster
                </span>
              </div>
              <div className="extra-input-row">
                <div className="field" style={{maxWidth:'220px'}}>
                  <label>Extra payment / month</label>
                  <div className="input-wrap has-prefix">
                    <span className="input-prefix">$</span>
                    <input type="number" inputMode="numeric" value={extraPayment} min="0" step="50" placeholder="0" onChange={e => setExtraPayment(e.target.value)} />
                  </div>
                </div>
              </div>
              <p className="extra-hint">Try $100, $200, or $500 — even small amounts add up significantly over 30 years.</p>
            </div>

            <div className={`savings-banner${calc.savings ? ' visible' : ''}`}>
              <div className="savings-banner-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                With your extra payment
              </div>
              {calc.savings && (
                <>
                  <div className="savings-grid">
                    <div className="savings-stat highlight"><div className="s-label">Interest saved</div><div className="s-value">{fmtK(calc.savings.saved)}</div><div className="s-sub">less than no extra</div></div>
                    <div className="savings-stat highlight"><div className="s-label">Paid off earlier</div><div className="s-value">{calc.savings.earlier}</div><div className="s-sub">sooner than scheduled</div></div>
                    <div className="savings-stat"><div className="s-label">New payoff date</div><div className="s-value">{calc.savings.newDate}</div><div className="s-sub">vs {calc.savings.origDate}</div></div>
                    <div className="savings-stat"><div className="s-label">Total interest (new)</div><div className="s-value">{fmtK(calc.savings.newInt)}</div><div className="s-sub">vs {fmtK(calc.savings.origInt)}</div></div>
                  </div>
                  <div className="savings-compare">
                    <div className="compare-row"><span className="compare-label">No extra</span><div className="compare-bar-wrap"><div className="compare-bar" style={{background:'#94A3B8',width:'100%'}}></div></div><span className="compare-value">{monthsToLabel(calc.savings.origMonths)}</span></div>
                    <div className="compare-row"><span className="compare-label">With extra</span><div className="compare-bar-wrap"><div className="compare-bar" style={{background:'#16A34A',width:(calc.savings.newMonths/calc.savings.origMonths*100).toFixed(1)+'%'}}></div></div><span className="compare-value">{monthsToLabel(calc.savings.newMonths)}</span></div>
                  </div>
                </>
              )}
            </div>

            <div className="results-grid">
              <div className="result-card featured">
                <div className="result-label">Est. monthly payment</div>
                <div className="result-value">{calc.total > 0 ? fmt(calc.total) : '—'}</div>
                <div className="result-sub">all costs included</div>
              </div>
              <div className="result-card"><div className="result-label">Loan amount</div><div className="result-value">{calc.loan > 0 ? fmt(calc.loan) : '—'}</div></div>
              <div className="result-card"><div className="result-label">Principal &amp; interest</div><div className="result-value">{calc.pi > 0 ? fmt(calc.pi) : '—'}</div><div className="result-sub">per month</div></div>
              <div className="result-card"><div className="result-label">Total interest paid</div><div className="result-value">{calc.interest > 0 ? fmt(calc.interest) : '—'}</div></div>
              <div className="result-card"><div className="result-label">Total loan cost</div><div className="result-value">{calc.tPaid > 0 ? fmt(calc.tPaid) : '—'}</div></div>
            </div>

            <div className="card">
              <p className="card-title">Monthly payment breakdown</p>
              <ul className="breakdown-list">
                <li className="breakdown-item"><span className="breakdown-name"><span className="dot" style={{background:'#2563EB'}}></span>Principal &amp; interest</span><span className="breakdown-amount">{calc.pi > 0 ? fmt(calc.pi) : '—'}</span></li>
                <li className="breakdown-item"><span className="breakdown-name"><span className="dot" style={{background:'#16A34A'}}></span>Property tax</span><span className="breakdown-amount">{calc.mTax > 0 ? fmt(calc.mTax) : '—'}</span></li>
                <li className="breakdown-item"><span className="breakdown-name"><span className="dot" style={{background:'#9333EA'}}></span>Home insurance</span><span className="breakdown-amount">{calc.mIns > 0 ? fmt(calc.mIns) : '—'}</span></li>
                <li className="breakdown-item"><span className="breakdown-name"><span className="dot" style={{background:'#D97706'}}></span>PMI</span><span className="breakdown-amount">{pmiV > 0 ? fmt(pmiV) : '—'}</span></li>
                <li className="breakdown-item"><span className="breakdown-name"><span className="dot" style={{background:'#E11D48'}}></span>HOA</span><span className="breakdown-amount">{hoaV > 0 ? fmt(hoaV) : '—'}</span></li>
              </ul>
              <div className="breakdown-bar-wrap">
                <div className="bar-seg" style={{background:'#2563EB',width:calc.pctPI}}></div>
                <div className="bar-seg" style={{background:'#16A34A',width:calc.pctTax}}></div>
                <div className="bar-seg" style={{background:'#9333EA',width:calc.pctIns}}></div>
                <div className="bar-seg" style={{background:'#D97706',width:calc.pctPMI}}></div>
                <div className="bar-seg" style={{background:'#E11D48',width:calc.pctHOA}}></div>
              </div>
            </div>

            <div className="disclaimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              This calculator provides estimates only. Actual payments may vary based on your lender, credit score, and local tax rates.
            </div>
          </div>
        )}

        <div className="section-divider"><span>Mortgage Payoff Calculator</span></div>
        <div className="payoff-hero">
          <h2>How much can you save by paying more each month?</h2>
          <p>On a typical $320,000 loan at 6.5% for 30 years, adding just $200/month saves over $60,000 in interest and cuts 5 years off your loan.</p>
        </div>

        <div id="guide">
          <h2 className="guide-header">How to use this calculator</h2>
          <p className="guide-sub">A quick explanation of each input field.</p>
          <div className="guide-grid">
            <div className="guide-item"><div className="guide-icon" style={{background:'#EFF6FF'}}><svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div><strong>Home price</strong><span>The total purchase price of the home you want to buy.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#F0FDF4'}}><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 12l-4-4-4 4M12 16V8"/></svg></div><div><strong>Down payment</strong><span>Enter either % or $ — the other updates automatically. 20% or more avoids PMI.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#FAF5FF'}}><svg viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div><div><strong>Interest rate</strong><span>The annual rate your lender charges. Check current rates from your bank or broker.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#FFF7ED'}}><svg viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><strong>Loan term</strong><span>How many years to repay. 15 years saves interest; 30 years lowers payments.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#FFFBEB'}}><svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div><strong>Property tax</strong><span>Annual taxes from your local government. Check your county assessor's website.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#F0FDFA'}}><svg viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div><strong>Home insurance</strong><span>Annual cost to insure your home. Required by most lenders.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#FFF1F2'}}><svg viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><div><strong>PMI</strong><span>Required when your down payment is under 20%. Usually $50–$200/month.</span></div></div>
            <div className="guide-item"><div className="guide-icon" style={{background:'#EFF6FF'}}><svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg></div><div><strong>HOA</strong><span>Monthly fee for communities with shared amenities. Not all homes have this.</span></div></div>
            <div className="guide-item" style={{borderColor:'#BBF7D0',background:'#F0FDF4'}}><div className="guide-icon" style={{background:'#DCFCE7'}}><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div><strong>Extra monthly payment</strong><span>Goes directly toward principal, cutting interest and shortening your loan.</span></div></div>
          </div>
        </div>
      </main>

      <footer>
        &copy; 2026 MortgageCalc &nbsp;·&nbsp; For informational purposes only &nbsp;·&nbsp; Not financial advice
      </footer>
    </>
  )
}
