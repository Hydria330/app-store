"use client"

import { useApp } from "@/context/app-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { exportTraceCsv, exportMarkdown, exportRawJson, exportAuditCredentials } from "@/lib/export"
import { FileSpreadsheet, FileText, FileJson, ShieldCheck, Table2 } from "lucide-react"

export function ExportCenter() {
  const { snapshot, auditCount, pushToast, openTrace } = useApp()
  const ready = !!snapshot?.testCases.length

  const exportActions = [
    {
      icon: FileSpreadsheet,
      title: "全链路关联对照表",
      desc: "评论 → 痛点 → PRD需求 → 测试用例 的一行式溯源映射（CSV，含 BOM 防乱码）",
      action: () => {
        if (!snapshot) return
        exportTraceCsv(snapshot)
        pushToast({ type: "success", message: "关联对照表已导出" })
      },
    },
    {
      icon: FileText,
      title: "PRD 与测试用例",
      desc: "结构化 Markdown 文档，每条需求与用例均附带溯源评论原文",
      action: () => {
        if (!snapshot) return
        exportMarkdown(snapshot)
        pushToast({ type: "success", message: "Markdown 文档已导出" })
      },
    },
    {
      icon: FileJson,
      title: "原始评论凭证",
      desc: "Apple RSS 接口的原始 JSON 返回，未经任何加工，用于事实核对",
      action: () => {
        if (!snapshot) return
        exportRawJson(snapshot)
        pushToast({ type: "success", message: "原始评论凭证已导出" })
      },
    },
    {
      icon: ShieldCheck,
      title: "本地存证凭证",
      desc: `IndexedDB 全量存档（原始接口 + LLM 请求响应 + 快照，共 ${auditCount} 条），防篡改可追溯`,
      action: async () => {
        await exportAuditCredentials()
        pushToast({ type: "success", message: "本地存证凭证已导出" })
      },
      always: true,
    },
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Table2 className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">区块四 · 双向溯源与导出中心</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        任意方向溯源：既能由测试用例反查到最初的用户吐槽，也能由某条差评正查它最终影响了哪些需求与用例。所有导出物均基于本地存档生成。
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {exportActions.map((a) => {
          const disabled = !a.always && !ready
          return (
            <div
              key={a.title}
              className="flex items-start gap-3 rounded-lg border border-border p-4 bg-card"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <a.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium">{a.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={disabled}
                  onClick={a.action}
                >
                  {disabled ? "待流水线完成" : "导出"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {ready && (
        <div className="mt-5 rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">快速双向溯源入口</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                openTrace({
                  kind: "reviews",
                  ids: snapshot!.cleanReviews.map((r) => r.id),
                  title: "全部有效评论",
                })
              }
            >
              查看全部评论（{snapshot!.cleanReviews.length}）
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                openTrace({
                  kind: "painpoint",
                  ids: snapshot!.painPoints.map((p) => p.id),
                  title: "全部痛点",
                })
              }
            >
              查看全部痛点（{snapshot!.painPoints.length}）
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
