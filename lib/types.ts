// 全链路数据类型定义

export type StageStatus = "idle" | "running" | "success" | "error"

export interface StageState {
  id: number
  key: string
  title: string
  description: string
  status: StageStatus
  message?: string
  startedAt?: number
  finishedAt?: number
}

// Step1: 原始评论（Apple RSS 返回结构映射）
export interface RawReview {
  id: string
  title: string
  content: string
  rating: number // 1-5
  author: string
  version: string
  updated: string
}

// Step2: 清洗后的结构化评论
export interface CleanReview {
  id: string
  title: string
  content: string
  rating: number
  author: string
  version: string
  updated: string
  wordCount: number
  language: "en" | "zh" | "other"
  sentiment: "positive" | "neutral" | "negative"
}

export interface CleanRule {
  rule: string
  detail: string
  removed: number
}

// Step3: 痛点分析
export interface PainPoint {
  id: string
  name: string
  category: string
  frequency: number // 关联评论数
  severity: "P0" | "P1" | "P2"
  summary: string
  reviewIds: string[] // 溯源评论
  suspectedHallucination: boolean // 无匹配评论时标红
}

export interface SentimentBucket {
  name: string
  value: number
}

// Step4: 版本迭代规划
export type PlanBucket = "include" | "defer" | "longterm"

export interface VersionPlanItem {
  version: "V0" | "V1.1" | "V1.2"
  priority: "P0" | "P1" | "P2"
  label: string
  painPointIds: string[]
  bucket: PlanBucket
}

// Step5: PRD 需求
export interface PrdRequirement {
  id: string // REQ-001
  version: "V0" | "V1.1" | "V1.2"
  module: string
  title: string
  description: string
  acceptanceCriteria: string[]
  painPointIds: string[]
  reviewIds: string[] // 溯源评论，空则不渲染
}

// Step6: 测试用例
export interface TestCase {
  id: string // TC-001
  module: string
  scenario: string
  precondition: string
  steps: string[]
  expected: string // 对齐用户吐槽原文
  reqId: string
  painPointRestated: string
  reviewIds: string[]
}

export interface PipelineSnapshot {
  appId: string
  appLink: string
  createdAt: number
  rawReviews: RawReview[]
  cleanReviews: CleanReview[]
  cleanRules: CleanRule[]
  painPoints: PainPoint[]
  sentiment: SentimentBucket[]
  versionPlan: VersionPlanItem[]
  prd: PrdRequirement[]
  testCases: TestCase[]
  rssUrl: string
  rawJson: string
}

export interface AnalysisState {
  stages: StageState[]
  snapshot: PipelineSnapshot | null
  running: boolean
  globalError: string | null
}
