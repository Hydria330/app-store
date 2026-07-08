"use client"

import { useApp } from "@/context/app-context"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/primitives"
import { ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react"

export function AntiHallucination() {
  const { snapshot } = useApp()
  const painPoints = snapshot?.painPoints ?? []
  const flagged = painPoints.filter((p) => p.suspectedHallucination)
  const grounded = painPoints.length - flagged.length

  const measures = [
    {
      title: "强制溯源约束",
      detail: "每个痛点、PRD 需求、测试用例必须携带真实评论 ID，无匹配来源则视为不可信。",
    },
    {
      title: "疑似幻觉标红",
      detail: "分析结果中若出现无法对应任何原始评论的条目，自动以红色警示标记并计入下方统计。",
    },
    {
      title: "原文对齐校验",
      detail: "测试用例的预期结果对齐用户吐槽原文，禁止凭空编造未在评论中出现的功能诉求。",
    },
    {
      title: "本地留痕存证",
      detail: "接口原始返回与每次 LLM 请求/响应完整写入 IndexedDB，任何结论均可回放核验。",
    },
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">区块五 · 防幻觉与可信度控制</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        大模型可能产生看似合理却缺乏依据的输出。本平台通过四重机制约束，确保每个结论都能回到真实评论。
      </p>

      <div className="grid gap-3 md:grid-cols-2 mb-5">
        {measures.map((m) => (
          <div key={m.title} className="flex items-start gap-3 rounded-lg border border-border p-4">
            <CheckCircle2 className="size-5 shrink-0 text-success" />
            <div>
              <h3 className="text-sm font-medium">{m.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {snapshot && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <div className="text-2xl font-semibold text-success">{grounded}</div>
            <div className="mt-1 text-xs text-muted-foreground">已溯源痛点</div>
          </div>
          <div className="rounded-lg bg-warning-bg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-warning">
              {flagged.length > 0 && <AlertTriangle className="size-5" />}
              {flagged.length}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">疑似幻觉（已标记）</div>
          </div>
        </div>
      )}

      {flagged.length > 0 && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-bg p-4">
          <p className="text-xs font-medium text-warning mb-2">以下条目缺乏原始评论支撑，请人工复核：</p>
          <div className="flex flex-wrap gap-2">
            {flagged.map((p) => (
              <Badge key={p.id} tone="warning">
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
