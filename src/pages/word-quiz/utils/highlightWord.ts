/**
 * 在英文语境中高亮目标词（整词 + 常见屈折）
 */

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 生成目标词的常见屈折形式（严格集合，不做模糊前缀匹配） */
export function expandWordForms(word: string): string[] {
  const w = word.toLowerCase().trim()
  if (!w) return []

  const forms = new Set<string>([w])

  forms.add(`${w}s`)
  forms.add(`${w}es`)
  forms.add(`${w}ed`)
  forms.add(`${w}ing`)

  if (w.endsWith('e') && w.length > 2) {
    forms.add(`${w}d`)
    forms.add(`${w.slice(0, -1)}ing`)
  }

  if (w.endsWith('y') && w.length > 2 && !/[aeiou]y$/.test(w)) {
    forms.add(`${w.slice(0, -1)}ies`)
    forms.add(`${w.slice(0, -1)}ied`)
  }

  if (w.endsWith('ies') && w.length > 4) {
    forms.add(`${w.slice(0, -3)}y`)
  }

  if (w.endsWith('es') && w.length > 3) {
    forms.add(w.slice(0, -2))
    forms.add(w.slice(0, -1))
  } else if (w.endsWith('s') && w.length > 2) {
    forms.add(w.slice(0, -1))
  }

  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3)
    forms.add(stem)
    forms.add(`${stem}e`)
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) {
      forms.add(stem.slice(0, -1))
    }
  }

  if (w.endsWith('ed') && w.length > 3) {
    const stem = w.slice(0, -2)
    forms.add(stem)
    forms.add(`${stem}e`)
    forms.add(w.slice(0, -1))
  }

  return [...forms].filter((form) => form.length >= 2)
}

/** 高亮句子/短语中的目标词，返回带 <mark> 的 HTML */
export function highlightWordInText(text: string, targetWord: string): string {
  const forms = expandWordForms(targetWord).sort((a, b) => b.length - a.length)
  if (forms.length === 0) return text

  const pattern = forms.map(escapeRegExp).join('|')
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
