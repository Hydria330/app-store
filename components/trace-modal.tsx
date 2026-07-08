"use client"

// 全局双向溯源弹窗：评论 ↔ 痛点 ↔ PRD需求 ↔ 测试用例 互相跳转
import { Star } from "lucide-react"
import { useApp } from "@/context/app-context"
import { Modal } from "@/components/ui/modal"
import { Badge } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"
import type { CleanReview } from "@/lib/types"

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} 星`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < n ? "size-3 fill-warning text-warning" : "size-3 text-border"}
        />
      ))}
    </span>
  )
}

function ReviewItem({ r }: { r: CleanReview }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stars n={r.rating} />
          <span className="text-xs text-muted-foreground">{r.author}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          v{r.version} · {r.id}
        </span>
      </div>
      {r.title ? <p className="mt-1.5 text-sm font-medium text-foreground">{r.title}</p> : null}
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{r.content || "（无正文）"}</p>
    </div>
  )
}

export function TraceModal() {
  const { trace, closeTrace, snapshot, openTrace } = useApp()
  if (!trace || !snapshot) return null

  const reviewsFor = (ids: string[]) => snapshot.cleanReviews.filter((c) => ids.includes(c.id))

  let body: React.ReactNode = null

  if (trace.kind === "reviews") {
    const reviews = reviewsFor(trace.ids)
    body = reviews.length ? (
      <div className="flex flex-col gap-2">
        {reviews.map((r) => (
          <ReviewItem key={r.id} r={r} />
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">该条目无可溯源的原始评论。</p>
    )
  }

  if (trace.kind === "painpoint") {
    const pp = snapshot.painPoints.find((p) => p.id === trace.ids[0])
    const reviews = pp ? reviewsFor(pp.reviewIds) : []
    body = pp ? (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{pp.id}</Badge>
          <Badge tone={pp.severity === "P0" ? "danger" : pp.severity === "P1" ? "warning" : "muted"}>
            {pp.severity}
          </Badge>
          <span className="text-xs text-muted-foreground">{pp.category}</span>
        </div>
        <p className="text-sm text-foreground">{pp.summary}</p>
        <p className="text-xs font-medium text-muted-foreground">溯源评论（{reviews.length}）</p>
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </div>
      </div>
    ) : null
  }

  if (trace.kind === "req") {
    const req = snapshot.prd.find((r) => r.id === trace.ids[0])
    const reviews = req ? reviewsFor(req.reviewIds) : []
    const relatedTc = req ? snapshot.testCases.filter((t) => t.reqId === req.id) : []
    body = req ? (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{req.id}</Badge>
          <Badge tone="default">{req.version}</Badge>
          <span className="text-xs text-muted-foreground">{req.module}</span>
        </div>
        <p className="text-sm font-medium text-foreground">{req.title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{req.description}</p>
        <div>
          <p className="text-xs font-medium text-muted-foreground">验收标准</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-foreground">
            {req.acceptanceCriteria.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
        {relatedTc.length ? (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">关联测试用例：</span>
            {relatedTc.map((t) => (
              <Button key={t.id} variant="outline" size="xs" onClick={() => openTrace({ kind: "testcase", ids: [t.id], title: `测试用例 ${t.id}` })}>
                {t.id}
              </Button>
            ))}
          </div>
        ) : null}
        <p className="text-xs font-medium text-muted-foreground">溯源评论（{reviews.length}）</p>
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </div>
      </div>
    ) : null
  }

  if (trace.kind === "testcase") {
    const tc = snapshot.testCases.find((t) => t.id === trace.ids[0])
    const reviews = tc ? reviewsFor(tc.reviewIds) : []
    body = tc ? (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{tc.id}</Badge>
          <span className="text-xs text-muted-foreground">{tc.module}</span>
        </div>
        <p className="text-sm font-medium text-foreground">{tc.scenario}</p>
        <div className="grid gap-1 text-sm">
          <p><span className="text-muted-foreground">前置条件：</span>{tc.precondition}</p>
          <div>
            <span className="text-muted-foreground">操作步骤：</span>
            <ol className="mt-1 list-decimal pl-5 text-foreground">
              {tc.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <p><span className="text-muted-foreground">预期结果：</span>{tc.expected}</p>
          <p><span className="text-muted-foreground">用户痛点复述：</span>{tc.painPointRestated}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">双向跳转：</span>
          <Button variant="outline" size="xs" onClick={() => openTrace({ kind: "req", ids: [tc.reqId], title: `PRD 需求 ${tc.reqId}` })}>
            {tc.reqId}
          </Button>
        </div>
        <p className="text-xs font-medium text-muted-foreground">溯源评论（{reviews.length}）</p>
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </div>
      </div>
    ) : null
  }

  return (
    <Modal open onClose={closeTrace} title={trace.title} description="双向溯源 · 数据均来自本地存档的真实评论">
      {body}
    </Modal>
  )
}
