"use client"

import { Activity, ShieldCheck } from "lucide-react"
import { useApp } from "@/context/app-context"
import { CompliancePanel } from "@/components/sections/compliance-panel"
import { TaskLauncher } from "@/components/sections/task-launcher"
import { PipelineBoard } from "@/components/sections/pipeline-board"
import { ExportCenter } from "@/components/sections/export-center"
import { AntiHallucination } from "@/components/sections/anti-hallucination"
import { AcceptanceChecklist } from "@/components/sections/acceptance-checklist"
import { Toaster } from "@/components/toaster"
import { TraceModal } from "@/components/trace-modal"

export function AppShell() {
  const { auditCount, running } = useApp()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-foreground">
                App Store 美区评论 · 全链路产品分析平台
              </h1>
              <p className="text-[11px] text-muted-foreground">
                纯前端采集 → 痛点量化 → PRD → 溯源测试用例
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {running ? (
              <span className="hidden items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground sm:inline-flex">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                分析进行中
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-[color:var(--success)]" />
              本地存证 {auditCount}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <CompliancePanel />
        <TaskLauncher />
        <PipelineBoard />
        <ExportCenter />
        <div className="grid gap-6 lg:grid-cols-2">
          <AntiHallucination />
          <AcceptanceChecklist />
        </div>
        <footer className="border-t border-border pt-6 pb-2 text-center text-[11px] text-muted-foreground">
          数据来源 Apple 官方 RSS Customer Reviews 公开接口 · 所有分析结论均可回溯至真实评论 · 仅用于产品研究
        </footer>
      </main>

      <Toaster />
      <TraceModal />
    </div>
  )
}
