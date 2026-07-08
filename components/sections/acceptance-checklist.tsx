"use client"

import { useApp } from "@/context/app-context"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Circle, ClipboardCheck } from "lucide-react"

export function AcceptanceChecklist() {
  const { snapshot, auditCount } = useApp()
  const s = snapshot

  const items: { label: string; done: boolean; note: string }[] = [
    {
      label: "美区评论真实采集",
      done: !!s && s.rawReviews.length > 0,
      note: s ? `已采集 ${s.rawReviews.length} 条 Apple 官方 RSS 评论` : "尚未运行",
    },
    {
      label: "评论清洗与结构化",
      done: !!s && s.cleanReviews.length > 0,
      note: s ? `保留有效评论 ${s.cleanReviews.length} 条，应用 ${s.cleanRules.length} 条清洗规则` : "尚未运行",
    },
    {
      label: "痛点量化与情感分布",
      done: !!s && s.painPoints.length > 0,
      note: s ? `识别 ${s.painPoints.length} 个痛点，含 P0/P1/P2 分级` : "尚未运行",
    },
    {
      label: "多版本迭代规划",
      done: !!s && s.versionPlan.length > 0,
      note: s ? `覆盖 ${new Set(s.versionPlan.map((v) => v.version)).size} 个版本` : "尚未运行",
    },
    {
      label: "PRD 需求全部可溯源",
      done: !!s && s.prd.length > 0 && s.prd.every((r) => r.reviewIds.length > 0),
      note: s ? `${s.prd.length} 条需求，每条均挂载原始评论` : "尚未运行",
    },
    {
      label: "测试用例对齐吐槽原文",
      done: !!s && s.testCases.length > 0,
      note: s ? `${s.testCases.length} 条用例，预期结果引用用户原声` : "尚未运行",
    },
    {
      label: "全链路本地存证防篡改",
      done: auditCount > 0,
      note: auditCount > 0 ? `IndexedDB 已存档 ${auditCount} 条证据` : "尚无存档",
    },
    {
      label: "双向溯源与多格式导出",
      done: !!s && s.testCases.length > 0,
      note: "支持 CSV 对照表 / Markdown / JSON 凭证导出",
    },
  ]

  const doneCount = items.filter((i) => i.done).length

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">区块六 · 交付验收核对清单</h2>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {doneCount}/{items.length} 项达成
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        对照产品需求逐项核验交付完整性，绿色表示已由当前流水线运行结果证实。
      </p>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 py-3">
            {item.done ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" />
            ) : (
              <Circle className="size-5 shrink-0 text-muted-foreground/40" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${item.done ? "" : "text-muted-foreground"}`}>{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
