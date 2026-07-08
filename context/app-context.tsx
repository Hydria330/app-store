"use client"

// 全局状态管理：保存全流水线快照，串行驱动 6 阶段
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { AnalysisState, PipelineSnapshot, StageState } from "@/lib/types"
import { extractAppId, fetchReviews, buildRssUrl } from "@/lib/apple"
import {
  cleanReviews,
  buildSentiment,
  analyzePainPoints,
  planVersions,
  generatePrd,
  generateTestCases,
} from "@/lib/pipeline"
import { putAudit, countAudit } from "@/lib/db"

const DEFAULT_LINK = "https://apps.apple.com/us/app/workout-for-women-home-gym/id839285684"
const API_KEY_STORAGE = "appstore-analyzer-openai-key"

const STAGE_DEFS: Omit<StageState, "status">[] = [
  { id: 1, key: "collect", title: "美区评论数据采集", description: "Apple 官方 RSS Customer Reviews API" },
  { id: 2, key: "clean", title: "评论清洗结构化", description: "去空 / 去重 / 字段结构化" },
  { id: 3, key: "analyze", title: "评论分类 + 痛点量化分析", description: "情感分布 + Top10 痛点 + 溯源" },
  { id: 4, key: "plan", title: "多版本迭代路线规划", description: "V0 / V1.1 / V1.2 优先级划分" },
  { id: 5, key: "prd", title: "标准化 PRD 自动生成", description: "每条需求挂载溯源评论" },
  { id: 6, key: "test", title: "带溯源的测试用例生成", description: "预期结果对齐用户吐槽原文" },
]

function initStages(): StageState[] {
  return STAGE_DEFS.map((s) => ({ ...s, status: "idle" }))
}

interface Toast {
  id: number
  type: "success" | "error" | "info"
  message: string
}

// 双向溯源弹窗：可展示 评论 / 痛点 / PRD需求 / 测试用例 任一实体
export type TraceKind = "reviews" | "painpoint" | "req" | "testcase"
export interface TraceTarget {
  kind: TraceKind
  ids: string[]
  title: string
}

interface AppContextValue extends AnalysisState {
  appLink: string
  setAppLink: (v: string) => void
  apiKey: string
  setApiKey: (v: string) => void
  auditCount: number
  toasts: Toast[]
  pushToast: (t: Omit<Toast, "id">) => void
  dismissToast: (id: number) => void
  // 双向溯源联动
  trace: TraceTarget | null
  openTrace: (t: TraceTarget) => void
  closeTrace: () => void
  runPipeline: () => Promise<void>
  refreshAuditCount: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [appLink, setAppLink] = useState(DEFAULT_LINK)
  const [apiKey, setApiKeyState] = useState("")
  const [stages, setStages] = useState<StageState[]>(initStages)
  const [snapshot, setSnapshot] = useState<PipelineSnapshot | null>(null)
  const [running, setRunning] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [auditCount, setAuditCount] = useState(0)
  const [trace, setTrace] = useState<TraceTarget | null>(null)
  const toastId = useRef(0)

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(API_KEY_STORAGE) : null
    if (saved) setApiKeyState(saved)
    void refreshAuditCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setApiKey = useCallback((v: string) => {
    setApiKeyState(v)
    if (typeof window !== "undefined") localStorage.setItem(API_KEY_STORAGE, v)
  }, [])

  const refreshAuditCount = useCallback(async () => {
    const [raw, llm, snap] = await Promise.all([countAudit("raw"), countAudit("llm"), countAudit("snapshot")])
    setAuditCount(raw + llm + snap)
  }, [])

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const patchStage = useCallback((key: string, patch: Partial<StageState>) => {
    setStages((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }, [])

  const runPipeline = useCallback(async () => {
    setGlobalError(null)
    setSnapshot(null)
    setStages(initStages())
    setRunning(true)

    const appId = extractAppId(appLink)
    if (!appId) {
      setGlobalError("无法从输入中解析出数字 APP ID，请检查 App Store 链接。")
      pushToast({ type: "error", message: "解析 APP ID 失败" })
      setRunning(false)
      return
    }

    const snap: PipelineSnapshot = {
      appId,
      appLink,
      createdAt: Date.now(),
      rawReviews: [],
      cleanReviews: [],
      cleanRules: [],
      painPoints: [],
      sentiment: [],
      versionPlan: [],
      prd: [],
      testCases: [],
      rssUrl: buildRssUrl(appId, 1),
      rawJson: "",
    }

    try {
      // Step1 采集
      patchStage("collect", { status: "running", startedAt: Date.now() })
      const fetched = await fetchReviews(appId, 10)
      if (!fetched.reviews.length) {
        patchStage("collect", { status: "error", message: "接口未返回任何评论（可能是该 App 暂无美区评论或接口限制）。" })
        pushToast({ type: "error", message: "未采集到评论，已如实披露" })
        setRunning(false)
        return
      }
      snap.rawReviews = fetched.reviews
      snap.rawJson = fetched.rawJson
      await putAudit("raw", {
        key: `${appId}-raw-${snap.createdAt}`,
        appId,
        createdAt: snap.createdAt,
        type: "apple-rss",
        payload: JSON.parse(fetched.rawJson),
      })
      patchStage("collect", {
        status: "success",
        finishedAt: Date.now(),
        message: `采集 ${fetched.reviews.length} 条 / ${fetched.pagesFetched} 页`,
      })
      setSnapshot({ ...snap })

      // Step2 清洗
      patchStage("clean", { status: "running", startedAt: Date.now() })
      const { clean, rules } = cleanReviews(snap.rawReviews)
      snap.cleanReviews = clean
      snap.cleanRules = rules
      snap.sentiment = buildSentiment(clean)
      patchStage("clean", {
        status: "success",
        finishedAt: Date.now(),
        message: `有效评论 ${clean.length} 条`,
      })
      setSnapshot({ ...snap })

      // Step3 痛点分析（需要 LLM）
      patchStage("analyze", { status: "running", startedAt: Date.now() })
      const painPoints = await analyzePainPoints(clean, apiKey, appId)
      snap.painPoints = painPoints
      const suspicious = painPoints.filter((p) => p.suspectedHallucination).length
      patchStage("analyze", {
        status: "success",
        finishedAt: Date.now(),
        message: `识别 ${painPoints.length} 个痛点${suspicious ? `，${suspicious} 个疑似幻觉已标记` : ""}`,
      })
      setSnapshot({ ...snap })

      // Step4 版本规划
      patchStage("plan", { status: "running", startedAt: Date.now() })
      snap.versionPlan = planVersions(painPoints)
      patchStage("plan", {
        status: "success",
        finishedAt: Date.now(),
        message: `规划 ${snap.versionPlan.length} 个版本`,
      })
      setSnapshot({ ...snap })

      // Step5 PRD
      patchStage("prd", { status: "running", startedAt: Date.now() })
      const prd = await generatePrd(painPoints, apiKey, appId)
      snap.prd = prd
      patchStage("prd", {
        status: "success",
        finishedAt: Date.now(),
        message: `生成 ${prd.length} 条可溯源需求`,
      })
      setSnapshot({ ...snap })

      // Step6 测试用例
      patchStage("test", { status: "running", startedAt: Date.now() })
      const testCases = await generateTestCases(prd, painPoints, apiKey, appId)
      snap.testCases = testCases
      patchStage("test", {
        status: "success",
        finishedAt: Date.now(),
        message: `生成 ${testCases.length} 条测试用例`,
      })

      // 存证快照
      await putAudit("snapshot", {
        key: `${appId}-snapshot-${snap.createdAt}`,
        appId,
        createdAt: snap.createdAt,
        type: "pipeline-snapshot",
        payload: snap,
      })
      setSnapshot({ ...snap })
      await refreshAuditCount()
      pushToast({ type: "success", message: "全链路分析完成，证据已本地存档" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误"
      // 定位当前运行中的阶段并标红
      setStages((prev) => {
        const runningStage = prev.find((s) => s.status === "running")
        if (runningStage) {
          return prev.map((s) => (s.key === runningStage.key ? { ...s, status: "error" as const, message: msg } : s))
        }
        return prev
      })
      setGlobalError(msg)
      setSnapshot({ ...snap })
      pushToast({ type: "error", message: "流水线中断，详情见阶段提示" })
    } finally {
      await refreshAuditCount()
      setRunning(false)
    }
  }, [appLink, apiKey, patchStage, pushToast, refreshAuditCount])

  const value: AppContextValue = {
    stages,
    snapshot,
    running,
    globalError,
    appLink,
    setAppLink,
    apiKey,
    setApiKey,
    auditCount,
    toasts,
    pushToast,
    dismissToast,
    trace,
    openTrace: (t: TraceTarget) => setTrace(t),
    closeTrace: () => setTrace(null),
    runPipeline,
    refreshAuditCount,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
