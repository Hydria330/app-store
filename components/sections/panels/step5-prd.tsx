"use client"

import { FileText, GitPullRequest } from "lucide-react"
import { useApp } from "@/context/app-context"
import { Badge } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"

export function Step5Prd() {
  const { snapshot, openTrace } = useApp()
  if (!snapshot) return null

  if (!snapshot.prd.length) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无可渲染需求。无溯源评论支撑的需求已被禁止渲染，以杜绝无依据的编造需求。
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5" />
        每条需求均附带溯源评论，无溯源评论的需求不予渲染。
      </p>
      {snapshot.prd.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{r.id}</Badge>
            <Badge tone="default">{r.version}</Badge>
            <span className="text-xs text-muted-foreground">{r.module}</span>
            <span className="text-sm font-medium text-foreground">{r.title}</span>
          </div>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{r.description}</p>
          <div className="mt-2">
            <p className="text-[11px] font-medium text-foreground">验收标准</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
              {r.acceptanceCriteria.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => openTrace({ kind: "req", ids: [r.id], title: `需求 ${r.id} 溯源` })}
            >
              <GitPullRequest className="size-3" />
              查看溯源评论（{r.reviewIds.length}）
            </Button>
            <span className="text-[11px] text-muted-foreground">关联痛点 {r.painPointIds.join(", ")}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
