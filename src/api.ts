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
  evidence: Array<{ label: string; subtitle: string; title: string; description: string; value: string; source: string; section?: string; quote?: string; glyph?: string }>
  claims?: Array<{ id: string; label: string; text: string; source: string; evidenceIds: string[] }>
  branches?: Array<{ id: string; label: string; text: string; summary: string; claimId: string; evidenceIds: string[]; correct: boolean }>
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

export async function generateStory(paper: ImportedPaper, apiKey: string) {
  return post<{ story: GeneratedStory }>('/api/paper/generate', { paper, apiKey })
}
