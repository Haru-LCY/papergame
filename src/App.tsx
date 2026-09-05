import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { generateStory, importArxiv, type GeneratedStory, type ImportedPaper } from './api'
import { PAPERS, type PaperBranch, type PaperCase, type PaperClaim, type PaperEvidence, type PaperId } from './papers'

type Screen = 'title' | 'briefing' | 'trial' | 'verdict'
type StageId = 'paper' | 'note' | 'hypothesis' | 'synthesis'

type Evidence = {
  id: string
  concept: 'paper'
  number: string
  label: string
  subtitle: string
  glyph: string
  title: string
  description: string
  command: string
  value?: string
  source?: string
  section?: string
  quote?: string
}

type LedgerEntry = {
  claimId: string
  evidenceIds: string[]
  interpretation: string
  message: string
}

const API_KEY_STORAGE = 'paper2.deepseekApiKey'

function loadApiKey() {
  try { return window.localStorage.getItem(API_KEY_STORAGE) ?? '' } catch { return '' }
}

const COURT_STEPS = [
  { id: 'paper', number: '01', label: '阅读卷宗', subtitle: '确认论文主张', glyph: 'P' },
  { id: 'testimony', number: '02', label: '交叉询问', subtitle: '用证物击破误解', glyph: '!' },
  { id: 'note', number: '03', label: '保存笔记', subtitle: '写下证据解释', glyph: 'N' },
  { id: 'hypothesis', number: '04', label: '调查假设', subtitle: '比较竞争解释', glyph: 'H' },
  { id: 'synthesis', number: '05', label: '合议结论', subtitle: '形成论文理解', glyph: 'S' },
]

const CHAPTERS = ['建立卷宗', '交叉询问', '保存学习笔记', '调查假设', '合议结论']

function paperEvidence(paper: PaperCase): Evidence {
  return { id: 'paper-summary', concept: 'paper', number: '00', label: paper.label, subtitle: '论文卷宗', glyph: 'P', title: paper.title, description: paper.summary, command: paper.keyFact, value: paper.keyFact }
}

function paperEvidenceItems(paper: PaperCase): Evidence[] {
  const sourceItems: PaperEvidence[] = paper.evidence ?? [{ label: 'PAPER', subtitle: 'KEY CLAIM', title: '论文核心主张', description: paper.summary, value: paper.keyFact, source: paper.sourceLabel, glyph: '↗' }]
  return sourceItems.map((item, index) => ({ id: `paper-evidence-${index}`, concept: 'paper' as const, number: `P${index + 1}`, label: item.label, subtitle: item.subtitle, glyph: item.glyph ?? ['↗', 'Σ', '#'][index % 3], title: item.title, description: item.description, command: item.source, value: item.value, source: item.source, section: item.section, quote: item.quote }))
}

function paperClaims(paper: PaperCase): PaperClaim[] {
  return paper.claims?.length ? paper.claims : [{ id: 'core-claim', label: '核心主张', text: paper.summary, source: paper.sourceLabel, evidenceIds: ['P1', 'P2', 'P3'] }]
}

function paperBranches(paper: PaperCase): PaperBranch[] {
  return paper.branches?.length ? paper.branches : [
    { id: 'unsupported', label: '没有实验支持的解释', text: '论文只提出方法，没有可核对的实验结果。', summary: '这条解释无法由论文证物支持。', claimId: paperClaims(paper)[0].id, evidenceIds: [], correct: false },
    { id: 'evidence-backed', label: '由证据支持的解释', text: '论文提出方法，并用实验结果检验了它的主张。', summary: '这条解释把论文主张、方法和实验连成一条可验证的链。', claimId: paperClaims(paper)[0].id, evidenceIds: ['P1', 'P2', 'P3'], correct: true },
  ]
}

function makeGeneratedPaper(imported: ImportedPaper, story: GeneratedStory): PaperCase {
  return {
    id: 'custom', label: 'ARXIV · AI', title: imported.title, subtitle: imported.categories.slice(0, 2).join(' / ') || 'AI 生成案件',
    year: imported.year, authors: imported.authors.slice(0, 4).join(', '), caseTitle: story.caseTitle, tagline: story.tagline,
    summary: story.summary, keyFact: story.keyFact, question: story.question, options: story.options,
    correctOption: story.correctOption, correctFeedback: story.correctFeedback, sourceUrl: imported.sourceUrl,
    sourceLabel: `arXiv · ${imported.id}`, sourceMode: 'arxiv-deepseek', keyIdeas: story.keyIdeas, scenes: story.scenes, evidence: story.evidence, claims: story.claims, branches: story.branches,
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [apiKey, setApiKey] = useState(loadApiKey)
  const [paperId, setPaperId] = useState<PaperId>('attention')
  const [customPaper, setCustomPaper] = useState<PaperCase | null>(null)
  const [turn, setTurn] = useState(0)
  const [score, setScore] = useState(0)
  const [activeEvidenceId, setActiveEvidenceId] = useState('paper-summary')
  const [feedback, setFeedback] = useState('')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [objection, setObjection] = useState('')
  const [paperEvidencePresented, setPaperEvidencePresented] = useState(false)
  const [objectionRaised, setObjectionRaised] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [mainLedger, setMainLedger] = useState<LedgerEntry | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<PaperBranch | null>(null)
  const [merged, setMerged] = useState(false)
  const activePaper = customPaper ?? (paperId === 'custom' ? PAPERS.attention : PAPERS[paperId])
  const allEvidence = useMemo(() => [paperEvidence(activePaper), ...paperEvidenceItems(activePaper)], [activePaper])
  const activeEvidence = useMemo(() => allEvidence.find((item) => item.id === activeEvidenceId) ?? allEvidence[0], [activeEvidenceId, allEvidence])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, turn])

  const updateApiKey = (value: string) => {
    setApiKey(value)
    try {
      if (value.trim()) window.localStorage.setItem(API_KEY_STORAGE, value.trim())
      else window.localStorage.removeItem(API_KEY_STORAGE)
    } catch { /* localStorage can be disabled; the in-memory key still works for this session */ }
  }

  const reset = () => { setScreen('title'); setPaperId('attention'); setCustomPaper(null); setTurn(0); setScore(0); setActiveEvidenceId('paper-summary'); setFeedback(''); setObjection(''); setWrongAttempts(0); setPaperEvidencePresented(false); setObjectionRaised(false); setTransitioning(false); setMainLedger(null); setSelectedBranch(null); setMerged(false) }
  const selectPaper = (id: PaperId) => { if (id !== 'custom') setCustomPaper(null); setPaperId(id); setActiveEvidenceId('paper-summary'); setFeedback(''); setPaperEvidencePresented(false); setObjectionRaised(false); setMainLedger(null); setSelectedBranch(null); setMerged(false) }
  const focusEvidence = (stage: StageId) => { if (stage === 'paper') setActiveEvidenceId((current) => allEvidence.some((item) => item.id === current) ? current : allEvidence[0].id) }
  const raiseObjection = (message: string, stage: StageId = 'paper') => { focusEvidence(stage); setObjection(message); window.setTimeout(() => setObjection(''), 980) }
  const raisePaperObjection = (message: string) => { setObjectionRaised(true); raiseObjection(message); const result = allEvidence.find((item) => item.id.startsWith('paper-evidence-')); if (result) setActiveEvidenceId(result.id) }
  const advance = (stage: StageId, message: string) => {
    if (transitioning) return
    setTransitioning(true)
    setScore((value) => value + 1)
    focusEvidence(stage)
    setFeedback(message)
    window.setTimeout(() => { setFeedback(''); setTurn((value) => value + 1); setTransitioning(false) }, 420)
  }
  const choosePaper = (answer: string) => {
    if (transitioning) return
    if (answer !== activePaper.correctOption) {
      setWrongAttempts((value) => value + 1)
      raisePaperObjection('证人把论文的结论说反了。请指向一条具体实验结果。')
      setFeedback('异议！先读右侧的论文摘要，再检查这句证言。')
      return
    }
    if (!paperEvidencePresented) {
      setWrongAttempts((value) => value + 1)
      raisePaperObjection('概念不是证据。请先提交一张包含实验数据的论文证物。')
      setFeedback('请先点击右侧 P1 / P2 / P3 中的一张实验数据卡，再完成选择。')
      return
    }
    advance('paper', activePaper.correctFeedback)
  }
  const saveLearningNote = (entry: LedgerEntry) => {
    if (transitioning) return
    const claim = paperClaims(activePaper).find((item) => item.id === entry.claimId)
    const supportingEvidence = entry.evidenceIds.filter((id) => claim?.evidenceIds.includes(id))
    if (!claim || supportingEvidence.length === 0 || !entry.interpretation.trim() || !entry.message.trim()) {
      setWrongAttempts((value) => value + 1)
      raiseObjection('这份学习笔记缺少可以支持主张的论文证物。请补齐证据与解释。', 'note')
      setFeedback('学习笔记需要：选择主张、至少一张对应证物、写下你的解释和标题。')
      return
    }
    setMainLedger({ ...entry, evidenceIds: supportingEvidence, interpretation: entry.interpretation.trim(), message: entry.message.trim() })
    advance('note', `学习笔记已保存：${claim.label} 由 ${supportingEvidence.join('、')} 支持。现在开始调查竞争性解释。`)
  }
  const chooseHypothesis = (branchId: string) => {
    if (transitioning) return
    const branch = paperBranches(activePaper).find((item) => item.id === branchId)
    if (!branch || !branch.correct) {
      setWrongAttempts((value) => value + 1)
      raiseObjection('这条解释没有论文证物支持。请回到摘要、方法或实验结果重新核对。', 'hypothesis')
      setFeedback('调查假设必须提出一个能被论文证物验证的解释。')
      return
    }
    setSelectedBranch(branch)
    advance('hypothesis', `假设成立：${branch.label}。它把 ${branch.evidenceIds.join('、')} 带进了进一步核对。`)
  }
  const synthesizeConclusion = (answer: 'accept' | 'keep') => {
    if (transitioning) return
    if (answer !== 'accept' || !selectedBranch || !selectedBranch.correct) {
      setWrongAttempts((value) => value + 1)
      raiseObjection('最终结论还没有吸收经过证物审查的解释。请比较两种理解后再决定。', 'synthesis')
      setFeedback('只有带有论文证物来源的解释，才应该进入最终学习结论。')
      return
    }
    setMerged(true)
    advance('synthesis', '合议完成：论文证据、主张和解释已经形成一条完整的学习结论。')
  }
  const present = (item: Evidence) => {
    if (transitioning) return
    if (turn === 1 && item.concept === 'paper' && item.id.startsWith('paper-evidence-')) {
      if (!objectionRaised) {
        setActiveEvidenceId(item.id)
        setFeedback('先按下 OBJECTION! 指出矛盾；现在可以阅读证物，但提交要在异议之后。')
        return
      }
      setPaperEvidencePresented(true)
      setActiveEvidenceId(item.id)
      setFeedback(`已提交 ${item.label}：${item.value ?? '论文证据'}。现在用它反驳证人的证言。`)
      return
    }
    if (turn !== 2) { setActiveEvidenceId(item.id); return }
    setWrongAttempts((value) => value + 1)
    setActiveEvidenceId(item.id)
    raiseObjection('这件论文证物是真的，但现在需要把它和主张、解释一起写进学习笔记。', 'note')
    setActiveEvidenceId(item.id)
    setFeedback('请在下方写下这条论文主张、对应证物和你的解释。')
  }

  if (screen === 'title') return <Title apiKey={apiKey} onApiKeyChange={updateApiKey} onStart={() => setScreen('briefing')} />
  if (screen === 'briefing') return <Briefing paper={activePaper} paperId={paperId} customPaper={customPaper} apiKey={apiKey} onSelectPaper={selectPaper} onImportPaper={(paper) => { setCustomPaper(paper); setPaperId('custom'); setActiveEvidenceId('paper-summary'); setFeedback(''); setPaperEvidencePresented(false); setObjectionRaised(false); setMainLedger(null); setSelectedBranch(null); setMerged(false) }} onBack={reset} onEnter={() => { setScreen('trial'); setTurn(0) }} />
  if (screen === 'verdict') return <Verdict score={score} wrongAttempts={wrongAttempts} paper={activePaper} mainLedger={mainLedger} selectedBranch={selectedBranch} merged={merged} onRestart={reset} />

  const chapter = CHAPTERS[Math.min(turn, CHAPTERS.length - 1)]
  return (
    <div className="game game--trial">
      <Masthead onHome={reset} status="IN SESSION" live />
      {objection ? <div className="objection-flash" role="alert" aria-live="assertive"><div className="objection-speed-lines" /><div className="objection-bubble"><strong>OBJECTION!</strong><span>異議あり！</span></div><div className="objection-note">{objection}</div><div className="objection-portrait"><img src="/assets/defense.png" alt="" /></div></div> : null}
      <main className="court-layout">
        <div className="court-topline">
          <div><p className="overline">CASE 001 / {activePaper.label}</p><h1>{String(turn + 1).padStart(2, '0')} <span>{chapter}</span></h1></div>
          <div className="progress"><span>PROGRESS</span><i><b style={{ width: `${((turn + 1) / 6) * 100}%` }} /></i><strong>{String(turn + 1).padStart(2, '0')} / 06</strong></div>
        </div>
        <div className="court-grid">
          <section className="courtroom">
            <div className="scene-stage"><div className="stage-grid" /><div className="scene-sign">SUPREME<br /><b>PAPER COURT</b></div><Avatar kind="judge" label="JUDGE" text="J" image="/assets/judge.png" /><Avatar kind="defense" label="DEFENSE" text="YOU" image="/assets/defense.png" /><Avatar kind="prosecutor" label="PROSECUTOR" text="!" image="/assets/prosecutor.png" /><div className="bench" /></div>
            <div className="dialogue-box">
              <Turn turn={turn} paper={activePaper} mainLedger={mainLedger} selectedBranch={selectedBranch} onAdvance={advance} onChoosePaper={choosePaper} onSaveNote={saveLearningNote} onChooseHypothesis={chooseHypothesis} onSynthesize={synthesizeConclusion} onObjection={() => raisePaperObjection('证言与论文结果冲突。选择一件具体证物来反驳。')} onFinish={() => setScreen('verdict')} />
              {feedback ? <p className="feedback" role="status">{feedback}</p> : null}
            </div>
          </section>
          <aside className="board">
            <div className="board-head"><div><p className="overline">PAPER EVIDENCE</p><h2>论文证物</h2></div><span>{allEvidence.length} ITEMS</span></div>
            <div className="evidence-grid">{allEvidence.map((item) => <button key={item.id} aria-pressed={activeEvidenceId === item.id} className={activeEvidenceId === item.id ? 'evidence-card evidence-card--active' : 'evidence-card'} onClick={() => present(item)}><span className="evidence-top"><small>{item.number}</small><b>{item.label}</b></span><span className="evidence-glyph">{item.glyph}</span><span className="evidence-name">{item.subtitle}</span>{item.value ? <span className="evidence-value">{item.value}</span> : null}</button>)}</div>
            <EvidenceSnapshot paper={activePaper} turn={turn} activeEvidence={activeEvidence} mainLedger={mainLedger} selectedBranch={selectedBranch} merged={merged} />
            <div className="lesson-card"><div className="lesson-card-head"><span>PAPER EVIDENCE</span><span>{activeEvidence.label}</span></div><h3>{activeEvidence.title}</h3>{activeEvidence.value ? <strong className="lesson-metric">{activeEvidence.value}</strong> : null}<p>{activeEvidence.description}</p>{activeEvidence.section ? <small className="evidence-source">来源 · {activeEvidence.section}</small> : null}{activeEvidence.quote ? <blockquote>“{activeEvidence.quote}”</blockquote> : null}<code>{activeEvidence.command}</code></div>
            <div className="board-foot"><span>WRONG ATTEMPTS</span><strong>{wrongAttempts}</strong><i /><span>SCORE</span><strong>{score}/5</strong></div>
          </aside>
        </div>
      </main>
      <div className="ticker"><span>CLICK A CARD TO INSPECT THE PAPER</span><span>EVERY ANSWER LEAVES A LEARNING TRAIL</span></div>
    </div>
  )
}

function Masthead({ onHome, status, live = false }: { onHome: () => void; status: string; live?: boolean }) {
  return <header className="masthead"><button className="wordmark" onClick={onHome}><span className="brand-mark">P2</span> PAPER2 / TRAINING COURT</button><span className="masthead-status">{live ? <span className="status-dot status-dot--live" /> : null}{status}</span></header>
}

function Avatar({ kind, label, text, image }: { kind: string; label: string; text: string; image: string }) {
  return <div className={`avatar avatar--${kind}`}><span aria-label={text}><img src={image} alt="" /></span><small>{label}</small></div>
}

function Title({ apiKey, onApiKeyChange, onStart }: { apiKey: string; onApiKeyChange: (value: string) => void; onStart: () => void }) {
  const keyReady = /^sk-[A-Za-z0-9_-]{16,}$/.test(apiKey.trim())
  return <div className="game game--title"><Masthead onHome={() => undefined} status="CASE 001 / PLAYABLE" /><main className="title-layout"><section className="title-copy"><p className="overline">AN INTERACTIVE CASE FILE · 01</p><h1>Paper2<br /><em>逆转裁判</em></h1><p className="title-lede">把一篇真实论文变成可追问的证据链。<br />在一场 5 分钟的法庭推理里，学会读懂论文。</p><div className="title-meta"><span><b>案件</b> 真实论文</span><span><b>形式</b> 互动教程</span><span><b>难度</b> 新手友好</span></div><div className="key-gate"><div className="key-gate-head"><span>DEEPSEEK API KEY · OPTIONAL</span><b className={keyReady ? 'key-state key-state--ready' : 'key-state'}>{keyReady ? 'READY' : 'OPTIONAL'}</b></div><label className="key-label" htmlFor="deepseek-key">导入自定义 arXiv 案件时需要 key；内置案件可直接试玩</label><div className="key-input-row"><input id="deepseek-key" className="key-input" type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="sk-..." autoComplete="off" spellCheck={false} /><button className="key-clear" type="button" onClick={() => onApiKeyChange('')} disabled={!apiKey}>清除</button></div><p className="key-help">只保存在此浏览器的本地存储中；仅用于向本地服务端请求 DeepSeek，不会显示在案件页面。</p></div><button className="button button--primary button--large" onClick={onStart}>选择论文案件 <span>↗</span></button><p className="title-note">内置案件无需 key · 不上传本地文件 · 现在就能进入法庭</p></section><TitleArt /></main><div className="title-footer"><span>PLAYABLE EXPLAINER</span><span>SCROLL / CLICK / LEARN</span><span>证据驱动的论文课堂</span></div></div>
}

function TitleArt() {
  return <section className="title-art" aria-label="案件卷宗预览"><div className="paper-sheet paper-sheet--back" /><div className="paper-sheet paper-sheet--front"><div className="sheet-stamp">EVIDENCE</div><p className="sheet-kicker">CASE FILE / 001</p><p className="sheet-title">消失的<br /><strong>上下文</strong></p><div className="sheet-rule" /><div className="sheet-lines"><i /><i /><i /><i /></div><p className="sheet-footer">PAPER2 · 2026</p></div><div className="orbit orbit--one" /><div className="orbit orbit--two" /><span className="art-label art-label--top">THE PAPER IS<br /><b>THE EVIDENCE</b></span><span className="art-label art-label--bottom">CLAIM / EVIDENCE / REASONING<br /><b>HYPOTHESIS / SYNTHESIS</b></span></section>
}

function Briefing({ paper, paperId, customPaper, apiKey, onSelectPaper, onImportPaper, onBack, onEnter }: { paper: PaperCase; paperId: PaperId; customPaper: PaperCase | null; apiKey: string; onSelectPaper: (id: PaperId) => void; onImportPaper: (paper: PaperCase) => void; onBack: () => void; onEnter: () => void }) {
  const [url, setUrl] = useState('')
  const [importState, setImportState] = useState<'idle' | 'scanning' | 'generating'>('idle')
  const [importError, setImportError] = useState('')
  const submitImport = async () => {
    if (!url.trim() || importState !== 'idle') return
    if (!/^sk-[A-Za-z0-9_-]{16,}$/.test(apiKey.trim())) {
      setImportError('导入自定义 arXiv 案件需要 DeepSeek API key；你仍可以直接游玩内置案件。')
      return
    }
    setImportError('')
    try {
      setImportState('scanning')
      const { paper: imported } = await importArxiv(url.trim())
      setImportState('generating')
      const { story } = await generateStory(imported, apiKey)
      onImportPaper(makeGeneratedPaper(imported, story))
      setImportState('idle')
      setUrl('')
    } catch (error) {
      setImportState('idle')
      setImportError(error instanceof Error ? error.message : '论文导入失败，请稍后重试。')
    }
  }
  const choices = Object.values(PAPERS)
  return <div className="game game--briefing"><Masthead onHome={onBack} status="BRIEFING / CASE 001" /><main className="briefing-layout"><section className="briefing-intro"><p className="overline">CASE BRIEFING · SELECT A REAL PAPER</p><h1>{paper.caseTitle}<br /><em>案件</em></h1><p className="briefing-lede">{paper.tagline} 你将作为辩护人，把论文主张、方法和实验结果带进法庭。</p><div className="paper-picker" aria-label="选择论文案件">{choices.map((item) => <button key={item.id} aria-pressed={item.id === paperId} className={item.id === paperId ? 'paper-picker-card paper-picker-card--active' : 'paper-picker-card'} onClick={() => onSelectPaper(item.id)}><span className="paper-picker-code">{item.label}</span><strong>{item.title}</strong><small>{item.subtitle} · {item.year}</small></button>)}{customPaper ? <button aria-pressed={paperId === 'custom'} className={paperId === 'custom' ? 'paper-picker-card paper-picker-card--active paper-picker-card--generated' : 'paper-picker-card paper-picker-card--generated'} onClick={() => onSelectPaper('custom')}><span className="paper-picker-code">ARXIV · AI</span><strong>{customPaper.title}</strong><small>刚刚生成 · DeepSeek</small></button> : null}</div><div className="import-card"><div className="import-card-head"><span>NEW CASE / ARXIV</span><b>SERVER-SIDE SCAN</b></div><p>粘贴 arXiv 链接。服务端会读取公开摘要与 TeX 源码，再生成一套可追问的案件。</p><div className="import-form"><input className="import-input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submitImport() }} placeholder="https://arxiv.org/abs/1706.03762" aria-label="arXiv 论文链接" /><button className="button button--primary import-button" onClick={() => void submitImport()} disabled={importState !== 'idle'}>{importState === 'scanning' ? '扫描 TeX…' : importState === 'generating' ? '生成剧情…' : '导入论文'} <span>↗</span></button></div>{importState !== 'idle' ? <p className="import-status" role="status">{importState === 'scanning' ? '解析 arXiv 元数据并扫描 TeX 源码…' : 'DeepSeek 正在把方法、实验和结论编成庭审证词…'}</p> : null}{importError ? <p className="import-error" role="alert">{importError}</p> : null}</div><a className="paper-source-link" href={paper.sourceUrl} target="_blank" rel="noreferrer">阅读论文原文 · {paper.sourceLabel} ↗</a><button className="button button--primary" onClick={onEnter}>进入法庭 <span>→</span></button></section><section className="dossier"><div className="dossier-head"><span>论文卷宗 {paper.sourceMode === 'arxiv-deepseek' ? <em className="paper-badge">AI GENERATED</em> : null}</span><span>{paper.year} / {paper.authors}</span></div><div className="paper-summary"><p className="paper-summary-title">{paper.title}</p><p>{paper.summary}</p><strong>{paper.keyFact}</strong>{paper.keyIdeas?.length ? <div className="key-ideas">{paper.keyIdeas.map((idea) => <span key={idea}>✦ {idea}</span>)}</div> : null}</div><div className="dossier-head dossier-head--evidence"><span>庭审结构</span><span>5 STEPS</span></div><div className="dossier-list">{COURT_STEPS.map((item) => <div className="dossier-item" key={item.id}><span className="dossier-number">{item.number}</span><span className="dossier-icon">{item.glyph}</span><span className="dossier-text"><b>{item.label}</b><small>{item.subtitle}</small></span><span className="dossier-arrow">↗</span></div>)}</div><div className="dossier-note"><span>✦</span><p>右侧证物栏只放论文内的摘要、方法和实验结果；每一关都要求用论文事实来支持判断。</p></div></section></main><div className="ticker"><span>DEFENSE ATTORNEY / YOU</span><span>THE COURT IS NOW IN SESSION</span></div></div>
}

function Turn({ turn, paper, mainLedger, selectedBranch, onAdvance, onChoosePaper, onSaveNote, onChooseHypothesis, onSynthesize, onObjection, onFinish }: { turn: number; paper: PaperCase; mainLedger: LedgerEntry | null; selectedBranch: PaperBranch | null; onAdvance: (stage: StageId, message: string) => void; onChoosePaper: (answer: string) => void; onSaveNote: (entry: LedgerEntry) => void; onChooseHypothesis: (branchId: string) => void; onSynthesize: (answer: 'accept' | 'keep') => void; onObjection: () => void; onFinish: () => void }) {
  const scenes = paper.scenes ?? {}
  if (turn === 0) return <><SceneText speaker={`书记官 · ${paper.label}`}>{scenes.opening || <>“本庭受理论文案件 <strong>{paper.title}</strong>。它的关键主张是：{paper.tagline} 辩护人，请先把论文主张登记进卷宗。”</>}</SceneText><div className="action-row"><button className="button button--primary" onClick={() => onAdvance('paper', '论文卷宗已打开：先从主张、方法和证据开始。')}>打开论文卷宗 <span>→</span></button><span className="hint">提示：先确认这篇论文到底主张了什么</span></div></>
  if (turn === 1) return <><SceneText speaker={`证人 · 论文摘要`}>{scenes.testimony || '“我听说这篇论文的核心只是一个漂亮的标题。至于它到底提出了什么，读者各自理解就好。”'}<Question>{paper.question}</Question></SceneText><div className="objection-row"><button className="objection-button" onClick={onObjection}><strong>OBJECTION!</strong><span>指出证言矛盾</span></button><span className="hint">按下异议后，先提交右侧 P1 / P2 / P3 的实验数据，再选择反驳。</span></div><div className="choice-grid"><Choice letter="A" onClick={() => onChoosePaper(paper.options[0])}>{paper.options[0]}</Choice><Choice letter="B" onClick={() => onChoosePaper(paper.options[1])}>{paper.options[1]}</Choice><Choice letter="C" onClick={() => onChoosePaper(paper.options[2])}>{paper.options[2]}</Choice></div></>
  if (turn === 2) return <><SceneText speaker="法官 · 主审">{scenes.commit || '“你已经找到了关键证物。现在把它和论文主张、自己的解释保存成一条学习笔记。”'}<Question>把一条论文主张、对应证物和你的解释保存为学习笔记。</Question></SceneText><LearningNoteComposer paper={paper} onSubmit={onSaveNote} /></>
  if (turn === 3) {
    const branches = paperBranches(paper)
    return <><SceneText speaker="助手 · 调查假设">{scenes.branch || '“一个结论可能有不止一种解释。请用论文证物逐一核对，找出最站得住脚的假设。”'}<Question>选择一个可被论文证物验证的调查假设：</Question></SceneText><div className="branch-grid">{branches.map((branch, index) => <Choice key={branch.id} letter={String.fromCharCode(65 + index)} onClick={() => onChooseHypothesis(branch.id)}><span className="choice-copy"><b>{branch.label}</b><small>{branch.text}</small></span></Choice>)}</div></>
  }
  if (turn === 4) return <><SceneText speaker="陪审团 · 最终核对">{scenes.merge || '“调查已经有结果。请并排核对你的学习笔记和调查假设，决定哪条理解真正被论文支持。”'}<Question>比较两种理解，决定哪条结论可以进入最终学习报告：</Question></SceneText><SynthesisComparison paper={paper} mainLedger={mainLedger} selectedBranch={selectedBranch} onSynthesize={onSynthesize} /></>
  return <><SceneText speaker="书记官 · 结案记录">{scenes.verdict || '“所有关键事实都已写入学习报告：主张、证物、解释和调查结论彼此吻合。”'}<Question>案件即将宣判。你已经完成一次可复核的论文阅读。</Question></SceneText><div className="action-row"><button className="button button--primary" onClick={onFinish}>宣读判决 <span>→</span></button><span className="hint">正确答案已收录进你的学习报告</span></div></>
}

function SceneText({ speaker, children }: { speaker: string; children: ReactNode }) { return <div className="scene-copy"><p className="speaker">{speaker}</p><p className="dialogue">{children}</p></div> }
function Question({ children }: { children: ReactNode }) { return <p className="question">{children}</p> }
function Choice({ letter, onClick, children }: { letter: string; onClick: () => void; children: ReactNode }) { return <button className="choice" onClick={onClick}><span className="choice-letter">{letter}</span>{children}</button> }

function LearningNoteComposer({ paper, onSubmit }: { paper: PaperCase; onSubmit: (entry: LedgerEntry) => void }) {
  const claims = paperClaims(paper)
  const evidence = paperEvidenceItems(paper)
  const [claimId, setClaimId] = useState(claims[0]?.id ?? '')
  const [evidenceIds, setEvidenceIds] = useState<string[]>([])
  const [interpretation, setInterpretation] = useState('')
  const [message, setMessage] = useState('')
  const claim = claims.find((item) => item.id === claimId) ?? claims[0]
  const toggleEvidence = (id: string) => setEvidenceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  return <div className="learning-note-composer"><div className="composer-label">1 / 选择要记录的论文主张</div><div className="claim-grid">{claims.map((item) => <button key={item.id} type="button" aria-pressed={item.id === claim?.id} className={item.id === claim?.id ? 'claim-card claim-card--active' : 'claim-card'} onClick={() => { setClaimId(item.id); setEvidenceIds([]) }}><b>{item.label}</b><span>{item.text}</span><small>{item.source}</small></button>)}</div><div className="composer-label">2 / 选择支持证物 <small>至少一张与主张关联的卡</small></div><div className="note-evidence-grid">{evidence.map((item) => <label key={item.id} className={evidenceIds.includes(item.number) ? 'note-evidence note-evidence--active' : 'note-evidence'}><input type="checkbox" checked={evidenceIds.includes(item.number)} onChange={() => toggleEvidence(item.number)} /><span><b>{item.number} · {item.label}</b><small>{item.value}</small></span></label>)}</div><label className="composer-field"><span>3 / 你的解释</span><textarea value={interpretation} onChange={(event) => setInterpretation(event.target.value)} placeholder="这条证物为什么支持这条主张？" rows={2} /></label><label className="composer-field"><span>4 / 笔记标题</span><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="例如：用实验结果确认方法有效" /></label><button className="button button--primary composer-submit" type="button" onClick={() => onSubmit({ claimId: claim?.id ?? '', evidenceIds, interpretation, message })}>保存学习笔记 <span>→</span></button></div>
}

function EvidenceSnapshot({ paper, turn, activeEvidence, mainLedger, selectedBranch, merged }: { paper: PaperCase; turn: number; activeEvidence: Evidence; mainLedger: LedgerEntry | null; selectedBranch: PaperBranch | null; merged: boolean }) {
  const claim = paperClaims(paper).find((item) => item.id === mainLedger?.claimId)
  const status = merged ? '已形成结论' : selectedBranch ? '调查中' : mainLedger ? '已保存笔记' : turn === 0 ? '论文阅读' : '待核对'
  const evidence = mainLedger?.evidenceIds.length ? mainLedger.evidenceIds.join(' · ') : activeEvidence.number
  const openQuestion = merged ? '结论已完成，准备宣读判决' : selectedBranch ? '这个解释是否被足够证据支持？' : mainLedger ? '哪条假设值得继续调查？' : turn === 1 ? '哪张论文证物可以击破证言？' : '先把论文事实放进可追溯的上下文'
  return <section className="view-snapshot" aria-label="当前证据快照"><div className="view-snapshot-head"><span>当前证据快照</span><b>{status}</b></div><div className="view-snapshot-grid"><div><small>主张</small><strong>{claim?.text ?? '尚未记录主张'}</strong></div><div><small>证物</small><strong>{evidence}</strong></div><div><small>调查假设</small><strong>{selectedBranch?.label ?? '尚未选择'}</strong></div><div><small>待解决</small><strong>{openQuestion}</strong></div></div></section>
}

function SynthesisComparison({ paper, mainLedger, selectedBranch, onSynthesize }: { paper: PaperCase; mainLedger: LedgerEntry | null; selectedBranch: PaperBranch | null; onSynthesize: (answer: 'accept' | 'keep') => void }) {
  const claim = paperClaims(paper).find((item) => item.id === mainLedger?.claimId)
  return <div className="synthesis-comparison"><div className="synthesis-columns"><article><small>当前理解 · 已记录</small><h3>{claim?.label ?? '论文主张'}</h3><p>{claim?.text ?? '尚未记录主张。'}</p><strong>{mainLedger?.evidenceIds.join(' · ') ?? '无证物'}</strong><em>{mainLedger?.interpretation ?? '等待你的解释'}</em></article><article className="synthesis-alt"><small>调查假设 · 结果</small><h3>{selectedBranch?.label ?? '等待假设'}</h3><p>{selectedBranch?.text ?? '先选择一条由论文证物支持的调查假设。'}</p><strong>{selectedBranch?.evidenceIds.join(' · ') ?? '无证物'}</strong><em>{selectedBranch?.summary ?? '等待调查结果'}</em></article></div><div className="choice-grid choice-grid--two"><Choice letter="A" onClick={() => onSynthesize('accept')}>采纳这条有论文证据的结论</Choice><Choice letter="B" onClick={() => onSynthesize('keep')}>保留当前理解，继续核对</Choice></div></div>
}

function Verdict({ score, wrongAttempts, paper, mainLedger, selectedBranch, merged, onRestart }: { score: number; wrongAttempts: number; paper: PaperCase; mainLedger: LedgerEntry | null; selectedBranch: PaperBranch | null; merged: boolean; onRestart: () => void }) {
  const receiptItems = [paperEvidence(paper), ...paperEvidenceItems(paper)]
  const claim = paperClaims(paper).find((item) => item.id === mainLedger?.claimId)
  const evidenceLabels = paperEvidenceItems(paper).filter((item) => mainLedger?.evidenceIds.includes(item.number)).map((item) => `${item.number} · ${item.value}`).join(' / ')
  const fidelity = Math.max(60, 100 - wrongAttempts * 10)
  return <div className="game game--verdict"><Masthead onHome={onRestart} status="VERDICT / CASE CLOSED" /><main className="verdict-layout"><section className="verdict-copy"><p className="overline">THE COURT HAS REACHED A DECISION</p><div className="verdict-seal">✓</div><h1>{paper.caseTitle}<br /><em>证据充分。</em></h1><p className="verdict-lede">你读懂了 <strong>{paper.title}</strong> 的关键主张，并把主张、证物和自己的解释连成一条可复核的证据链。</p><div className="score"><span>FINAL SCORE</span><strong>{score}<small>/ 5</small></strong><i style={{ '--score': `${Math.max(20, score * 20)}%` } as CSSProperties} /></div><div className="learning-report"><div className="report-head"><span>证据快照 → 学习报告</span><b>{merged ? 'SYNTHESIZED' : 'CLOSED'}</b></div><p><small>已确认主张</small><strong>{claim?.text ?? '未记录主张'}</strong></p><p><small>使用证物</small><strong>{evidenceLabels || '未记录证物'}</strong></p><p><small>我的解释</small><strong>{mainLedger?.interpretation || '未记录解释'}</strong></p><p><small>调查假设</small><strong>{selectedBranch?.label ?? '未记录假设'}</strong></p><div className="report-metrics"><span>证据精度 <b>{mainLedger ? '100' : '40'}%</b></span><span>论文忠实度 <b>{fidelity}%</b></span><span>推理完整度 <b>{merged ? '100' : `${score * 20}`}%</b></span></div></div><div className="verdict-actions"><button className="button button--primary" onClick={onRestart}>再审一次</button><a className="button button--ghost" href={paper.sourceUrl} target="_blank" rel="noreferrer">阅读论文原文 <span>↗</span></a></div></section><section className="receipt"><div className="receipt-head"><span>CASE RECEIPT</span><span>P2 / 001</span></div><p className="receipt-title">你的证据链</p><ol>{receiptItems.map((item, index) => <li key={item.id}><span className="receipt-check">✓</span><span><b>{item.label}</b><small>{item.subtitle}</small></span><em>{String(index + 1).padStart(2, '0')}</em></li>)}</ol><div className="receipt-footer"><span>KEEP THE CONTEXT</span><span>READ WITH EVIDENCE</span></div></section></main></div>
}
