export type DiffPart = {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

/** 按中文单字 / 英文词 / 标点拆分，便于对照阅读 */
export function tokenize(text: string): string[] {
  return text.match(/[\u4e00-\u9fff]|[a-zA-Z0-9]+|\s+|[^\s]/g) ?? []
}

/**
 * 基于 LCS 的简易 token diff（纯前端，无依赖）
 */
export function diffTexts(before: string, after: string): DiffPart[] {
  const a = tokenize(before)
  const b = tokenize(after)

  if (a.length === 0 && b.length === 0) return []
  if (a.length === 0) return [{ type: 'insert', text: after }]
  if (b.length === 0) return [{ type: 'delete', text: before }]

  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const raw: DiffPart[] = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push({ type: 'equal', text: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: 'insert', text: b[j - 1] })
      j--
    } else if (i > 0) {
      raw.push({ type: 'delete', text: a[i - 1] })
      i--
    }
  }

  raw.reverse()
  return mergeAdjacent(raw)
}

function mergeAdjacent(parts: DiffPart[]): DiffPart[] {
  const result: DiffPart[] = []
  for (const part of parts) {
    const last = result[result.length - 1]
    if (last && last.type === part.type) {
      last.text += part.text
    } else {
      result.push({ ...part })
    }
  }
  return result
}
