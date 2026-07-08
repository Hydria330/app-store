"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useApp } from "@/context/app-context"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/primitives"
import type { CleanReview } from "@/lib/types"

export function Step2Clean() {
  const { snapshot } = useApp()

  const columns = useMemo<ColumnDef<CleanReview, unknown>[]>(
    () => [
      { accessorKey: "rating", header: "评分", cell: ({ row }) => <Badge tone={row.original.rating >= 4 ? "success" : row.original.rating <= 2 ? "danger" : "muted"}>{row.original.rating}★</Badge> },
      { accessorKey: "title", header: "标题", cell: ({ row }) => <span className="block max-w-[180px] truncate font-medium">{row.original.title || "—"}</span> },
      { accessorKey: "content", header: "正文", cell: ({ row }) => <span className="block max-w-[360px] truncate text-muted-foreground">{row.original.content}</span> },
      { accessorKey: "sentiment", header: "情感", cell: ({ row }) => { const s = row.original.sentiment; return <Badge tone={s === "positive" ? "success" : s === "negative" ? "danger" : "muted"}>{s === "positive" ? "正面" : s === "negative" ? "负面" : "中性"}</Badge> } },
      { accessorKey: "version", header: "版本" },
      { accessorKey: "wordCount", header: "字数" },
    ],
    [],
  )

  if (!snapshot) return null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">清洗规则清单</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">规则</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">说明</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">过滤条数</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.cleanRules.map((r) => (
                <tr key={r.rule} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{r.rule}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.detail}</td>
                  <td className="px-3 py-2 text-right">
                    <Badge tone={r.removed > 0 ? "warning" : "muted"}>{r.removed}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-foreground">
          结构化清洗后评论（{snapshot.cleanReviews.length} 条 · 支持搜索 / 排序 / 分页）
        </p>
        <DataTable
          columns={columns}
          data={snapshot.cleanReviews}
          searchPlaceholder="搜索评论标题或正文…"
          emptyText="无有效评论"
        />
      </div>
    </div>
  )
}
