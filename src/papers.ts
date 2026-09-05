export type PaperId = 'attention' | 'streaming' | 'custom'

export type PaperScenes = {
  opening?: string
  testimony?: string
  commit?: string
  branch?: string
  merge?: string
  verdict?: string
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
  },
  streaming: {
    id: 'streaming',
    label: 'STREAMINGLLM',
    title: 'Efficient Streaming Language Models with Attention Sinks',
    subtitle: 'Attention sinks / long context',
    year: '2023',
    authors: 'Xiao et al.',
    caseTitle: '四个 token 的锚点',
    tagline: '当上下文无限延伸，模型需要记住的不只是最近窗口，还有最初的 attention sink。',
    summary: '论文发现，单纯丢弃旧 KV 的 window attention 会在超出缓存后失稳；保留最初 token 的 KV 作为 attention sink，再配合最近窗口，可以在不微调的情况下稳定流式语言建模。',
    keyFact: '核心线索：attention sink + sliding window + KV cache',
    question: '哪种策略最接近 StreamingLLM 的关键做法？',
    options: ['只保留最近窗口，完全丢弃最初 token', '保留初始 attention sink，再保留最近窗口的 KV', '每次上下文变长都重新训练一个更大的模型'],
    correctOption: '保留初始 attention sink，再保留最近窗口的 KV',
    correctFeedback: '指证成功：StreamingLLM 把“最初的锚点”和“最近的窗口”一起留下，让流式上下文保持稳定。',
    sourceUrl: 'https://arxiv.org/abs/2309.17453',
    sourceLabel: 'arXiv · 2309.17453',
  },
}
