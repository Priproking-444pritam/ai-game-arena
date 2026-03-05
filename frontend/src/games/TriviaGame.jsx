import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const TOPICS = [
  { id:'science',    label:'🔬 Science',      color:'#00f5ff' },
  { id:'history',    label:'📜 History',      color:'#ffd700' },
  { id:'tech',       label:'💻 Technology',   color:'#bf00ff' },
  { id:'geography',  label:'🌍 Geography',    color:'#00ff88' },
  { id:'movies',     label:'🎬 Movies',       color:'#ff6b00' },
  { id:'sports',     label:'⚽ Sports',       color:'#ff0066' },
  { id:'gaming',     label:'🎮 Gaming',       color:'#00f5ff' },
  { id:'random',     label:'🎲 Random Mix',   color:'#ffd700' },
]

const DIFF = {
  easy:   { label:'Easy',   color:'#00ff88', time:20, points:100 },
  medium: { label:'Medium', color:'#ffd700', time:15, points:200 },
  hard:   { label:'Hard',   color:'#ff4466', time:10, points:350 },
}

// Built-in question bank (fallback if API fails)
const QB = {
  science: [
    {q:"What is the powerhouse of the cell?",a:"Mitochondria",w:["Nucleus","Ribosome","Golgi body"]},
    {q:"How many bones are in the adult human body?",a:"206",w:["212","198","226"]},
    {q:"What planet is known as the Red Planet?",a:"Mars",w:["Jupiter","Venus","Saturn"]},
    {q:"What gas do plants absorb from the air?",a:"Carbon dioxide",w:["Oxygen","Nitrogen","Hydrogen"]},
    {q:"What is the chemical symbol for gold?",a:"Au",w:["Go","Gd","Ag"]},
    {q:"How many chromosomes do humans have?",a:"46",w:["44","48","42"]},
  ],
  tech: [
    {q:"Who co-founded Apple with Steve Jobs?",a:"Steve Wozniak",w:["Bill Gates","Mark Zuckerberg","Jeff Bezos"]},
    {q:"What does CPU stand for?",a:"Central Processing Unit",w:["Core Power Unit","Central Program Utility","Computer Processing Unit"]},
    {q:"Which language is known as the mother of all languages?",a:"C",w:["Assembly","FORTRAN","COBOL"]},
    {q:"What does HTML stand for?",a:"HyperText Markup Language",w:["High Transfer Markup Language","Hyper Tool Make Language","HyperText Machine Language"]},
    {q:"Who created Linux?",a:"Linus Torvalds",w:["Richard Stallman","Ken Thompson","Dennis Ritchie"]},
    {q:"What year was the first iPhone released?",a:"2007",w:["2005","2008","2006"]},
  ],
  history: [
    {q:"In what year did World War II end?",a:"1945",w:["1944","1946","1943"]},
    {q:"Who was the first President of the United States?",a:"George Washington",w:["John Adams","Thomas Jefferson","Abraham Lincoln"]},
    {q:"Which ancient wonder was located in Alexandria?",a:"Great Library",w:["Colossus of Rhodes","Hanging Gardens","Lighthouse of Alexandria"]},
    {q:"What year did the Berlin Wall fall?",a:"1989",w:["1991","1987","1990"]},
    {q:"Who painted the Mona Lisa?",a:"Leonardo da Vinci",w:["Michelangelo","Raphael","Botticelli"]},
    {q:"Which empire was ruled by Julius Caesar?",a:"Roman Empire",w:["Greek Empire","Ottoman Empire","Byzantine Empire"]},
  ],
  geography: [
    {q:"What is the capital of Australia?",a:"Canberra",w:["Sydney","Melbourne","Brisbane"]},
    {q:"Which is the longest river in the world?",a:"Nile",w:["Amazon","Yangtze","Mississippi"]},
    {q:"What country has the most natural lakes?",a:"Canada",w:["Russia","USA","Finland"]},
    {q:"Which mountain is the highest in the world?",a:"Mount Everest",w:["K2","Kangchenjunga","Lhotse"]},
    {q:"What is the smallest country in the world?",a:"Vatican City",w:["Monaco","San Marino","Liechtenstein"]},
    {q:"Which ocean is the largest?",a:"Pacific Ocean",w:["Atlantic Ocean","Indian Ocean","Arctic Ocean"]},
  ],
  movies: [
    {q:"Which movie features the quote 'I'll be back'?",a:"The Terminator",w:["Predator","RoboCop","Total Recall"]},
    {q:"What year was the first Star Wars movie released?",a:"1977",w:["1975","1980","1978"]},
    {q:"Who directed Jurassic Park?",a:"Steven Spielberg",w:["James Cameron","George Lucas","Christopher Nolan"]},
    {q:"Which film won the first Academy Award for Best Picture?",a:"Wings",w:["Sunrise","The Jazz Singer","7th Heaven"]},
    {q:"What animated film features the song 'Let It Go'?",a:"Frozen",w:["Tangled","Brave","Moana"]},
    {q:"Which actor played Tony Stark in Iron Man?",a:"Robert Downey Jr.",w:["Chris Evans","Chris Hemsworth","Mark Ruffalo"]},
  ],
  sports: [
    {q:"How many players are on a basketball team on the court?",a:"5",w:["6","4","7"]},
    {q:"Which country invented football (soccer)?",a:"England",w:["Brazil","France","Italy"]},
    {q:"How many Grand Slam tournaments are in tennis?",a:"4",w:["3","5","6"]},
    {q:"What sport uses a puck?",a:"Ice Hockey",w:["Lacrosse","Polo","Curling"]},
    {q:"How long is a marathon in km?",a:"42.195",w:["40","44","38.5"]},
    {q:"Which country has won the most FIFA World Cups?",a:"Brazil",w:["Germany","Italy","Argentina"]},
  ],
  gaming: [
    {q:"What is the best-selling video game of all time?",a:"Minecraft",w:["Tetris","GTA V","Wii Sports"]},
    {q:"Which company makes the PlayStation?",a:"Sony",w:["Microsoft","Nintendo","Sega"]},
    {q:"What year was Pac-Man released?",a:"1980",w:["1978","1982","1979"]},
    {q:"Which game features a character named Master Chief?",a:"Halo",w:["Call of Duty","Gears of War","Doom"]},
    {q:"What is the main currency in The Legend of Zelda?",a:"Rupees",w:["Coins","Gold","Gems"]},
    {q:"Which game studio made The Witcher series?",a:"CD Projekt Red",w:["Bethesda","FromSoftware","BioWare"]},
  ],
  random: [],
}
// Random mix = all questions shuffled
QB.random = Object.values(QB).flat().sort(()=>Math.random()-0.5)

function shuffle(arr) { return [...arr].sort(()=>Math.random()-0.5) }

function getQuestions(topic, count=8) {
  const pool = QB[topic] || QB.random
  return shuffle(pool).slice(0, count).map(q => {
    const opts = shuffle([q.a, ...q.w])
    return { question:q.q, correct:q.a, options:opts }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TriviaGame() {
  const { user, submitScore } = useAuth()
  const [phase,     setPhase]     = useState('menu')   // menu|playing|result
  const [topic,     setTopic]     = useState(TOPICS[0])
  const [diff,      setDiff]      = useState('medium')
  const [questions, setQuestions] = useState([])
  const [qIdx,      setQIdx]      = useState(0)
  const [selected,  setSelected]  = useState(null)
  const [revealed,  setRevealed]  = useState(false)
  const [score,     setScore]     = useState(0)
  const [streak,    setStreak]    = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [correct,   setCorrect]   = useState(0)
  const [timeLeft,  setTimeLeft]  = useState(0)
  const [answers,   setAnswers]   = useState([])  // track per-question result
  const timerRef = useRef(null)

  const d = DIFF[diff]

  const startGame = () => {
    const qs = getQuestions(topic.id, 8)
    setQuestions(qs); setQIdx(0); setSelected(null); setRevealed(false)
    setScore(0); setStreak(0); setMaxStreak(0); setCorrect(0); setAnswers([])
    setTimeLeft(d.time); setPhase('playing')
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || revealed) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, qIdx, revealed])

  const handleAnswer = (opt) => {
    if (revealed) return
    clearInterval(timerRef.current)
    setSelected(opt); setRevealed(true)
    const q = questions[qIdx]
    const isCorrect = opt === q.correct
    let pts = 0
    if (isCorrect) {
      const timeBonus = Math.floor((timeLeft / d.time) * d.points * 0.5)
      pts = d.points + timeBonus
      setScore(s => s + pts)
      setStreak(s => { const ns=s+1; setMaxStreak(m=>Math.max(m,ns)); return ns })
      setCorrect(c => c+1)
    } else {
      setStreak(0)
    }
    setAnswers(a => [...a, { question:q.question, correct:q.correct, selected:opt, isCorrect, pts }])
    setTimeout(() => nextQ(), 1400)
  }

  const nextQ = () => {
    setQIdx(i => {
      const next = i + 1
      if (next >= questions.length) {
        setPhase('result')
        return i
      }
      setSelected(null); setRevealed(false)
      setTimeLeft(d.time)
      return next
    })
  }

  useEffect(() => {
    if (phase !== 'result' || !answers.length) return
    const acc = Math.round((correct / questions.length) * 100)
    submitScore('trivia', score, diff, acc>=60?'win':'loss', {accuracy:acc,streak:maxStreak,topic:topic.id}).catch(()=>{})
    if (acc >= 80) toast.success(`🎯 ${acc}% — Great score!`)
    else if (acc >= 60) toast('👍 ' + acc + '% — Not bad!')
    else toast.error(`💀 Only ${acc}% correct`)
  }, [phase])

  if (!user) return <div style={{textAlign:'center',padding:'60px'}}>🔒 Login to play</div>

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (phase === 'menu') return (
    <div style={{maxWidth:'580px',margin:'0 auto',padding:'24px 20px'}}>
      <div style={{textAlign:'center',marginBottom:'24px'}}>
        <div style={{fontSize:'48px',marginBottom:'8px'}}>🧠</div>
        <h2 style={{fontSize:'24px',fontWeight:900,fontFamily:'var(--font-display)',marginBottom:'4px'}}>AI Trivia Battle</h2>
        <p style={{color:'var(--text-secondary)',fontSize:'13px'}}>8 questions · Race the clock · Beat your streak</p>
      </div>

      {/* Topic grid */}
      <div style={{marginBottom:'6px',fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em',textAlign:'center'}}>Choose Topic</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'20px'}}>
        {TOPICS.map(t=>(
          <button key={t.id} onClick={()=>setTopic(t)} style={{
            padding:'10px 6px',borderRadius:'10px',cursor:'pointer',textAlign:'center',
            background:topic.id===t.id?`${t.color}18`:'var(--bg-card)',
            border:`2px solid ${topic.id===t.id?t.color:t.color+'25'}`,
            transition:'all 0.18s',
          }}>
            <div style={{fontSize:'18px',marginBottom:'3px'}}>{t.label.split(' ')[0]}</div>
            <div style={{fontSize:'10px',fontWeight:600,color:topic.id===t.id?t.color:'var(--text-muted)'}}>{t.label.split(' ').slice(1).join(' ')}</div>
          </button>
        ))}
      </div>

      {/* Difficulty */}
      <div style={{marginBottom:'6px',fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em',textAlign:'center'}}>Difficulty</div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'20px'}}>
        {Object.entries(DIFF).map(([k,v])=>(
          <button key={k} onClick={()=>setDiff(k)} style={{
            padding:'8px 20px',borderRadius:'99px',cursor:'pointer',fontWeight:700,fontSize:'13px',
            background:diff===k?v.color+'22':'var(--bg-elevated)',
            color:diff===k?v.color:'var(--text-muted)',
            border:`1px solid ${diff===k?v.color:v.color+'20'}`,transition:'all 0.2s',
          }}>{v.label}</button>
        ))}
      </div>
      <div style={{textAlign:'center',fontSize:'12px',color:'var(--text-muted)',marginBottom:'20px'}}>
        {d.time}s per question · {d.points} base points + time bonus
      </div>
      <div style={{textAlign:'center'}}>
        <button className="btn btn-primary" onClick={startGame} style={{minWidth:'200px',fontSize:'16px',padding:'12px 28px'}}>
          Start Quiz →
        </button>
      </div>
    </div>
  )

  // ── Playing ───────────────────────────────────────────────────────────────
  if (phase === 'playing' && questions.length) {
    const q = questions[qIdx]
    const progress = ((qIdx) / questions.length) * 100
    const timerFrac = timeLeft / d.time
    const timerColor = timerFrac > 0.5 ? '#00ff88' : timerFrac > 0.25 ? '#ffd700' : '#ff4466'

    return (
      <div style={{maxWidth:'560px',margin:'0 auto',padding:'20px'}}>
        {/* Top bar */}
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
          <div style={{flex:1,height:'6px',background:'var(--bg-elevated)',borderRadius:'99px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:`linear-gradient(to right,${topic.color},${topic.color}aa)`,borderRadius:'99px',transition:'width 0.4s'}}/>
          </div>
          <span style={{fontSize:'12px',color:'var(--text-muted)',minWidth:'40px',textAlign:'right'}}>{qIdx+1}/{questions.length}</span>
        </div>

        {/* Score + streak */}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',fontWeight:700,color:topic.color}}>⚡ {score}</span>
          {streak > 1 && <span style={{fontSize:'13px',fontWeight:700,color:'#ffd700'}}>🔥 {streak}× streak</span>}
          <span style={{fontSize:'13px',fontWeight:700,color:timerColor}}>⏱ {timeLeft}s</span>
        </div>

        {/* Timer bar */}
        <div style={{height:'4px',background:'var(--bg-elevated)',borderRadius:'99px',overflow:'hidden',marginBottom:'20px'}}>
          <div style={{height:'100%',width:`${timerFrac*100}%`,background:timerColor,borderRadius:'99px',transition:'width 1s linear,background 0.3s'}}/>
        </div>

        {/* Question */}
        <div style={{background:'var(--bg-card)',border:`1px solid ${topic.color}30`,borderRadius:'14px',
          padding:'20px',marginBottom:'16px',textAlign:'center',minHeight:'90px',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <p style={{fontSize:'16px',fontWeight:600,lineHeight:1.5,margin:0}}>{q.question}</p>
        </div>

        {/* Options */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          {q.options.map((opt,i) => {
            let bg='var(--bg-card)', border='var(--border-dim)', color='var(--text-primary)'
            if (revealed) {
              if (opt === q.correct) { bg='rgba(0,255,136,0.15)'; border='#00ff88'; color='#00ff88' }
              else if (opt === selected) { bg='rgba(239,68,68,0.15)'; border='#ef4444'; color='#ef4444' }
            } else if (selected === opt) { bg=`${topic.color}15`; border=topic.color }
            return (
              <button key={i} onClick={()=>handleAnswer(opt)} disabled={revealed} style={{
                padding:'12px 14px',borderRadius:'10px',cursor:revealed?'default':'pointer',
                background:bg, border:`2px solid ${border}`, color,
                fontWeight:600, fontSize:'13px', textAlign:'left',
                transition:'all 0.2s', lineHeight:1.4,
              }}
              onMouseEnter={e=>{ if(!revealed){ e.currentTarget.style.borderColor=topic.color; e.currentTarget.style.background=`${topic.color}10` }}}
              onMouseLeave={e=>{ if(!revealed){ e.currentTarget.style.borderColor='var(--border-dim)'; e.currentTarget.style.background='var(--bg-card)' }}}>
                <span style={{opacity:0.5,marginRight:'8px',fontSize:'11px'}}>{['A','B','C','D'][i]}</span>
                {opt}
                {revealed && opt===q.correct && ' ✓'}
                {revealed && opt===selected && opt!==q.correct && ' ✗'}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const acc = Math.round((correct / questions.length)*100)
    const grade = acc>=95?'S':acc>=80?'A':acc>=65?'B':acc>=50?'C':'D'
    const gradeColor = acc>=80?'#ffd700':acc>=60?'#00ff88':'#ff4466'
    return (
      <div style={{maxWidth:'520px',margin:'0 auto',padding:'28px 20px',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'6px'}}>{grade==='S'?'🌟':grade==='A'?'🏆':grade==='B'?'🎯':grade==='C'?'👍':'💀'}</div>
        <div style={{fontSize:'56px',fontWeight:900,color:gradeColor,fontFamily:'var(--font-display)',lineHeight:1,marginBottom:'4px'}}>{grade}</div>
        <div style={{color:'var(--text-muted)',fontSize:'13px',marginBottom:'20px'}}>{topic.label} · {d.label}</div>

        <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginBottom:'20px'}}>
          {[{l:'Score',v:score,c:topic.color},{l:'Accuracy',v:acc+'%',c:gradeColor},{l:'Max Streak',v:maxStreak+'×',c:'#ffd700'},{l:'Correct',v:`${correct}/${questions.length}`,c:'#00ff88'}].map(({l,v,c})=>(
            <div key={l} style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'12px',padding:'10px 14px',minWidth:'80px'}}>
              <div style={{fontSize:'20px',fontWeight:900,color:c}}>{v}</div>
              <div style={{fontSize:'10px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:'2px'}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Answer review */}
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'12px',padding:'14px',marginBottom:'18px',textAlign:'left'}}>
          <div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>Review</div>
          {answers.map((a,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',marginBottom:'8px',fontSize:'12px'}}>
              <span style={{fontSize:'14px',minWidth:'20px'}}>{a.isCorrect?'✅':'❌'}</span>
              <div>
                <div style={{color:'var(--text-secondary)',marginBottom:'2px'}}>{a.question}</div>
                {!a.isCorrect && <div style={{color:'#00ff88',fontSize:'11px'}}>✓ {a.correct}</div>}
                {!a.isCorrect && a.selected && <div style={{color:'#ef4444',fontSize:'11px'}}>✗ {a.selected}</div>}
                {!a.isCorrect && !a.selected && <div style={{color:'#ffd700',fontSize:'11px'}}>⏱ Time ran out</div>}
              </div>
              {a.isCorrect && <span style={{marginLeft:'auto',color:'#ffd700',fontWeight:700,fontSize:'11px'}}>+{a.pts}</span>}
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <button className="btn btn-primary" onClick={startGame}>Play Again</button>
          <button className="btn btn-ghost" onClick={()=>setPhase('menu')}>Change Topic</button>
        </div>
        <div style={{marginTop:'10px',fontSize:'12px',color:'var(--text-muted)'}}>+{Math.floor(score/5)} XP awarded</div>
      </div>
    )
  }

  return null
}
