// 1. App Store RSS 链接ID解析 & 美区评论采集
export function extractAppId(url: string): string | null {
  const match = url.match(/id(\d+)/)
  return match ? match[1] : null
}

export async function fetchUSReviews(appId: string) {
  const proxyUrl = `/rss-proxy/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
  const res = await fetch(proxyUrl);
  
  if (!res.ok) {
    throw new Error(`获取评论失败: HTTP ${res.status}`);
  }
  
  const rawData = await res.json();
  const reviewList = rawData.feed?.entry || rawData.entry || [];
  
  if (!Array.isArray(reviewList)) {
    throw new Error('API 返回数据格式错误，无法解析');
  }
  
  return {
    requestUrl: `https://itunes.apple.com/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`,
    timestamp: new Date().toISOString(),
    rawJson: rawData,
    reviewList: reviewList
  };
}

// 2. 评论清洗拆分逻辑
function splitMultiDemandText(text: string) {
  if (!text || text.trim().length < 3) return [];
  return text.split(/[.;!？！。，、；]/g)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

export function cleanReviewData(rawReviews: any[]) {
  if (!Array.isArray(rawReviews)) return [];
  
  const cleaned: any[] = [];
  
  for (let idx = 0; idx < rawReviews.length; idx++) {
    const item = rawReviews[idx];
    if (!item || typeof item !== 'object') continue;

    // 尝试从多个字段提取内容
    let content = item.content?.label || item.summary?.label || item['im:text']?.label || '';
    const title = item.title?.label || item['im:name']?.label || '';
    
    // 如果 content 为空但有 title，用 title 作为 content
    if (!content && title) content = title;
    if (!content) continue;  // 如果还是空就跳过
    
    // 获取评分，防止为0
    const ratingRaw = item['im:rating']?.label || item.rating?.label || '5';
    const star = Math.min(5, Math.max(1, parseInt(String(ratingRaw).charAt(0)) || 5));
    
    // 获取 ID
    const reviewId = item.id?.label || `review_${idx}`;
    
    // 清洗文本
    let cleanText = String(content)
      .replace(/\n+/g, ' ')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) continue;
    
    // 如果内容很长，尝试分割；否则直接添加
    let segments = [cleanText];
    if (cleanText.length > 200) {
      const split = splitMultiDemandText(cleanText);
      if (split.length > 0) segments = split;
    }

    // 添加到结果集
    segments.forEach((singleText, segIdx) => {
      if (singleText && singleText.trim().length > 0) {
        cleaned.push({
          reviewId: `${reviewId}-${segIdx}`,
          star: star,
          rating: star,
          title: title,
          content: singleText.trim(),
          publishDate: item.updated?.label || item.published?.label || new Date().toISOString(),
          originalRaw: item
        });
      }
    });
  }
  
  return cleaned;
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
硬性输出规则：
1. 禁止输出任何开场白、中文解释、多余说明文字；
2. 只输出标准JSON，不要markdown代码块、注释；
3. 输出必须以 {{ 开头、}} 结尾，能直接被JSON.parse解析。
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
  // 直接请求本地服务端接口，不走前端代理
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ apiKey, prompt, data })
  })
  // 先捕获非JSON错误响应
  if (!res.ok) {
    const errText = await res.text()
    console.error("后端接口报错文本：", errText)
    throw new Error(errText)
  }
  const resJson = await res.json()
  console.log("硅基接口状态码：", res.status, "完整返回：", resJson)
  return resJson
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