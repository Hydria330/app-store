"use client"

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { useApp } from "@/context/app-context"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-lg border bg-card p-3 shadow-lg",
            t.type === "success" && "border-[color:var(--success)]/30",
            t.type === "error" && "border-destructive/30",
            t.type === "info" && "border-border",
          )}
        >
          {t.type === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />}
          {t.type === "error" && <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
          {t.type === "info" && <Info className="mt-0.5 size-4 shrink-0 text-primary" />}
          <p className="flex-1 text-sm text-foreground">{t.message}</p>
          <button
            onClick={() => dismissToast(t.id)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="关闭提示"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
