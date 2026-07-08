"use client"

import { useState } from "react"
import { Copy, Check, Download, FileJson } from "lucide-react"
import { useApp } from "@/context/app-context"
import { StatCard } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"
import { exportRawJson } from "@/lib/export"

export function Step1Collect() {
  const { snapshot, pushToast } = useApp()
  const [copied, setCopied] = useState(false)
  if (!snapshot) return null

  const preview = snapshot.rawJson ? snapshot.rawJson.slice(0, 4000) : "（暂无原始返回）"

  const copyUrl = async () => {
    await navigator.clipboard.writeText(snapshot.rssUrl)
    setCopied(true)
    pushToast({ type: "info", message: "已复制 RSS 请求 URL" })
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="原始采集条数" value={snapshot.rawReviews.length} hint="API 上限约 500" />
        <StatCard label="APP ID" value={snapshot.appId} />
        <StatCard label="区域" value="US 美区" hint="强制拼接" />
        <StatCard label="存证" value="IndexedDB" hint="原始 JSON 永久留存" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-foreground">完整 RSS 请求 URL</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-muted-foreground">
            {snapshot.rssUrl}
          </code>
          <Button variant="outline" size="xs" onClick={copyUrl}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            复制
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <FileJson className="size-3.5 text-muted-foreground" />
            原始 API 返回 JSON 预览
          </p>
          <Button variant="outline" size="xs" onClick={() => exportRawJson(snapshot)}>
            <Download className="size-3" />
            导出原始评论 JSON
          </Button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-5 text-muted-foreground">
          {preview}
          {snapshot.rawJson.length > 4000 ? "\n… （已截断，完整内容见导出文件）" : ""}
        </pre>
      </div>
    </div>
  )
}
