"use client"

import { useApp } from "@/context/app-context"
import { Badge } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"
import type { PlanBucket } from "@/lib/types"

const BUCKET_LABEL: Record<PlanBucket, { text: string; tone: "success" | "warning" | "muted" }> = {
  include: { text: "纳入需求", tone: "success" },
  defer: { text: "暂不做需求", tone: "muted" },
  longterm: { text: "长期规划需求", tone: "warning" },
}

export function Step4Plan() {
  const { snapshot, openTrace } = useApp()
  if (!snapshot) return null

  if (!snapshot.versionPlan.length) {
    return <p className="text-sm text-muted-foreground">暂无有效痛点可规划版本（可能全部被标记为可疑幻觉）。</p>
  }

  const reviewCount = (ppIds: string[]) => {
    const set = new Set<string>()
    snapshot.painPoints
      .filter((p) => ppIds.includes(p.id))
      .forEach((p) => p.reviewIds.forEach((r) => set.add(r)))
    return set.size
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {snapshot.versionPlan.map((v) => {
        const pps = snapshot.painPoints.filter((p) => v.painPointIds.includes(p.id))
        const bucket = BUCKET_LABEL[v.bucket]
        return (
          <div key={v.version} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{v.version}</span>
                <Badge tone={v.priority === "P0" ? "danger" : v.priority === "P1" ? "warning" : "muted"}>
                  {v.priority}
                </Badge>
              </div>
              <Badge tone={bucket.tone}>{bucket.text}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{v.label}</p>
            <div className="flex gap-2 text-[11px] text-muted-foreground">
              <span>痛点 {v.painPointIds.length} 项</span>
              <span>·</span>
              <span>关联评论 {reviewCount(v.painPointIds)} 条</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {pps.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openTrace({ kind: "painpoint", ids: [p.id], title: `痛点 ${p.id}` })}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:border-primary"
                >
                  <span className="font-medium text-foreground">{p.id}</span>
                  <span className="ml-1 text-muted-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
