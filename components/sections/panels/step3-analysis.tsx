"use client"

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { AlertTriangle, MessageSquare } from "lucide-react"
import { useApp } from "@/context/app-context"
import { Badge } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SENTIMENT_COLORS = ["#16a34a", "#64748b", "#dc2626"]

export function Step3Analysis() {
  const { snapshot, openTrace } = useApp()
  if (!snapshot) return null

  const barData = snapshot.painPoints.map((p) => ({ name: p.id, 频次: p.frequency, full: p.name }))

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-medium text-foreground">情感评分分布</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={snapshot.sentiment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                  {snapshot.sentiment.map((_, i) => (
                    <Cell key={i} fill={SENTIMENT_COLORS[i % SENTIMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-medium text-foreground">痛点频次矩阵</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v} 条评论`, "关联频次"]}
                  labelFormatter={(l) => barData.find((d) => d.name === l)?.full ?? l}
                />
                <Bar dataKey="频次" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Top {snapshot.painPoints.length} 痛点清单</p>
        <div className="flex flex-col gap-2">
          {snapshot.painPoints.map((p) => {
            const thumbs = snapshot.cleanReviews.filter((c) => p.reviewIds.includes(c.id)).slice(0, 3)
            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border p-3",
                  p.suspectedHallucination ? "border-warning bg-warning-bg" : "border-border bg-card",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{p.id}</Badge>
                  <Badge tone={p.severity === "P0" ? "danger" : p.severity === "P1" ? "warning" : "muted"}>
                    {p.severity}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground">· {p.category}</span>
                  <Badge tone="muted">{p.frequency} 条关联</Badge>
                  {p.suspectedHallucination ? (
                    <Badge tone="warning" className="ml-auto">
                      <AlertTriangle className="size-3" />
                      疑似 AI 幻觉（无匹配评论）
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{p.summary}</p>

                {thumbs.length ? (
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                    {thumbs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openTrace({ kind: "reviews", ids: [t.id], title: `评论原文 · ${t.id}` })}
                        className="rounded-md border border-border bg-background p-2 text-left transition-colors hover:border-primary"
                      >
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MessageSquare className="size-3" />
                          {t.rating}★ · {t.author}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-foreground">
                          {t.title || t.content}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-warning">该痛点暂无可溯源评论，已标记为可疑结论。</p>
                )}

                {p.reviewIds.length ? (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openTrace({ kind: "painpoint", ids: [p.id], title: `痛点 ${p.id} 全部溯源评论` })}
                    >
                      查看全部 {p.reviewIds.length} 条原文
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
