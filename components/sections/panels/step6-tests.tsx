"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useApp } from "@/context/app-context"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"
import type { TestCase } from "@/lib/types"

export function Step6Tests() {
  const { snapshot, openTrace } = useApp()

  const columns = useMemo<ColumnDef<TestCase, unknown>[]>(
    () => [
      { accessorKey: "id", header: "用例ID", cell: ({ row }) => <Badge tone="primary">{row.original.id}</Badge> },
      { accessorKey: "module", header: "模块" },
      { accessorKey: "scenario", header: "测试场景", cell: ({ row }) => <span className="block max-w-[200px]">{row.original.scenario}</span> },
      { accessorKey: "precondition", header: "前置条件", cell: ({ row }) => <span className="block max-w-[160px] text-muted-foreground">{row.original.precondition}</span> },
      {
        id: "steps",
        header: "操作步骤",
        cell: ({ row }) => (
          <ol className="ml-4 max-w-[220px] list-decimal text-xs text-muted-foreground">
            {row.original.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        ),
      },
      { accessorKey: "expected", header: "预期结果(对齐吐槽)", cell: ({ row }) => <span className="block max-w-[220px]">{row.original.expected}</span> },
      { accessorKey: "painPointRestated", header: "原始痛点复述", cell: ({ row }) => <span className="block max-w-[200px] text-muted-foreground">{row.original.painPointRestated}</span> },
      {
        id: "links",
        header: "双向跳转",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="xs"
              onClick={() => openTrace({ kind: "req", ids: [row.original.reqId], title: `PRD 需求 ${row.original.reqId}` })}
            >
              {row.original.reqId}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => openTrace({ kind: "reviews", ids: row.original.reviewIds, title: `用例 ${row.original.id} 溯源评论` })}
            >
              溯源评论({row.original.reviewIds.length})
            </Button>
          </div>
        ),
      },
    ],
    [openTrace],
  )

  if (!snapshot) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        固定字段：模块 / 测试场景 / 前置条件 / 操作步骤 / 预期结果 / 关联 PRD 需求 ID / 原始痛点复述 / 溯源评论。
        预期结果对齐用户吐槽原文，每条用例可双向跳转对应 PRD 需求与原始评论。
      </p>
      <DataTable
        columns={columns}
        data={snapshot.testCases}
        searchPlaceholder="搜索测试场景 / 模块…"
        emptyText="暂无测试用例"
        pageSize={6}
      />
    </div>
  )
}
