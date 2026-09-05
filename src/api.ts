export type ImportedPaper = {
  id: string
  title: string
  authors: string[]
  year: string
  abstract: string
  categories: string[]
  sourceText: string
  texFiles: string[]
  sourceMode: 'tex' | 'abstract-only'
  sourceUrl: string
}

export type GeneratedStory = {
  caseTitle: string
  tagline: string
  summary: string
  keyFact: string
  question: string
  options: [string, string, string]
  correctOption: string
  correctFeedback: string
  keyIdeas: string[]
  scenes: { opening?: string; testimony?: string; commit?: string; branch?: string; merge?: string; verdict?: string }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `请求失败（${response.status}）`)
  return payload as T
}

export async function importArxiv(url: string) {
  return post<{ paper: ImportedPaper }>('/api/paper/import', { url })
}

export async function generateStory(paper: ImportedPaper) {
  return post<{ story: GeneratedStory }>('/api/paper/generate', { paper })
}
