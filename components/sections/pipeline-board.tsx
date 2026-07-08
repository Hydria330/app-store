"use client"

import { CheckCircle2, Loader2, Circle, AlertTriangle, Workflow } from "lucide-react"
import { useApp } from "@/context/app-context"
import { Collapsible } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/primitives"
import { cn } from "@/lib/utils"
import type { StageState } from "@/lib/types"
import { Step1Collect } from "./panels/step1-collect"
import { Step2Clean } from "./panels/step2-clean"
import { Step3Analysis } from "./panels/step3-analysis"
import { Step4Plan } from "./panels/step4-plan"
import { Step5Prd } from "./panels/step5-prd"
import { Step6Tests } from "./panels/step6-tests"

const PANELS: Record<string, React.ReactNode> = {
  collect: <Step1Collect />,
  clean: <Step2Clean />,
  analyze: <Step3Analysis />,
  plan: <Step4Plan />,
  prd: <Step5Prd />,
  test: <Step6Tests />,
}

function statusMeta(status: StageState["status"]) {
  switch (status) {
    case "success":
      return { icon: <CheckCircle2 className="size-5 text-[color:var(--success)]" />, pct: 100, tone: "success" as const }
    case "running":
      return { icon: <Loader2 className="size-5 animate-spin text-primary" />, pct: 60, tone: "primary" as const }
    case "error":
      return { icon: <AlertTriangle className="size-5 text-warning" />, pct: 100, tone: "warning" as const }
    default:
      return { icon: <Circle className="size-5 text-muted-foreground/40" />, pct: 0, tone: "primary" as const }
  }
}

export function PipelineBoard() {
  const { stages, snapshot } = useApp()
  const done = stages.filter((s) => s.status === "success").length

  return (
    <section aria-label="流水线进度看板" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            3
          </span>
          <Workflow className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">评论转产品方案 · 6 阶段流水线</h2>
        </div>
        <span className="text-xs text-muted-foreground">已完成 {done} / 6 阶段</span>
      </div>

      <div className="flex flex-col gap-2">
        {stages.map((stage, idx) => {
          const meta = statusMeta(stage.status)
          const hasPanel = stage.status === "success" || (stage.status === "error" && !!snapshot)
          const isCore = stage.id >= 3
          return (
            <div
              key={stage.key}
              className={cn(
                "rounded-xl border bg-card p-3",
                isCore ? "border-primary/30 ring-1 ring-primary/5" : "border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex shrink-0 flex-col items-center">
                  {meta.icon}
                  {idx < stages.length - 1 ? <div className="mt-1 h-4 w-px bg-border" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Step{stage.id}</span>
                    <span className="text-sm font-medium text-foreground">{stage.title}</span>
                    {isCore ? (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                        核心
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {stage.message || stage.description}
                  </p>
                  <div className="mt-2">
                    <Progress value={meta.pct} tone={meta.tone} />
                  </div>
                </div>
              </div>

              {hasPanel ? (
                <div className="mt-3">
                  <Collapsible
                    title={`Step${stage.id} 中间产出`}
                    subtitle="展开查看该阶段完整产出与溯源"
                    defaultOpen={stage.id === 3}
                  >
                    {PANELS[stage.key]}
                  </Collapsible>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
