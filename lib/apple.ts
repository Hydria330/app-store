// Apple 官方美区 RSS Customer Reviews API 采集
// 放弃网页爬虫，仅使用官方接口；自动解析中美 App Store 链接提取数字 APP ID，强制拼接 us 美区接口
import type { RawReview } from "./types"

export class RateLimitError extends Error {
  constructor() {
    super("Apple RSS 接口限流（每分钟约 10 次），请稍后再试。")
    this.name = "RateLimitError"
  }
}

export class NetworkError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = "NetworkError"
  }
}

// 从任意区（含中国区 apps.apple.com/cn）App Store 链接中提取数字 APP ID
export function extractAppId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()
  // 纯数字直接作为 ID
  if (/^\d+$/.test(trimmed)) return trimmed
  // 匹配 idXXXXXXXX
  const m = trimmed.match(/id(\d{5,})/i)
  if (m) return m[1]
  // 兜底：取链接里最长的数字串
  const nums = trimmed.match(/\d{6,}/g)
  if (nums && nums.length) return nums.sort((a, b) => b.length - a.length)[0]
  return null
}

// 强制拼接美区接口 URL（展示用完整 URL）
export function buildRssUrl(appId: string, page = 1) {
  return `https://itunes.apple.com/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/page=${page}/json`
}

// 浏览器端通过 Next.js rewrite 代理，规避 Apple RSS 的 CORS 限制
function buildRssProxyUrl(appId: string, page = 1) {
  return `/rss-proxy/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/page=${page}/json`
}

interface AppleEntry {
  id?: { label?: string }
  author?: { name?: { label?: string } }
  "im:rating"?: { label?: string }
  "im:version"?: { label?: string }
  title?: { label?: string }
  content?: { label?: string }
  updated?: { label?: string }
}

function mapEntry(e: AppleEntry, idx: number): RawReview | null {
  // 第一条 entry 通常是 App 元信息（无 im:rating），需过滤
  if (!e["im:rating"]) return null
  return {
    id: e.id?.label || `entry-${idx}`,
    title: e.title?.label ?? "",
    content: e.content?.label ?? "",
    rating: Number.parseInt(e["im:rating"]?.label ?? "0", 10) || 0,
    author: e.author?.name?.label ?? "Anonymous",
    version: e["im:version"]?.label ?? "unknown",
    updated: e.updated?.label ?? "",
  }
}

export interface FetchResult {
  reviews: RawReview[]
  rawJson: string
  firstUrl: string
  pagesFetched: number
}

// 采集最新至多 500 条评论（API 客观上限），无全量历史
export async function fetchReviews(
  appId: string,
  maxPages = 10,
  onProgress?: (page: number, total: number) => void,
): Promise<FetchResult> {
  const all: RawReview[] = []
  const rawPages: unknown[] = []
  const firstUrl = buildRssUrl(appId, 1)

  for (let page = 1; page <= maxPages; page++) {
    const url = buildRssProxyUrl(appId, page)
    let res: Response
    try {
      res = await fetch(url, { headers: { Accept: "application/json" } })
    } catch {
      throw new NetworkError("无法获取 Apple RSS 评论（网络异常或代理不可用），请稍后重试。")
    }
    if (res.status === 403 || res.status === 429) throw new RateLimitError()
    if (!res.ok) throw new NetworkError(`Apple 接口返回异常状态码 ${res.status}`)

    const data = await res.json()
    rawPages.push(data)
    const entries: AppleEntry[] = data?.feed?.entry ?? []
    if (!Array.isArray(entries) || entries.length === 0) {
      onProgress?.(page, maxPages)
      break
    }
    for (let i = 0; i < entries.length; i++) {
      const r = mapEntry(entries[i], i)
      if (r) all.push(r)
    }
    onProgress?.(page, maxPages)
    if (all.length >= 500) break
    // 尊重限流，页间轻微延迟
    await new Promise((r) => setTimeout(r, 250))
  }

  // 去重
  const seen = new Set<string>()
  const deduped = all.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))

  return {
    reviews: deduped.slice(0, 500),
    rawJson: JSON.stringify(rawPages, null, 2),
    firstUrl,
    pagesFetched: rawPages.length,
  }
}
