import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'

type Screen = 'title' | 'briefing' | 'trial' | 'verdict'
type ConceptId = 'repo' | 'view' | 'commit' | 'branch' | 'merge'

type Evidence = {
  id: ConceptId
  number: string
  label: string
  subtitle: string
  glyph: string
  title: string
  description: string
  command: string
}

const EVIDENCE: Evidence[] = [
  { id: 'repo', number: '01', label: 'REPO', subtitle: '案件卷宗', glyph: 'R', title: 'Agent repo 是案件的总卷宗', description: '它保存代码之外的对话、VIEW、事件和共享记忆，让“这次协作发生过什么”可以被再次打开。', command: 'agit status' },
  { id: 'view', number: '02', label: 'VIEW', subtitle: '庭审记录', glyph: 'V', title: 'VIEW 是给下一位协作者的现场快照', description: '它不是整段聊天的复制品，而是压缩后的上下文：目标、改动、证据和待办。', command: 'agit view @ --json' },
  { id: 'commit', number: '03', label: 'COMMIT', subtitle: '证物封存', glyph: 'C', title: 'commit 是带意图的不可变快照', description: '一次阶段完成，就把本轮证据封存。它记录的是一段可追溯的对话历史，不会偷偷改写旧案。', command: 'agit commit --milestone "phase done"' },
  { id: 'branch', number: '04', label: 'BRANCH', subtitle: '调查支线', glyph: 'B', title: 'branch 让调查可以并行', description: '从 main 分出一条专门调查的支线，各自推进，不会把主案卷弄乱。', command: 'agit fork @ -b investigate-context' },
  { id: 'merge', number: '05', label: 'MERGE', subtitle: '合议归档', glyph: 'M', title: 'merge 把被审查过的结论带回主线', description: '当调查支线有了清晰总结，再把选中的证据合并回目标分支；冲突时保留人的判断。', command: 'agit merge investigate-context' },
]

const CONCEPTS = Object.fromEntries(EVIDENCE.map((item) => [item.id, item])) as Record<ConceptId, Evidence>
const CHAPTERS = ['建立卷宗', '交叉询问', '提交证物', '调查支线', '合议归档']
const answers = { repo: '卷宗', commit: '快照', branch: '支线', merge: '合并' } as const

export function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [turn, setTurn] = useState(0)
  const [score, setScore] = useState(0)
  const [activeConcept, setActiveConcept] = useState<ConceptId>('repo')
  const [feedback, setFeedback] = useState('')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const activeEvidence = useMemo(() => CONCEPTS[activeConcept], [activeConcept])

  const reset = () => { setScreen('title'); setTurn(0); setScore(0); setActiveConcept('repo'); setFeedback(''); setWrongAttempts(0) }
  const advance = (concept: ConceptId, message: string) => {
    setScore((value) => value + 1)
    setActiveConcept(concept)
    setFeedback(message)
    window.setTimeout(() => { setFeedback(''); setTurn((value) => value + 1) }, 420)
  }
  const choose = (answer: string, concept: 'repo' | 'branch' | 'merge', message: string) => {
    if (answer !== answers[concept]) {
      setWrongAttempts((value) => value + 1)
      setActiveConcept(concept)
      setFeedback('异议！这份证言还不够精确。先看看右侧证物卡上的定义，再试一次。')
      return
    }
    advance(concept, message)
  }
  const present = (id: ConceptId) => {
    if (turn !== 2) { setActiveConcept(id); return }
    if (id !== 'commit') {
      setWrongAttempts((value) => value + 1)
      setActiveConcept(id)
      setFeedback('这件证物能解释协作，但还不能击破“历史被覆盖”的矛盾。请提交 COMMIT。')
      return
    }
    advance('commit', '指证成功：一条有意图的快照，足以让历史重新变得可验证。')
  }

  if (screen === 'title') return <Title onStart={() => setScreen('briefing')} />
  if (screen === 'briefing') return <Briefing onBack={reset} onEnter={() => { setScreen('trial'); setTurn(0) }} />
  if (screen === 'verdict') return <Verdict score={score} onRestart={reset} />

  const chapter = CHAPTERS[Math.min(turn, CHAPTERS.length - 1)]
  return (
    <div className="game game--trial">
      <Masthead onHome={reset} status="IN SESSION" live />
      <main className="court-layout">
        <div className="court-topline">
          <div><p className="overline">CASE 001 / THE MISSING CONTEXT</p><h1>{String(turn + 1).padStart(2, '0')} <span>{chapter}</span></h1></div>
          <div className="progress"><span>PROGRESS</span><i><b style={{ width: `${((turn + 1) / 6) * 100}%` }} /></i><strong>{String(turn + 1).padStart(2, '0')} / 06</strong></div>
        </div>
        <div className="court-grid">
          <section className="courtroom">
            <div className="scene-stage"><div className="stage-grid" /><div className="scene-sign">SUPREME<br /><b>AGENT COURT</b></div><Avatar kind="judge" label="JUDGE" text="J" image="/assets/judge.png" /><Avatar kind="defense" label="DEFENSE" text="YOU" image="/assets/defense.png" /><Avatar kind="prosecutor" label="PROSECUTOR" text="!" image="/assets/prosecutor.png" /><div className="bench" /></div>
            <div className="dialogue-box">
              <Turn turn={turn} onAdvance={advance} onChoose={choose} onFinish={() => setScreen('verdict')} />
              {feedback ? <p className="feedback" role="status">{feedback}</p> : null}
            </div>
          </section>
          <aside className="board">
            <div className="board-head"><div><p className="overline">EVIDENCE BOARD</p><h2>卷宗证物</h2></div><span>5 ITEMS</span></div>
            <div className="evidence-grid">{EVIDENCE.map((item) => <button key={item.id} className={activeConcept === item.id ? 'evidence-card evidence-card--active' : 'evidence-card'} onClick={() => present(item.id)}><span className="evidence-top"><small>{item.number}</small><b>{item.label}</b></span><span className="evidence-glyph">{item.glyph}</span><span className="evidence-name">{item.subtitle}</span></button>)}</div>
            <div className="lesson-card"><div className="lesson-card-head"><span>CONCEPT NOTE</span><span>{activeEvidence.label}</span></div><h3>{activeEvidence.title}</h3><p>{activeEvidence.description}</p><code>{activeEvidence.command}</code></div>
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

function Title({ onStart }: { onStart: () => void }) {
  return <div className="game game--title"><Masthead onHome={() => undefined} status="CASE 001 / PLAYABLE" /><main className="title-layout"><section className="title-copy"><p className="overline">AN INTERACTIVE CASE FILE · 01</p><h1>Paper2<br /><em>逆转裁判</em></h1><p className="title-lede">把“我记得”变成可验证的版本历史。<br />在一场 5 分钟的法庭推理里，学会 AgentGit。</p><div className="title-meta"><span><b>案件</b> 消失的上下文</span><span><b>形式</b> 互动教程</span><span><b>难度</b> 新手友好</span></div><button className="button button--primary button--large" onClick={onStart}>接手案件 <span>↗</span></button><p className="title-note">不需要账号 · 不上传文件 · 进度只存在于本页</p></section><TitleArt /></main><div className="title-footer"><span>PLAYABLE EXPLAINER</span><span>SCROLL / CLICK / LEARN</span><span>BUILT FOR AGENTGIT</span></div></div>
}

function TitleArt() {
  return <section className="title-art" aria-label="案件卷宗预览"><div className="paper-sheet paper-sheet--back" /><div className="paper-sheet paper-sheet--front"><div className="sheet-stamp">EVIDENCE</div><p className="sheet-kicker">CASE FILE / 001</p><p className="sheet-title">消失的<br /><strong>上下文</strong></p><div className="sheet-rule" /><div className="sheet-lines"><i /><i /><i /><i /></div><p className="sheet-footer">AGENTGIT · 2026</p></div><div className="orbit orbit--one" /><div className="orbit orbit--two" /><span className="art-label art-label--top">THE CONTEXT IS<br /><b>THE EVIDENCE</b></span><span className="art-label art-label--bottom">REPO / VIEW / COMMIT<br /><b>BRANCH / MERGE</b></span></section>
}

function Briefing({ onBack, onEnter }: { onBack: () => void; onEnter: () => void }) {
  return <div className="game game--briefing"><Masthead onHome={onBack} status="BRIEFING / CASE 001" /><main className="briefing-layout"><section className="briefing-intro"><p className="overline">CASE BRIEFING · READ BEFORE ENTERING</p><h1>消失的<br /><em>上下文</em></h1><p className="briefing-lede">一次 agent session 结束后，代码还在，但为什么下一位协作者像失忆了一样？你将作为辩护人，找出缺失的证据链。</p><button className="button button--primary" onClick={onEnter}>进入法庭 <span>→</span></button></section><section className="dossier"><div className="dossier-head"><span>证物清单</span><span>5 ITEMS</span></div><div className="dossier-list">{EVIDENCE.map((item) => <div className="dossier-item" key={item.id}><span className="dossier-number">{item.number}</span><span className="dossier-icon">{item.glyph}</span><span className="dossier-text"><b>{item.label}</b><small>{item.subtitle}</small></span><span className="dossier-arrow">↗</span></div>)}</div><div className="dossier-note"><span>✦</span><p>所有证物都能在庭审中再次查看。先从 repo 开始，沿着证据链走完一遍。</p></div></section></main><div className="ticker"><span>DEFENSE ATTORNEY / YOU</span><span>THE COURT IS NOW IN SESSION</span></div></div>
}

function Turn({ turn, onAdvance, onChoose, onFinish }: { turn: number; onAdvance: (concept: ConceptId, message: string) => void; onChoose: (answer: string, concept: 'repo' | 'branch' | 'merge', message: string) => void; onFinish: () => void }) {
  if (turn === 0) return <><SceneText speaker="书记官 · VIEW">“本庭受理案件 <strong>消失的上下文</strong>。被告声称：只要把代码放进一个文件夹，协作就不会丢。辩护人，你认同吗？”</SceneText><div className="action-row"><button className="button button--primary" onClick={() => onAdvance('repo', '卷宗已打开：先从 repo 认识 AgentGit。')}>打开案件卷宗 <span>→</span></button><span className="hint">提示：先确认“案件”保存在哪里</span></div></>
  if (turn === 1) return <><SceneText speaker="证人 · 文件夹先生">“我就是 repo！代码都在我肚子里，至于你们的对话……记不记得住，靠运气。”<Question>请选择能击破证言的定义：</Question></SceneText><div className="choice-grid"><Choice letter="A" onClick={() => onChoose('文件夹', 'repo', '')}>repo 只是代码文件夹</Choice><Choice letter="B" onClick={() => onChoose('卷宗', 'repo', '定义正确：repo 是项目与对话历史共同的卷宗。')}>repo 是项目与对话历史的卷宗</Choice><Choice letter="C" onClick={() => onChoose('云盘', 'repo', '')}>repo 只是一个云盘链接</Choice></div></>
  if (turn === 2) return <><SceneText speaker="法官 · 主审">“证人说你每次保存都会覆盖旧记录。请提交一件证物，证明历史可以被一段一段地封存。”<Question>点击右侧证物栏中的 COMMIT，完成指证。</Question></SceneText><div className="evidence-prompt"><span>C</span>目标：证明“带意图的快照”</div></>
  if (turn === 3) return <><SceneText speaker="助手 · 小纸条">“主线太拥挤了。我们要调查另一种解释，但不想打断 main。下一步怎么做？”<Question>选择正确的调查姿势：</Question></SceneText><div className="choice-grid"><Choice letter="A" onClick={() => onChoose('主线', 'branch', '')}>直接把实验写进 main</Choice><Choice letter="B" onClick={() => onChoose('支线', 'branch', '正确：从 main 分出调查支线，协作就能并行。')}>从 main 分出一条调查支线</Choice><Choice letter="C" onClick={() => onChoose('删除', 'branch', '')}>删除 main，重新开始</Choice></div></>
  if (turn === 4) return <><SceneText speaker="陪审团 · 多个 VIEW">“调查已经有结果，但它还不是主案的一部分。请给出最后的合议动作。”<Question>把被审查过的结论带回目标分支：</Question></SceneText><div className="choice-grid choice-grid--two"><Choice letter="A" onClick={() => onChoose('合并', 'merge', '合议完成：merge 让经过审查的结论回到主线。')}>merge 调查支线回 main</Choice><Choice letter="B" onClick={() => onChoose('删除', 'merge', '')}>删除调查支线</Choice></div></>
  return <><SceneText speaker="书记官 · VIEW">“所有关键事实都已写入卷宗：repo 保存上下文，commit 封存进度，branch 允许探索，merge 带回共识。”<Question>案件即将宣判。你已经掌握了 AgentGit 的最小工作流。</Question></SceneText><div className="action-row"><button className="button button--primary" onClick={onFinish}>宣读判决 <span>→</span></button><span className="hint">正确答案已收录进你的证据链</span></div></>
}

function SceneText({ speaker, children }: { speaker: string; children: ReactNode }) { return <div className="scene-copy"><p className="speaker">{speaker}</p><p className="dialogue">{children}</p></div> }
function Question({ children }: { children: ReactNode }) { return <p className="question">{children}</p> }
function Choice({ letter, onClick, children }: { letter: string; onClick: () => void; children: ReactNode }) { return <button className="choice" onClick={onClick}><span>{letter}</span>{children}</button> }

function Verdict({ score, onRestart }: { score: number; onRestart: () => void }) {
  return <div className="game game--verdict"><Masthead onHome={onRestart} status="VERDICT / CASE CLOSED" /><main className="verdict-layout"><section className="verdict-copy"><p className="overline">THE COURT HAS REACHED A DECISION</p><div className="verdict-seal">✓</div><h1>上下文<br /><em>无罪释放。</em></h1><p className="verdict-lede">你证明了：AgentGit 不只保存“改了什么”，还保存“为什么、由谁、在什么上下文里改”。这就是可继续的协作。</p><div className="score"><span>FINAL SCORE</span><strong>{score}<small>/ 5</small></strong><i style={{ '--score': `${Math.max(20, score * 20)}%` } as CSSProperties} /></div><div className="verdict-actions"><button className="button button--primary" onClick={onRestart}>再审一次</button><a className="button button--ghost" href="https://agent-git.com/docs/concepts">查看概念文档 <span>↗</span></a></div></section><section className="receipt"><div className="receipt-head"><span>CASE RECEIPT</span><span>AG / 001</span></div><p className="receipt-title">你的证据链</p><ol>{EVIDENCE.map((item, index) => <li key={item.id}><span className="receipt-check">✓</span><span><b>{item.label}</b><small>{item.subtitle}</small></span><em>{String(index + 1).padStart(2, '0')}</em></li>)}</ol><div className="receipt-footer"><span>KEEP THE CONTEXT</span><span>SHIP WITH INTENT</span></div></section></main></div>
}
