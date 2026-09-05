import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { generateStory, importArxiv, type GeneratedStory, type ImportedPaper } from './api'
import { PAPERS, type PaperCase, type PaperEvidence, type PaperId } from './papers'

type Screen = 'title' | 'briefing' | 'trial' | 'verdict'
type ConceptId = 'paper' | 'repo' | 'view' | 'commit' | 'branch' | 'merge'

type Evidence = {
  id: string
  concept: ConceptId
  number: string
  label: string
  subtitle: string
  glyph: string
  title: string
  description: string
  command: string
  value?: string
}

const API_KEY_STORAGE = 'paper2.deepseekApiKey'

function loadApiKey() {
  try { return window.localStorage.getItem(API_KEY_STORAGE) ?? '' } catch { return '' }
}

const WORKFLOW_STEPS: Evidence[] = [
  { id: 'repo', concept: 'repo', number: '01', label: 'REPO', subtitle: '案件卷宗', glyph: 'R', title: 'Agent repo 是案件的总卷宗', description: '它保存代码之外的对话、VIEW、事件和共享记忆，让“这次协作发生过什么”可以被再次打开。', command: 'agit status' },
  { id: 'view', concept: 'view', number: '02', label: 'VIEW', subtitle: '庭审记录', glyph: 'V', title: 'VIEW 是给下一位协作者的现场快照', description: '它不是整段聊天的复制品，而是压缩后的上下文：目标、改动、证据和待办。', command: 'agit view @ --json' },
  { id: 'commit', concept: 'commit', number: '03', label: 'COMMIT', subtitle: '证物封存', glyph: 'C', title: 'commit 是带意图的不可变快照', description: '一次阶段完成，就把本轮证据封存。它记录的是一段可追溯的对话历史，不会偷偷改写旧案。', command: 'agit commit --milestone "phase done"' },
  { id: 'branch', concept: 'branch', number: '04', label: 'BRANCH', subtitle: '调查支线', glyph: 'B', title: 'branch 让调查可以并行', description: '从 main 分出一条专门调查的支线，各自推进，不会把主案卷弄乱。', command: 'agit fork @ -b investigate-context' },
  { id: 'merge', concept: 'merge', number: '05', label: 'MERGE', subtitle: '合议归档', glyph: 'M', title: 'merge 把被审查过的结论带回主线', description: '当调查支线有了清晰总结，再把选中的证据合并回目标分支；冲突时保留人的判断。', command: 'agit merge investigate-context' },
]

const CHAPTERS = ['建立卷宗', '交叉询问', '提交证物', '调查支线', '合议归档']
const answers = { repo: '卷宗', commit: '快照', branch: '支线', merge: '合并' } as const

function paperEvidence(paper: PaperCase): Evidence {
  return { id: 'paper-summary', concept: 'paper', number: '00', label: paper.label, subtitle: '论文卷宗', glyph: 'P', title: paper.title, description: paper.summary, command: paper.keyFact, value: paper.keyFact }
}

function paperEvidenceItems(paper: PaperCase): Evidence[] {
  const sourceItems: PaperEvidence[] = paper.evidence ?? [{ label: 'PAPER', subtitle: 'KEY CLAIM', title: '论文核心主张', description: paper.summary, value: paper.keyFact, source: paper.sourceLabel, glyph: '↗' }]
  return sourceItems.map((item, index) => ({ id: `paper-evidence-${index}`, concept: 'paper' as const, number: `P${index + 1}`, label: item.label, subtitle: item.subtitle, glyph: item.glyph ?? ['↗', 'Σ', '#'][index % 3], title: item.title, description: item.description, command: item.source, value: item.value }))
}

function makeGeneratedPaper(imported: ImportedPaper, story: GeneratedStory): PaperCase {
  return {
    id: 'custom', label: 'ARXIV · AI', title: imported.title, subtitle: imported.categories.slice(0, 2).join(' / ') || 'AI 生成案件',
    year: imported.year, authors: imported.authors.slice(0, 4).join(', '), caseTitle: story.caseTitle, tagline: story.tagline,
    summary: story.summary, keyFact: story.keyFact, question: story.question, options: story.options,
    correctOption: story.correctOption, correctFeedback: story.correctFeedback, sourceUrl: imported.sourceUrl,
    sourceLabel: `arXiv · ${imported.id}`, sourceMode: 'arxiv-deepseek', keyIdeas: story.keyIdeas, scenes: story.scenes, evidence: story.evidence,
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [apiKey, setApiKey] = useState(loadApiKey)
  const [paperId, setPaperId] = useState<PaperId>('attention')
  const [customPaper, setCustomPaper] = useState<PaperCase | null>(null)
  const [turn, setTurn] = useState(0)
  const [score, setScore] = useState(0)
  const [activeConcept, setActiveConcept] = useState<ConceptId>('paper')
  const [activeEvidenceId, setActiveEvidenceId] = useState('paper-summary')
  const [feedback, setFeedback] = useState('')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [objection, setObjection] = useState('')
  const [paperEvidencePresented, setPaperEvidencePresented] = useState(false)
  const activePaper = customPaper ?? (paperId === 'custom' ? PAPERS.attention : PAPERS[paperId])
  const allEvidence = useMemo(() => [paperEvidence(activePaper), ...paperEvidenceItems(activePaper)], [activePaper])
  const activeEvidence = useMemo(() => allEvidence.find((item) => item.id === activeEvidenceId) ?? allEvidence[0], [activeEvidenceId, allEvidence])
  const activeWorkflow = useMemo(() => WORKFLOW_STEPS.find((item) => item.concept === activeConcept) ?? WORKFLOW_STEPS[0], [activeConcept])

  const updateApiKey = (value: string) => {
    setApiKey(value)
    try {
      if (value.trim()) window.localStorage.setItem(API_KEY_STORAGE, value.trim())
      else window.localStorage.removeItem(API_KEY_STORAGE)
    } catch { /* localStorage can be disabled; the in-memory key still works for this session */ }
  }

  const reset = () => { setScreen('title'); setPaperId('attention'); setCustomPaper(null); setTurn(0); setScore(0); setActiveConcept('paper'); setActiveEvidenceId('paper-summary'); setFeedback(''); setObjection(''); setWrongAttempts(0); setPaperEvidencePresented(false) }
  const selectPaper = (id: PaperId) => { setCustomPaper(null); setPaperId(id); setActiveEvidenceId('paper-summary'); setFeedback(''); setPaperEvidencePresented(false) }
  const focusEvidence = (concept: ConceptId) => { const item = allEvidence.find((evidence) => evidence.concept === concept); if (item) setActiveEvidenceId(item.id); setActiveConcept(concept) }
  const raiseObjection = (message: string, concept: ConceptId = 'paper') => { focusEvidence(concept); setObjection(message); window.setTimeout(() => setObjection(''), 980) }
  const raisePaperObjection = (message: string) => { raiseObjection(message); const result = allEvidence.find((item) => item.id.startsWith('paper-evidence-')); if (result) setActiveEvidenceId(result.id) }
  const advance = (concept: ConceptId, message: string, nextConcept: ConceptId = concept) => {
    setScore((value) => value + 1)
    focusEvidence(concept)
    setFeedback(message)
    window.setTimeout(() => { setFeedback(''); setActiveConcept(nextConcept); setTurn((value) => value + 1) }, 420)
  }
  const choose = (answer: string, concept: 'repo' | 'branch' | 'merge', message: string) => {
    if (answer !== answers[concept]) {
      setWrongAttempts((value) => value + 1)
      raiseObjection('这句证言与卷宗中的事实不符。请用证物击破它。', concept)
      setFeedback('异议！这份证言还不够精确。先看看右侧证物卡上的定义，再试一次。')
      return
    }
    advance(concept, message, concept === 'branch' ? 'merge' : concept)
  }
  const choosePaper = (answer: string) => {
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
    advance('paper', activePaper.correctFeedback, 'commit')
  }
  const present = (item: Evidence) => {
    if (turn === 1 && item.concept === 'paper' && item.id.startsWith('paper-evidence-')) {
      setPaperEvidencePresented(true)
      setActiveEvidenceId(item.id)
      setActiveConcept('paper')
      setFeedback(`已提交 ${item.label}：${item.value ?? '论文证据'}。现在用它反驳证人的证言。`)
      return
    }
    if (turn !== 2) { setActiveEvidenceId(item.id); setActiveConcept(item.concept); return }
    setWrongAttempts((value) => value + 1)
    setActiveEvidenceId(item.id)
    setActiveConcept('paper')
    raiseObjection('这件论文证物是真的，但不能解释“历史被覆盖”的矛盾。请在 AgentGit 教学流程中提交 COMMIT。', 'paper')
    setActiveEvidenceId(item.id)
    setFeedback('论文证物只能解释论文结果；现在请在下方独立的教学流程栏中提交 COMMIT。')
  }
  const interactWorkflow = (item: Evidence) => {
    if (turn !== 2) { setActiveConcept(item.concept); return }
    if (item.concept !== 'commit') {
      setWrongAttempts((value) => value + 1)
      setActiveConcept(item.concept)
      raiseObjection('协作流程走错了。现在要提交 COMMIT，而不是切换其它概念。', item.concept)
      setFeedback('现在的指证目标是 COMMIT：先把这次判断封存成带意图的快照。')
      return
    }
    setObjection('')
    advance('commit', '指证成功：一条有意图的快照，足以让历史重新变得可验证。', 'branch')
  }

  if (screen === 'title') return <Title apiKey={apiKey} onApiKeyChange={updateApiKey} onStart={() => setScreen('briefing')} />
  if (screen === 'briefing') return <Briefing paper={activePaper} paperId={paperId} customPaper={customPaper} apiKey={apiKey} onSelectPaper={selectPaper} onImportPaper={(paper) => { setCustomPaper(paper); setPaperId('custom'); setActiveEvidenceId('paper-summary'); setFeedback(''); setPaperEvidencePresented(false) }} onBack={reset} onEnter={() => { setScreen('trial'); setTurn(0) }} />
  if (screen === 'verdict') return <Verdict score={score} paper={activePaper} onRestart={reset} />

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
            <div className="scene-stage"><div className="stage-grid" /><div className="scene-sign">SUPREME<br /><b>AGENT COURT</b></div><Avatar kind="judge" label="JUDGE" text="J" image="/assets/judge.png" /><Avatar kind="defense" label="DEFENSE" text="YOU" image="/assets/defense.png" /><Avatar kind="prosecutor" label="PROSECUTOR" text="!" image="/assets/prosecutor.png" /><div className="bench" /></div>
            <div className="dialogue-box">
              <Turn turn={turn} paper={activePaper} onAdvance={advance} onChoose={choose} onChoosePaper={choosePaper} onObjection={() => raisePaperObjection('证言与论文结果冲突。选择一件具体证物来反驳。')} onFinish={() => setScreen('verdict')} />
              {feedback ? <p className="feedback" role="status">{feedback}</p> : null}
            </div>
          </section>
          <aside className="board">
            <div className="board-head"><div><p className="overline">PAPER EVIDENCE</p><h2>论文证物</h2></div><span>{allEvidence.length} ITEMS</span></div>
            <div className="evidence-grid">{allEvidence.map((item) => <button key={item.id} className={activeEvidenceId === item.id ? 'evidence-card evidence-card--active' : 'evidence-card'} onClick={() => present(item)}><span className="evidence-top"><small>{item.number}</small><b>{item.label}</b></span><span className="evidence-glyph">{item.glyph}</span><span className="evidence-name">{item.subtitle}</span>{item.value ? <span className="evidence-value">{item.value}</span> : null}</button>)}</div>
            <div className="workflow-panel"><div className="workflow-head"><span>AGENTGIT WORKFLOW</span><span>教学流程 · 非论文证物</span></div><div className="workflow-grid">{WORKFLOW_STEPS.map((item) => <button key={item.id} className={activeConcept === item.concept ? 'workflow-step workflow-step--active' : 'workflow-step'} onClick={() => interactWorkflow(item)}><small>{item.number}</small><b>{item.label}</b><span>{item.subtitle}</span></button>)}</div></div>
            <div className="lesson-card"><div className="lesson-card-head"><span>{activeConcept === 'paper' ? 'PAPER EVIDENCE' : 'WORKFLOW NOTE'}</span><span>{activeConcept === 'paper' ? activeEvidence.label : activeWorkflow.label}</span></div><h3>{activeConcept === 'paper' ? activeEvidence.title : activeWorkflow.title}</h3>{(activeConcept === 'paper' ? activeEvidence.value : activeWorkflow.value) ? <strong className="lesson-metric">{activeConcept === 'paper' ? activeEvidence.value : activeWorkflow.value}</strong> : null}<p>{activeConcept === 'paper' ? activeEvidence.description : activeWorkflow.description}</p><code>{activeConcept === 'paper' ? activeEvidence.command : activeWorkflow.command}</code></div>
            <div className="board-foot"><span>WRONG ATTEMPTS</span><strong>{wrongAttempts}</strong><i /><span>SCORE</span><strong>{score}/5</strong></div>
          </aside>
        </div>
      </main>
      <div className="ticker"><span>CLICK A CARD TO INSPECT THE CONCEPT</span><span>EVERY SESSION LEAVES A TRAIL</span></div>
    </div>
  )
}

function Masthead({ onHome, status, live = false }: { onHome: () => void; status: string; live?: boolean }) {
  return <header className="masthead"><button className="wordmark" onClick={onHome}><span className="brand-mark">AG</span> AGENTGIT / TRAINING COURT</button><span className="masthead-status">{live ? <span className="status-dot status-dot--live" /> : null}{status}</span></header>
}

function Avatar({ kind, label, text, image }: { kind: string; label: string; text: string; image: string }) {
  return <div className={`avatar avatar--${kind}`}><span aria-label={text}><img src={image} alt="" /></span><small>{label}</small></div>
}

function Title({ apiKey, onApiKeyChange, onStart }: { apiKey: string; onApiKeyChange: (value: string) => void; onStart: () => void }) {
  const keyReady = /^sk-[A-Za-z0-9_-]{16,}$/.test(apiKey.trim())
  return <div className="game game--title"><Masthead onHome={() => undefined} status="CASE 001 / PLAYABLE" /><main className="title-layout"><section className="title-copy"><p className="overline">AN INTERACTIVE CASE FILE · 01</p><h1>Paper2<br /><em>逆转裁判</em></h1><p className="title-lede">把一篇真实论文变成可追问的证据链。<br />在一场 5 分钟的法庭推理里，学会 AgentGit。</p><div className="title-meta"><span><b>案件</b> 真实论文</span><span><b>形式</b> 互动教程</span><span><b>难度</b> 新手友好</span></div><div className="key-gate"><div className="key-gate-head"><span>DEEPSEEK API KEY</span><b className={keyReady ? 'key-state key-state--ready' : 'key-state'}>{keyReady ? 'READY' : 'REQUIRED'}</b></div><label className="key-label" htmlFor="deepseek-key">先配置 key，才能开始案件</label><div className="key-input-row"><input id="deepseek-key" className="key-input" type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="sk-..." autoComplete="off" spellCheck={false} /><button className="key-clear" type="button" onClick={() => onApiKeyChange('')} disabled={!apiKey}>清除</button></div><p className="key-help">只保存在此浏览器的本地存储中；仅用于向本地服务端请求 DeepSeek，不会显示在案件页面。</p></div><button className="button button--primary button--large" onClick={onStart} disabled={!keyReady}>选择论文案件 <span>↗</span></button><p className="title-note">不需要账号 · 不上传本地文件 · 没有 key 不能进入法庭</p></section><TitleArt /></main><div className="title-footer"><span>PLAYABLE EXPLAINER</span><span>SCROLL / CLICK / LEARN</span><span>BUILT FOR AGENTGIT</span></div></div>
}

function TitleArt() {
  return <section className="title-art" aria-label="案件卷宗预览"><div className="paper-sheet paper-sheet--back" /><div className="paper-sheet paper-sheet--front"><div className="sheet-stamp">EVIDENCE</div><p className="sheet-kicker">CASE FILE / 001</p><p className="sheet-title">消失的<br /><strong>上下文</strong></p><div className="sheet-rule" /><div className="sheet-lines"><i /><i /><i /><i /></div><p className="sheet-footer">AGENTGIT · 2026</p></div><div className="orbit orbit--one" /><div className="orbit orbit--two" /><span className="art-label art-label--top">THE CONTEXT IS<br /><b>THE EVIDENCE</b></span><span className="art-label art-label--bottom">REPO / VIEW / COMMIT<br /><b>BRANCH / MERGE</b></span></section>
}

function Briefing({ paper, paperId, customPaper, apiKey, onSelectPaper, onImportPaper, onBack, onEnter }: { paper: PaperCase; paperId: PaperId; customPaper: PaperCase | null; apiKey: string; onSelectPaper: (id: PaperId) => void; onImportPaper: (paper: PaperCase) => void; onBack: () => void; onEnter: () => void }) {
  const [url, setUrl] = useState('')
  const [importState, setImportState] = useState<'idle' | 'scanning' | 'generating'>('idle')
  const [importError, setImportError] = useState('')
  const submitImport = async () => {
    if (!url.trim() || importState !== 'idle') return
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
  return <div className="game game--briefing"><Masthead onHome={onBack} status="BRIEFING / CASE 001" /><main className="briefing-layout"><section className="briefing-intro"><p className="overline">CASE BRIEFING · SELECT A REAL PAPER</p><h1>{paper.caseTitle}<br /><em>案件</em></h1><p className="briefing-lede">{paper.tagline} 你将作为辩护人，把论文主张和 AgentGit 的证据链一起带进法庭。</p><div className="paper-picker" aria-label="选择论文案件">{choices.map((item) => <button key={item.id} className={item.id === paperId ? 'paper-picker-card paper-picker-card--active' : 'paper-picker-card'} onClick={() => onSelectPaper(item.id)}><span className="paper-picker-code">{item.label}</span><strong>{item.title}</strong><small>{item.subtitle} · {item.year}</small></button>)}{customPaper ? <button className={paperId === 'custom' ? 'paper-picker-card paper-picker-card--active paper-picker-card--generated' : 'paper-picker-card paper-picker-card--generated'} onClick={() => onSelectPaper('custom')}><span className="paper-picker-code">ARXIV · AI</span><strong>{customPaper.title}</strong><small>刚刚生成 · DeepSeek</small></button> : null}</div><div className="import-card"><div className="import-card-head"><span>NEW CASE / ARXIV</span><b>SERVER-SIDE SCAN</b></div><p>粘贴 arXiv 链接。服务端会读取公开摘要与 TeX 源码，再生成一套可追问的案件。</p><div className="import-form"><input className="import-input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submitImport() }} placeholder="https://arxiv.org/abs/1706.03762" aria-label="arXiv 论文链接" /><button className="button button--primary import-button" onClick={() => void submitImport()} disabled={importState !== 'idle'}>{importState === 'scanning' ? '扫描 TeX…' : importState === 'generating' ? '生成剧情…' : '导入论文'} <span>↗</span></button></div>{importState !== 'idle' ? <p className="import-status" role="status">{importState === 'scanning' ? '解析 arXiv 元数据并扫描 TeX 源码…' : 'DeepSeek 正在把方法、实验和结论编成庭审证词…'}</p> : null}{importError ? <p className="import-error" role="alert">{importError}</p> : null}</div><a className="paper-source-link" href={paper.sourceUrl} target="_blank" rel="noreferrer">阅读论文原文 · {paper.sourceLabel} ↗</a><button className="button button--primary" onClick={onEnter}>进入法庭 <span>→</span></button></section><section className="dossier"><div className="dossier-head"><span>论文卷宗 {paper.sourceMode === 'arxiv-deepseek' ? <em className="paper-badge">AI GENERATED</em> : null}</span><span>{paper.year} / {paper.authors}</span></div><div className="paper-summary"><p className="paper-summary-title">{paper.title}</p><p>{paper.summary}</p><strong>{paper.keyFact}</strong>{paper.keyIdeas?.length ? <div className="key-ideas">{paper.keyIdeas.map((idea) => <span key={idea}>✦ {idea}</span>)}</div> : null}</div><div className="dossier-head dossier-head--evidence"><span>AGENTGIT 教学流程</span><span>5 STEPS</span></div><div className="dossier-list">{WORKFLOW_STEPS.map((item) => <div className="dossier-item" key={item.id}><span className="dossier-number">{item.number}</span><span className="dossier-icon">{item.glyph}</span><span className="dossier-text"><b>{item.label}</b><small>{item.subtitle}</small></span><span className="dossier-arrow">↗</span></div>)}</div><div className="dossier-note"><span>✦</span><p>右侧证物栏只放论文内的摘要、方法和实验结果；AgentGit 的 repo / commit / branch / merge 是另一条教学流程。</p></div></section></main><div className="ticker"><span>DEFENSE ATTORNEY / YOU</span><span>THE COURT IS NOW IN SESSION</span></div></div>
}

function Turn({ turn, paper, onAdvance, onChoose, onChoosePaper, onObjection, onFinish }: { turn: number; paper: PaperCase; onAdvance: (concept: ConceptId, message: string, nextConcept?: ConceptId) => void; onChoose: (answer: string, concept: 'branch' | 'merge', message: string) => void; onChoosePaper: (answer: string) => void; onObjection: () => void; onFinish: () => void }) {
  const scenes = paper.scenes ?? {}
  if (turn === 0) return <><SceneText speaker={`书记官 · ${paper.label}`}>{scenes.opening || <>“本庭受理论文案件 <strong>{paper.title}</strong>。它的关键主张是：{paper.tagline} 辩护人，请先把论文卷宗放进 AgentGit 的案件记录。”</>}</SceneText><div className="action-row"><button className="button button--primary" onClick={() => onAdvance('repo', '卷宗已打开：先从 repo 认识 AgentGit。', 'paper')}>打开案件卷宗 <span>→</span></button><span className="hint">提示：先确认“论文与协作记录”保存在哪里</span></div></>
  if (turn === 1) return <><SceneText speaker={`证人 · 论文摘要`}>{scenes.testimony || '“我听说这篇论文的核心只是一个漂亮的标题。至于它到底提出了什么，读者各自理解就好。”'}<Question>{paper.question}</Question></SceneText><div className="objection-row"><button className="objection-button" onClick={onObjection}><strong>OBJECTION!</strong><span>指出证言矛盾</span></button><span className="hint">按下异议后，先提交右侧 P1 / P2 / P3 的实验数据，再选择反驳。</span></div><div className="choice-grid"><Choice letter="A" onClick={() => onChoosePaper(paper.options[0])}>{paper.options[0]}</Choice><Choice letter="B" onClick={() => onChoosePaper(paper.options[1])}>{paper.options[1]}</Choice><Choice letter="C" onClick={() => onChoosePaper(paper.options[2])}>{paper.options[2]}</Choice></div></>
  if (turn === 2) return <><SceneText speaker="法官 · 主审">{scenes.commit || '“证人说你每次保存都会覆盖旧记录。请提交一件证物，证明历史可以被一段一段地封存。”'}<Question>点击右侧证物栏中的 COMMIT，完成指证。</Question></SceneText><div className="evidence-prompt"><span>C</span>目标：证明“带意图的快照”<small>PRESENT EVIDENCE</small></div></>
  if (turn === 3) return <><SceneText speaker="助手 · 小纸条">{scenes.branch || '“主线太拥挤了。我们要调查另一种解释，但不想打断 main。下一步怎么做？”'}<Question>选择正确的调查姿势：</Question></SceneText><div className="choice-grid"><Choice letter="A" onClick={() => onChoose('主线', 'branch', '')}>直接把实验写进 main</Choice><Choice letter="B" onClick={() => onChoose('支线', 'branch', '正确：从 main 分出调查支线，协作就能并行。')}>从 main 分出一条调查支线</Choice><Choice letter="C" onClick={() => onChoose('删除', 'branch', '')}>删除 main，重新开始</Choice></div></>
  if (turn === 4) return <><SceneText speaker="陪审团 · 多个 VIEW">{scenes.merge || '“调查已经有结果，但它还不是主案的一部分。请给出最后的合议动作。”'}<Question>把被审查过的结论带回目标分支：</Question></SceneText><div className="choice-grid choice-grid--two"><Choice letter="A" onClick={() => onChoose('合并', 'merge', '合议完成：merge 让经过审查的结论回到主线。')}>merge 调查支线回 main</Choice><Choice letter="B" onClick={() => onChoose('删除', 'merge', '')}>删除调查支线</Choice></div></>
  return <><SceneText speaker="书记官 · VIEW">{scenes.verdict || '“所有关键事实都已写入卷宗：repo 保存上下文，commit 封存进度，branch 允许探索，merge 带回共识。”'}<Question>案件即将宣判。你已经掌握了 AgentGit 的最小工作流。</Question></SceneText><div className="action-row"><button className="button button--primary" onClick={onFinish}>宣读判决 <span>→</span></button><span className="hint">正确答案已收录进你的证据链</span></div></>
}

function SceneText({ speaker, children }: { speaker: string; children: ReactNode }) { return <div className="scene-copy"><p className="speaker">{speaker}</p><p className="dialogue">{children}</p></div> }
function Question({ children }: { children: ReactNode }) { return <p className="question">{children}</p> }
function Choice({ letter, onClick, children }: { letter: string; onClick: () => void; children: ReactNode }) { return <button className="choice" onClick={onClick}><span>{letter}</span>{children}</button> }

function Verdict({ score, paper, onRestart }: { score: number; paper: PaperCase; onRestart: () => void }) {
  const receiptItems = [paperEvidence(paper), ...paperEvidenceItems(paper)]
  return <div className="game game--verdict"><Masthead onHome={onRestart} status="VERDICT / CASE CLOSED" /><main className="verdict-layout"><section className="verdict-copy"><p className="overline">THE COURT HAS REACHED A DECISION</p><div className="verdict-seal">✓</div><h1>{paper.caseTitle}<br /><em>证据充分。</em></h1><p className="verdict-lede">你读懂了 <strong>{paper.title}</strong> 的关键主张，也证明了 AgentGit 不只保存“改了什么”，还保存“为什么、由谁、在什么上下文里改”。</p><div className="score"><span>FINAL SCORE</span><strong>{score}<small>/ 5</small></strong><i style={{ '--score': `${Math.max(20, score * 20)}%` } as CSSProperties} /></div><div className="verdict-actions"><button className="button button--primary" onClick={onRestart}>再审一次</button><a className="button button--ghost" href={paper.sourceUrl} target="_blank" rel="noreferrer">阅读论文原文 <span>↗</span></a></div></section><section className="receipt"><div className="receipt-head"><span>CASE RECEIPT</span><span>AG / 001</span></div><p className="receipt-title">你的证据链</p><ol>{receiptItems.map((item, index) => <li key={item.id}><span className="receipt-check">✓</span><span><b>{item.label}</b><small>{item.subtitle}</small></span><em>{String(index + 1).padStart(2, '0')}</em></li>)}</ol><div className="receipt-footer"><span>KEEP THE CONTEXT</span><span>SHIP WITH INTENT</span></div></section></main></div>
}
