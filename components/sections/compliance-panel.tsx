"use client"

// 区块1：顶部常驻数据源合规说明面板（不可折叠，白底灰文字）
import { ShieldCheck, Database, Link2, AlertTriangle, Archive } from "lucide-react"

const ITEMS = [
  {
    icon: Database,
    title: "数据源",
    body: "Apple 官方美区 RSS Customer Reviews API，放弃网页爬虫，仅使用官方接口保证合规。",
  },
  {
    icon: Link2,
    title: "接口规则",
    body: "自动解析用户输入的中 / 美 App Store 链接提取数字 APP ID，强制拼接 us 美区接口地址。",
  },
  {
    icon: AlertTriangle,
    title: "客观局限性透明披露",
    body: "API 仅返回最新约 500 条评论；无全量历史；限流约每分钟 10 次；无设备 / 地域标签。",
  },
  {
    icon: Archive,
    title: "数据存证",
    body: "所有原始 API 返回 JSON 永久存入浏览器 IndexedDB，支持一键导出原始凭证复现核验。",
  },
]

export function CompliancePanel() {
  return (
    <section
      aria-label="数据源合规说明"
      className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur"
    >
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">数据源合规说明</h2>
          <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            常驻 · 不可折叠
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => (
            <div key={it.title} className="flex gap-2 rounded-lg border border-border bg-background p-2.5">
              <it.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-foreground">{it.title}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
