// 6 阶段串行流水线核心逻辑
import type {
  RawReview,
  CleanReview,
  CleanRule,
  PainPoint,
  SentimentBucket,
  VersionPlanItem,
  PrdRequirement,
  TestCase,
} from "./types"
import { callLLMJson } from "./openai"

// ---------- Step2 清洗结构化（纯前端确定性规则） ----------
function detectLang(text: string): CleanReview["language"] {
  if (/[\u4e00-\u9fa5]/.test(text)) return "zh"
  if (/[a-zA-Z]/.test(text)) return "en"
  return "other"
}

export function cleanReviews(raw: RawReview[]): { clean: CleanReview[]; rules: CleanRule[] } {
  const rules: CleanRule[] = []
  let emptyRemoved = 0
  let shortRemoved = 0
  let dupRemoved = 0

  const seen = new Set<string>()
  const clean: CleanReview[] = []

  for (const r of raw) {
    const merged = `${r.title} ${r.content}`.trim()
    if (!merged) {
      emptyRemoved++
      continue
    }
    if (merged.replace(/\s/g, "").length < 3) {
      shortRemoved++
      continue
    }
    const sig = merged.toLowerCase().slice(0, 80)
    if (seen.has(sig)) {
      dupRemoved++
      continue
    }
    seen.add(sig)

    const sentiment: CleanReview["sentiment"] =
      r.rating >= 4 ? "positive" : r.rating === 3 ? "neutral" : "negative"

    clean.push({
      id: r.id,
      title: r.title.trim(),
      content: r.content.trim(),
      rating: r.rating,
      author: r.author,
      version: r.version,
      updated: r.updated,
      wordCount: merged.split(/\s+/).filter(Boolean).length,
      language: detectLang(merged),
      sentiment,
    })
  }

  rules.push({ rule: "过滤空评论", detail: "标题与正文均为空的记录", removed: emptyRemoved })
  rules.push({ rule: "过滤过短评论", detail: "有效字符数 < 3 的记录", removed: shortRemoved })
  rules.push({ rule: "去重", detail: "标题+正文前 80 字符签名重复", removed: dupRemoved })
  rules.push({ rule: "字段结构化", detail: "补齐字数、语言、情感倾向标签", removed: 0 })

  return { clean, rules }
}

// ---------- 情感分布（确定性） ----------
export function buildSentiment(clean: CleanReview[]): SentimentBucket[] {
  const pos = clean.filter((c) => c.sentiment === "positive").length
  const neu = clean.filter((c) => c.sentiment === "neutral").length
  const neg = clean.filter((c) => c.sentiment === "negative").length
  return [
    { name: "正面(4-5星)", value: pos },
    { name: "中性(3星)", value: neu },
    { name: "负面(1-2星)", value: neg },
  ]
}

// ---------- Step3 痛点量化分析（LLM + 后置校验） ----------
interface LLMPainPoint {
  name: string
  category: string
  severity: "P0" | "P1" | "P2"
  summary: string
  reviewIds: string[]
}

// 关键词后置校验：从评论文本中为痛点匹配佐证，防幻觉
function keywordSupport(pp: LLMPainPoint, clean: CleanReview[]): string[] {
  const declared = pp.reviewIds.filter((id) => clean.some((c) => c.id === id))
  if (declared.length > 0) return declared
  // LLM 未给出有效 ID 时，用关键词回溯匹配
  const tokens = `${pp.name} ${pp.summary}`
    .toLowerCase()
    .split(/[^a-z\u4e00-\u9fa5]+/)
    .filter((t) => t.length >= 3)
  const matched = clean
    .filter((c) => {
      const text = `${c.title} ${c.content}`.toLowerCase()
      return tokens.some((t) => text.includes(t))
    })
    .slice(0, 5)
    .map((c) => c.id)
  return matched
}

export async function analyzePainPoints(
  clean: CleanReview[],
  apiKey: string,
  appId: string,
): Promise<PainPoint[]> {
  // 仅传入负面/中性评论作为痛点来源，控制上下文体积
  const source = clean
    .filter((c) => c.sentiment !== "positive")
    .slice(0, 200)
    .map((c) => ({ id: c.id, rating: c.rating, text: `${c.title}. ${c.content}`.slice(0, 400) }))

  const fallback = clean.slice(0, 120).map((c) => ({
    id: c.id,
    rating: c.rating,
    text: `${c.title}. ${c.content}`.slice(0, 400),
  }))
  const payload = source.length >= 5 ? source : fallback

  const system =
    "你是资深产品分析师。只能基于用户提供的评论列表归纳痛点，禁止编造评论中不存在的问题。" +
    "reviewIds 只能引用输入列表中真实存在的 id。输出 JSON。"
  const user =
    `以下是清洗后的 App Store 美区评论（JSON 数组，含 id/rating/text）：\n` +
    `${JSON.stringify(payload)}\n\n` +
    `请归纳 Top 10 用户痛点，严格返回 JSON：{"painPoints":[{"name":"痛点名","category":"分类","severity":"P0|P1|P2","summary":"一句话概括","reviewIds":["引用的真实评论id，至少1个"]}]}。` +
    `severity 判定：导致崩溃/无法使用/付费纠纷=P0；体验受损/功能缺失=P1；内容与优化建议=P2。`

  const res = await callLLMJson<{ painPoints: LLMPainPoint[] }>({
    apiKey,
    appId,
    stage: "step3-painpoints",
    system,
    user,
  })

  const list = (res.painPoints ?? []).slice(0, 10)
  return list.map((pp, i) => {
    const reviewIds = keywordSupport(pp, clean)
    return {
      id: `PP-${String(i + 1).padStart(2, "0")}`,
      name: pp.name,
      category: pp.category || "未分类",
      severity: pp.severity || "P1",
      summary: pp.summary || "",
      frequency: reviewIds.length,
      reviewIds,
      // 前端后置校验：AI 产出痛点无任何匹配评论 → 标记为可疑幻觉
      suspectedHallucination: reviewIds.length === 0,
    }
  })
}

// ---------- Step4 多版本迭代路线规划（确定性映射） ----------
export function planVersions(painPoints: PainPoint[]): VersionPlanItem[] {
  const valid = painPoints.filter((p) => !p.suspectedHallucination)
  const p0 = valid.filter((p) => p.severity === "P0")
  const p1 = valid.filter((p) => p.severity === "P1")
  const p2 = valid.filter((p) => p.severity === "P2")

  const items: VersionPlanItem[] = []
  if (p0.length)
    items.push({
      version: "V0",
      priority: "P0",
      label: "紧急修复",
      painPointIds: p0.map((p) => p.id),
      bucket: "include",
    })
  if (p1.length)
    items.push({
      version: "V1.1",
      priority: "P1",
      label: "体验优化",
      painPointIds: p1.map((p) => p.id),
      bucket: "include",
    })
  if (p2.length)
    items.push({
      version: "V1.2",
      priority: "P2",
      label: "内容迭代",
      painPointIds: p2.map((p) => p.id),
      bucket: p2.length > 3 ? "longterm" : "defer",
    })
  return items
}

// ---------- Step5 标准化 PRD 生成（LLM + 溯源校验） ----------
interface LLMReq {
  module: string
  title: string
  description: string
  acceptanceCriteria: string[]
  painPointId: string
}

export async function generatePrd(
  painPoints: PainPoint[],
  apiKey: string,
  appId: string,
): Promise<PrdRequirement[]> {
  const valid = painPoints.filter((p) => !p.suspectedHallucination)
  if (!valid.length) return []

  const ppInput = valid.map((p) => ({
    id: p.id,
    name: p.name,
    severity: p.severity,
    summary: p.summary,
    frequency: p.frequency,
  }))

  const system =
    "你是资深产品经理。只能基于给定痛点撰写需求，每条需求必须关联一个 painPointId。禁止创造与痛点无关的需求。输出 JSON。"
  const user =
    `以下是量化后的用户痛点：\n${JSON.stringify(ppInput)}\n\n` +
    `请为每个痛点生成 1 条标准化 PRD 需求，严格返回 JSON：` +
    `{"requirements":[{"module":"所属模块","title":"需求标题","description":"需求描述","acceptanceCriteria":["验收标准1","验收标准2"],"painPointId":"关联痛点id"}]}`

  const res = await callLLMJson<{ requirements: LLMReq[] }>({
    apiKey,
    appId,
    stage: "step5-prd",
    system,
    user,
  })

  const versionOf = (sev: string): PrdRequirement["version"] =>
    sev === "P0" ? "V0" : sev === "P1" ? "V1.1" : "V1.2"

  const out: PrdRequirement[] = []
  ;(res.requirements ?? []).forEach((r, i) => {
    const pp = valid.find((p) => p.id === r.painPointId)
    if (!pp) return // 无法关联痛点 → 丢弃
    const reviewIds = pp.reviewIds
    if (!reviewIds.length) return // 无溯源评论的需求禁止渲染
    out.push({
      id: `REQ-${String(i + 1).padStart(3, "0")}`,
      version: versionOf(pp.severity),
      module: r.module || pp.category,
      title: r.title,
      description: r.description,
      acceptanceCriteria: r.acceptanceCriteria?.length ? r.acceptanceCriteria : ["满足痛点对应的用户诉求"],
      painPointIds: [pp.id],
      reviewIds,
    })
  })
  return out
}

// ---------- Step6 带溯源的测试用例生成（LLM） ----------
interface LLMTestCase {
  reqId: string
  scenario: string
  precondition: string
  steps: string[]
  expected: string
}

export async function generateTestCases(
  prd: PrdRequirement[],
  painPoints: PainPoint[],
  apiKey: string,
  appId: string,
): Promise<TestCase[]> {
  if (!prd.length) return []

  const reqInput = prd.map((r) => ({
    id: r.id,
    module: r.module,
    title: r.title,
    acceptanceCriteria: r.acceptanceCriteria,
  }))

  const system =
    "你是资深测试工程师。只能基于给定 PRD 需求生成测试用例，预期结果必须对齐需求验收标准。输出 JSON。"
  const user =
    `以下是 PRD 需求：\n${JSON.stringify(reqInput)}\n\n` +
    `请为每条需求生成 1 条测试用例，严格返回 JSON：` +
    `{"testCases":[{"reqId":"关联需求id","scenario":"测试场景","precondition":"前置条件","steps":["步骤1","步骤2"],"expected":"预期结果"}]}`

  const res = await callLLMJson<{ testCases: LLMTestCase[] }>({
    apiKey,
    appId,
    stage: "step6-testcases",
    system,
    user,
  })

  const out: TestCase[] = []
  ;(res.testCases ?? []).forEach((tc, i) => {
    const req = prd.find((r) => r.id === tc.reqId)
    if (!req) return
    const pp = painPoints.find((p) => req.painPointIds.includes(p.id))
    out.push({
      id: `TC-${String(i + 1).padStart(3, "0")}`,
      module: req.module,
      scenario: tc.scenario,
      precondition: tc.precondition || "已安装最新版本并完成登录",
      steps: tc.steps?.length ? tc.steps : ["执行需求对应操作"],
      expected: tc.expected || req.acceptanceCriteria[0],
      reqId: req.id,
      painPointRestated: pp?.summary || pp?.name || "",
      reviewIds: req.reviewIds,
    })
  })
  return out
}
