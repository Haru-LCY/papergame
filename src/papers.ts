export type PaperId = 'attention' | 'voidpadding' | 'custom'

export type PaperScenes = {
  opening?: string
  testimony?: string
  commit?: string
  branch?: string
  merge?: string
  verdict?: string
}

export type PaperEvidence = {
  label: string
  subtitle: string
  title: string
  description: string
  value: string
  source: string
  section?: string
  quote?: string
  glyph?: string
}

export type PaperClaim = {
  id: string
  label: string
  text: string
  source: string
  evidenceIds: string[]
}

export type PaperBranch = {
  id: string
  label: string
  text: string
  summary: string
  claimId: string
  evidenceIds: string[]
  correct: boolean
}

export type PaperCase = {
  id: PaperId
  label: string
  title: string
  subtitle: string
  year: string
  authors: string
  caseTitle: string
  tagline: string
  summary: string
  keyFact: string
  question: string
  options: [string, string, string]
  correctOption: string
  correctFeedback: string
  sourceUrl: string
  sourceLabel: string
  sourceMode?: 'curated' | 'arxiv-deepseek'
  keyIdeas?: string[]
  scenes?: PaperScenes
  evidence?: PaperEvidence[]
  claims?: PaperClaim[]
  branches?: PaperBranch[]
}

export const PAPERS: Record<Exclude<PaperId, 'custom'>, PaperCase> = {
  attention: {
    id: 'attention',
    label: 'ATTENTION',
    title: 'Attention Is All You Need',
    subtitle: 'Transformer / self-attention',
    year: '2017',
    authors: 'Vaswani et al.',
    caseTitle: '被重新分配的注意力',
    tagline: 'Transformer 把序列建模从“按顺序读”改成“同时看重要关系”。',
    summary: '论文提出 Transformer：一个完全基于 attention 的 encoder-decoder 架构，移除了 recurrence 与 convolution，并在机器翻译任务上展示了更好的并行化与训练效率。',
    keyFact: '核心线索：self-attention + positional encoding + encoder-decoder',
    question: '哪句话准确描述了这篇论文的关键转折？',
    options: ['它依赖 RNN 逐词处理输入', '它以 attention 为核心并移除 recurrence 与 convolution', '它只研究了 KV cache 的压缩'],
    correctOption: '它以 attention 为核心并移除 recurrence 与 convolution',
    correctFeedback: '指证成功：Transformer 的关键不是“更大的记忆”，而是让每个位置直接关注其它位置。',
    sourceUrl: 'https://arxiv.org/abs/1706.03762',
    sourceLabel: 'arXiv · 1706.03762',
    claims: [
      { id: 'architecture', label: '架构转折', text: 'Transformer 以 attention 为核心，并移除了 recurrence 与 convolution。', source: '摘要 / Section 3', evidenceIds: ['P1', 'P3'] },
      { id: 'translation', label: '翻译结果', text: 'Transformer 在 WMT14 英德和英法任务上取得论文报告的高质量结果。', source: '摘要 / Table 2–3', evidenceIds: ['P1', 'P2'] },
    ],
    branches: [
      { id: 'rnn-sequential', label: '仍是 RNN 式顺序处理', text: 'Transformer 只是换名，仍需等待前一个位置完成。', summary: '这条解释与论文“移除 recurrence、提升并行化”的描述冲突。', claimId: 'architecture', evidenceIds: [], correct: false },
      { id: 'attention-parallel', label: 'attention 并行建模', text: '每个位置可以直接关注其它位置，并用 positional encoding 保留顺序信息。', summary: '这条解释同时符合论文架构描述和 WMT14 实验结果。', claimId: 'architecture', evidenceIds: ['P1', 'P3'], correct: true },
    ],
    scenes: {
      opening: '“本庭审理《Attention Is All You Need》：旧式 RNN 像排队传话，Transformer 却让每个位置直接查看其它位置。辩护人，请先把这份架构证物登记入卷宗。”',
      testimony: '“我主张 Transformer 只是把 RNN 换了个名字；它仍得按顺序等待，也没有任何翻译成绩能证明差异。”',
      commit: '“论文明确移除了 recurrence 与 convolution，靠 self-attention、positional encoding 和 encoder-decoder 组成新架构。请封存一条可复核的快照。”',
      branch: '“检方追问：既然每个位置都能看见整句，模型如何保持可训练？请在调查中核对论文的 6+6 层、8 heads 配置。”',
      merge: '“陪审团：调查确认了 base Transformer 的模型配置，也找到了 WMT14 英德 28.4 BLEU 与英法 41.8 BLEU 的结果。请把审查后的证据纳入最终结论。”',
      verdict: '“结案：架构、并行化和 WMT14 结果已经连成证据链。Transformer 的转折不是口号，而是可复核的设计与实验。”',
    },
    evidence: [
      { label: 'RESULT', subtitle: 'WMT14 EN→DE', title: '28.4 BLEU：超过既有最佳结果 2+ 分', description: 'Transformer big 在 WMT 2014 英德翻译上达到 28.4 BLEU，超过包括 ensemble 在内的既有最佳结果 2 分以上。', value: '28.4 BLEU · +2 以上', source: '论文摘要 / Table 2', section: 'Abstract / Table 2', quote: 'Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task.', glyph: '↗' },
      { label: 'RESULT', subtitle: 'WMT14 EN→FR', title: '41.8 BLEU：单模型 SOTA', description: '在 WMT 2014 英法任务上，单个 Transformer big 达到 41.8 BLEU；论文报告训练耗时约 3.5 天。', value: '41.8 BLEU · 3.5 days', source: '论文摘要 / Table 2–3', section: 'Abstract / Table 2–3', quote: 'On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8.', glyph: 'Σ' },
      { label: 'DESIGN', subtitle: 'MODEL CONFIG', title: '6 层、8 头、dₘₒdₑₗ=512', description: 'Base Transformer 使用 6 层 encoder 与 6 层 decoder、8 个 attention heads，模型维度 d_model=512。', value: '6 + 6 layers · 8 heads', source: 'Section 3 / Table 3', section: 'Section 3 / Table 3', quote: 'The base model has 6 layers in the encoder and decoder, 8 attention heads, and d_model = 512.', glyph: '#' },
    ],
  },
  voidpadding: {
    id: 'voidpadding',
    label: 'VOIDPADDING',
    title: 'VoidPadding',
    subtitle: 'arXiv · 2606.17999',
    year: '2026',
    authors: 'VoidPadding authors',
    caseTitle: '填充位里的真相',
    tagline: 'VoidPadding 研究如何识别并利用序列中的 padding 空间。',
    summary: '这是一篇来自 arXiv 的 VoidPadding 论文案件。玩家需要回到论文摘要、方法和实验，区分论文真正验证的主张与未经证据支持的解释。',
    keyFact: '核心线索：VoidPadding · 方法设计 · 实验证据',
    question: '哪句话最准确地概括了这篇论文的贡献？',
    options: ['论文只讨论了排版，没有提出方法', '论文提出 VoidPadding 方法并用实验检验其主张', '论文完全不需要实验就能证明结论'],
    correctOption: '论文提出 VoidPadding 方法并用实验检验其主张',
    correctFeedback: '指证成功：VoidPadding 的关键是把方法设计和可复核的实验结果连在一起。',
    sourceUrl: 'https://arxiv.org/abs/2606.17999',
    sourceLabel: 'arXiv · 2606.17999',
    claims: [
      { id: 'sink-window', label: '缓存方法', text: 'StreamingLLM 保留初始 attention sink，再保留最近窗口的 KV。', source: '摘要 / Section 3', evidenceIds: ['P3'] },
      { id: 'streaming-stability', label: '流式稳定性', text: '这个组合让有限窗口训练的模型可以稳定处理超长输入，而且无需微调。', source: '摘要', evidenceIds: ['P1', 'P3'] },
      { id: 'throughput', label: '吞吐提升', text: 'StreamingLLM 相比滑动窗口重算基线，最高获得 22.2× speedup。', source: '摘要', evidenceIds: ['P2'] },
    ],
    branches: [
      { id: 'window-only', label: '只保留最近窗口', text: '丢掉最初 token 的 KV，只要窗口足够近就能稳定运行。', summary: '论文明确指出单纯 window attention 在超过缓存长度后会失稳。', claimId: 'sink-window', evidenceIds: [], correct: false },
      { id: 'sink-window', label: 'attention sink + 最近窗口', text: '保留初始 token 的 KV 作为 sink，再缓存最近窗口。', summary: '这条解释符合论文方法，也能解释 4M tokens 和 22.2× speedup。', claimId: 'sink-window', evidenceIds: ['P1', 'P2', 'P3'], correct: true },
    ],
    scenes: {
      opening: '“本庭审理《Efficient Streaming Language Models with Attention Sinks》：当旧 token 被丢弃，最初的几个 token 仍像锚点维持注意力分布。辩护人，请先登记这份流式缓存卷宗。”',
      testimony: '“只要保留最近窗口，模型就能无限流式运行；开头 token 的 KV 完全可以丢掉。”',
      commit: '“论文指出，单纯的 sliding window 会在超出缓存后失稳；关键方法是保留最初的 attention sink，再保留最近窗口的 KV。请把这条证据封存。”',
      branch: '“调查要核对：不做 finetuning，为什么仍能稳定处理超长上下文？请对照论文报告的连续输入长度与缓存策略。”',
      merge: '“陪审团：调查找到最长约 4M tokens 的稳定流式处理，以及相对完整上下文重算 22.2× 的速度提升。请把实验证据纳入最终结论。”',
      verdict: '“结案：sink 固定注意力锚点，window 控制缓存长度；StreamingLLM 用论文数据同时钉住稳定性与效率。”',
    },
    evidence: [
      { label: 'RESULT', subtitle: 'STREAM LENGTH', title: '最长可稳定处理 4M tokens', description: 'StreamingLLM 将初始 attention sink 与最近窗口一起保留，使流式语言模型可以处理长达约 4M tokens 的连续输入。', value: '4M tokens', source: '论文摘要', section: 'Abstract', quote: 'StreamingLLM can enable ... stable and efficient language modeling with up to 4 million tokens and more.', glyph: '↗' },
      { label: 'RESULT', subtitle: 'THROUGHPUT', title: '相比重算快 22.2×', description: '论文报告 StreamingLLM 相比每次重新计算完整上下文可获得 22.2× 的速度提升，同时避免超出缓存后的性能崩溃。', value: '22.2× speedup', source: '论文摘要', section: 'Abstract', quote: 'StreamingLLM outperforms the sliding window recomputation baseline by up to 22.2x speedup.', glyph: 'Σ' },
      { label: 'METHOD', subtitle: 'NO FINETUNING', title: '只保留初始 sink + 最近窗口', description: '方法不要求重新训练：保留最初几个 token 的 KV 作为 attention sink，再保留滑动窗口内最近 token 的 KV。', value: 'sink + window · no FT', source: 'Section 3 / Method', section: 'Section 3 / Method', quote: 'Keeping the KV of initial tokens will largely recover the performance of window attention.', glyph: '#' },
    ],
  },
}
