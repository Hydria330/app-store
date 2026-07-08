// 导出工具：CSV（xlsx）、Markdown、JSON 凭证
import * as XLSX from "xlsx"
import type { PipelineSnapshot } from "./types"
import { exportAllAudit } from "./db"

export function downloadBlob(content: string | Blob, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 全链路关联对照表 CSV：评论 - 痛点 - PRD 需求 - 测试用例
export function exportTraceCsv(snap: PipelineSnapshot) {
  const rows: Record<string, string>[] = []
  for (const tc of snap.testCases) {
    const req = snap.prd.find((r) => r.id === tc.reqId)
    const pp = snap.painPoints.find((p) => req?.painPointIds.includes(p.id))
    for (const rid of tc.reviewIds) {
      const review = snap.cleanReviews.find((c) => c.id === rid)
      rows.push({
        评论ID: rid,
        评论原文: review ? `${review.title} ${review.content}`.slice(0, 300) : "",
        评论评分: review ? String(review.rating) : "",
        痛点ID: pp?.id ?? "",
        痛点: pp?.name ?? "",
        严重级: pp?.severity ?? "",
        PRD需求ID: req?.id ?? "",
        PRD需求: req?.title ?? "",
        版本: req?.version ?? "",
        测试用例ID: tc.id,
        测试场景: tc.scenario,
        预期结果: tc.expected,
      })
    }
  }
  if (!rows.length) rows.push({ 提示: "暂无可溯源的关联数据" })
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  // 加 BOM 防止中文乱码
  downloadBlob("\uFEFF" + csv, `全链路关联对照表-${snap.appId}.csv`, "text/csv;charset=utf-8")
}

// PRD + 测试用例 Markdown
export function exportMarkdown(snap: PipelineSnapshot) {
  const L: string[] = []
  L.push(`# App Store 美区评论分析报告`)
  L.push(``)
  L.push(`- APP ID：${snap.appId}`)
  L.push(`- 链接：${snap.appLink}`)
  L.push(`- 生成时间：${new Date(snap.createdAt).toLocaleString("zh-CN")}`)
  L.push(`- 采集评论：${snap.rawReviews.length} 条（有效 ${snap.cleanReviews.length} 条）`)
  L.push(``)
  L.push(`## 一、产品需求文档（PRD）`)
  if (!snap.prd.length) L.push(`> 无可溯源需求。`)
  for (const r of snap.prd) {
    L.push(``)
    L.push(`### ${r.id} ${r.title}（${r.version} / ${r.module}）`)
    L.push(`- 描述：${r.description}`)
    L.push(`- 验收标准：`)
    r.acceptanceCriteria.forEach((a) => L.push(`  - ${a}`))
    L.push(`- 溯源评论：`)
    r.reviewIds.forEach((rid) => {
      const rev = snap.cleanReviews.find((c) => c.id === rid)
      if (rev) L.push(`  - [${rev.rating}星] ${rev.title}：${rev.content}`.slice(0, 200))
    })
  }
  L.push(``)
  L.push(`## 二、测试用例`)
  if (!snap.testCases.length) L.push(`> 无测试用例。`)
  for (const tc of snap.testCases) {
    L.push(``)
    L.push(`### ${tc.id} ${tc.scenario}（关联 ${tc.reqId}）`)
    L.push(`- 模块：${tc.module}`)
    L.push(`- 前置条件：${tc.precondition}`)
    L.push(`- 操作步骤：`)
    tc.steps.forEach((s, i) => L.push(`  ${i + 1}. ${s}`))
    L.push(`- 预期结果：${tc.expected}`)
    L.push(`- 原始用户痛点复述：${tc.painPointRestated}`)
  }
  downloadBlob(L.join("\n"), `PRD与测试用例-${snap.appId}.md`, "text/markdown;charset=utf-8")
}

// 导出原始评论 JSON
export function exportRawJson(snap: PipelineSnapshot) {
  downloadBlob(snap.rawJson || JSON.stringify(snap.rawReviews, null, 2), `原始评论凭证-${snap.appId}.json`, "application/json")
}

// 导出 IndexedDB 全部存证凭证
export async function exportAuditCredentials() {
  const data = await exportAllAudit()
  downloadBlob(JSON.stringify(data, null, 2), `本地存证凭证-${Date.now()}.json`, "application/json")
}
