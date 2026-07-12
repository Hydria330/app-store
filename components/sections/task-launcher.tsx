"use client"

// 区块2：任务启动输入区
import { useState } from "react"
import { Play, KeyRound, Link as LinkIcon, Loader2, Eye, EyeOff, ShieldQuestion } from "lucide-react"
import { useApp } from "@/context/app-context"
import { Card, CardContent } from "@/components/ui/card"
import { Input, Textarea, Badge } from "@/components/ui/primitives"
import { Button } from "@/components/ui/button"
import { extractAppId } from "@/lib/apple"

export function TaskLauncher() {
  const { appLink, setAppLink, apiKey, setApiKey, runPipeline, running } = useApp()
  const [showKey, setShowKey] = useState(false)
  const appId = extractAppId(appLink)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            2
          </span>
          <h2 className="text-sm font-semibold text-foreground">任务启动</h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-foreground" htmlFor="app-link">
            <LinkIcon className="size-3.5 text-muted-foreground" />
            App Store 链接（支持中国区链接自动识别 ID）
          </label>
          <Textarea
            id="app-link"
            value={appLink}
            onChange={(e) => setAppLink(e.target.value)}
            placeholder="粘贴 https://apps.apple.com/... 链接或直接输入数字 APP ID"
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-2 text-xs">
            {appId ? (
              <Badge tone="success">已解析 APP ID：{appId}</Badge>
            ) : (
              <Badge tone="warning">未能解析 APP ID</Badge>
            )}
            <span className="text-muted-foreground">强制拼接美区（us）接口</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-foreground" htmlFor="api-key">
            <KeyRound className="size-3.5 text-muted-foreground" />
            LLM API Key（SiliconFlow / OpenAI 兼容）
          </label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-...（也可在 .env.local 配置 SILICON_FLOW_API_KEY）"
              className="pr-10 font-mono text-xs"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "隐藏密钥" : "显示密钥"}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            密钥仅用于调用本地 /api/llm 代理；可存 LocalStorage，或在 .env.local 配置服务端密钥。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button size="lg" onClick={() => void runPipeline()} disabled={running} className="w-full sm:w-auto">
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Pipeline 运行中…
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start Full Analysis Pipeline
              </>
            )}
          </Button>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldQuestion className="size-3.5" />
            评论采集走本地 RSS 代理，LLM 分析走 /api/llm，证据本地 IndexedDB 存档。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
