import {
  DEFAULT_RSS_FEEDS,
  RSS_FEEDS_STORAGE_KEY,
  type RssFeedConfig,
} from '@/constants/rss-feeds'

export interface RssItem {
  title: string
  link: string
  summary: string
  source: string
  pubDate?: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function textOf(el: Element | null): string {
  return el?.textContent?.trim() || ''
}

/** 解析 RSS 2.0 / Atom XML */
export function parseRssXml(xmlText: string, sourceName: string): RssItem[] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error(`RSS 解析失败：${sourceName}`)
  }

  const items: RssItem[] = []

  // RSS 2.0
  for (const item of Array.from(doc.querySelectorAll('channel > item'))) {
    const title = textOf(item.querySelector('title'))
    const link = textOf(item.querySelector('link'))
    const description =
      textOf(item.querySelector('description')) ||
      textOf(item.querySelector('content\\:encoded')) ||
      ''
    const pubDate = textOf(item.querySelector('pubDate')) || undefined
    if (!title) continue
    items.push({
      title,
      link,
      summary: stripHtml(description).slice(0, 280),
      source: sourceName,
      pubDate,
    })
  }

  if (items.length) return items

  // Atom
  for (const entry of Array.from(doc.querySelectorAll('entry'))) {
    const title = textOf(entry.querySelector('title'))
    const linkEl = entry.querySelector('link[href]') || entry.querySelector('link')
    const link =
      linkEl?.getAttribute('href') || textOf(linkEl) || textOf(entry.querySelector('id'))
    const summary =
      textOf(entry.querySelector('summary')) || textOf(entry.querySelector('content')) || ''
    const pubDate =
      textOf(entry.querySelector('updated')) ||
      textOf(entry.querySelector('published')) ||
      undefined
    if (!title) continue
    items.push({
      title,
      link,
      summary: stripHtml(summary).slice(0, 280),
      source: sourceName,
      pubDate,
    })
  }

  return items
}

async function fetchViaLocalProxy(feedUrl: string): Promise<string> {
  const res = await fetch(`/api/rss-proxy?url=${encodeURIComponent(feedUrl)}`)
  if (!res.ok) throw new Error(`本地代理失败 ${res.status}`)
  return res.text()
}

async function fetchViaAllOrigins(feedUrl: string): Promise<string> {
  const res = await fetch(
    `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
  )
  if (!res.ok) throw new Error(`CORS 中转失败 ${res.status}`)
  return res.text()
}

/** 拉取单个 feed 的 XML 文本（开发走 Vite 代理，生产走 allorigins） */
export async function fetchRssXml(feedUrl: string): Promise<string> {
  // 开发环境优先本地代理，避免依赖第三方
  if (import.meta.env.DEV) {
    try {
      return await fetchViaLocalProxy(feedUrl)
    } catch (error) {
      console.warn('[rss] local proxy failed, fallback allorigins:', error)
    }
  }

  try {
    return await fetchViaAllOrigins(feedUrl)
  } catch (error) {
    // 生产也再试一次本地路径（若用户自建了同路径反代）
    try {
      return await fetchViaLocalProxy(feedUrl)
    } catch {
      throw error
    }
  }
}

export function loadRssFeedConfigs(): RssFeedConfig[] {
  try {
    const raw = localStorage.getItem(RSS_FEEDS_STORAGE_KEY)
    if (!raw) return DEFAULT_RSS_FEEDS.map((f) => ({ ...f }))
    const parsed = JSON.parse(raw) as RssFeedConfig[]
    if (!Array.isArray(parsed) || !parsed.length) {
      return DEFAULT_RSS_FEEDS.map((f) => ({ ...f }))
    }
    // 合并默认源：保留用户开关，补全新预置
    const byId = new Map(parsed.map((f) => [f.id, f]))
    const merged: RssFeedConfig[] = DEFAULT_RSS_FEEDS.map((def) => {
      const prev = byId.get(def.id)
      return prev
        ? { ...def, enabled: prev.enabled !== false, url: prev.url || def.url, name: prev.name || def.name }
        : { ...def }
    })
    for (const f of parsed) {
      if (!merged.some((m) => m.id === f.id) && f.url) {
        merged.push({
          id: f.id,
          name: f.name || f.id,
          url: f.url,
          enabled: f.enabled !== false,
        })
      }
    }
    return merged
  } catch {
    return DEFAULT_RSS_FEEDS.map((f) => ({ ...f }))
  }
}

export function saveRssFeedConfigs(feeds: RssFeedConfig[]) {
  localStorage.setItem(RSS_FEEDS_STORAGE_KEY, JSON.stringify(feeds))
}

/**
 * 拉取已启用源的最新条目，按源交错合并后截断。
 */
export async function fetchLatestRssItems(limit = 18): Promise<RssItem[]> {
  const feeds = loadRssFeedConfigs().filter((f) => f.enabled && f.url)
  if (!feeds.length) return []

  const perFeed = Math.max(4, Math.ceil(limit / feeds.length) + 1)
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const xml = await fetchRssXml(feed.url)
      return parseRssXml(xml, feed.name).slice(0, perFeed)
    }),
  )

  const buckets: RssItem[][] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length) buckets.push(r.value)
    else if (r.status === 'rejected') console.warn('[rss] feed failed:', r.reason)
  }

  if (!buckets.length) {
    throw new Error('无法拉取新闻源，请检查网络或稍后重试')
  }

  // 交错合并，避免同一源占满
  const merged: RssItem[] = []
  let i = 0
  while (merged.length < limit) {
    let added = false
    for (const bucket of buckets) {
      if (i < bucket.length) {
        merged.push(bucket[i])
        added = true
        if (merged.length >= limit) break
      }
    }
    if (!added) break
    i += 1
  }
  return merged
}

export function formatRssItemsForPrompt(items: RssItem[]): string {
  return items
    .map(
      (item, idx) =>
        `${idx + 1}. [${item.source}] ${item.title}\n   link: ${item.link}\n   summary: ${item.summary || '(no summary)'}`,
    )
    .join('\n')
}
