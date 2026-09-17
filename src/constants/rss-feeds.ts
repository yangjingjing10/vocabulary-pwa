/** 预置英文新闻 RSS（用户可在设置里开关） */
export interface RssFeedConfig {
  id: string
  name: string
  url: string
  enabled: boolean
}

export const DEFAULT_RSS_FEEDS: RssFeedConfig[] = [
  {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    enabled: true,
  },
  {
    id: 'npr-news',
    name: 'NPR News',
    url: 'https://feeds.npr.org/1001/rss.xml',
    enabled: true,
  },
  {
    id: 'guardian-world',
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    enabled: true,
  },
]

export const RSS_FEEDS_STORAGE_KEY = 'app_rss_feeds'
