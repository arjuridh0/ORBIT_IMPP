export interface Konten {
  [key: string]: string
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n|(?=\d+\)\s)/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}