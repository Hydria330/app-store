// 1. App Store RSS 链接ID解析 & 美区评论采集
export function extractAppId(url: string): string | null {
  const match = url.match(/id(\d+)/)
  return match ? match[1] : null
}

export async function fetchUSReviews(appId: string) {
  const proxyUrl = `/rss-proxy/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`
  const res = await fetch(proxyUrl)
  const rawData = await res.json()
  return {
    requestUrl: `https://itunes.apple.com/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`,
    timestamp: new Date().toISOString(),
    rawJson: rawData,
    reviewList: rawData.feed.entry || []
  }
}

// 2. 评论清洗拆分逻辑
function splitMultiDemandText(text: string) {
  return text.split(/[.;!？！]/).filter(s => s.trim().length > 5)
}

export function cleanReviewData(rawReviews: any[]) {
  const cleaned: any[] = []
  for (const item of rawReviews) {
    const title = item.title?.label || ''
    const content = item.content?.label || ''
    if (!title.trim() && !content.trim()) continue
    const cleanText = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?]/g, '')
    const splitTexts = splitMultiDemandText(cleanText)
    splitTexts.forEach((singleText, idx) => {
      cleaned.push({
        reviewId: `${item.id.label}-${idx}`,
        star: Number(item.rating?.label || 0),
        title,
        content: singleText,
        publishDate: item.updated?.label,
        originalRaw: item
      })
    })
  }
  return cleaned
}

// 3. IndexedDB 本地持久化存证
import { openDB } from 'idb'
export async function initDB() {
  return openDB('AppReviewAnalysisDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('rawApiData')) db.createObjectStore('rawApiData', { keyPath: 'requestUrl' })
      if (!db.objectStoreNames.contains('cleanReviews')) db.createObjectStore('cleanReviews', { keyPath: 'reviewId' })
      if (!db.objectStoreNames.contains('analysisSnapshot')) db.createObjectStore('analysisSnapshot', { keyPath: 'createTime' })
    }
  })
}
export async function saveRawData(data: any) {
  const db = await initDB()
  await db.put('rawApiData', data)
}
export async function saveCleanReviews(list: any[]) {
  const db = await initDB()
  const tx = db.transaction('cleanReviews', 'readwrite')
  list.forEach(item => tx.store.put(item))
  await tx.done
}
export async function saveAnalysisSnapshot(snap: any) {
  const db = await initDB()
  await db.put('analysisSnapshot', { ...snap, createTime: new Date().toISOString() })
}
export async function exportRawEvidence(requestUrl: string) {
  const db = await initDB()
  return db.get('rawApiData', requestUrl)
}

// 4. LLM 调用、标准化Prompt、AI幻觉检测
export const LLM_PROMPTS = {
  classifyReview: `
你是产品分析师，仅基于下方传入的清洗评论列表进行分类，输出标准JSON。
硬性约束：
1. 只能使用传入评论内真实存在的问题，禁止编造任何未提及功能；
2. 每条用户诉求必须绑定对应reviewId；
3. 固定5分类：Bug崩溃、交互体验、内容需求、付费广告负面、正向好评；
4. 每条痛点附带至少3条对应reviewId作为证据支撑。
评论数据集：{{reviewData}}
`,
  generatePRD: `
基于下方用户痛点集合生成标准化PRD，强制约束：
1. 每一条需求必须绑定对应reviewId数组，无评论证据禁止输出；
2. 分三栏清晰划分边界：本次纳入版本/暂不做需求/长期规划需求；
3. 每条需求尾部标注支撑该需求的全部原始评论ID列表；
痛点集合：{{painPointList}}
`,
  generateTestCase: `
基于下方PRD需求生成测试用例，硬性规则：
1. 用例字段：模块、测试场景、前置条件、操作步骤、预期结果、关联reviewId、原始用户痛点复述；
2. 预期结果必须直接回应用户原始吐槽原文，禁止通用模糊描述；
PRD完整内容：{{prdContent}}
`
}

export async function runLLMAnalysis(apiKey: string, prompt: string, data: any) {
  const filledPrompt = prompt
    .replace('{{reviewData}}', JSON.stringify(data))
    .replace('{{painPointList}}', JSON.stringify(data))
    .replace('{{prdContent}}', JSON.stringify(data))
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: filledPrompt }],
      temperature: 0.1
    })
  })
  return res.json()
}

export function detectHallucination(aiResult: any, cleanReviews: any[]) {
  const reviewTextPool = cleanReviews.map(item => item.content.toLowerCase())
  const suspectPoints: string[] = []
  const aiTexts = JSON.stringify(aiResult).toLowerCase()
  const wordList = aiTexts.match(/[\u4e00-\u9fa5a-zA-Z]{4,}/g) || []
  wordList.forEach(word => {
    if (!reviewTextPool.some(text => text.includes(word))) {
      suspectPoints.push(word)
    }
  })
  return [...new Set(suspectPoints)]
}