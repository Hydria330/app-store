"use client"

import { AppProvider } from "@/context/app-context"
import { AppShell } from "@/components/app-shell"

export default function HomePage() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
